// Game2 Logic — 一騎打ち stacking board game

import { WIN_LINES } from '../../game/types';
import {
  Game2State,
  StackCell,
  StackCoin,
  Player,
  CoinNumber,
  Hand,
  GameAction,
  PlaceAction,
  MoveAction,
  createEmptyCell,
} from './game2Types';

// ========== HELPERS ==========

/** Get the top-visible coin of a cell (top if exists, else bottom) */
export function getTopCoin(cell: StackCell): StackCoin | null {
  return cell.top ?? cell.bottom;
}

/** Get the owner of the top-visible coin */
export function getTopOwner(cell: StackCell): Player | null {
  const coin = getTopCoin(cell);
  return coin ? coin.owner : null;
}

/** Check if a cell is completely empty */
export function isCellEmpty(cell: StackCell): boolean {
  return cell.bottom === null && cell.top === null;
}

/** Check if a cell has only a bottom coin (single layer with a "1") */
export function hasOnlyBottom(cell: StackCell): boolean {
  return cell.bottom !== null && cell.top === null;
}

/** Check if a cell is full (has top coin, meaning 2 layers or a single "2") */
export function isCellFull(cell: StackCell): boolean {
  return cell.top !== null;
}

/** Deep clone board */
export function cloneBoard(board: StackCell[]): StackCell[] {
  return board.map(cell => ({
    bottom: cell.bottom ? { ...cell.bottom } : null,
    top: cell.top ? { ...cell.top } : null,
  }));
}

/** Deep clone state */
export function cloneState(state: Game2State): Game2State {
  return {
    ...state,
    board: cloneBoard(state.board),
    playerHand: { ...state.playerHand },
    cpuHand: { ...state.cpuHand },
  };
}

// ========== VALID PLACEMENTS ==========

/**
 * Get valid placement indices for a given coin number from hand.
 * - "1" or "2" can go on empty cells
 * - "2" can also go on top of any "1" (stacking)
 * - Nothing can go on top of a "2"
 */
export function getValidPlacements(board: StackCell[], coinNumber: CoinNumber): number[] {
  const valid: number[] = [];
  for (let i = 0; i < 9; i++) {
    const cell = board[i];
    if (isCellEmpty(cell)) {
      // Empty cell: any coin can be placed
      valid.push(i);
    } else if (coinNumber === 2 && hasOnlyBottom(cell) && cell.bottom!.number === 1) {
      // "2" can stack on top of any "1"
      valid.push(i);
    }
  }
  return valid;
}

// ========== VALID MOVES ==========

/**
 * Get the indices of the player's movable coins on the board.
 * A coin is movable if:
 * - It belongs to the player
 * - It is the top-visible coin (not buried under another)
 */
export function getMovableCoins(board: StackCell[], player: Player): number[] {
  const movable: number[] = [];
  for (let i = 0; i < 9; i++) {
    const topCoin = getTopCoin(board[i]);
    if (topCoin && topCoin.owner === player) {
      movable.push(i);
    }
  }
  return movable;
}

/**
 * Get valid move destinations for a coin at fromIndex.
 * Movement: only to empty cells (no stacking on move).
 */
export function getValidMoveTargets(board: StackCell[], _fromIndex: number): number[] {
  const targets: number[] = [];
  for (let i = 0; i < 9; i++) {
    if (isCellEmpty(board[i])) {
      targets.push(i);
    }
  }
  return targets;
}

// ========== CHECK FOR AVAILABLE ACTIONS ==========

/** Check if a player has any valid action (place or move) */
export function hasAnyAction(state: Game2State, player: Player): boolean {
  const hand = player === 'player' ? state.playerHand : state.cpuHand;

  // Check placements from hand
  if (hand.count1 > 0 && getValidPlacements(state.board, 1).length > 0) return true;
  if (hand.count2 > 0 && getValidPlacements(state.board, 2).length > 0) return true;

  // Check moves on board
  const movable = getMovableCoins(state.board, player);
  for (const idx of movable) {
    if (getValidMoveTargets(state.board, idx).length > 0) return true;
  }

  return false;
}

/** Check if player can place any coin from hand */
export function canPlace(state: Game2State, player: Player): boolean {
  const hand = player === 'player' ? state.playerHand : state.cpuHand;
  if (hand.count1 > 0 && getValidPlacements(state.board, 1).length > 0) return true;
  if (hand.count2 > 0 && getValidPlacements(state.board, 2).length > 0) return true;
  return false;
}

/** Check if player can move any coin on board */
export function canMove(state: Game2State, player: Player): boolean {
  const movable = getMovableCoins(state.board, player);
  for (const idx of movable) {
    if (getValidMoveTargets(state.board, idx).length > 0) return true;
  }
  return false;
}

// ========== ACTIONS ==========

/**
 * Place a coin from hand onto the board.
 * Returns new state (does NOT mutate input).
 */
export function placeFromHand(
  state: Game2State,
  player: Player,
  coinNumber: CoinNumber,
  targetIndex: number,
  coinType: import('../../game/types').CoinType,
): Game2State {
  const newState = cloneState(state);
  const hand = player === 'player' ? newState.playerHand : newState.cpuHand;
  const cell = newState.board[targetIndex];

  const coin: StackCoin = { owner: player, number: coinNumber, coinType };

  if (isCellEmpty(cell)) {
    if (coinNumber === 1) {
      cell.bottom = coin;
    } else {
      // "2" placed alone goes to bottom (single coin, but it's effectively on top)
      // Actually for consistency: a single "2" on empty should still be "bottom" with no top
      // But since "2" blocks stacking, it doesn't matter. Let's put it as bottom.
      cell.bottom = coin;
    }
  } else if (hasOnlyBottom(cell) && cell.bottom!.number === 1 && coinNumber === 2) {
    // Stack "2" on top of "1"
    cell.top = coin;
  }

  // Deduct from hand
  if (coinNumber === 1) hand.count1--;
  else hand.count2--;

  return newState;
}

/**
 * Move a coin on the board from one cell to another.
 * Only the top coin can move, only to empty cells.
 * Returns new state.
 */
export function moveOnBoard(
  state: Game2State,
  fromIndex: number,
  toIndex: number,
): Game2State {
  const newState = cloneState(state);
  const fromCell = newState.board[fromIndex];
  const toCell = newState.board[toIndex];

  // Pick up the top coin
  let movedCoin: StackCoin;
  if (fromCell.top) {
    movedCoin = fromCell.top;
    fromCell.top = null; // Reveal bottom coin
  } else {
    movedCoin = fromCell.bottom!;
    fromCell.bottom = null;
  }

  // Place on empty cell
  toCell.bottom = movedCoin;

  return newState;
}

// ========== WIN CHECK ==========

/**
 * Check if there's a winner based on top-visible coins.
 * Returns { winner, winLine } or null.
 */
export function checkWinner(board: StackCell[]): { winner: Player; winLine: number[] } | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    const ownerA = getTopOwner(board[a]);
    const ownerB = getTopOwner(board[b]);
    const ownerC = getTopOwner(board[c]);

    if (ownerA && ownerA === ownerB && ownerB === ownerC) {
      return { winner: ownerA, winLine: [a, b, c] };
    }
  }
  return null;
}

// ========== GAME OVER CHECK ==========

/**
 * Check if the game is over.
 * - Someone won
 * - Or neither player can make any move (draw)
 */
export function isGameOver(state: Game2State): { over: boolean; winner: Player | 'draw' | null } {
  const winResult = checkWinner(state.board);
  if (winResult) {
    return { over: true, winner: winResult.winner };
  }

  // Check draw: neither player can act
  const playerCanAct = hasAnyAction(state, 'player');
  const cpuCanAct = hasAnyAction(state, 'cpu');

  if (!playerCanAct && !cpuCanAct) {
    return { over: true, winner: 'draw' };
  }

  return { over: false, winner: null };
}

// ========== APPLY ACTION (for AI) ==========

/**
 * Apply a GameAction to a state, returning a new state.
 * Used by AI for simulation.
 */
export function applyAction(
  state: Game2State,
  action: GameAction,
  player: Player,
  coinType: import('../../game/types').CoinType,
): Game2State {
  if (action.type === 'place') {
    return placeFromHand(state, player, action.coinNumber, action.targetIndex, coinType);
  } else {
    return moveOnBoard(state, action.fromIndex, action.toIndex);
  }
}

// ========== GET ALL ACTIONS (for AI) ==========

/** Get all legal actions for a player */
export function getAllActions(state: Game2State, player: Player): GameAction[] {
  const actions: GameAction[] = [];
  const hand = player === 'player' ? state.playerHand : state.cpuHand;

  // Placement actions
  for (const coinNum of [1, 2] as CoinNumber[]) {
    const count = coinNum === 1 ? hand.count1 : hand.count2;
    if (count > 0) {
      const targets = getValidPlacements(state.board, coinNum);
      for (const t of targets) {
        actions.push({ type: 'place', coinNumber: coinNum, targetIndex: t });
      }
    }
  }

  // Move actions
  const movable = getMovableCoins(state.board, player);
  for (const from of movable) {
    const targets = getValidMoveTargets(state.board, from);
    for (const to of targets) {
      actions.push({ type: 'move', fromIndex: from, toIndex: to });
    }
  }

  return actions;
}
