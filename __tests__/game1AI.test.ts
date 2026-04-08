import { CellState } from '../src/game/types';
import {
  checkWin,
  cpuBestPlace,
  cpuBestMove,
  cpuBestPlaceHard,
  cpuBestMoveHard,
} from '../src/game/ai';

// ============================================================
// Helper
// ============================================================
function makeBoard(spec: (string | null)[]): CellState[] {
  return spec.map((v) => {
    if (v === 'P') return 'player';
    if (v === 'C') return 'cpu';
    return null;
  });
}

// ============================================================
// 1. AI takes winning move when available
// ============================================================
describe('cpuBestPlace — takes winning move', () => {
  it('completes a row to win (top row)', () => {
    // CPU has cells 0 and 1, cell 2 is empty -> should pick 2
    const board = makeBoard(['C', 'C', null, 'P', 'P', null, null, null, null]);
    const move = cpuBestPlace(board);
    expect(move).toBe(2);
  });

  it('completes a column to win (left col)', () => {
    // CPU has cells 0 and 3, cell 6 is empty
    const board = makeBoard(['C', 'P', null, 'C', 'P', null, null, null, null]);
    const move = cpuBestPlace(board);
    expect(move).toBe(6);
  });

  it('completes a diagonal to win', () => {
    // CPU has cells 0 and 4, cell 8 is empty
    const board = makeBoard(['C', null, 'P', null, 'C', null, 'P', null, null]);
    const move = cpuBestPlace(board);
    expect(move).toBe(8);
  });
});

// ============================================================
// 2. AI blocks player winning move
// ============================================================
describe('cpuBestPlace — blocks player win', () => {
  it('blocks player from completing top row', () => {
    // Player has 0 and 1, cell 2 empty. CPU has no winning threat.
    const board = makeBoard(['P', 'P', null, 'C', null, null, null, null, 'C']);
    const move = cpuBestPlace(board);
    expect(move).toBe(2);
  });

  it('blocks player from completing diagonal', () => {
    // Player has 0 and 4, cell 8 empty (diagonal 0-4-8)
    const board = makeBoard(['P', null, 'C', null, 'P', null, null, 'C', null]);
    const move = cpuBestPlace(board);
    expect(move).toBe(8);
  });

  it('prioritises own win over blocking', () => {
    // CPU can win at cell 2 (row 0-1-2), player can also win at cell 5 (row 3-4-5)
    // CPU should take its own win first
    const board = makeBoard(['C', 'C', null, 'P', 'P', null, null, null, null]);
    const move = cpuBestPlace(board);
    expect(move).toBe(2); // win > block
  });
});

// ============================================================
// 3. AI prefers center in place phase
// ============================================================
describe('cpuBestPlace — prefers center', () => {
  it('picks center (cell 4) on empty board', () => {
    const board: CellState[] = Array(9).fill(null);
    const move = cpuBestPlace(board);
    expect(move).toBe(4);
  });

  it('picks center when only player has placed one piece elsewhere', () => {
    const board = makeBoard([null, null, null, null, null, null, null, null, 'P']);
    const move = cpuBestPlace(board);
    expect(move).toBe(4);
  });

  it('picks a corner when center is taken', () => {
    const board = makeBoard([null, null, null, null, 'P', null, null, null, null]);
    const move = cpuBestPlace(board);
    expect([0, 2, 6, 8]).toContain(move);
  });
});

// ============================================================
// 4. cpuBestMove — winning move in move phase
// ============================================================
describe('cpuBestMove — finds winning move', () => {
  it('moves CPU piece to complete a line', () => {
    // CPU at 0,4; empty at 8 -> diagonal [0,4,8]
    // ADJACENTS[4] includes 8, so CPU can move 4->8... but that breaks line.
    // Better: CPU at 0,1; empty at 2. ADJACENTS[1] includes 2. Move 1->2 for row [0,1,2]?
    // No: moving 1->2 means 0,_,2 which is not a line with 1 moved.
    // Correct: CPU at 6,4; empty at 2. Move 4->2? ADJACENTS[4] includes 2.
    // After: 6,_,2+CPU -> not a line.
    // Simplest: CPU at 0 and 4; extra CPU at 8-adjacent to move to 8.
    // CPU at 0,4,7; move 7->8 for diagonal [0,4,8]. ADJACENTS[7] includes 8.
    const board = makeBoard([
      'C', null, null,
      null, 'C', null,
      'P', 'C', null,
    ]);
    const move = cpuBestMove([...board]);
    expect(move).not.toBeNull();
    if (move) {
      const [from, to] = move;
      // Simulate move and verify win
      const testBoard = [...board];
      testBoard[to] = 'cpu';
      testBoard[from] = null;
      expect(checkWin(testBoard, 'cpu')).toBe(true);
    }
  });

  it('returns a valid [from, to] pair', () => {
    const board = makeBoard([
      'C', null, 'P',
      null, 'C', null,
      'P', null, 'C',
    ]);
    // CPU already wins on diagonal [0,4,8] — but cpuBestMove works
    // on boards without existing win. Adjust:
    const board2 = makeBoard([
      'C', null, 'P',
      null, 'C', null,
      'P', null, null,
    ]);
    const move = cpuBestMove([...board2]);
    expect(move).not.toBeNull();
    if (move) {
      const [from, to] = move;
      expect(board2[from]).toBe('cpu');
      expect(board2[to]).toBeNull();
    }
  });
});

// ============================================================
// 5. cpuBestMove — blocks player winning move
// ============================================================
describe('cpuBestMove — blocks player win', () => {
  it('moves a CPU piece to block player completing a line', () => {
    // Player at 0,1,6; empty at 2. Player can move 6->3 (ADJACENTS[6] includes 3)
    // but the real threat is: player at 0,1 and 3 is adjacent to player 6.
    // Better: Player at 0,1,5; empty at 2. Player can move 5->2 (ADJACENTS[5] includes 2)
    // giving [0,1,2] win. CPU at 4 is adjacent to 2 (ADJACENTS[4] includes 2), should block.
    const board = makeBoard([
      'P', 'P', null,
      'C', 'C', 'P',
      null, null, 'C',
    ]);
    const move = cpuBestMove([...board]);
    expect(move).not.toBeNull();
    if (move) {
      const [_from, to] = move;
      // CPU should move to cell 2 to block player's 5->2 threat
      expect(to).toBe(2);
    }
  });
});

// ============================================================
// 6. Hard AI — cpuBestPlaceHard
// ============================================================
describe('cpuBestPlaceHard', () => {
  it('returns a valid cell index', () => {
    const board: CellState[] = Array(9).fill(null);
    const move = cpuBestPlaceHard(board, 0, 0);
    expect(move).toBeGreaterThanOrEqual(0);
    expect(move).toBeLessThanOrEqual(8);
    expect(board[move]).toBeNull();
  });

  it('takes winning move immediately', () => {
    // CPU at 0,1, empty at 2
    const board = makeBoard(['C', 'C', null, 'P', 'P', null, null, null, null]);
    const move = cpuBestPlaceHard(board, 2, 2);
    expect(move).toBe(2);
  });

  it('blocks player win when CPU cannot win immediately', () => {
    // Player at 3,4, empty at 5 -> player threatens [3,4,5]
    // CPU has no immediate win
    const board = makeBoard([null, 'C', null, 'P', 'P', null, null, null, 'C']);
    const move = cpuBestPlaceHard(board, 2, 2);
    expect(move).toBe(5);
  });

  it('does not return an occupied cell', () => {
    const board = makeBoard([
      'P', 'C', 'P',
      'C', null, null,
      null, null, null,
    ]);
    const move = cpuBestPlaceHard(board, 2, 2);
    expect(board[move]).toBeNull();
  });
});

// ============================================================
// 7. Hard AI — cpuBestMoveHard
// ============================================================
describe('cpuBestMoveHard', () => {
  it('returns [from, to] pair or null', () => {
    const board = makeBoard([
      'C', null, 'P',
      null, 'C', null,
      'P', null, null,
    ]);
    const move = cpuBestMoveHard([...board]);
    if (move !== null) {
      expect(move).toHaveLength(2);
      const [from, to] = move;
      expect(board[from]).toBe('cpu');
      expect(board[to]).toBeNull();
    }
  });

  it('finds winning move when available', () => {
    // CPU at 4,7 (only 2 pieces), player at 0,1,2,3 (4 pieces).
    // Empty: 5,6,8. CPU can win via 7->8 then later 4->0 for diagonal,
    // but with only 2 CPU pieces, can't win in one move.
    // Instead, test that hard AI returns a valid adjacent move.
    // For a guaranteed-win test: CPU at 0,4 and 7; player fills rest except 8.
    // Board: C,P,P, P,C,P, P,C,null -> CPU pieces: 0,4,7; empty: 8
    // Only legal moves: 7->8 (ADJACENTS[7] includes 8), 4->8 (ADJACENTS[4] includes 8)
    // Move 7->8 gives [C,P,P, P,C,P, P,_,C] -> diagonal [0,4,8]=C,C,C = WIN
    const board = makeBoard([
      'C', 'P', 'P',
      'P', 'C', 'P',
      'P', 'C', null,
    ]);
    const move = cpuBestMoveHard([...board]);
    expect(move).not.toBeNull();
    if (move) {
      const testBoard = [...board];
      testBoard[move[1]] = 'cpu';
      testBoard[move[0]] = null;
      expect(checkWin(testBoard, 'cpu')).toBe(true);
    }
  });

  it('returns null when there are no CPU pieces', () => {
    const board: CellState[] = Array(9).fill(null);
    board[0] = 'player';
    const move = cpuBestMoveHard([...board]);
    expect(move).toBeNull();
  });

  it('returns null when there are no empty cells to move to', () => {
    // All cells occupied, no empty target
    const board: CellState[] = [
      'cpu', 'player', 'cpu',
      'player', 'cpu', 'player',
      'player', 'cpu', 'player',
    ];
    const move = cpuBestMoveHard([...board]);
    expect(move).toBeNull();
  });
});

// ============================================================
// 8. AI consistency — does not mutate the input board
// ============================================================
describe('AI does not permanently mutate the board', () => {
  it('cpuBestPlace leaves board unchanged', () => {
    const board: CellState[] = Array(9).fill(null);
    board[0] = 'player';
    const snapshot = [...board];
    cpuBestPlace(board);
    expect(board).toEqual(snapshot);
  });

  it('cpuBestMove leaves board unchanged', () => {
    const board = makeBoard([
      'P', null, 'C',
      'C', null, null,
      null, 'P', 'C',
    ]);
    const snapshot = [...board];
    cpuBestMove(board);
    expect(board).toEqual(snapshot);
  });

  it('cpuBestPlaceHard leaves board unchanged', () => {
    const board: CellState[] = Array(9).fill(null);
    board[0] = 'player';
    const snapshot = [...board];
    cpuBestPlaceHard(board, 1, 0);
    expect(board).toEqual(snapshot);
  });

  it('cpuBestMoveHard leaves board unchanged', () => {
    const board = makeBoard([
      'P', null, 'C',
      'C', null, null,
      null, 'P', 'C',
    ]);
    const snapshot = [...board];
    cpuBestMoveHard(board);
    expect(board).toEqual(snapshot);
  });
});
