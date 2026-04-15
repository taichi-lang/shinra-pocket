// ============================================================
// Game3: 三つ巴 — Core Game Logic
// ============================================================

import { WIN_LINES } from '../../game/types';
import type {
  Player,
  CoinNumber,
  StackLayer,
  StackCell,
  PlayerHand,
  Game3State,
  Game3Action,
  PlaceAction,
  MoveAction,
} from './game3Types';
import { PLAYERS, createInitialGame3State } from './game3Types';

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/** Get the top layer of a cell, or null if empty */
export function topLayer(cell: StackCell): StackLayer | null {
  return cell.length > 0 ? cell[cell.length - 1] : null;
}

/** Get the owner visible on top of a cell */
export function topOwner(cell: StackCell): Player | null {
  const top = topLayer(cell);
  return top ? top.owner : null;
}

/** Get the number on top of a cell */
export function topNumber(cell: StackCell): CoinNumber | null {
  const top = topLayer(cell);
  return top ? top.number : null;
}

/** Clone the board (deep copy) */
export function cloneBoard(board: StackCell[]): StackCell[] {
  return board.map(cell => cell.map(layer => ({ ...layer })));
}

/** Clone hands */
export function cloneHands(
  hands: Record<Player, PlayerHand>,
): Record<Player, PlayerHand> {
  return {
    fire: { ...hands.fire },
    water: { ...hands.water },
    swirl: { ...hands.swirl },
  };
}

/** Deep clone entire game state */
export function cloneState(state: Game3State): Game3State {
  return {
    ...state,
    board: cloneBoard(state.board),
    hands: cloneHands(state.hands),
  };
}

// ------------------------------------------------------------------
// Next player (turn rotation)
// ------------------------------------------------------------------

export function nextPlayer(player: Player): Player {
  const idx = PLAYERS.indexOf(player);
  return PLAYERS[(idx + 1) % 3];
}

// ------------------------------------------------------------------
// Valid placements from hand
// ------------------------------------------------------------------

/**
 * Returns cell indices where `player` can place `coinNumber` from hand.
 * Rules:
 *   - Empty cell: always OK
 *   - Occupied cell: top number must be < coinNumber (stack on top)
 *   - Max 3 layers
 */
export function getValidPlacements(
  board: StackCell[],
  coinNumber: CoinNumber,
): number[] {
  const valid: number[] = [];
  for (let i = 0; i < 9; i++) {
    const cell = board[i];
    if (cell.length === 0) {
      valid.push(i);
    } else if (cell.length < 3) {
      const tn = topNumber(cell);
      if (tn !== null && coinNumber > tn) {
        valid.push(i);
      }
    }
  }
  return valid;
}

/**
 * Returns coin numbers the player can place (has in hand and has valid targets).
 */
export function getPlayableHandCoins(
  board: StackCell[],
  hand: PlayerHand,
): CoinNumber[] {
  const playable: CoinNumber[] = [];
  for (const n of [1, 2, 3] as CoinNumber[]) {
    if (hand[n] > 0 && getValidPlacements(board, n).length > 0) {
      playable.push(n);
    }
  }
  return playable;
}

// ------------------------------------------------------------------
// Valid moves (board -> board)
// ------------------------------------------------------------------

/**
 * Returns indices of cells that have `player`'s coin on top and can be moved.
 * A coin can move only to an empty cell.
 */
export function getMovableCells(board: StackCell[], player: Player): number[] {
  // Must have at least one empty cell to move to
  const hasEmpty = board.some(c => c.length === 0);
  if (!hasEmpty) return [];

  const movable: number[] = [];
  for (let i = 0; i < 9; i++) {
    if (topOwner(board[i]) === player) {
      movable.push(i);
    }
  }
  return movable;
}

/**
 * Returns valid destination cells for a move from `fromCell`.
 * Movement destination: empty cells OR cells where moving coin's number > top number (stack).
 */
export function getValidMoveDestinations(
  board: StackCell[],
  fromCell: number,
): number[] {
  const movingCoin = topLayer(board[fromCell]);
  if (!movingCoin) return [];
  const dests: number[] = [];
  for (let i = 0; i < 9; i++) {
    if (i === fromCell) continue;
    if (board[i].length === 0) {
      dests.push(i);
    } else if (board[i].length < 3) {
      const tn = topNumber(board[i]);
      if (tn !== null && movingCoin.number > tn) {
        dests.push(i);
      }
    }
  }
  return dests;
}

// ------------------------------------------------------------------
// Check if a player has any legal action
// ------------------------------------------------------------------

export function hasAnyAction(
  board: StackCell[],
  hand: PlayerHand,
  player: Player,
): boolean {
  // Can place from hand?
  if (getPlayableHandCoins(board, hand).length > 0) return true;
  // Can move on board?
  if (getMovableCells(board, player).length > 0) return true;
  return false;
}

// ------------------------------------------------------------------
// Get ALL legal actions for a player
// ------------------------------------------------------------------

export function getAllActions(
  board: StackCell[],
  hand: PlayerHand,
  player: Player,
): Game3Action[] {
  const actions: Game3Action[] = [];

  // Place from hand
  for (const n of [1, 2, 3] as CoinNumber[]) {
    if (hand[n] <= 0) continue;
    for (const target of getValidPlacements(board, n)) {
      actions.push({ type: 'place', coinNumber: n, targetCell: target });
    }
  }

  // Move on board
  for (const from of getMovableCells(board, player)) {
    for (const to of getValidMoveDestinations(board, from)) {
      actions.push({ type: 'move', fromCell: from, toCell: to });
    }
  }

  return actions;
}

// ------------------------------------------------------------------
// Apply action (mutates nothing — returns new state)
// ------------------------------------------------------------------

export function applyPlaceAction(
  state: Game3State,
  action: PlaceAction,
): Game3State {
  const newState = cloneState(state);
  const { currentPlayer } = newState;
  const { coinNumber, targetCell } = action;

  // Remove from hand
  newState.hands[currentPlayer][coinNumber]--;

  // Place on board
  newState.board[targetCell].push({ owner: currentPlayer, number: coinNumber });

  return newState;
}

export function applyMoveAction(
  state: Game3State,
  action: MoveAction,
): Game3State {
  const newState = cloneState(state);
  const { fromCell, toCell } = action;

  // Pop top layer from source
  const layer = newState.board[fromCell].pop();
  if (!layer) return newState; // safety

  // Place on destination (must be empty per rules)
  newState.board[toCell].push(layer);

  return newState;
}

export function applyAction(
  state: Game3State,
  action: Game3Action,
): Game3State {
  if (action.type === 'place') {
    return applyPlaceAction(state, action as PlaceAction);
  } else {
    return applyMoveAction(state, action as MoveAction);
  }
}

// ------------------------------------------------------------------
// Winner check (3-player)
// ------------------------------------------------------------------

/**
 * Check all 8 lines. Returns the winning player and the line, or null.
 * In the rare case multiple players complete a line in the same state,
 * the first found wins (shouldn't happen mid-game normally).
 */
export function checkWinner(
  board: StackCell[],
): { winner: Player; line: number[] } | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    const oa = topOwner(board[a]);
    const ob = topOwner(board[b]);
    const oc = topOwner(board[c]);
    if (oa && oa === ob && ob === oc) {
      return { winner: oa, line: line as unknown as number[] };
    }
  }
  return null;
}

// ------------------------------------------------------------------
// Check draw — disabled: 三つ巴 has no draw.
// If a player can't move, they lose.
// ------------------------------------------------------------------

export function checkDraw(_state: Game3State): boolean {
  // No draw in 三つ巴. If a player can't move, they lose.
  return false;
}

// ------------------------------------------------------------------
// Advance turn (handles skipping stuck players)
// ------------------------------------------------------------------

export function advanceTurn(state: Game3State): Game3State {
  let newState = cloneState(state);
  newState.turnCount++;
  newState.selectedHandCoin = null;
  newState.selectedBoardCell = null;

  // Check winner after this action
  const result = checkWinner(newState.board);
  if (result) {
    newState.winner = result.winner;
    newState.winLine = result.line;
    newState.phase = 'finished';
    return newState;
  }

  // Rotate to next player.
  // If the next player can't move, they lose.
  // The winner is the player who made the last move (the one who just went).
  let next = nextPlayer(newState.currentPlayer);
  if (!hasAnyAction(newState.board, newState.hands[next], next)) {
    // Next player can't move — they lose.
    // Check the player after them too.
    const afterNext = nextPlayer(next);
    if (!hasAnyAction(newState.board, newState.hands[afterNext], afterNext)) {
      // Both opponents can't move — current player wins
      newState.winner = newState.currentPlayer;
      newState.phase = 'finished';
      return newState;
    }
    // Only next player is stuck — the previous player (who just moved) wins
    // because they forced an opponent into an unplayable state
    newState.winner = newState.currentPlayer;
    newState.phase = 'finished';
    return newState;
  }
  newState.currentPlayer = next;

  return newState;
}

// ------------------------------------------------------------------
// Full turn execution: action -> check -> advance
// ------------------------------------------------------------------

export function executeTurn(
  state: Game3State,
  action: Game3Action,
): Game3State {
  const afterAction = applyAction(state, action);
  return advanceTurn(afterAction);
}
