// Game6: Number Link -- Types

export type Difficulty = 'easy' | 'normal' | 'hard';

export type GameMode = 'puzzle' | 'timeAttack';

export type CellKind = 'prefilled' | 'empty';

export interface Cell {
  /** Current value (0 = not yet filled) */
  value: number;
  /** Whether this cell was given as a hint */
  kind: CellKind;
}

/** 3x3 grid represented as a flat array of 9 cells (row-major) */
export type Grid = [Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell];

export interface PuzzleData {
  /** The puzzle the player sees (some cells empty) */
  grid: Grid;
  /** The complete solution grid */
  solution: number[];
  /** Target sum for each row and column */
  target: number;
  /** Difficulty of this puzzle */
  difficulty: Difficulty;
}

export interface Game6State {
  /** Current puzzle */
  puzzle: PuzzleData;
  /** Player's working grid */
  grid: Grid;
  /** Currently selected cell index (0-8) or null */
  selectedCell: number | null;
  /** Remaining time in seconds */
  timeLeft: number;
  /** Current score */
  score: number;
  /** Score multiplier (1-3) */
  combo: number;
  /** Consecutive correct solves */
  streak: number;
  /** Remaining lives (Puzzle Mode only) */
  lives: number;
  /** Hints used this puzzle */
  hintsUsed: number;
  /** Total puzzles solved this session */
  puzzlesSolved: number;
  /** Game mode */
  mode: GameMode;
  /** Phase of the game */
  phase: 'playing' | 'correct' | 'wrong' | 'gameover';
  /** Current difficulty (can progress) */
  difficulty: Difficulty;
}

// --- Config ---

export interface DifficultyConfig {
  numberRange: [number, number]; // min, max
  target: number;
  prefilledCount: number; // how many cells are pre-filled
  timeLimit: number; // seconds
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: { numberRange: [1, 3], target: 6, prefilledCount: 5, timeLimit: 60 },
  normal: { numberRange: [1, 5], target: 9, prefilledCount: 4, timeLimit: 45 },
  hard: { numberRange: [1, 9], target: 15, prefilledCount: 3, timeLimit: 30 },
};

export const SCORE_TABLE = {
  easy: 100,
  normal: 200,
  hard: 400,
  timeBonusPerSecond: 5,
  hintPenalty: 50,
  maxCombo: 3,
  maxHintsPerPuzzle: 2,
  timeAttackBonus: { easy: 10, normal: 15, hard: 20 },
  timeAttackTotal: 120,
  initialLives: 3,
} as const;
