// === Online Battle Types ===

import { CellState, CoinType, GamePhase, Turn } from '../game/types';
import type { CoinNumber as Game2CoinNumber, ActionType as Game2ActionType } from '../games/game2/game2Types';
import type { Position, PieceType, Side } from '../games/game5/game5Types';

// === Supported Game IDs for online ===
export type OnlineGameId = 'game1' | 'game2' | 'game4' | 'game5';

// === Socket Event Names ===
export enum SocketEvents {
  // Connection
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  CONNECT_ERROR = 'connect_error',

  // Matchmaking
  JOIN_QUEUE = 'matchmaking:join',
  LEAVE_QUEUE = 'matchmaking:leave',
  QUEUE_STATUS = 'matchmaking:status',
  MATCH_FOUND = 'matchmaking:found',

  // Room / Game
  ROOM_JOINED = 'room:joined',
  ROOM_LEFT = 'room:left',
  ROOM_STATE = 'room:state',

  // Gameplay
  GAME_START = 'game:start',
  GAME_MOVE = 'game:move',
  GAME_STATE_UPDATE = 'game:state',
  GAME_RESULT = 'game:result',
  GAME_SURRENDER = 'game:surrender',

  // Misc
  PING = 'ping',
  PONG = 'pong',
  ERROR = 'error',
}

// === Connection State ===
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

// === Queue Status ===
export interface QueueStatus {
  inQueue: boolean;
  playersInQueue: number;
  estimatedWait: number | null; // seconds
}

// === Match Found Payload ===
export interface MatchFoundPayload {
  roomId: string;
  playerId: string;
  opponentId: string;
  playerOrder: 1 | 2; // 1 = first turn, 2 = second turn
}

// === Room State ===
export interface RoomState {
  roomId: string;
  players: PlayerInfo[];
  gameId: string; // e.g. 'game1', 'game2', etc.
  status: 'waiting' | 'playing' | 'finished';
}

// === Player Info ===
export interface PlayerInfo {
  id: string;
  coin: CoinType;
  connected: boolean;
}

// === Match State (synced game state) ===
// Generic state: the server relays game-specific data under `gameState`.
// Game1 fields are kept at top level for backwards compatibility.
export interface MatchState {
  gameId?: OnlineGameId;
  board: CellState[];
  phase: GamePhase;
  currentTurn: string; // playerId of whose turn it is
  playerPlaced: Record<string, number>; // playerId -> count
  selected: number | null;
  moveRound: number;
  winLine: number[] | null;
  winner: string | null; // playerId or 'draw' or null
  /** Opaque game-specific state (games 2/4/5 send their own shape) */
  gameState?: Record<string, unknown>;
  /** Last move that was applied */
  lastMove?: GameMove;
}

// === Game-Specific Move Types ===

/** Game1: 3x3 coin placement / slide */
export interface Game1Move {
  gameId: 'game1';
  type: 'place' | 'move';
  cellIndex: number;
  fromIndex?: number; // for move phase
}

/** Game2: stacking duel — place from hand or move on board */
export interface Game2Move {
  gameId: 'game2';
  type: 'place' | 'move';
  coinNumber?: Game2CoinNumber; // which hand coin to place (1 or 2)
  targetIndex: number;          // destination cell 0-8
  fromIndex?: number;           // source cell (move only)
}

/** Game4: Mancala — pick a pit to sow */
export interface Game4Move {
  gameId: 'game4';
  type: 'sow';
  side: 'a' | 'b'; // which row
  pitIndex: number; // 0-2
}

/** Game5: Shogi-lite — move piece or drop captured piece */
export interface Game5Move {
  gameId: 'game5';
  type: 'move' | 'drop';
  from?: Position; // board move
  to: Position;    // destination
  piece?: PieceType; // for drop
}

/** Union of all game moves */
export type GameMove = Game1Move | Game2Move | Game4Move | Game5Move;

/** Wire format: GameMove + room/player metadata */
export interface GameMovePayload {
  roomId: string;
  playerId: string;
  move: GameMove;
}

/** @deprecated — legacy flat move shape kept for backwards compatibility */
export interface LegacyGameMove {
  roomId: string;
  playerId: string;
  type: 'place' | 'move';
  cellIndex: number;
  fromIndex?: number;
}

// === Game Result ===
export interface GameResult {
  roomId: string;
  winner: string | null; // playerId or null for draw
  reason: 'win' | 'draw' | 'surrender' | 'disconnect' | 'timeout';
}

// === Error Payload ===
export interface SocketError {
  code: string;
  message: string;
}
