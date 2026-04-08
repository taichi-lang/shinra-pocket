import {
  BoardState,
  Player,
  createInitialBoard,
  INITIAL_PITS,
} from '../src/games/game4/game4Types';
import {
  cloneBoard,
  getValidPits,
  sowSeeds,
  checkWinner,
  checkExtraTurn,
  sideTotal,
  opponent,
} from '../src/games/game4/game4Logic';

// ============================================================
// Helpers
// ============================================================

function makeBoard(
  a: [number, number, number],
  b: [number, number, number],
  pitL = 0,
  pitR = 0,
): BoardState {
  return { a: [...a] as [number, number, number], b: [...b] as [number, number, number], pitL, pitR };
}

// ============================================================
// 1. Initial Board
// ============================================================
describe('createInitialBoard', () => {
  it('creates correct initial pit values', () => {
    const board = createInitialBoard();
    expect(board.a).toEqual([4, 3, 2]);
    expect(board.b).toEqual([2, 3, 4]);
    expect(board.pitL).toBe(0);
    expect(board.pitR).toBe(0);
  });

  it('total coins across all pits should be 18', () => {
    const board = createInitialBoard();
    const total = board.a[0] + board.a[1] + board.a[2]
      + board.b[0] + board.b[1] + board.b[2]
      + board.pitL + board.pitR;
    expect(total).toBe(18);
  });
});

// ============================================================
// 2. getValidPits
// ============================================================
describe('getValidPits', () => {
  it('returns all pits with coins for player A', () => {
    const board = createInitialBoard();
    expect(getValidPits(board, 'A')).toEqual([0, 1, 2]);
  });

  it('returns only non-empty pits', () => {
    const board = makeBoard([0, 3, 0], [1, 1, 1]);
    expect(getValidPits(board, 'A')).toEqual([1]);
  });

  it('returns empty array when all pits are zero', () => {
    const board = makeBoard([0, 0, 0], [1, 1, 1]);
    expect(getValidPits(board, 'A')).toEqual([]);
  });
});

// ============================================================
// 3. Seed Sowing
// ============================================================
describe('sowSeeds', () => {
  it('distributes seeds one per slot in cycle order', () => {
    // A sows from pit 0 (4 coins): a0=4 -> picks up 4, distributes to a1, a2, pitR, b2
    const board = createInitialBoard();
    const result = sowSeeds(board, 'A', 0);
    expect(result.board.a[0]).toBe(0); // picked up
    expect(result.board.a[1]).toBe(4); // was 3, +1
    expect(result.board.a[2]).toBe(3); // was 2, +1
    expect(result.board.pitR).toBe(1); // was 0, +1
    expect(result.board.b[2]).toBe(5); // was 4, +1 (b2 in cycle_A)
  });

  it('returns correct number of steps', () => {
    const board = createInitialBoard();
    const result = sowSeeds(board, 'A', 0);
    expect(result.steps).toHaveLength(4); // 4 coins = 4 steps
  });

  it('does nothing when sowing from empty pit', () => {
    const board = makeBoard([0, 1, 1], [1, 1, 1]);
    const result = sowSeeds(board, 'A', 0);
    expect(result.board).toEqual(board);
    expect(result.extraTurn).toBe(false);
    expect(result.steps).toHaveLength(0);
  });

  it('preserves total coin count after sowing', () => {
    const board = createInitialBoard();
    const totalBefore = board.a[0] + board.a[1] + board.a[2]
      + board.b[0] + board.b[1] + board.b[2]
      + board.pitL + board.pitR;
    const result = sowSeeds(board, 'A', 0);
    const rb = result.board;
    const totalAfter = rb.a[0] + rb.a[1] + rb.a[2]
      + rb.b[0] + rb.b[1] + rb.b[2]
      + rb.pitL + rb.pitR;
    expect(totalAfter).toBe(totalBefore);
  });
});

// ============================================================
// 4. Extra Turn
// ============================================================
describe('extra turn', () => {
  it('grants extra turn when last seed lands in own pit (player A -> pitR)', () => {
    // A sows from pit a2 which has 1 coin: distributes to pitR only
    const board = makeBoard([0, 0, 1], [1, 1, 1]);
    const result = sowSeeds(board, 'A', 2);
    expect(result.extraTurn).toBe(true);
    expect(result.board.pitR).toBe(1);
  });

  it('grants extra turn for player B landing in pitL', () => {
    // B sows from pit b2 which has 1 coin: distributes to pitL only
    const board = makeBoard([1, 1, 1], [0, 0, 1]);
    const result = sowSeeds(board, 'B', 2);
    expect(result.extraTurn).toBe(true);
    expect(result.board.pitL).toBe(1);
  });

  it('no extra turn when last seed does not land in own pit', () => {
    const board = makeBoard([0, 0, 2], [1, 1, 1]);
    const result = sowSeeds(board, 'A', 2);
    // 2 coins from a2: pitR, b2 -- last lands on b2
    expect(result.extraTurn).toBe(false);
  });

  it('checkExtraTurn returns result.extraTurn', () => {
    const board = makeBoard([0, 0, 1], [1, 1, 1]);
    const result = sowSeeds(board, 'A', 2);
    expect(checkExtraTurn(result)).toBe(true);
  });
});

// ============================================================
// 5. Win Condition (empty side)
// ============================================================
describe('checkWinner', () => {
  it('returns null when both sides have coins', () => {
    expect(checkWinner(createInitialBoard())).toBeNull();
  });

  it('returns A when all of A side is empty', () => {
    const board = makeBoard([0, 0, 0], [1, 2, 3], 5, 7);
    expect(checkWinner(board)).toBe('A');
  });

  it('returns B when all of B side is empty', () => {
    const board = makeBoard([1, 1, 1], [0, 0, 0], 5, 7);
    expect(checkWinner(board)).toBe('B');
  });
});

// ============================================================
// 6. Utility Functions
// ============================================================
describe('sideTotal', () => {
  it('sums pits for player A', () => {
    const board = makeBoard([4, 3, 2], [1, 1, 1]);
    expect(sideTotal(board, 'A')).toBe(9);
  });

  it('sums pits for player B', () => {
    const board = makeBoard([1, 1, 1], [2, 3, 4]);
    expect(sideTotal(board, 'B')).toBe(9);
  });
});

describe('opponent', () => {
  it('returns the other player', () => {
    expect(opponent('A')).toBe('B');
    expect(opponent('B')).toBe('A');
  });
});

// ============================================================
// 7. cloneBoard
// ============================================================
describe('cloneBoard', () => {
  it('creates a deep copy', () => {
    const board = createInitialBoard();
    const clone = cloneBoard(board);
    clone.a[0] = 99;
    expect(board.a[0]).toBe(4); // original unchanged
  });
});

// ============================================================
// 8. Wrapping distribution
// ============================================================
describe('sowing wraps around the board', () => {
  it('player A sowing many seeds wraps past pitL back to a0', () => {
    // A sows from pit 0 with 8 coins -- should go all the way around
    const board = makeBoard([8, 0, 0], [0, 0, 0]);
    const result = sowSeeds(board, 'A', 0);
    // cycle for A: a0, a1, a2, pitR, b2, b1, b0, pitL
    // distributes to: a1(+1), a2(+1), pitR(+1), b2(+1), b1(+1), b0(+1), pitL(+1), a0(+1)
    expect(result.board.a[0]).toBe(1); // wrapped back
    expect(result.board.a[1]).toBe(1);
    expect(result.board.a[2]).toBe(1);
    expect(result.board.pitR).toBe(1);
    expect(result.board.b[2]).toBe(1);
    expect(result.board.b[1]).toBe(1);
    expect(result.board.b[0]).toBe(1);
    expect(result.board.pitL).toBe(1);
    // last seed lands on pitL for A -> not own pit -> no extra turn
    expect(result.extraTurn).toBe(false);
  });
});
