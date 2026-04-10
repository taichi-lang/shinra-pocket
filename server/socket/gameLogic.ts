/**
 * Server-side game logic for Shinra Pocket online multiplayer.
 * Validates moves and detects win conditions to prevent cheating.
 *
 * Online games: game1 (三目並べ), game2 (一騎打ち), game4 (パタパタ/マンカラ), game5 (日月の戦い)
 * Game3 and Game6 are NOT available online.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CellState = null | 'player1' | 'player2';
export type GamePhase = 'place' | 'move';
export type PlayerId = 'player1' | 'player2';

export interface ServerGameState {
  gameType: string;
  board: CellState[];
  phase: GamePhase;
  currentTurn: PlayerId;
  player1Placed: number;
  player2Placed: number;
  moveRound: number;
  winner: PlayerId | null;
  winLine: number[] | null;
  active: boolean;
}

export interface MoveData {
  type: 'place' | 'move';
  cellIndex: number;
  fromIndex?: number; // for move phase
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WIN_LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const MAX_PLACE_COUNT = 4;
const BOARD_SIZE = 9;
const ONLINE_GAMES = ['game1', 'game2', 'game4', 'game5'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getOpponent(playerId: PlayerId): PlayerId {
  return playerId === 'player1' ? 'player2' : 'player1';
}

function checkWin(board: CellState[], playerId: PlayerId): number[] | null {
  for (const line of WIN_LINES) {
    if (line.every((i) => board[i] === playerId)) {
      return line;
    }
  }
  return null;
}

function cloneState(state: ServerGameState): ServerGameState {
  return {
    ...state,
    board: [...state.board],
    winLine: state.winLine ? [...state.winLine] : null,
  };
}

function reject(
  state: ServerGameState,
  reason: string,
): { valid: false; state: ServerGameState; reason: string } {
  return { valid: false, state, reason };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createServerGameState(gameType: string): ServerGameState {
  return {
    gameType,
    board: Array(BOARD_SIZE).fill(null),
    phase: 'place',
    currentTurn: 'player1',
    player1Placed: 0,
    player2Placed: 0,
    moveRound: 0,
    winner: null,
    winLine: null,
    active: true,
  };
}

// ---------------------------------------------------------------------------
// Move application
// ---------------------------------------------------------------------------

export function applyMove(
  state: ServerGameState,
  playerId: PlayerId,
  move: MoveData,
): { valid: boolean; state: ServerGameState; reason?: string } {
  // Game must be active
  if (!state.active) {
    return reject(state, 'Game is not active');
  }

  // Turn validation
  if (state.currentTurn !== playerId) {
    return reject(state, 'Not your turn');
  }

  // Dispatch by game type
  if (state.gameType === 'game1') {
    return applyGame1Move(state, playerId, move);
  }

  // game2, game4, game5: minimal passthrough (turn order only)
  return applyPassthroughMove(state, playerId, move);
}

// ---------------------------------------------------------------------------
// Game1 - 三目並べ
// ---------------------------------------------------------------------------

function applyGame1Move(
  state: ServerGameState,
  playerId: PlayerId,
  move: MoveData,
): { valid: boolean; state: ServerGameState; reason?: string } {
  const next = cloneState(state);

  // -- Place phase ----------------------------------------------------------
  if (state.phase === 'place') {
    if (move.type !== 'place') {
      return reject(state, 'Must place a coin during place phase');
    }

    const { cellIndex } = move;

    if (cellIndex < 0 || cellIndex >= BOARD_SIZE) {
      return reject(state, 'Cell index out of range');
    }

    if (next.board[cellIndex] !== null) {
      return reject(state, 'Cell is already occupied');
    }

    const placedKey = playerId === 'player1' ? 'player1Placed' : 'player2Placed';
    if (next[placedKey] >= MAX_PLACE_COUNT) {
      return reject(state, 'Already placed maximum coins');
    }

    // Apply
    next.board[cellIndex] = playerId;
    next[placedKey]++;

    // Check win
    const winLine = checkWin(next.board, playerId);
    if (winLine) {
      next.winner = playerId;
      next.winLine = winLine;
      next.active = false;
      return { valid: true, state: next };
    }

    // Transition to move phase when both players placed all coins
    if (next.player1Placed >= MAX_PLACE_COUNT && next.player2Placed >= MAX_PLACE_COUNT) {
      next.phase = 'move';
      next.moveRound = 0;
    }

    next.currentTurn = getOpponent(playerId);
    return { valid: true, state: next };
  }

  // -- Move phase -----------------------------------------------------------
  if (move.type !== 'move') {
    return reject(state, 'Must move a coin during move phase');
  }

  const { fromIndex, cellIndex } = move;

  if (fromIndex === undefined || fromIndex === null) {
    return reject(state, 'fromIndex is required for move phase');
  }

  if (fromIndex < 0 || fromIndex >= BOARD_SIZE) {
    return reject(state, 'fromIndex out of range');
  }

  if (cellIndex < 0 || cellIndex >= BOARD_SIZE) {
    return reject(state, 'cellIndex out of range');
  }

  if (fromIndex === cellIndex) {
    return reject(state, 'Cannot move to the same cell');
  }

  if (next.board[fromIndex] !== playerId) {
    return reject(state, 'You can only move your own coins');
  }

  if (next.board[cellIndex] !== null) {
    return reject(state, 'Target cell is not empty');
  }

  // Apply
  next.board[fromIndex] = null;
  next.board[cellIndex] = playerId;
  next.moveRound++;

  // Check win
  const winLine = checkWin(next.board, playerId);
  if (winLine) {
    next.winner = playerId;
    next.winLine = winLine;
    next.active = false;
    return { valid: true, state: next };
  }

  next.currentTurn = getOpponent(playerId);
  return { valid: true, state: next };
}

// ---------------------------------------------------------------------------
// Passthrough for game2, game4, game5
// Validates turn order only; full server validation to be added later.
// ---------------------------------------------------------------------------

function applyPassthroughMove(
  state: ServerGameState,
  playerId: PlayerId,
  move: MoveData,
): { valid: boolean; state: ServerGameState; reason?: string } {
  const next = cloneState(state);
  next.currentTurn = getOpponent(playerId);
  next.moveRound++;
  return { valid: true, state: next };
}
