/**
 * Playtest simulation for Games 4, 5, and 6
 * Runs full game simulations to find bugs, infinite loops, and illegal states.
 */

// ============================================================
// Game 4: Mancala (パタパタ)
// ============================================================

import {
  BoardState,
  Player as G4Player,
  createInitialBoard as g4CreateBoard,
} from '../src/games/game4/game4Types';
import {
  sowSeeds,
  checkWinner as g4CheckWinner,
  getValidPits,
  opponent as g4Opponent,
  cloneBoard as g4CloneBoard,
} from '../src/games/game4/game4Logic';
import { getAIMove as g4GetAIMove } from '../src/games/game4/game4AI';

// ============================================================
// Game 5: Mini Shogi (日月の戦い)
// ============================================================

import {
  Game5State,
  Side,
  Action,
  PieceType,
  MOVE_DELTAS,
} from '../src/games/game5/game5Types';
import {
  createInitialState as g5CreateState,
  getAllLegalActions,
  movePiece,
  dropPiece,
  isInCheck,
  isCheckmate,
  getValidMoves,
} from '../src/games/game5/game5Logic';
import { getAIMove as g5GetAIMove } from '../src/games/game5/game5AI';

// ============================================================
// Game 6: Number Link Puzzle
// ============================================================

import {
  Difficulty as G6Difficulty,
  Grid,
  DIFFICULTY_CONFIGS,
} from '../src/games/game6/game6Types';
import {
  generatePuzzle,
  isGridCorrect,
  isGridComplete,
  getRowSum,
  getColSum,
  submitAnswer,
  placeNumber,
  createInitialState as g6CreateState,
} from '../src/games/game6/game6Logic';

// ============================================================
// Helper: total seeds on a Mancala board
// ============================================================

function totalSeeds(board: BoardState): number {
  return (
    board.a[0] + board.a[1] + board.a[2] +
    board.b[0] + board.b[1] + board.b[2] +
    board.pitL + board.pitR
  );
}

function hasNegativeSeeds(board: BoardState): boolean {
  return (
    board.a[0] < 0 || board.a[1] < 0 || board.a[2] < 0 ||
    board.b[0] < 0 || board.b[1] < 0 || board.b[2] < 0 ||
    board.pitL < 0 || board.pitR < 0
  );
}

// ============================================================
// Game 4 Tests
// ============================================================

describe('Game4: Mancala (パタパタ) — Full Playtest', () => {
  const TOTAL_GAMES = 10;
  const MAX_TURNS = 200;

  function playOneGame(gameIndex: number, difficulty: 'normal' | 'hard') {
    let board = g4CreateBoard();
    let currentPlayer: G4Player = 'A';
    const initialTotal = totalSeeds(board);
    let turnCount = 0;
    let winner: G4Player | null = null;

    while (turnCount < MAX_TURNS) {
      // Check invariants every turn
      expect(hasNegativeSeeds(board)).toBe(false);
      expect(totalSeeds(board)).toBe(initialTotal);

      winner = g4CheckWinner(board);
      if (winner !== null) break;

      const validPits = getValidPits(board, currentPlayer);
      if (validPits.length === 0) {
        // No valid moves means game should be over
        break;
      }

      let chosenPit: number;
      if (currentPlayer === 'A') {
        // Player A picks random valid pit
        chosenPit = validPits[Math.floor(Math.random() * validPits.length)];
      } else {
        // CPU uses AI
        chosenPit = g4GetAIMove(board, currentPlayer, difficulty);
        expect(validPits).toContain(chosenPit);
      }

      const result = sowSeeds(board, currentPlayer, chosenPit);
      board = result.board;

      // Verify extra turn: only if last seed landed in own pit
      if (result.extraTurn) {
        // Extra turn: same player goes again
        // (currentPlayer stays the same)
      } else {
        currentPlayer = g4Opponent(currentPlayer);
      }

      turnCount++;
    }

    // Game should terminate within MAX_TURNS
    expect(turnCount).toBeLessThan(MAX_TURNS);

    // Final invariants
    expect(hasNegativeSeeds(board)).toBe(false);
    expect(totalSeeds(board)).toBe(initialTotal);

    // Game should be over: at least one side must be empty
    const finalWinner = g4CheckWinner(board);
    if (finalWinner !== null) {
      const aEmpty = board.a[0] + board.a[1] + board.a[2] === 0;
      const bEmpty = board.b[0] + board.b[1] + board.b[2] === 0;
      expect(aEmpty || bEmpty).toBe(true);
    }

    return { turnCount, winner: finalWinner };
  }

  it('should complete 10 games vs normal AI without crashes or illegal states', () => {
    const results: { turnCount: number; winner: G4Player | null }[] = [];
    for (let i = 0; i < TOTAL_GAMES; i++) {
      const r = playOneGame(i, 'normal');
      results.push(r);
    }
    // All games should have a winner
    for (const r of results) {
      expect(r.winner).not.toBeNull();
    }
    console.log('Game4 normal results:', results.map(r => `${r.winner} in ${r.turnCount} turns`));
  });

  it('should complete 10 games vs hard AI without crashes or illegal states', () => {
    const results: { turnCount: number; winner: G4Player | null }[] = [];
    for (let i = 0; i < TOTAL_GAMES; i++) {
      const r = playOneGame(i, 'hard');
      results.push(r);
    }
    for (const r of results) {
      expect(r.winner).not.toBeNull();
    }
    console.log('Game4 hard results:', results.map(r => `${r.winner} in ${r.turnCount} turns`));
  });

  it('extra turn should only occur when last seed lands in own pit', () => {
    // Run a focused test: manually check every sow
    for (let trial = 0; trial < 20; trial++) {
      let board = g4CreateBoard();
      const player: G4Player = trial % 2 === 0 ? 'A' : 'B';
      const validPits = getValidPits(board, player);
      if (validPits.length === 0) continue;

      const pit = validPits[Math.floor(Math.random() * validPits.length)];
      const result = sowSeeds(board, player, pit);

      if (result.extraTurn) {
        // The last step should be the player's own pit
        const lastStep = result.steps[result.steps.length - 1];
        const ownPit = player === 'A' ? 'pitR' : 'pitL';
        expect(lastStep.target).toBe(ownPit);
      }
    }
  });

  it('should maintain constant total seeds throughout entire game', () => {
    let board = g4CreateBoard();
    const initialTotal = totalSeeds(board);
    let currentPlayer: G4Player = 'A';

    for (let turn = 0; turn < 100; turn++) {
      const winner = g4CheckWinner(board);
      if (winner !== null) break;

      const validPits = getValidPits(board, currentPlayer);
      if (validPits.length === 0) break;

      const pit = validPits[Math.floor(Math.random() * validPits.length)];
      const result = sowSeeds(board, currentPlayer, pit);
      board = result.board;

      // Check after every single move
      const currentTotal = totalSeeds(board);
      expect(currentTotal).toBe(initialTotal);

      if (!result.extraTurn) {
        currentPlayer = g4Opponent(currentPlayer);
      }
    }
  });
});

// ============================================================
// Game 5 Tests
// ============================================================

describe('Game5: Mini Shogi (日月の戦い) — Full Playtest', () => {
  const TOTAL_GAMES = 10;
  const MAX_TURNS = 300;

  function countPieces(state: Game5State): number {
    let count = 0;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (state.board[r][c] !== null) count++;
      }
    }
    count += state.sunHand.length;
    count += state.moonHand.length;
    return count;
  }

  function applyAction(state: Game5State, action: Action): Game5State {
    if (action.kind === 'move') {
      return movePiece(state, action.from, action.to);
    } else {
      return dropPiece(state, action.piece, action.to);
    }
  }

  function playOneGame(gameIndex: number) {
    let state = g5CreateState();
    const initialPieceCount = countPieces(state); // should be 6
    let turnCount = 0;

    while (state.phase !== 'gameover' && turnCount < MAX_TURNS) {
      // Invariant: piece count should be constant (no duplication or disappearance)
      const currentPieceCount = countPieces(state);
      expect(currentPieceCount).toBe(initialPieceCount);

      // Both kings should be on the board (unless game is over)
      let sunKingFound = false;
      let moonKingFound = false;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const cell = state.board[r][c];
          if (cell && cell.type === 'king' && cell.side === 'sun') sunKingFound = true;
          if (cell && cell.type === 'king' && cell.side === 'moon') moonKingFound = true;
        }
      }
      expect(sunKingFound).toBe(true);
      expect(moonKingFound).toBe(true);

      const side = state.turn;
      const actions = getAllLegalActions(state, side);

      if (actions.length === 0) {
        // Should be checkmate or stalemate
        break;
      }

      let action: Action;
      if (side === 'sun') {
        // Player picks random legal move
        action = actions[Math.floor(Math.random() * actions.length)];
      } else {
        // CPU uses normal AI
        action = g5GetAIMove(state, side, 'normal');
      }

      // Verify the chosen action is legal
      const isLegal = actions.some(a => {
        if (a.kind !== action.kind) return false;
        if (a.kind === 'move' && action.kind === 'move') {
          return a.from.row === action.from.row && a.from.col === action.from.col &&
                 a.to.row === action.to.row && a.to.col === action.to.col;
        }
        if (a.kind === 'drop' && action.kind === 'drop') {
          return a.piece === action.piece && a.to.row === action.to.row && a.to.col === action.to.col;
        }
        return false;
      });
      expect(isLegal).toBe(true);

      state = applyAction(state, action);
      turnCount++;
    }

    expect(turnCount).toBeLessThan(MAX_TURNS);

    return {
      turnCount,
      winner: state.winner,
      finalPieceCount: countPieces(state),
    };
  }

  it('should complete 10 games without crashes or illegal states', () => {
    const results: { turnCount: number; winner: Side | 'draw' | null }[] = [];
    for (let i = 0; i < TOTAL_GAMES; i++) {
      const r = playOneGame(i);
      results.push(r);
      // Piece count should be 6 (3 per side: king, fire, water)
      expect(r.finalPieceCount).toBe(6);
    }
    console.log('Game5 results:', results.map(r => `${r.winner} in ${r.turnCount} turns`));
  });

  it('pieces should move according to their rules', () => {
    const state = g5CreateState();
    // Sun king at (0,1) should have up to 8 directions (within bounds)
    const kingMoves = getValidMoves(state.board, { row: 0, col: 1 });
    // King at (0,1) can move to: (1,0), (1,1), (1,2) - row 1 cells
    // Can't go to row -1 (out of bounds) or own pieces at (0,0) and (0,2)
    for (const move of kingMoves) {
      expect(move.row).toBeGreaterThanOrEqual(0);
      expect(move.row).toBeLessThanOrEqual(2);
      expect(move.col).toBeGreaterThanOrEqual(0);
      expect(move.col).toBeLessThanOrEqual(2);
    }

    // Sun fire at (0,0) moves diagonally: (1,1) only within bounds and not blocked by own
    const fireMoves = getValidMoves(state.board, { row: 0, col: 0 });
    for (const move of fireMoves) {
      // Fire moves diagonally: |dr|=1 and |dc|=1
      const dr = Math.abs(move.row - 0);
      const dc = Math.abs(move.col - 0);
      expect(dr).toBe(1);
      expect(dc).toBe(1);
    }

    // Sun water at (0,2) moves vertically: (1,2) only
    const waterMoves = getValidMoves(state.board, { row: 0, col: 2 });
    for (const move of waterMoves) {
      // Water moves vertically: dc=0, |dr|=1
      const dc = Math.abs(move.col - 2);
      expect(dc).toBe(0);
      const dr = Math.abs(move.row - 0);
      expect(dr).toBe(1);
    }
  });

  it('capture should add piece to hand (except king)', () => {
    // Set up a state where sun fire can capture moon water
    let state = g5CreateState();
    // Move sun fire (0,0) to (1,1) first
    state = movePiece(state, { row: 0, col: 0 }, { row: 1, col: 1 });
    // Now it's moon's turn. Let's check if moon captures at (1,1)
    // Moon fire at (2,0) can move diagonally to (1,1) to capture sun fire
    const moonActions = getAllLegalActions(state, 'moon');
    const captureAction = moonActions.find(a =>
      a.kind === 'move' && a.to.row === 1 && a.to.col === 1
    );

    if (captureAction && captureAction.kind === 'move') {
      const prevMoonHand = [...state.moonHand];
      const captured = state.board[1][1];
      const newState = movePiece(state, captureAction.from, captureAction.to);

      if (captured && captured.type !== 'king') {
        // Moon's hand should have one more piece
        expect(newState.moonHand.length).toBe(prevMoonHand.length + 1);
        expect(newState.moonHand).toContain(captured.type);
      }
    }
  });

  it('check detection should work correctly', () => {
    const state = g5CreateState();
    // Initial position should not be in check
    expect(isInCheck(state.board, 'sun')).toBe(false);
    expect(isInCheck(state.board, 'moon')).toBe(false);
  });

  /**
   * BUG FOUND: Normal AI aggressively captures both non-king pieces,
   * leading to stalemate (draw) after only 4 moves in nearly every game.
   *
   * Reproduction:
   *   1. Sun moves fire/water to center row
   *   2. Moon AI (capture-priority) captures each piece immediately
   *   3. After 4 moves, sun has only king left with no hand pieces
   *   4. Moon's fire+water+king cover all cells adjacent to sun king
   *   5. Sun is stalemated (no legal moves, not in check) -> draw
   *
   * This is a gameplay/design bug: the AI should avoid creating
   * stalemates when it could pursue checkmate instead.
   */
  it('stalemate position does NOT end game (CEO指示: no stalemate/draw)', () => {
    let state = g5CreateState();

    // Sun moves fire to center
    state = movePiece(state, { row: 0, col: 0 }, { row: 1, col: 1 });
    // Moon AI captures it
    state = movePiece(state, { row: 2, col: 0 }, { row: 1, col: 1 });
    // Sun moves water to center-right
    state = movePiece(state, { row: 0, col: 2 }, { row: 1, col: 2 });
    // Moon AI captures it
    state = movePiece(state, { row: 2, col: 2 }, { row: 1, col: 2 });

    // Board: __ sk __ / __ mf mw / __ mk __
    // Sun king at (0,1) has no board moves but can drop captured pieces,
    // and stalemate detection is intentionally disabled per CEO指示
    expect(state.winner).toBe(null);
    expect(state.phase).not.toBe('gameover');
    // Sun can still drop captured pieces, so has legal actions
    expect(getAllLegalActions(state, 'sun').length).toBeGreaterThan(0);
    // Sun IS in check from moon's pieces — but not checkmated (can drop to block/escape)
    expect(isInCheck(state.board, 'sun')).toBe(true);
  });
});

// ============================================================
// Game 6 Tests
// ============================================================

describe('Game6: Number Link Puzzle — Full Playtest', () => {
  const PUZZLES_PER_DIFFICULTY = 10;

  function testDifficulty(difficulty: G6Difficulty) {
    const config = DIFFICULTY_CONFIGS[difficulty];

    for (let i = 0; i < PUZZLES_PER_DIFFICULTY; i++) {
      const puzzle = generatePuzzle(difficulty);

      // Verify solution exists and is valid
      expect(puzzle.solution).toHaveLength(9);
      expect(puzzle.target).toBe(config.target);

      // Verify solution row sums
      for (let row = 0; row < 3; row++) {
        const rowSum = puzzle.solution[row * 3] + puzzle.solution[row * 3 + 1] + puzzle.solution[row * 3 + 2];
        expect(rowSum).toBe(config.target);
      }

      // Verify solution column sums
      for (let col = 0; col < 3; col++) {
        const colSum = puzzle.solution[col] + puzzle.solution[3 + col] + puzzle.solution[6 + col];
        expect(colSum).toBe(config.target);
      }

      // Verify all solution values are within range
      const [min, max] = config.numberRange;
      for (const v of puzzle.solution) {
        expect(v).toBeGreaterThanOrEqual(min);
        expect(v).toBeLessThanOrEqual(max);
      }

      // Count prefilled cells
      const prefilledCount = puzzle.grid.filter(c => c.kind === 'prefilled').length;
      expect(prefilledCount).toBe(config.prefilledCount);

      // Verify prefilled cells match solution
      for (let j = 0; j < 9; j++) {
        if (puzzle.grid[j].kind === 'prefilled') {
          expect(puzzle.grid[j].value).toBe(puzzle.solution[j]);
        } else {
          expect(puzzle.grid[j].value).toBe(0);
        }
      }
    }
  }

  it('should generate 10 valid easy puzzles', () => {
    testDifficulty('easy');
  });

  it('should generate 10 valid normal puzzles', () => {
    testDifficulty('normal');
  });

  it('should generate 10 valid hard puzzles', () => {
    testDifficulty('hard');
  });

  it('submitting the correct solution should be detected as correct', () => {
    for (const difficulty of ['easy', 'normal', 'hard'] as G6Difficulty[]) {
      const puzzle = generatePuzzle(difficulty);
      let state = g6CreateState('puzzle', difficulty);
      // Override with our known puzzle
      state = { ...state, puzzle, grid: puzzle.grid.map(c => ({ ...c })) as Grid };

      // Fill in all empty cells with the solution
      for (let i = 0; i < 9; i++) {
        if (state.grid[i].kind === 'empty') {
          state = placeNumber(state, i, puzzle.solution[i]);
        }
      }

      // Grid should be complete
      expect(isGridComplete(state.grid)).toBe(true);

      // Grid should be correct
      expect(isGridCorrect(state.grid, puzzle.target)).toBe(true);

      // Submit should mark as correct
      const result = submitAnswer(state);
      expect(result.phase).toBe('correct');
    }
  });

  it('submitting a wrong solution should be detected as wrong', () => {
    const puzzle = generatePuzzle('easy');
    let state = g6CreateState('puzzle', 'easy');
    state = { ...state, puzzle, grid: puzzle.grid.map(c => ({ ...c })) as Grid };

    // Fill all empty cells with value 1 (likely wrong)
    for (let i = 0; i < 9; i++) {
      if (state.grid[i].kind === 'empty') {
        state = placeNumber(state, i, 1);
      }
    }

    if (isGridComplete(state.grid)) {
      const result = submitAnswer(state);
      // Should be wrong or correct (if accidentally right with all 1s and target 3, unlikely but possible)
      if (!isGridCorrect(state.grid, puzzle.target)) {
        expect(result.phase).toBe('wrong');
      }
    }
  });

  it('row and column sums should match target for correct solution grid', () => {
    for (const difficulty of ['easy', 'normal', 'hard'] as G6Difficulty[]) {
      const config = DIFFICULTY_CONFIGS[difficulty];
      const puzzle = generatePuzzle(difficulty);

      // Create a grid with the full solution
      const fullGrid: Grid = puzzle.solution.map(v => ({
        value: v,
        kind: 'prefilled' as const,
      })) as Grid;

      for (let r = 0; r < 3; r++) {
        expect(getRowSum(fullGrid, r)).toBe(config.target);
      }
      for (let c = 0; c < 3; c++) {
        expect(getColSum(fullGrid, c)).toBe(config.target);
      }
    }
  });

  it('should handle filling and clearing cells properly', () => {
    const puzzle = generatePuzzle('normal');
    let state = g6CreateState('puzzle', 'normal');
    state = { ...state, puzzle, grid: puzzle.grid.map(c => ({ ...c })) as Grid };

    // Try to place a number on a prefilled cell (should be rejected)
    const prefilledIdx = state.grid.findIndex(c => c.kind === 'prefilled');
    if (prefilledIdx !== -1) {
      const before = state.grid[prefilledIdx].value;
      const after = placeNumber(state, prefilledIdx, 9);
      expect(after.grid[prefilledIdx].value).toBe(before);
    }

    // Place a number on an empty cell
    const emptyIdx = state.grid.findIndex(c => c.kind === 'empty');
    if (emptyIdx !== -1) {
      const newState = placeNumber(state, emptyIdx, 5);
      expect(newState.grid[emptyIdx].value).toBe(5);
    }

    // Invalid cell index should be rejected
    const outOfBounds = placeNumber(state, 9, 5);
    expect(outOfBounds).toBe(state); // unchanged
    const negative = placeNumber(state, -1, 5);
    expect(negative).toBe(state); // unchanged
  });
});
