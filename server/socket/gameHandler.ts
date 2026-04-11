/**
 * Socket.io game handler for Shinra Pocket.
 *
 * Features:
 *  - Rating-based matchmaking queue (±100 expanding to ±500)
 *  - Server-side game state with move validation via gameLogic
 *  - 30-second turn timeout with auto-loss
 *  - Anti-cheat room registration
 *  - Graceful reconnection handling
 */

import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { AuthPayload } from "../middleware/auth";
import { registerGameRoom, unregisterGameRoom } from "../middleware/antiCheat";
import {
  createServerGameState,
  applyMove,
  getOpponent,
  ServerGameState,
  PlayerId,
  MoveData,
} from "./gameLogic";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn(
    "[Socket] WARNING: JWT_SECRET is not set in environment variables"
  );
}

// ゲームの複雑さに応じた思考時間（オンライン対戦）
const TURN_TIMEOUT_BY_GAME: Record<string, number> = {
  game1: 10_000,   // 三目並べ: 10秒（シンプル）
  game2: 20_000,   // 一騎打ち: 20秒（スタック戦略）
  game4: 20_000,   // パタパタ: 20秒（種まき計算）
  game5: 30_000,   // 日月の戦い: 30秒（将棋風、最も複雑）
};
const DEFAULT_TURN_TIMEOUT_MS = 20_000;
const MATCHMAKING_INTERVAL_MS = 2_000;
const QUEUE_STALE_MS = 5 * 60 * 1000; // 5 minutes
const RATING_INITIAL_RANGE = 100;
const RATING_EXPAND_STEP = 100;
const RATING_EXPAND_INTERVAL_MS = 10_000;
const RATING_MAX_RANGE = 500;

// ---------------------------------------------------------------------------
// Socket Event Names (must match client SocketEvents enum)
// ---------------------------------------------------------------------------

const Events = {
  // Matchmaking (client -> server)
  JOIN_QUEUE: "matchmaking:join",
  LEAVE_QUEUE: "matchmaking:leave",
  // Matchmaking (server -> client)
  QUEUE_STATUS: "matchmaking:status",
  MATCH_FOUND: "matchmaking:found",

  // Room (server -> client)
  ROOM_JOINED: "room:joined",
  ROOM_LEFT: "room:left",
  ROOM_STATE: "room:state",

  // Gameplay (client -> server)
  GAME_MOVE: "game:move",
  GAME_SURRENDER: "game:surrender",
  // Gameplay (server -> client)
  GAME_START: "game:start",
  GAME_STATE_UPDATE: "game:state",
  GAME_RESULT: "game:result",
  GAME_ERROR: "game:error",

  // Misc
  ERROR: "error",
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QueueEntry {
  socketId: string;
  userId: string;
  username: string;
  rating: number;
  gameType: string;
  coin: string;
  joinedAt: number;
  displayName: string;
  countryFlag: string;
}

interface PlayerData {
  socketId: string;
  userId: string;
  username: string;
  coin: string;
  rating: number;
  displayName: string;
  countryFlag: string;
}

interface GameRoom {
  roomId: string;
  gameType: string;
  players: Map<string, PlayerData>; // keyed by oderId
  state: ServerGameState | null;
  turnTimer: ReturnType<typeof setTimeout> | null;
  playerOrder: Map<string, PlayerId>; // oderId -> 'player1' | 'player2'
  createdAt: number;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const matchmakingQueue: Map<string, QueueEntry> = new Map(); // keyed by oderId
const rooms: Map<string, GameRoom> = new Map();
const socketToRoom: Map<string, string> = new Map(); // socketId -> roomId
const socketToUser: Map<string, string> = new Map(); // socketId -> oderId
const userToSocket: Map<string, string> = new Map(); // oderId -> socketId (latest)

let matchmakingTimer: ReturnType<typeof setInterval> | null = null;

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function authenticateSocket(socket: Socket): AuthPayload | null {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.replace("Bearer ", "");

  if (!token) return null;
  if (!JWT_SECRET) return null;

  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Matchmaking helpers
// ---------------------------------------------------------------------------

function ratingRange(entry: QueueEntry): number {
  const elapsed = Date.now() - entry.joinedAt;
  const expansions = Math.floor(elapsed / RATING_EXPAND_INTERVAL_MS);
  return Math.min(
    RATING_INITIAL_RANGE + expansions * RATING_EXPAND_STEP,
    RATING_MAX_RANGE
  );
}

function runMatchmaking(io: Server): void {
  const now = Date.now();

  // Remove stale entries
  for (const [userId, entry] of matchmakingQueue) {
    if (now - entry.joinedAt > QUEUE_STALE_MS) {
      console.log(`[Matchmaking] Removing stale entry: ${entry.username}`);
      const sock = io.sockets.sockets.get(entry.socketId);
      if (sock) {
        sock.emit(Events.QUEUE_STATUS, {
          inQueue: false,
          reason: "timeout",
        });
      }
      matchmakingQueue.delete(userId);
    }
  }

  // Group by gameType
  const byGameType = new Map<string, QueueEntry[]>();
  for (const entry of matchmakingQueue.values()) {
    const list = byGameType.get(entry.gameType) || [];
    list.push(entry);
    byGameType.set(entry.gameType, list);
  }

  // Try to match within each gameType
  for (const [gameType, entries] of byGameType) {
    if (entries.length < 2) continue;

    // Sort by rating for efficient matching
    entries.sort((a, b) => a.rating - b.rating);

    const matched = new Set<string>();

    for (let i = 0; i < entries.length; i++) {
      if (matched.has(entries[i].userId)) continue;

      for (let j = i + 1; j < entries.length; j++) {
        if (matched.has(entries[j].userId)) continue;

        const diff = Math.abs(entries[i].rating - entries[j].rating);
        const allowedRange = Math.max(
          ratingRange(entries[i]),
          ratingRange(entries[j])
        );

        if (diff <= allowedRange) {
          matched.add(entries[i].userId);
          matched.add(entries[j].userId);
          createMatch(io, entries[i], entries[j], gameType);
          break;
        }
      }
    }
  }
}

function createMatch(
  io: Server,
  entry1: QueueEntry,
  entry2: QueueEntry,
  gameType: string
): void {
  // Remove from queue
  matchmakingQueue.delete(entry1.userId);
  matchmakingQueue.delete(entry2.userId);

  const roomId = `room_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const playerOrder = new Map<string, PlayerId>();
  playerOrder.set(entry1.userId, "player1");
  playerOrder.set(entry2.userId, "player2");

  const players = new Map<string, PlayerData>();
  players.set(entry1.userId, {
    socketId: entry1.socketId,
    userId: entry1.userId,
    username: entry1.username,
    coin: entry1.coin,
    rating: entry1.rating,
    displayName: entry1.displayName,
    countryFlag: entry1.countryFlag,
  });
  players.set(entry2.userId, {
    socketId: entry2.socketId,
    userId: entry2.userId,
    username: entry2.username,
    coin: entry2.coin,
    rating: entry2.rating,
    displayName: entry2.displayName,
    countryFlag: entry2.countryFlag,
  });

  const room: GameRoom = {
    roomId,
    gameType,
    players,
    state: null,
    turnTimer: null,
    playerOrder,
    createdAt: Date.now(),
  };

  rooms.set(roomId, room);

  // Join sockets to room
  for (const pd of players.values()) {
    const sock = io.sockets.sockets.get(pd.socketId);
    if (sock) {
      sock.join(roomId);
      socketToRoom.set(pd.socketId, roomId);
    }
  }

  // Emit matchmaking:found to each player individually
  for (const [userId, pd] of players) {
    const opponentEntry = userId === entry1.userId ? entry2 : entry1;
    const order = playerOrder.get(userId)!;
    const sock = io.sockets.sockets.get(pd.socketId);
    if (sock) {
      sock.emit(Events.MATCH_FOUND, {
        roomId,
        playerId: userId,
        opponentId: opponentEntry.userId,
        playerOrder: order === "player1" ? 1 : 2,
        displayName: pd.displayName,
        countryFlag: pd.countryFlag,
        opponentDisplayName: opponentEntry.displayName,
        opponentCountryFlag: opponentEntry.countryFlag,
      });
    }
  }

  // Start game
  startGame(io, room);

  console.log(
    `[Matchmaking] Match created: ${entry1.username} (${entry1.rating}) vs ${entry2.username} (${entry2.rating}) -> ${roomId}`
  );
}

// ---------------------------------------------------------------------------
// Game lifecycle
// ---------------------------------------------------------------------------

function startGame(io: Server, room: GameRoom): void {
  const state = createServerGameState(room.gameType);
  room.state = state;

  // Register with anti-cheat
  registerGameRoom(room.roomId);

  const playersArray = Array.from(room.players.values()).map((p) => ({
    userId: p.userId,
    username: p.username,
    coin: p.coin,
    displayName: p.displayName,
    countryFlag: p.countryFlag,
  }));

  io.to(room.roomId).emit(Events.GAME_START, {
    roomId: room.roomId,
    gameType: room.gameType,
    players: playersArray,
    currentTurn: state.currentTurn,
    state,
  });

  // Start turn timer
  startTurnTimer(io, room);

  console.log(`[Game] Started ${room.gameType} in room ${room.roomId}`);
}

function startTurnTimer(io: Server, room: GameRoom): void {
  clearTurnTimer(room);

  if (!room.state || !room.state.active) return;

  room.turnTimer = setTimeout(() => {
    if (!room.state || !room.state.active) return;

    const loser = room.state.currentTurn;
    const winner = getOpponent(loser);

    room.state.winner = winner;
    room.state.active = false;

    console.log(
      `[Game] Turn timeout in ${room.roomId}: ${loser} loses, ${winner} wins`
    );

    io.to(room.roomId).emit(Events.GAME_RESULT, {
      roomId: room.roomId,
      winner,
      reason: "timeout",
    });

    cleanupRoom(room.roomId);
  }, TURN_TIMEOUT_BY_GAME[room.gameType] ?? DEFAULT_TURN_TIMEOUT_MS);
}

function clearTurnTimer(room: GameRoom): void {
  if (room.turnTimer) {
    clearTimeout(room.turnTimer);
    room.turnTimer = null;
  }
}

function cleanupRoom(roomId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;

  clearTurnTimer(room);
  unregisterGameRoom(roomId);

  // Clean up socket mappings
  for (const pd of room.players.values()) {
    socketToRoom.delete(pd.socketId);
  }

  // Delay deletion so clients can read final state
  setTimeout(() => {
    rooms.delete(roomId);
    console.log(`[Game] Room ${roomId} cleaned up`);
  }, 5000);
}

function endGame(
  io: Server,
  room: GameRoom,
  winner: PlayerId | null,
  reason: string
): void {
  if (room.state) {
    room.state.winner = winner;
    room.state.active = false;
  }

  io.to(room.roomId).emit(Events.GAME_RESULT, {
    roomId: room.roomId,
    winner,
    reason,
  });

  console.log(
    `[Game] Ended ${room.roomId}: winner=${winner}, reason=${reason}`
  );

  cleanupRoom(room.roomId);
}

// ---------------------------------------------------------------------------
// Resolve PlayerId from userId + room
// ---------------------------------------------------------------------------

function getPlayerId(room: GameRoom, userId: string): PlayerId | null {
  return room.playerOrder.get(userId) ?? null;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export function setupGameHandler(io: Server): void {
  // Start matchmaking loop
  matchmakingTimer = setInterval(() => {
    runMatchmaking(io);
  }, MATCHMAKING_INTERVAL_MS);

  io.on("connection", (socket: Socket) => {
    const user = authenticateSocket(socket);

    if (!user) {
      console.log(
        `[Socket] Unauthenticated connection rejected: ${socket.id}`
      );
      socket.emit(Events.ERROR, { message: "Authentication required" });
      socket.disconnect(true);
      return;
    }

    console.log(`[Socket] ${user.username} connected (${socket.id})`);
    socketToUser.set(socket.id, user.userId);

    // Handle reconnection: update socketId in active room
    const prevSocketId = userToSocket.get(user.userId);
    userToSocket.set(user.userId, socket.id);

    handleReconnection(io, socket, user, prevSocketId);

    // ── Matchmaking: Join Queue ─────────────────────────
    socket.on(
      Events.JOIN_QUEUE,
      (data: { gameType: string; coin?: string; rating?: number; displayName?: string; countryFlag?: string }) => {
        const gameType = data.gameType ?? "game1";
        const coin = data.coin ?? "default";
        const rating = data.rating ?? 1000;
        const displayName = data.displayName || user.username;
        const countryFlag = data.countryFlag || "";

        // Remove from queue if already in it
        matchmakingQueue.delete(user.userId);

        const entry: QueueEntry = {
          socketId: socket.id,
          userId: user.userId,
          username: user.username,
          rating,
          gameType,
          coin,
          joinedAt: Date.now(),
          displayName,
          countryFlag,
        };

        matchmakingQueue.set(user.userId, entry);

        socket.emit(Events.QUEUE_STATUS, {
          inQueue: true,
          gameType,
          rating,
        });

        console.log(
          `[Matchmaking] ${user.username} joined queue (${gameType}, rating=${rating})`
        );
      }
    );

    // ── Matchmaking: Leave Queue ────────────────────────
    socket.on(Events.LEAVE_QUEUE, () => {
      const removed = matchmakingQueue.delete(user.userId);
      if (removed) {
        socket.emit(Events.QUEUE_STATUS, { inQueue: false });
        console.log(`[Matchmaking] ${user.username} left queue`);
      }
    });

    // ── Game Move ───────────────────────────────────────
    socket.on(
      Events.GAME_MOVE,
      (data: {
        roomId: string;
        type: string;
        cellIndex: number;
        fromIndex?: number;
      }) => {
        const { roomId } = data;

        if (!roomId) {
          socket.emit(Events.GAME_ERROR, { message: "roomId is required" });
          return;
        }

        const room = rooms.get(roomId);
        if (!room) {
          socket.emit(Events.GAME_ERROR, { message: "Room not found" });
          return;
        }

        if (!room.state || !room.state.active) {
          socket.emit(Events.GAME_ERROR, { message: "Game is not active" });
          return;
        }

        const playerId = getPlayerId(room, user.userId);
        if (!playerId) {
          socket.emit(Events.GAME_ERROR, {
            message: "You are not in this game",
          });
          return;
        }

        const moveData: MoveData = {
          type: data.type as "place" | "move",
          cellIndex: data.cellIndex,
          fromIndex: data.fromIndex,
        };

        const result = applyMove(room.state, playerId, moveData);

        if (!result.valid) {
          socket.emit(Events.GAME_ERROR, {
            message: result.reason ?? "Invalid move",
          });
          return;
        }

        // Update state
        room.state = result.state;

        // Broadcast updated state
        io.to(roomId).emit(Events.GAME_STATE_UPDATE, {
          state: room.state,
          lastMove: { ...moveData, playerId },
        });

        // Check if game ended
        if (room.state.winner || !room.state.active) {
          endGame(io, room, room.state.winner, "checkmate");
          return;
        }

        // Reset turn timer for next turn
        startTurnTimer(io, room);
      }
    );

    // ── Game Surrender ──────────────────────────────────
    socket.on(Events.GAME_SURRENDER, (data: { roomId: string }) => {
      const { roomId } = data;

      const room = rooms.get(roomId);
      if (!room) return;

      const playerId = getPlayerId(room, user.userId);
      if (!playerId) return;

      const winner = getOpponent(playerId);
      endGame(io, room, winner, "surrender");
    });

    // ── Request room state (for reconnect) ──────────────
    socket.on(Events.ROOM_STATE, (data: { roomId: string }) => {
      const room = rooms.get(data.roomId);
      if (!room) {
        socket.emit(Events.GAME_ERROR, { message: "Room not found" });
        return;
      }

      const playersArray = Array.from(room.players.values()).map((p) => ({
        userId: p.userId,
        username: p.username,
        coin: p.coin,
        displayName: p.displayName,
        countryFlag: p.countryFlag,
      }));

      socket.emit(Events.GAME_STATE_UPDATE, {
        roomId: room.roomId,
        state: room.state,
        players: playersArray,
      });
    });

    // ── Disconnect ──────────────────────────────────────
    socket.on("disconnect", () => {
      console.log(`[Socket] ${user.username} disconnected (${socket.id})`);

      // Remove from matchmaking queue
      matchmakingQueue.delete(user.userId);

      // Clean up socket mappings
      socketToUser.delete(socket.id);

      // Only process room disconnect if this is the latest socket for this user
      const latestSocket = userToSocket.get(user.userId);
      if (latestSocket === socket.id) {
        userToSocket.delete(user.userId);

        const roomId = socketToRoom.get(socket.id);
        if (roomId) {
          const room = rooms.get(roomId);
          if (room && room.state && room.state.active) {
            const playerId = getPlayerId(room, user.userId);
            if (playerId) {
              const winner = getOpponent(playerId);
              endGame(io, room, winner, "disconnect");
            }
          }
          socketToRoom.delete(socket.id);
        }
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Reconnection handling
// ---------------------------------------------------------------------------

function handleReconnection(
  io: Server,
  socket: Socket,
  user: AuthPayload,
  prevSocketId: string | undefined
): void {
  if (!prevSocketId || prevSocketId === socket.id) return;

  // Check if the previous socket was in a room
  const roomId = socketToRoom.get(prevSocketId);
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (!room) return;

  // Update player's socketId in the room
  const playerData = room.players.get(user.userId);
  if (!playerData) return;

  console.log(
    `[Socket] ${user.username} reconnected to room ${roomId} (${prevSocketId} -> ${socket.id})`
  );

  playerData.socketId = socket.id;
  socketToRoom.delete(prevSocketId);
  socketToRoom.set(socket.id, roomId);
  socket.join(roomId);

  // Send current state to reconnected player
  if (room.state) {
    const playersArray = Array.from(room.players.values()).map((p) => ({
      userId: p.userId,
      username: p.username,
      coin: p.coin,
      displayName: p.displayName,
      countryFlag: p.countryFlag,
    }));

    socket.emit(Events.GAME_STATE_UPDATE, {
      roomId: room.roomId,
      state: room.state,
      players: playersArray,
    });
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { rooms, matchmakingQueue };

// Also export as registerGameHandler alias for backward compat
export { setupGameHandler as registerGameHandler };
