import {
  Player,
  CoinNumber,
  StackCell,
  StackLayer,
  PlayerHand,
  Game3State,
  PLAYERS,
  createFullHand,
  createInitialGame3State,
} from '../src/games/game3/game3Types';
import {
  topLayer,
  topOwner,
  topNumber,
  cloneBoard,
  cloneState,
  nextPlayer,
  getValidPlacements,
  getPlayableHandCoins,
  getMovableCells,
  getValidMoveDestinations,
  hasAnyAction,
  getAllActions,
  applyPlaceAction,
  applyMoveAction,
  applyAction,
  checkWinner,
  checkDraw,
  advanceTurn,
  executeTurn,
} from '../src/games/game3/game3Logic';

// ============================================================
// Helpers
// ============================================================

function emptyBoard(): StackCell[] {
  return Array.from({ length: 9 }, () => [] as StackLayer[]);
}

function placeLayer(board: StackCell[], idx: number, owner: Player, num: CoinNumber): void {
  board[idx].push({ owner, number: num });
}

// ============================================================
// 1. Initial State
// ============================================================
describe('createInitialGame3State', () => {
  it('creates a board of 9 empty cells', () => {
    const state = createInitialGame3State();
    expect(state.board).toHaveLength(9);
    expect(state.board.every(c => c.length === 0)).toBe(true);
  });

  it('gives each player a full hand (2 each of 1,2,3)', () => {
    const state = createInitialGame3State();
    for (const p of PLAYERS) {
      expect(state.hands[p]).toEqual({ 1: 2, 2: 2, 3: 2 });
    }
  });

  it('starts with fire as current player', () => {
    const state = createInitialGame3State();
    expect(state.currentPlayer).toBe('fire');
  });
});

// ============================================================
// 2. Turn Cycling (3 players)
// ============================================================
describe('nextPlayer', () => {
  it('fire -> water -> swirl -> fire', () => {
    expect(nextPlayer('fire')).toBe('water');
    expect(nextPlayer('water')).toBe('swirl');
    expect(nextPlayer('swirl')).toBe('fire');
  });
});

// ============================================================
// 3. Cell Helpers
// ============================================================
describe('topLayer / topOwner / topNumber', () => {
  it('returns null for empty cell', () => {
    expect(topLayer([])).toBeNull();
    expect(topOwner([])).toBeNull();
    expect(topNumber([])).toBeNull();
  });

  it('returns the last pushed layer', () => {
    const cell: StackCell = [
      { owner: 'fire', number: 1 },
      { owner: 'water', number: 2 },
    ];
    expect(topOwner(cell)).toBe('water');
    expect(topNumber(cell)).toBe(2);
  });
});

// ============================================================
// 4. Stacking Rules (3 layers)
// ============================================================
describe('getValidPlacements', () => {
  it('any coin can go on empty cells', () => {
    const board = emptyBoard();
    expect(getValidPlacements(board, 1)).toHaveLength(9);
  });

  it('coin 2 can stack on coin 1', () => {
    const board = emptyBoard();
    placeLayer(board, 0, 'fire', 1);
    expect(getValidPlacements(board, 2)).toContain(0);
  });

  it('coin 1 cannot stack on coin 1 (not greater)', () => {
    const board = emptyBoard();
    placeLayer(board, 0, 'fire', 1);
    expect(getValidPlacements(board, 1)).not.toContain(0);
  });

  it('coin 3 can stack on coin 2', () => {
    const board = emptyBoard();
    placeLayer(board, 0, 'fire', 1);
    placeLayer(board, 0, 'water', 2);
    expect(getValidPlacements(board, 3)).toContain(0);
  });

  it('cannot stack beyond 3 layers', () => {
    const board = emptyBoard();
    placeLayer(board, 0, 'fire', 1);
    placeLayer(board, 0, 'water', 2);
    placeLayer(board, 0, 'swirl', 3);
    // cell has 3 layers — nothing can go here
    expect(getValidPlacements(board, 1)).not.toContain(0);
    expect(getValidPlacements(board, 2)).not.toContain(0);
    expect(getValidPlacements(board, 3)).not.toContain(0);
  });

  it('coin 2 cannot stack on coin 2 (not strictly greater)', () => {
    const board = emptyBoard();
    placeLayer(board, 0, 'fire', 2);
    expect(getValidPlacements(board, 2)).not.toContain(0);
  });
});

// ============================================================
// 5. getPlayableHandCoins
// ============================================================
describe('getPlayableHandCoins', () => {
  it('returns all coin numbers when board is empty and hand is full', () => {
    const board = emptyBoard();
    const hand = createFullHand();
    expect(getPlayableHandCoins(board, hand)).toEqual([1, 2, 3]);
  });

  it('returns empty when hand has no coins', () => {
    const board = emptyBoard();
    const hand: PlayerHand = { 1: 0, 2: 0, 3: 0 };
    expect(getPlayableHandCoins(board, hand)).toEqual([]);
  });
});

// ============================================================
// 6. Movement
// ============================================================
describe('getMovableCells / getValidMoveDestinations', () => {
  it('returns cells where player owns the top', () => {
    const board = emptyBoard();
    placeLayer(board, 3, 'fire', 1);
    placeLayer(board, 5, 'water', 2);
    expect(getMovableCells(board, 'fire')).toEqual([3]);
    expect(getMovableCells(board, 'water')).toEqual([5]);
  });

  it('returns empty when no empty cells exist', () => {
    const board = emptyBoard();
    for (let i = 0; i < 9; i++) placeLayer(board, i, 'fire', 1);
    expect(getMovableCells(board, 'fire')).toEqual([]);
  });

  it('destinations are all empty cells', () => {
    const board = emptyBoard();
    placeLayer(board, 0, 'fire', 1);
    placeLayer(board, 1, 'water', 1);
    const dests = getValidMoveDestinations(board, 0);
    expect(dests).toHaveLength(7);
    expect(dests).not.toContain(0);
    expect(dests).not.toContain(1);
  });
});

// ============================================================
// 7. Win Detection (3 players)
// ============================================================
describe('checkWinner', () => {
  it('returns null for empty board', () => {
    expect(checkWinner(emptyBoard())).toBeNull();
  });

  it('detects fire winning a row', () => {
    const board = emptyBoard();
    placeLayer(board, 0, 'fire', 1);
    placeLayer(board, 1, 'fire', 2);
    placeLayer(board, 2, 'fire', 1);
    const result = checkWinner(board);
    expect(result).not.toBeNull();
    expect(result!.winner).toBe('fire');
  });

  it('detects water winning a column', () => {
    const board = emptyBoard();
    placeLayer(board, 0, 'water', 1);
    placeLayer(board, 3, 'water', 2);
    placeLayer(board, 6, 'water', 1);
    const result = checkWinner(board);
    expect(result!.winner).toBe('water');
  });

  it('detects swirl winning a diagonal', () => {
    const board = emptyBoard();
    placeLayer(board, 2, 'swirl', 1);
    placeLayer(board, 4, 'swirl', 2);
    placeLayer(board, 6, 'swirl', 3);
    const result = checkWinner(board);
    expect(result!.winner).toBe('swirl');
  });

  it('top coin determines the winner', () => {
    const board = emptyBoard();
    // fire places 1, water stacks 2 on top
    placeLayer(board, 0, 'fire', 1);
    placeLayer(board, 0, 'water', 2);
    placeLayer(board, 1, 'fire', 1);
    placeLayer(board, 1, 'water', 2);
    placeLayer(board, 2, 'fire', 1);
    placeLayer(board, 2, 'water', 2);
    const result = checkWinner(board);
    expect(result!.winner).toBe('water');
  });
});

// ============================================================
// 8. Draw Detection
// ============================================================
describe('checkDraw', () => {
  it('returns false when players can still act', () => {
    const state = createInitialGame3State();
    expect(checkDraw(state)).toBe(false);
  });

  it('returns true when all players have no actions', () => {
    const state = createInitialGame3State();
    // Empty all hands
    for (const p of PLAYERS) {
      state.hands[p] = { 1: 0, 2: 0, 3: 0 };
    }
    // Fill board completely so no moves possible
    for (let i = 0; i < 9; i++) {
      placeLayer(state.board, i, PLAYERS[i % 3], 1);
    }
    expect(checkDraw(state)).toBe(true);
  });
});

// ============================================================
// 9. Apply Actions
// ============================================================
describe('applyPlaceAction / applyMoveAction', () => {
  it('places a coin and reduces hand', () => {
    const state = createInitialGame3State();
    const newState = applyPlaceAction(state, {
      type: 'place',
      coinNumber: 1,
      targetCell: 4,
    });
    expect(topOwner(newState.board[4])).toBe('fire');
    expect(newState.hands.fire[1]).toBe(1);
  });

  it('moves a coin from one cell to another', () => {
    const state = createInitialGame3State();
    placeLayer(state.board, 0, 'fire', 1);
    const newState = applyMoveAction(state, {
      type: 'move',
      fromCell: 0,
      toCell: 4,
    });
    expect(newState.board[0]).toHaveLength(0);
    expect(topOwner(newState.board[4])).toBe('fire');
  });

  it('does not mutate the original state', () => {
    const state = createInitialGame3State();
    const newState = applyPlaceAction(state, {
      type: 'place',
      coinNumber: 2,
      targetCell: 0,
    });
    expect(state.board[0]).toHaveLength(0);
    expect(newState.board[0]).toHaveLength(1);
  });
});

// ============================================================
// 10. executeTurn
// ============================================================
describe('executeTurn', () => {
  it('advances current player after a placement', () => {
    const state = createInitialGame3State();
    const newState = executeTurn(state, {
      type: 'place',
      coinNumber: 1,
      targetCell: 0,
    });
    expect(newState.currentPlayer).toBe('water');
  });

  it('detects a win during executeTurn', () => {
    const state = createInitialGame3State();
    placeLayer(state.board, 0, 'fire', 1);
    placeLayer(state.board, 1, 'fire', 2);
    // fire places at cell 2 to complete the top row
    const newState = executeTurn(state, {
      type: 'place',
      coinNumber: 1,
      targetCell: 2,
    });
    expect(newState.winner).toBe('fire');
    expect(newState.phase).toBe('finished');
  });
});
