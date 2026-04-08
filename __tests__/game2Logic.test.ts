import {
  createInitialGame2State,
  createEmptyCell,
  StackCell,
  Hand,
  Player,
  Game2State,
} from '../src/games/game2/game2Types';
import {
  getTopCoin,
  getTopOwner,
  isCellEmpty,
  hasOnlyBottom,
  isCellFull,
  cloneBoard,
  cloneState,
  getValidPlacements,
  getMovableCoins,
  getValidMoveTargets,
  hasAnyAction,
  canPlace,
  canMove,
  placeFromHand,
  moveOnBoard,
  checkWinner,
  isGameOver,
  getAllActions,
} from '../src/games/game2/game2Logic';

// ============================================================
// Helpers
// ============================================================

function emptyBoard(): StackCell[] {
  return Array.from({ length: 9 }, () => createEmptyCell());
}

function placeOnBoard(
  board: StackCell[],
  idx: number,
  owner: Player,
  num: 1 | 2,
  asTop = false,
): void {
  const coin = { owner, number: num as 1 | 2, coinType: 'fire' as const };
  if (asTop) {
    board[idx].top = coin;
  } else {
    board[idx].bottom = coin;
  }
}

// ============================================================
// 1. Board Initialization
// ============================================================
describe('createInitialGame2State', () => {
  it('returns a board of 9 empty cells', () => {
    const state = createInitialGame2State();
    expect(state.board).toHaveLength(9);
    expect(state.board.every(c => isCellEmpty(c))).toBe(true);
  });

  it('starts with player turn', () => {
    const state = createInitialGame2State();
    expect(state.turn).toBe('player');
  });

  it('gives each player 2 of each coin', () => {
    const state = createInitialGame2State();
    expect(state.playerHand).toEqual({ count1: 2, count2: 2 });
    expect(state.cpuHand).toEqual({ count1: 2, count2: 2 });
  });

  it('has no winner initially', () => {
    const state = createInitialGame2State();
    expect(state.winner).toBeNull();
    expect(state.winLine).toBeNull();
  });
});

// ============================================================
// 2. Cell Helpers
// ============================================================
describe('cell helpers', () => {
  it('getTopCoin returns null for empty cell', () => {
    expect(getTopCoin(createEmptyCell())).toBeNull();
  });

  it('getTopCoin returns bottom when no top exists', () => {
    const cell = createEmptyCell();
    cell.bottom = { owner: 'player', number: 1, coinType: 'fire' };
    expect(getTopCoin(cell)!.owner).toBe('player');
  });

  it('getTopCoin returns top when both exist', () => {
    const cell: StackCell = {
      bottom: { owner: 'player', number: 1, coinType: 'fire' },
      top: { owner: 'cpu', number: 2, coinType: 'water' },
    };
    expect(getTopCoin(cell)!.owner).toBe('cpu');
    expect(getTopCoin(cell)!.number).toBe(2);
  });

  it('hasOnlyBottom is true when bottom exists but top is null', () => {
    const cell = createEmptyCell();
    cell.bottom = { owner: 'player', number: 1, coinType: 'fire' };
    expect(hasOnlyBottom(cell)).toBe(true);
  });

  it('isCellFull is true when top is set', () => {
    const cell: StackCell = {
      bottom: { owner: 'player', number: 1, coinType: 'fire' },
      top: { owner: 'cpu', number: 2, coinType: 'water' },
    };
    expect(isCellFull(cell)).toBe(true);
  });
});

// ============================================================
// 3. Placement Rules
// ============================================================
describe('getValidPlacements', () => {
  it('coin 1 can go on any empty cell', () => {
    const board = emptyBoard();
    expect(getValidPlacements(board, 1)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('coin 2 can go on empty cells', () => {
    const board = emptyBoard();
    expect(getValidPlacements(board, 2)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('coin 2 can stack on top of a coin 1', () => {
    const board = emptyBoard();
    placeOnBoard(board, 4, 'player', 1);
    const valid = getValidPlacements(board, 2);
    expect(valid).toContain(4); // stacking allowed
  });

  it('coin 1 cannot stack on another coin 1', () => {
    const board = emptyBoard();
    placeOnBoard(board, 4, 'player', 1);
    const valid = getValidPlacements(board, 1);
    expect(valid).not.toContain(4);
  });

  it('nothing can go on top of a coin 2', () => {
    const board = emptyBoard();
    placeOnBoard(board, 0, 'cpu', 2);
    expect(getValidPlacements(board, 1)).not.toContain(0);
    expect(getValidPlacements(board, 2)).not.toContain(0);
  });

  it('nothing can go on a full stack (bottom 1 + top 2)', () => {
    const board = emptyBoard();
    placeOnBoard(board, 0, 'player', 1);
    placeOnBoard(board, 0, 'cpu', 2, true);
    expect(getValidPlacements(board, 1)).not.toContain(0);
    expect(getValidPlacements(board, 2)).not.toContain(0);
  });
});

// ============================================================
// 4. Move Targets
// ============================================================
describe('getValidMoveTargets', () => {
  it('returns only empty cells', () => {
    const board = emptyBoard();
    placeOnBoard(board, 0, 'player', 1);
    placeOnBoard(board, 4, 'cpu', 1);
    const targets = getValidMoveTargets(board, 0);
    expect(targets).not.toContain(0);
    expect(targets).not.toContain(4);
    expect(targets).toHaveLength(7);
  });
});

describe('getMovableCoins', () => {
  it('returns indices where player owns the top coin', () => {
    const board = emptyBoard();
    placeOnBoard(board, 2, 'player', 1);
    placeOnBoard(board, 5, 'cpu', 1);
    expect(getMovableCoins(board, 'player')).toEqual([2]);
    expect(getMovableCoins(board, 'cpu')).toEqual([5]);
  });

  it('buried coin is not movable', () => {
    const board = emptyBoard();
    placeOnBoard(board, 0, 'player', 1);
    placeOnBoard(board, 0, 'cpu', 2, true);
    // player's coin is under cpu's top coin
    expect(getMovableCoins(board, 'player')).not.toContain(0);
    expect(getMovableCoins(board, 'cpu')).toContain(0);
  });
});

// ============================================================
// 5. Win Detection
// ============================================================
describe('checkWinner', () => {
  it('returns null on empty board', () => {
    expect(checkWinner(emptyBoard())).toBeNull();
  });

  it('detects horizontal win (top row)', () => {
    const board = emptyBoard();
    placeOnBoard(board, 0, 'player', 1);
    placeOnBoard(board, 1, 'player', 1);
    placeOnBoard(board, 2, 'player', 2);
    const result = checkWinner(board);
    expect(result).not.toBeNull();
    expect(result!.winner).toBe('player');
    expect(result!.winLine).toEqual([0, 1, 2]);
  });

  it('detects diagonal win', () => {
    const board = emptyBoard();
    placeOnBoard(board, 0, 'cpu', 1);
    placeOnBoard(board, 4, 'cpu', 2);
    placeOnBoard(board, 8, 'cpu', 1);
    const result = checkWinner(board);
    expect(result).not.toBeNull();
    expect(result!.winner).toBe('cpu');
  });

  it('top coin determines winner, not bottom', () => {
    const board = emptyBoard();
    // bottom is player but top is cpu
    placeOnBoard(board, 0, 'player', 1);
    placeOnBoard(board, 0, 'cpu', 2, true);
    placeOnBoard(board, 1, 'player', 1);
    placeOnBoard(board, 1, 'cpu', 2, true);
    placeOnBoard(board, 2, 'player', 1);
    placeOnBoard(board, 2, 'cpu', 2, true);
    const result = checkWinner(board);
    expect(result!.winner).toBe('cpu');
  });
});

// ============================================================
// 6. Place From Hand
// ============================================================
describe('placeFromHand', () => {
  it('places coin 1 on empty cell and decrements hand', () => {
    const state = createInitialGame2State();
    const newState = placeFromHand(state, 'player', 1, 0, 'fire');
    expect(newState.board[0].bottom!.owner).toBe('player');
    expect(newState.board[0].bottom!.number).toBe(1);
    expect(newState.playerHand.count1).toBe(1);
  });

  it('stacks coin 2 on top of coin 1', () => {
    let state = createInitialGame2State();
    state = placeFromHand(state, 'player', 1, 4, 'fire');
    state = placeFromHand(state, 'cpu', 2, 4, 'water');
    expect(state.board[4].bottom!.owner).toBe('player');
    expect(state.board[4].top!.owner).toBe('cpu');
    expect(state.cpuHand.count2).toBe(1);
  });

  it('does not mutate the original state', () => {
    const state = createInitialGame2State();
    const newState = placeFromHand(state, 'player', 1, 0, 'fire');
    expect(state.board[0].bottom).toBeNull();
    expect(newState.board[0].bottom).not.toBeNull();
  });
});

// ============================================================
// 7. Move On Board
// ============================================================
describe('moveOnBoard', () => {
  it('moves a single coin to empty cell', () => {
    let state = createInitialGame2State();
    state = placeFromHand(state, 'player', 1, 0, 'fire');
    const moved = moveOnBoard(state, 0, 4);
    expect(isCellEmpty(moved.board[0])).toBe(true);
    expect(moved.board[4].bottom!.owner).toBe('player');
  });

  it('moving top coin reveals bottom coin', () => {
    let state = createInitialGame2State();
    state = placeFromHand(state, 'player', 1, 0, 'fire');
    state = placeFromHand(state, 'cpu', 2, 0, 'water');
    // cpu's 2 is on top of player's 1
    const moved = moveOnBoard(state, 0, 5);
    expect(moved.board[0].bottom!.owner).toBe('player');
    expect(moved.board[0].top).toBeNull();
    expect(moved.board[5].bottom!.owner).toBe('cpu');
  });
});

// ============================================================
// 8. Game Over / Draw
// ============================================================
describe('isGameOver', () => {
  it('reports not over on fresh state', () => {
    const state = createInitialGame2State();
    expect(isGameOver(state).over).toBe(false);
  });

  it('reports over when a player wins', () => {
    const state = createInitialGame2State();
    placeOnBoard(state.board, 0, 'player', 1);
    placeOnBoard(state.board, 1, 'player', 1);
    placeOnBoard(state.board, 2, 'player', 2);
    const result = isGameOver(state);
    expect(result.over).toBe(true);
    expect(result.winner).toBe('player');
  });
});

// ============================================================
// 9. getAllActions
// ============================================================
describe('getAllActions', () => {
  it('returns placement and move actions', () => {
    let state = createInitialGame2State();
    state = placeFromHand(state, 'player', 1, 0, 'fire');
    const actions = getAllActions(state, 'player');
    const placeActions = actions.filter(a => a.type === 'place');
    const moveActions = actions.filter(a => a.type === 'move');
    expect(placeActions.length).toBeGreaterThan(0);
    expect(moveActions.length).toBeGreaterThan(0);
  });

  it('returns no actions when both hands empty and board full', () => {
    const state = createInitialGame2State();
    state.playerHand = { count1: 0, count2: 0 };
    // fill all cells
    for (let i = 0; i < 9; i++) {
      placeOnBoard(state.board, i, 'cpu', 1);
    }
    const actions = getAllActions(state, 'player');
    expect(actions).toHaveLength(0);
  });
});
