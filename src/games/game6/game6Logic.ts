// Game6: Number Link -- Puzzle generation, validation, hint system

import {
  Cell,
  Grid,
  PuzzleData,
  Game6State,
  Difficulty,
  GameMode,
  DifficultyConfig,
  DIFFICULTY_CONFIGS,
  SCORE_TABLE,
} from './game6Types';

// ============================================================
// Random helpers
// ============================================================

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ============================================================
// Puzzle generation
// ============================================================

/**
 * Generate a complete 3x3 grid where every row and column sums to `target`,
 * using numbers within [min, max].
 *
 * Strategy: fill row-by-row with backtracking.
 */
function generateFullGrid(config: DifficultyConfig): number[] | null {
  const { numberRange, target } = config;
  const [min, max] = numberRange;
  const grid = new Array(9).fill(0);

  function colSum(col: number, upToRow: number): number {
    let s = 0;
    for (let r = 0; r <= upToRow; r++) s += grid[r * 3 + col];
    return s;
  }

  function solve(idx: number): boolean {
    if (idx === 9) {
      // Verify all column sums
      for (let c = 0; c < 3; c++) {
        if (colSum(c, 2) !== target) return false;
      }
      return true;
    }

    const row = Math.floor(idx / 3);
    const col = idx % 3;

    // Determine usable range
    const rowUsed = col > 0
      ? grid.slice(row * 3, row * 3 + col).reduce((a: number, b: number) => a + b, 0)
      : 0;
    const colUsed = row > 0 ? colSum(col, row - 1) : 0;

    const remainingRowSlots = 2 - col; // slots after this one in the row
    const remainingColSlots = 2 - row;

    // Candidates in shuffled order for variety
    const candidates = shuffle(
      Array.from({ length: max - min + 1 }, (_, i) => i + min)
    );

    for (const v of candidates) {
      const newRowSum = rowUsed + v;
      const newColSum = colUsed + v;

      // Prune: row sum can't exceed target, and remaining slots must be fillable
      if (newRowSum + remainingRowSlots * min > target) continue;
      if (newRowSum + remainingRowSlots * max < target) continue;
      if (newColSum + remainingColSlots * min > target) continue;
      if (newColSum + remainingColSlots * max < target) continue;

      // Last in row must hit target exactly
      if (col === 2 && newRowSum !== target) continue;
      // Last in col must hit target exactly
      if (row === 2 && newColSum !== target) continue;

      grid[idx] = v;
      if (solve(idx + 1)) return true;
      grid[idx] = 0;
    }
    return false;
  }

  // Try up to 10 times with different random orderings
  for (let attempt = 0; attempt < 10; attempt++) {
    grid.fill(0);
    if (solve(0)) return [...grid];
  }
  return null;
}

/**
 * Create a puzzle by generating a full grid then removing cells.
 */
export function generatePuzzle(difficulty: Difficulty): PuzzleData {
  const config = DIFFICULTY_CONFIGS[difficulty];
  let solution = generateFullGrid(config);

  // Fallback: simple known solutions
  if (!solution) {
    if (difficulty === 'easy') {
      solution = [1, 2, 3, 3, 1, 2, 2, 3, 1];
    } else if (difficulty === 'normal') {
      solution = [2, 3, 4, 4, 2, 3, 3, 4, 2];
    } else {
      solution = [4, 5, 6, 6, 4, 5, 5, 6, 4];
    }
  }

  const emptyCount = 9 - config.prefilledCount;
  const indices = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  const emptyIndices = new Set(indices.slice(0, emptyCount));

  const grid: Cell[] = solution.map((v, i) => ({
    value: emptyIndices.has(i) ? 0 : v,
    kind: emptyIndices.has(i) ? 'empty' as const : 'prefilled' as const,
  }));

  return {
    grid: grid as Grid,
    solution,
    target: config.target,
    difficulty,
  };
}

// ============================================================
// Validation
// ============================================================

export function getRowSum(grid: Grid, row: number): number {
  return grid[row * 3].value + grid[row * 3 + 1].value + grid[row * 3 + 2].value;
}

export function getColSum(grid: Grid, col: number): number {
  return grid[col].value + grid[3 + col].value + grid[6 + col].value;
}

export function isGridComplete(grid: Grid): boolean {
  return grid.every(c => c.value > 0);
}

export function getDiagSum(grid: Grid, diag: 'main' | 'anti'): number {
  if (diag === 'main') return grid[0].value + grid[4].value + grid[8].value;
  return grid[2].value + grid[4].value + grid[6].value;
}

export function isGridCorrect(grid: Grid, target: number): boolean {
  if (!isGridComplete(grid)) return false;
  for (let i = 0; i < 3; i++) {
    if (getRowSum(grid, i) !== target) return false;
    if (getColSum(grid, i) !== target) return false;
  }
  if (getDiagSum(grid, 'main') !== target) return false;
  if (getDiagSum(grid, 'anti') !== target) return false;
  return true;
}

// ============================================================
// Hint system
// ============================================================

/** Returns the index of an empty cell to reveal, or -1 if none available. */
export function getHintCell(grid: Grid, solution: number[]): number {
  const emptyCells: number[] = [];
  for (let i = 0; i < 9; i++) {
    if (grid[i].kind === 'empty' && grid[i].value !== solution[i]) {
      emptyCells.push(i);
    }
  }
  if (emptyCells.length === 0) return -1;
  return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

// ============================================================
// State management helpers
// ============================================================

export function createInitialState(mode: GameMode, difficulty: Difficulty): Game6State {
  const puzzle = generatePuzzle(difficulty);
  const timeLimit = mode === 'timeAttack'
    ? SCORE_TABLE.timeAttackTotal
    : DIFFICULTY_CONFIGS[difficulty].timeLimit;

  return {
    puzzle,
    grid: puzzle.grid.map(c => ({ ...c })) as Grid,
    selectedCell: null,
    timeLeft: timeLimit,
    score: 0,
    combo: 1,
    streak: 0,
    lives: SCORE_TABLE.initialLives,
    hintsUsed: 0,
    puzzlesSolved: 0,
    mode,
    phase: 'playing',
    difficulty,
  };
}

export function placeNumber(state: Game6State, cellIndex: number, value: number): Game6State {
  if (state.phase !== 'playing') return state;
  if (cellIndex < 0 || cellIndex > 8) return state;
  if (state.grid[cellIndex].kind === 'prefilled') return state;

  const newGrid = state.grid.map(c => ({ ...c })) as Grid;
  newGrid[cellIndex] = { ...newGrid[cellIndex], value };

  return { ...state, grid: newGrid };
}

export function selectCell(state: Game6State, cellIndex: number): Game6State {
  if (state.phase !== 'playing') return state;
  if (state.grid[cellIndex].kind === 'prefilled') return state;
  return { ...state, selectedCell: cellIndex };
}

export function submitAnswer(state: Game6State): Game6State {
  if (state.phase !== 'playing') return state;
  if (!isGridComplete(state.grid)) return state;

  const correct = isGridCorrect(state.grid, state.puzzle.target);

  if (correct) {
    const baseScore = SCORE_TABLE[state.difficulty];
    const timeBonus = state.timeLeft * SCORE_TABLE.timeBonusPerSecond;
    const hintPenalty = state.hintsUsed * SCORE_TABLE.hintPenalty;
    const combo = Math.min(state.streak + 1, SCORE_TABLE.maxCombo);
    const earned = Math.max(0, (baseScore + timeBonus - hintPenalty) * combo);

    return {
      ...state,
      phase: 'correct',
      score: state.score + earned,
      combo,
      streak: state.streak + 1,
      puzzlesSolved: state.puzzlesSolved + 1,
    };
  } else {
    const newLives = state.mode === 'puzzle' ? state.lives - 1 : state.lives;
    const phase = newLives <= 0 ? 'gameover' : 'wrong';
    return {
      ...state,
      phase,
      lives: newLives,
      combo: 1,
      streak: 0,
    };
  }
}

export function useHint(state: Game6State): Game6State {
  if (state.phase !== 'playing') return state;
  if (state.hintsUsed >= SCORE_TABLE.maxHintsPerPuzzle) return state;

  const idx = getHintCell(state.grid, state.puzzle.solution);
  if (idx === -1) return state;

  const newGrid = state.grid.map(c => ({ ...c })) as Grid;
  newGrid[idx] = { value: state.puzzle.solution[idx], kind: 'prefilled' };

  return {
    ...state,
    grid: newGrid,
    hintsUsed: state.hintsUsed + 1,
  };
}

export function advanceToNextPuzzle(state: Game6State): Game6State {
  // Difficulty progression: after every 3 solves, increase difficulty
  let nextDifficulty = state.difficulty;
  if (state.puzzlesSolved % 3 === 0 && state.puzzlesSolved > 0) {
    if (nextDifficulty === 'easy') nextDifficulty = 'normal';
    else if (nextDifficulty === 'normal') nextDifficulty = 'hard';
  }

  const puzzle = generatePuzzle(nextDifficulty);

  const timeLeft = state.mode === 'timeAttack'
    ? state.timeLeft + SCORE_TABLE.timeAttackBonus[state.difficulty]
    : DIFFICULTY_CONFIGS[nextDifficulty].timeLimit;

  return {
    ...state,
    puzzle,
    grid: puzzle.grid.map(c => ({ ...c })) as Grid,
    selectedCell: null,
    timeLeft,
    hintsUsed: 0,
    phase: 'playing',
    difficulty: nextDifficulty,
  };
}

export function tickTimer(state: Game6State): Game6State {
  if (state.phase !== 'playing') return state;
  const newTime = state.timeLeft - 1;
  if (newTime <= 0) {
    return { ...state, timeLeft: 0, phase: 'gameover' };
  }
  return { ...state, timeLeft: newTime };
}
