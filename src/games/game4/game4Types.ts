// ============================================================
// Game4: パタパタ (Mancala) — Types
// ============================================================

/** Player identifier */
export type Player = 'A' | 'B';

/** Difficulty for CPU */
export type Difficulty = 'normal' | 'hard';

/** Game phase */
export type GamePhase = 'ready' | 'playing' | 'sowing' | 'finished';

/**
 * Board layout (indices):
 *
 *        [B1:0] [B2:1] [B3:2]
 *  [PIT_L]                     [PIT_R]
 *        [A1:0] [A2:1] [A3:2]
 *
 * Circulation (Player A perspective):
 *   A1 -> A2 -> A3 -> PIT_R -> B3 -> B2 -> B1 -> PIT_L -> A1 ...
 *
 * Circulation (Player B perspective):
 *   B1 -> B2 -> B3 -> PIT_L -> A3 -> A2 -> A1 -> PIT_R -> B1 ...
 */

/** The 6 pits (3 per side) + 2 shared goal pits */
export interface BoardState {
  /** Player A pits: [A1, A2, A3] */
  a: [number, number, number];
  /** Player B pits: [B1, B2, B3] */
  b: [number, number, number];
  /** Left shared pit */
  pitL: number;
  /** Right shared pit */
  pitR: number;
}

/** A single step in the sowing animation */
export interface SowStep {
  /** Target location identifier */
  target: 'a0' | 'a1' | 'a2' | 'b0' | 'b1' | 'b2' | 'pitL' | 'pitR';
  /** Board snapshot after this coin is placed */
  boardAfter: BoardState;
}

/** Result of a sow operation */
export interface SowResult {
  /** Final board state */
  board: BoardState;
  /** Whether the current player gets an extra turn */
  extraTurn: boolean;
  /** Animation steps */
  steps: SowStep[];
}

/** Full game state */
export interface Game4State {
  board: BoardState;
  currentPlayer: Player;
  phase: GamePhase;
  winner: Player | 'draw' | null;
  /** Mode: cpu or local (2-player) */
  mode: 'cpu' | 'local';
  /** CPU difficulty (only relevant in cpu mode) */
  difficulty: Difficulty;
  /** Which side is the human player (cpu mode) */
  humanSide: Player;
  /** Message to display (e.g. "もう一回!") */
  message: string | null;
}

/** Initial board configuration */
export const INITIAL_PITS: [number, number, number] = [4, 3, 2];

export function createInitialBoard(): BoardState {
  return {
    a: [...INITIAL_PITS] as [number, number, number],
    b: [2, 3, 4], // mirror: B1=2, B2=3, B3=4
    pitL: 0,
    pitR: 0,
  };
}

export function createInitialState(
  mode: 'cpu' | 'local',
  difficulty: Difficulty = 'normal',
  humanSide: Player = 'A',
): Game4State {
  return {
    board: createInitialBoard(),
    currentPlayer: 'A',
    phase: 'playing',
    winner: null,
    mode,
    difficulty,
    humanSide,
    message: null,
  };
}
