import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { AuthPayload } from "../middleware/auth";

const JWT_SECRET = process.env.JWT_SECRET || "shinra_pocket_dev_secret";

// ─── Socket Event Names (must match client SocketEvents enum) ──
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

  // Misc
  ERROR: "error",
} as const;

// ─── Room / Game State ───────────────────────────────────
interface PlayerInfo {
  socketId: string;
  userId: string;
  username: string;
}

interface GameRoom {
  roomId: string;
  gameType: string;
  players: PlayerInfo[];
  state: Record<string, unknown>;
  currentTurn: string | null; // userId of current turn player
  createdAt: number;
}

const rooms = new Map<string, GameRoom>();
const socketToRoom = new Map<string, string>(); // socketId -> roomId

// ─── Auth helper for Socket.io ───────────────────────────
function authenticateSocket(socket: Socket): AuthPayload | null {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.replace("Bearer ", "");

  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

// ─── Main handler ────────────────────────────────────────
export function registerGameHandler(io: Server): void {
  io.on("connection", (socket: Socket) => {
    const user = authenticateSocket(socket);

    if (!user) {
      console.log(`[Socket] Unauthenticated connection rejected: ${socket.id}`);
      socket.emit(Events.ERROR, { message: "Authentication required" });
      socket.disconnect(true);
      return;
    }

    console.log(`[Socket] ${user.username} connected (${socket.id})`);

    // ── Matchmaking: Join Queue ───────────────────────
    socket.on(Events.JOIN_QUEUE, (data: { roomId?: string; gameType?: string; coin?: string }) => {
      const roomId = data.roomId ?? `room_${Date.now()}`;
      const gameType = data.gameType ?? "default";

      // Create room if it doesn't exist
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          roomId,
          gameType,
          players: [],
          state: {},
          currentTurn: null,
          createdAt: Date.now(),
        });
      }

      const room = rooms.get(roomId)!;

      // Max 2 players
      if (room.players.length >= 2) {
        // Allow reconnect if same user
        const existingIdx = room.players.findIndex((p) => p.userId === user.userId);
        if (existingIdx === -1) {
          socket.emit(Events.ERROR, { message: "Room is full" });
          return;
        }
        // Reconnect — update socket id
        room.players[existingIdx].socketId = socket.id;
      } else {
        // Prevent duplicate join
        if (!room.players.some((p) => p.userId === user.userId)) {
          room.players.push({
            socketId: socket.id,
            userId: user.userId,
            username: user.username,
          });
        }
      }

      socket.join(roomId);
      socketToRoom.set(socket.id, roomId);

      // Notify all players in the room
      io.to(roomId).emit(Events.ROOM_JOINED, {
        userId: user.userId,
        username: user.username,
        players: room.players.map((p) => ({
          userId: p.userId,
          username: p.username,
        })),
      });

      // Send queue status
      socket.emit(Events.QUEUE_STATUS, {
        inQueue: room.players.length < 2,
        playersInQueue: room.players.length,
        estimatedWait: room.players.length < 2 ? 10 : null,
      });

      // If 2 players are present, notify match found & start the game
      if (room.players.length === 2) {
        room.currentTurn = room.players[0].userId;

        // Notify each player of match found with their specific info
        room.players.forEach((p, idx) => {
          const opponent = room.players[1 - idx];
          io.to(p.socketId).emit(Events.MATCH_FOUND, {
            roomId,
            playerId: p.userId,
            opponentId: opponent.userId,
            playerOrder: (idx + 1) as 1 | 2,
          });
        });

        io.to(roomId).emit(Events.GAME_START, {
          roomId,
          gameType: room.gameType,
          players: room.players.map((p) => ({
            userId: p.userId,
            username: p.username,
          })),
          currentTurn: room.currentTurn,
        });
      }

      console.log(`[Socket] ${user.username} joined room ${roomId} (${room.players.length}/2)`);
    });

    // ── Matchmaking: Leave Queue ──────────────────────
    socket.on(Events.LEAVE_QUEUE, () => {
      const roomId = socketToRoom.get(socket.id);
      if (roomId) {
        handleLeaveRoom(io, socket, user, roomId);
      }
    });

    // ── Game Move ─────────────────────────────────────
    socket.on(Events.GAME_MOVE, (data: { roomId: string; playerId: string; type: string; cellIndex: number; fromIndex?: number }) => {
      const { roomId } = data;

      if (!roomId) {
        socket.emit(Events.ERROR, { message: "roomId is required" });
        return;
      }

      const room = rooms.get(roomId);
      if (!room) {
        socket.emit(Events.ERROR, { message: "Room not found" });
        return;
      }

      // Verify it's this player's turn
      if (room.currentTurn && room.currentTurn !== user.userId) {
        socket.emit(Events.ERROR, { message: "Not your turn" });
        return;
      }

      // Switch turn to the other player
      const otherPlayer = room.players.find((p) => p.userId !== user.userId);
      if (otherPlayer) {
        room.currentTurn = otherPlayer.userId;
      }

      // Broadcast updated game state to all in room
      io.to(roomId).emit(Events.GAME_STATE_UPDATE, {
        ...room.state,
        currentTurn: room.currentTurn,
        lastMove: data,
      });
    });

    // ── Game Surrender ────────────────────────────────
    socket.on(Events.GAME_SURRENDER, (data: { roomId: string; playerId: string }) => {
      const { roomId } = data;

      const room = rooms.get(roomId);
      if (!room) return;

      const winner = room.players.find((p) => p.userId !== user.userId);

      io.to(roomId).emit(Events.GAME_RESULT, {
        roomId,
        winner: winner?.userId ?? null,
        reason: "surrender",
      });

      // Clean up room after a short delay
      setTimeout(() => {
        rooms.delete(roomId);
        console.log(`[Socket] Room ${roomId} cleaned up after surrender`);
      }, 5000);
    });

    // ── Request current room state (for reconnect) ────
    socket.on(Events.ROOM_STATE, (data: { roomId: string }) => {
      const room = rooms.get(data.roomId);
      if (!room) {
        socket.emit(Events.ERROR, { message: "Room not found" });
        return;
      }

      socket.emit(Events.GAME_STATE_UPDATE, {
        roomId: room.roomId,
        state: room.state,
        currentTurn: room.currentTurn,
        players: room.players.map((p) => ({
          userId: p.userId,
          username: p.username,
        })),
      });
    });

    // ── Disconnect ─────────────────────────────────────
    socket.on("disconnect", () => {
      console.log(`[Socket] ${user.username} disconnected (${socket.id})`);

      const roomId = socketToRoom.get(socket.id);
      if (roomId) {
        const room = rooms.get(roomId);
        // If game was in progress, emit game result for disconnect
        if (room && room.players.length === 2) {
          const winner = room.players.find((p) => p.userId !== user.userId);
          io.to(roomId).emit(Events.GAME_RESULT, {
            roomId,
            winner: winner?.userId ?? null,
            reason: "disconnect",
          });
        }
        handleLeaveRoom(io, socket, user, roomId);
      }
    });
  });
}

// ─── Helper: handle player leaving a room ────────────────
function handleLeaveRoom(
  io: Server,
  socket: Socket,
  user: AuthPayload,
  roomId: string
): void {
  const room = rooms.get(roomId);
  if (!room) return;

  // Remove player from room
  room.players = room.players.filter((p) => p.userId !== user.userId);
  socketToRoom.delete(socket.id);
  socket.leave(roomId);

  // Notify remaining players
  io.to(roomId).emit(Events.ROOM_LEFT, {
    userId: user.userId,
    username: user.username,
    players: room.players.map((p) => ({
      userId: p.userId,
      username: p.username,
    })),
  });

  // If room is empty, clean up
  if (room.players.length === 0) {
    rooms.delete(roomId);
    console.log(`[Socket] Room ${roomId} removed (empty)`);
  }
}

export { rooms };
