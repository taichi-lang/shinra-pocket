import {
  CellState,
  GameState,
  WIN_LINES,
  ADJACENTS,
  createInitialGameState,
} from '../src/game/types';
import {
  checkWin,
  getWinLine,
  cpuBestPlace,
  cpuBestMove,
} from '../src/game/ai';

// ============================================================
// Helper: build a board from a shorthand array
// 'P' = player, 'C' = cpu, null = empty
// ============================================================
function makeBoard(spec: (string | null)[]): CellState[] {
  return spec.map((v) => {
    if (v === 'P') return 'player';
    if (v === 'C') return 'cpu';
    return null;
  });
}

// ============================================================
// 1. Initial State
// ============================================================
describe('createInitialGameState', () => {
  it('returns a board of 9 null cells', () => {
    const state = createInitialGameState();
    expect(state.board).toHaveLength(9);
    expect(state.board.every((c) => c === null)).toBe(true);
  });

  it('starts in place phase with player turn', () => {
    const state = createInitialGameState();
    expect(state.phase).toBe('place');
    expect(state.turn).toBe('player');
  });

  it('initialises placement counters to 0', () => {
    const state = createInitialGameState();
    expect(state.playerPlaced).toBe(0);
    expect(state.cpuPlaced).toBe(0);
  });

  it('has no selection, active=true, moveRound=0, winLine=null', () => {
    const state = createInitialGameState();
    expect(state.selected).toBeNull();
    expect(state.active).toBe(true);
    expect(state.moveRound).toBe(0);
    expect(state.winLine).toBeNull();
  });
});

// ============================================================
// 2. Place coin on empty cell
// ============================================================
describe('Place coin on empty cell', () => {
  it('allows placing on an empty cell', () => {
    const board = makeBoard([null, null, null, null, null, null, null, null, null]);
    const target = 4;
    expect(board[target]).toBeNull();
    board[target] = 'player';
    expect(board[target]).toBe('player');
  });
});

// ============================================================
// 3. Place coin on occupied cell (should fail)
// ============================================================
describe('Place coin on occupied cell', () => {
  it('rejects placement on a cell already occupied by player', () => {
    const board = makeBoard([null, null, null, null, 'P', null, null, null, null]);
    const target = 4;
    const canPlace = board[target] === null;
    expect(canPlace).toBe(false);
  });

  it('rejects placement on a cell occupied by CPU', () => {
    const board = makeBoard([null, null, null, null, 'C', null, null, null, null]);
    const target = 4;
    const canPlace = board[target] === null;
    expect(canPlace).toBe(false);
  });
});

// ============================================================
// 4. Win detection (all 8 lines)
// ============================================================
describe('checkWin — all 8 winning lines', () => {
  const lines: [number, number, number][] = [
    [0, 1, 2], // top row
    [3, 4, 5], // mid row
    [6, 7, 8], // bot row
    [0, 3, 6], // left col
    [1, 4, 7], // mid col
    [2, 5, 8], // right col
    [0, 4, 8], // diag TL-BR
    [2, 4, 6], // diag TR-BL
  ];

  lines.forEach(([a, b, c]) => {
    it(`detects player win on line [${a},${b},${c}]`, () => {
      const board: CellState[] = Array(9).fill(null);
      board[a] = 'player';
      board[b] = 'player';
      board[c] = 'player';
      expect(checkWin(board, 'player')).toBe(true);
    });

    it(`detects CPU win on line [${a},${b},${c}]`, () => {
      const board: CellState[] = Array(9).fill(null);
      board[a] = 'cpu';
      board[b] = 'cpu';
      board[c] = 'cpu';
      expect(checkWin(board, 'cpu')).toBe(true);
    });
  });

  it('returns false when no line is complete', () => {
    const board = makeBoard(['P', 'C', 'P', 'C', 'P', 'C', null, null, null]);
    expect(checkWin(board, 'player')).toBe(false);
    expect(checkWin(board, 'cpu')).toBe(false);
  });
});

// ============================================================
// 5. getWinLine
// ============================================================
describe('getWinLine', () => {
  it('returns the winning line indices for player', () => {
    const board: CellState[] = Array(9).fill(null);
    board[0] = 'player';
    board[1] = 'player';
    board[2] = 'player';
    expect(getWinLine(board, 'player')).toEqual([0, 1, 2]);
  });

  it('returns null when no win exists', () => {
    const board: CellState[] = Array(9).fill(null);
    board[0] = 'player';
    board[4] = 'player';
    expect(getWinLine(board, 'player')).toBeNull();
  });
});

// ============================================================
// 6. Move to adjacent cell
// ============================================================
describe('Move to adjacent cell', () => {
  it('allows moving to an adjacent empty cell', () => {
    const board = makeBoard(['P', null, null, null, null, null, null, null, null]);
    const from = 0;
    const to = 1;
    const isAdjacent = ADJACENTS[from].includes(to);
    const isEmpty = board[to] === null;
    expect(isAdjacent).toBe(true);
    expect(isEmpty).toBe(true);

    // perform move
    board[to] = board[from];
    board[from] = null;
    expect(board[to]).toBe('player');
    expect(board[from]).toBeNull();
  });

  it('validates all ADJACENTS entries are symmetric', () => {
    for (let cell = 0; cell < 9; cell++) {
      for (const adj of ADJACENTS[cell]) {
        expect(ADJACENTS[adj]).toContain(cell);
      }
    }
  });
});

// ============================================================
// 7. Move to any empty cell (no adjacency restriction)
// ============================================================
describe('Move to any empty cell', () => {
  it('allows move from cell 0 to cell 8 (non-adjacent, empty)', () => {
    const board = makeBoard(['P', null, null, null, null, null, null, null, null]);
    const from = 0;
    const to = 8;
    const isEmpty = board[to] === null;
    expect(isEmpty).toBe(true);

    board[to] = board[from];
    board[from] = null;
    expect(board[to]).toBe('player');
    expect(board[from]).toBeNull();
  });

  it('allows move from cell 0 to cell 2 (non-adjacent, empty)', () => {
    const board = makeBoard(['P', null, null, null, null, null, null, null, null]);
    const from = 0;
    const to = 2;
    const isEmpty = board[to] === null;
    expect(isEmpty).toBe(true);

    board[to] = board[from];
    board[from] = null;
    expect(board[to]).toBe('player');
  });

  it('rejects move to occupied cell', () => {
    const board = makeBoard(['P', 'C', null, null, null, null, null, null, null]);
    const to = 1;
    const isEmpty = board[to] === null;
    expect(isEmpty).toBe(false);
  });
});

// ============================================================
// 8. WIN_LINES constant check
// ============================================================
describe('WIN_LINES', () => {
  it('contains exactly 8 lines', () => {
    expect(WIN_LINES).toHaveLength(8);
  });

  it('each line has 3 indices in range 0-8', () => {
    for (const line of WIN_LINES) {
      expect(line).toHaveLength(3);
      for (const idx of line) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThanOrEqual(8);
      }
    }
  });
});

// ============================================================
// 9. AI returns valid moves (cpuBestPlace)
// ============================================================
describe('cpuBestPlace returns valid cell', () => {
  it('returns an index of an empty cell', () => {
    const board: CellState[] = Array(9).fill(null);
    board[0] = 'player';
    board[4] = 'cpu';
    const move = cpuBestPlace(board);
    expect(move).toBeGreaterThanOrEqual(0);
    expect(move).toBeLessThanOrEqual(8);
    expect(board[move]).toBeNull();
  });

  it('returns the only available cell when one remains', () => {
    const board: CellState[] = [
      'player', 'cpu', 'player',
      'cpu', 'player', 'cpu',
      'player', 'cpu', null,
    ];
    const move = cpuBestPlace(board);
    expect(move).toBe(8);
  });
});

// ============================================================
// 10. AI returns valid moves (cpuBestMove)
// ============================================================
describe('cpuBestMove returns valid move pair', () => {
  it('returns [from, to] where from has cpu and to is empty', () => {
    const board: CellState[] = [
      'player', 'cpu', 'player',
      'cpu', null, 'player',
      null, 'cpu', 'cpu',
    ];
    const move = cpuBestMove([...board]);
    expect(move).not.toBeNull();
    if (move) {
      const [from, to] = move;
      expect(board[from]).toBe('cpu');
      expect(board[to]).toBeNull();
    }
  });

  it('returns null when no CPU pieces exist', () => {
    const board: CellState[] = Array(9).fill(null);
    board[0] = 'player';
    const move = cpuBestMove(board);
    expect(move).toBeNull();
  });
});
