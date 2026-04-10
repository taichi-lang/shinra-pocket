import {
  Difficulty,
  GameMode,
  Cell,
  Grid,
  PuzzleData,
  Game6State,
  DIFFICULTY_CONFIGS,
  SCORE_TABLE,
} from '../src/games/game6/game6Types';
import {
  generatePuzzle,
  getRowSum,
  getColSum,
  isGridComplete,
  isGridCorrect,
  getHintCell,
  createInitialState,
  placeNumber,
  selectCell,
  submitAnswer,
  useHint,
  advanceToNextPuzzle,
  tickTimer,
} from '../src/games/game6/game6Logic';

// ============================================================
// Helpers
// ============================================================

/** Create a solved grid from a flat number array */
function makeGrid(values: number[], kind: 'prefilled' | 'empty' = 'prefilled'): Grid {
  return values.map(v => ({ value: v, kind })) as Grid;
}

// ============================================================
// 1. Puzzle Generation
// ============================================================
describe('generatePuzzle', () => {
  it('generates a valid easy puzzle', () => {
    const puzzle = generatePuzzle('easy');
    expect(puzzle.solution).toHaveLength(9);
    expect(puzzle.grid).toHaveLength(9);
    expect(puzzle.target).toBe(DIFFICULTY_CONFIGS.easy.target);
  });

  it('generates a valid normal puzzle', () => {
    const puzzle = generatePuzzle('normal');
    expect(puzzle.target).toBe(DIFFICULTY_CONFIGS.normal.target);
  });

  it('generates a valid hard puzzle', () => {
    const puzzle = generatePuzzle('hard');
    expect(puzzle.target).toBe(DIFFICULTY_CONFIGS.hard.target);
  });

  it('solution has correct row and column sums', () => {
    const puzzle = generatePuzzle('easy');
    const sol = puzzle.solution;
    const target = puzzle.target;
    // Check rows
    expect(sol[0] + sol[1] + sol[2]).toBe(target);
    expect(sol[3] + sol[4] + sol[5]).toBe(target);
    expect(sol[6] + sol[7] + sol[8]).toBe(target);
    // Check columns
    expect(sol[0] + sol[3] + sol[6]).toBe(target);
    expect(sol[1] + sol[4] + sol[7]).toBe(target);
    expect(sol[2] + sol[5] + sol[8]).toBe(target);
  });

  it('has the correct number of prefilled cells', () => {
    const puzzle = generatePuzzle('easy');
    const prefilledCount = puzzle.grid.filter(c => c.kind === 'prefilled').length;
    expect(prefilledCount).toBe(DIFFICULTY_CONFIGS.easy.prefilledCount);
  });

  it('empty cells have value 0', () => {
    const puzzle = generatePuzzle('normal');
    for (const cell of puzzle.grid) {
      if (cell.kind === 'empty') {
        expect(cell.value).toBe(0);
      }
    }
  });

  it('prefilled cells match solution values', () => {
    const puzzle = generatePuzzle('easy');
    for (let i = 0; i < 9; i++) {
      if (puzzle.grid[i].kind === 'prefilled') {
        expect(puzzle.grid[i].value).toBe(puzzle.solution[i]);
      }
    }
  });
});

// ============================================================
// 2. Answer Validation
// ============================================================
describe('validation helpers', () => {
  it('getRowSum computes correctly', () => {
    const grid = makeGrid([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(getRowSum(grid, 0)).toBe(6);
    expect(getRowSum(grid, 1)).toBe(15);
    expect(getRowSum(grid, 2)).toBe(24);
  });

  it('getColSum computes correctly', () => {
    const grid = makeGrid([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(getColSum(grid, 0)).toBe(12);
    expect(getColSum(grid, 1)).toBe(15);
    expect(getColSum(grid, 2)).toBe(18);
  });

  it('isGridComplete returns false when any cell is 0', () => {
    const grid = makeGrid([1, 2, 3, 4, 0, 6, 7, 8, 9]);
    expect(isGridComplete(grid)).toBe(false);
  });

  it('isGridComplete returns true when all cells filled', () => {
    const grid = makeGrid([2, 1, 3, 3, 2, 1, 1, 3, 2]);
    expect(isGridComplete(grid)).toBe(true);
  });

  it('isGridCorrect returns true for valid solved grid', () => {
    // target = 6: rows, cols, and diagonals all sum to 6
    const grid = makeGrid([2, 1, 3, 3, 2, 1, 1, 3, 2]);
    expect(isGridCorrect(grid, 6)).toBe(true);
  });

  it('isGridCorrect returns false for incorrect grid', () => {
    const grid = makeGrid([1, 2, 3, 3, 1, 2, 2, 3, 2]); // last row = 7
    expect(isGridCorrect(grid, 6)).toBe(false);
  });

  it('isGridCorrect returns false for incomplete grid', () => {
    const grid = makeGrid([1, 2, 3, 3, 1, 2, 2, 3, 0]);
    expect(isGridCorrect(grid, 6)).toBe(false);
  });
});

// ============================================================
// 3. Scoring (submitAnswer)
// ============================================================
describe('submitAnswer', () => {
  it('awards score for correct answer', () => {
    const state = createInitialState('puzzle', 'easy');
    // Use a known magic-square solution with correct diagonals (target=6)
    const magicSolution = [2, 1, 3, 3, 2, 1, 1, 3, 2];
    const magicPuzzle = { ...state.puzzle, solution: magicSolution, target: 6 };
    const filledState: Game6State = {
      ...state,
      puzzle: magicPuzzle,
      grid: magicSolution.map(v => ({ value: v, kind: 'empty' as const })) as Grid,
    };
    const result = submitAnswer(filledState);
    expect(result.phase).toBe('correct');
    expect(result.score).toBeGreaterThan(0);
    expect(result.puzzlesSolved).toBe(1);
    expect(result.streak).toBe(1);
  });

  it('deducts a life for wrong answer in puzzle mode', () => {
    const state = createInitialState('puzzle', 'easy');
    const wrongGrid = makeGrid([9, 9, 9, 9, 9, 9, 9, 9, 9], 'empty');
    const filledState: Game6State = { ...state, grid: wrongGrid };
    const result = submitAnswer(filledState);
    expect(result.phase).toBe('wrong');
    expect(result.lives).toBe(SCORE_TABLE.initialLives - 1);
    expect(result.streak).toBe(0);
  });

  it('game over when lives reach 0', () => {
    const state = createInitialState('puzzle', 'easy');
    const wrongGrid = makeGrid([9, 9, 9, 9, 9, 9, 9, 9, 9], 'empty');
    const filledState: Game6State = { ...state, grid: wrongGrid, lives: 1 };
    const result = submitAnswer(filledState);
    expect(result.phase).toBe('gameover');
    expect(result.lives).toBe(0);
  });

  it('does not submit when phase is not playing', () => {
    const state = createInitialState('puzzle', 'easy');
    const overState: Game6State = { ...state, phase: 'gameover' };
    const result = submitAnswer(overState);
    expect(result).toEqual(overState);
  });

  it('does not submit incomplete grid', () => {
    const state = createInitialState('puzzle', 'easy');
    // grid has empty cells by default
    const result = submitAnswer(state);
    expect(result).toEqual(state);
  });

  it('applies hint penalty to score', () => {
    const state = createInitialState('puzzle', 'easy');
    // Use a known magic-square solution with correct diagonals (target=6)
    const magicSolution = [2, 1, 3, 3, 2, 1, 1, 3, 2];
    const magicPuzzle = { ...state.puzzle, solution: magicSolution, target: 6 };
    const noHint: Game6State = {
      ...state,
      puzzle: magicPuzzle,
      grid: magicSolution.map(v => ({ value: v, kind: 'empty' as const })) as Grid,
      hintsUsed: 0,
    };
    const withHint: Game6State = { ...noHint, hintsUsed: 2 };

    const resultNoHint = submitAnswer(noHint);
    const resultWithHint = submitAnswer(withHint);
    expect(resultNoHint.score).toBeGreaterThan(resultWithHint.score);
  });
});

// ============================================================
// 4. Difficulty Configs
// ============================================================
describe('difficulty configs', () => {
  it('easy has range [1,3] and target 6', () => {
    const c = DIFFICULTY_CONFIGS.easy;
    expect(c.numberRange).toEqual([1, 3]);
    expect(c.target).toBe(6);
  });

  it('normal has range [1,5] and target 9', () => {
    const c = DIFFICULTY_CONFIGS.normal;
    expect(c.numberRange).toEqual([1, 5]);
    expect(c.target).toBe(9);
  });

  it('hard has range [1,9] and target 15', () => {
    const c = DIFFICULTY_CONFIGS.hard;
    expect(c.numberRange).toEqual([1, 9]);
    expect(c.target).toBe(15);
  });

  it('easy has more prefilled cells than hard', () => {
    expect(DIFFICULTY_CONFIGS.easy.prefilledCount)
      .toBeGreaterThan(DIFFICULTY_CONFIGS.hard.prefilledCount);
  });
});

// ============================================================
// 5. State Management
// ============================================================
describe('placeNumber', () => {
  it('places a number on an empty cell', () => {
    const state = createInitialState('puzzle', 'easy');
    const emptyIdx = state.grid.findIndex(c => c.kind === 'empty');
    if (emptyIdx >= 0) {
      const newState = placeNumber(state, emptyIdx, 5);
      expect(newState.grid[emptyIdx].value).toBe(5);
    }
  });

  it('does not overwrite prefilled cells', () => {
    const state = createInitialState('puzzle', 'easy');
    const preIdx = state.grid.findIndex(c => c.kind === 'prefilled');
    if (preIdx >= 0) {
      const newState = placeNumber(state, preIdx, 9);
      expect(newState.grid[preIdx].value).toBe(state.grid[preIdx].value);
    }
  });

  it('ignores invalid indices', () => {
    const state = createInitialState('puzzle', 'easy');
    expect(placeNumber(state, -1, 5)).toEqual(state);
    expect(placeNumber(state, 10, 5)).toEqual(state);
  });
});

describe('selectCell', () => {
  it('selects an empty cell', () => {
    const state = createInitialState('puzzle', 'easy');
    const emptyIdx = state.grid.findIndex(c => c.kind === 'empty');
    if (emptyIdx >= 0) {
      const newState = selectCell(state, emptyIdx);
      expect(newState.selectedCell).toBe(emptyIdx);
    }
  });

  it('does not select prefilled cell', () => {
    const state = createInitialState('puzzle', 'easy');
    const preIdx = state.grid.findIndex(c => c.kind === 'prefilled');
    if (preIdx >= 0) {
      const newState = selectCell(state, preIdx);
      expect(newState.selectedCell).toBeNull();
    }
  });
});

// ============================================================
// 6. Hint System
// ============================================================
describe('getHintCell', () => {
  it('returns index of a cell that needs filling', () => {
    const puzzle = generatePuzzle('easy');
    const idx = getHintCell(puzzle.grid, puzzle.solution);
    if (idx >= 0) {
      expect(puzzle.grid[idx].kind).toBe('empty');
    }
  });

  it('returns -1 when all cells are correct', () => {
    const solution = [2, 1, 3, 3, 2, 1, 1, 3, 2];
    const grid = solution.map(v => ({ value: v, kind: 'empty' as const })) as Grid;
    expect(getHintCell(grid, solution)).toBe(-1);
  });
});

describe('useHint', () => {
  it('fills one empty cell and increments hintsUsed', () => {
    const state = createInitialState('puzzle', 'easy');
    const newState = useHint(state);
    expect(newState.hintsUsed).toBe(1);
    // One more prefilled than before
    const prefilledBefore = state.grid.filter(c => c.kind === 'prefilled').length;
    const prefilledAfter = newState.grid.filter(c => c.kind === 'prefilled').length;
    expect(prefilledAfter).toBe(prefilledBefore + 1);
  });

  it('respects max hints per puzzle', () => {
    const state = createInitialState('puzzle', 'easy');
    const maxed: Game6State = { ...state, hintsUsed: SCORE_TABLE.maxHintsPerPuzzle };
    const result = useHint(maxed);
    expect(result.hintsUsed).toBe(SCORE_TABLE.maxHintsPerPuzzle);
  });
});

// ============================================================
// 7. Timer
// ============================================================
describe('tickTimer', () => {
  it('decrements time by 1', () => {
    const state = createInitialState('puzzle', 'easy');
    const newState = tickTimer(state);
    expect(newState.timeLeft).toBe(state.timeLeft - 1);
  });

  it('triggers gameover when time reaches 0', () => {
    const state: Game6State = { ...createInitialState('puzzle', 'easy'), timeLeft: 1 };
    const newState = tickTimer(state);
    expect(newState.timeLeft).toBe(0);
    expect(newState.phase).toBe('gameover');
  });

  it('does nothing when phase is not playing', () => {
    const state: Game6State = { ...createInitialState('puzzle', 'easy'), phase: 'gameover' };
    const newState = tickTimer(state);
    expect(newState.timeLeft).toBe(state.timeLeft);
  });
});

// ============================================================
// 8. advanceToNextPuzzle
// ============================================================
describe('advanceToNextPuzzle', () => {
  it('generates a new puzzle and resets hintsUsed', () => {
    const state = createInitialState('puzzle', 'easy');
    const correct: Game6State = { ...state, phase: 'correct', hintsUsed: 2, puzzlesSolved: 1 };
    const next = advanceToNextPuzzle(correct);
    expect(next.phase).toBe('playing');
    expect(next.hintsUsed).toBe(0);
  });

  it('increases difficulty after 3 solves', () => {
    const state: Game6State = {
      ...createInitialState('puzzle', 'easy'),
      puzzlesSolved: 3,
      difficulty: 'easy',
    };
    const next = advanceToNextPuzzle(state);
    expect(next.difficulty).toBe('normal');
  });
});
