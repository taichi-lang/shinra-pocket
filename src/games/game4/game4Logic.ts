// ============================================================
// Game4: パタパタ (Mancala) — Core Game Logic
// ============================================================

import {
  BoardState,
  Player,
  SowResult,
  SowStep,
  createInitialBoard,
} from './game4Types';

// ---------- Circulation order ----------
// 全プレイヤー共通: a0→a1→a2→pitR→b2→b1→b0→pitL→a0...
// 一方向のみ（反時計回り）。AもBも同じ方向で回る。

type Slot = 'a0' | 'a1' | 'a2' | 'pitR' | 'b2' | 'b1' | 'b0' | 'pitL';

const CYCLE: Slot[] = ['a0', 'a1', 'a2', 'pitR', 'b2', 'b1', 'b0', 'pitL'];

function getCycle(_player: Player): Slot[] {
  return CYCLE;
}

// ---------- Board helpers ----------

/** Deep clone a board */
export function cloneBoard(b: BoardState): BoardState {
  return {
    a: [...b.a] as [number, number, number],
    b: [...b.b] as [number, number, number],
    pitL: b.pitL,
    pitR: b.pitR,
  };
}

function getSlotValue(board: BoardState, slot: Slot): number {
  switch (slot) {
    case 'a0': return board.a[0];
    case 'a1': return board.a[1];
    case 'a2': return board.a[2];
    case 'b0': return board.b[0];
    case 'b1': return board.b[1];
    case 'b2': return board.b[2];
    case 'pitL': return board.pitL;
    case 'pitR': return board.pitR;
  }
}

function setSlotValue(board: BoardState, slot: Slot, value: number): void {
  switch (slot) {
    case 'a0': board.a[0] = value; break;
    case 'a1': board.a[1] = value; break;
    case 'a2': board.a[2] = value; break;
    case 'b0': board.b[0] = value; break;
    case 'b1': board.b[1] = value; break;
    case 'b2': board.b[2] = value; break;
    case 'pitL': board.pitL = value; break;
    case 'pitR': board.pitR = value; break;
  }
}

function incSlot(board: BoardState, slot: Slot): void {
  setSlotValue(board, slot, getSlotValue(board, slot) + 1);
}

// ---------- Public API ----------

/**
 * Get valid pit indices (0-2) for the given player.
 * A pit is valid if it has at least 1 coin.
 */
export function getValidPits(board: BoardState, player: Player): number[] {
  const pits = player === 'A' ? board.a : board.b;
  const valid: number[] = [];
  for (let i = 0; i < 3; i++) {
    if (pits[i] > 0) valid.push(i);
  }
  return valid;
}

/**
 * Sow seeds from the chosen pit index (0-2) for the current player.
 * Returns the new board, whether an extra turn is earned, and animation steps.
 */
export function sowSeeds(
  board: BoardState,
  player: Player,
  pitIndex: number,
): SowResult {
  const newBoard = cloneBoard(board);
  const cycle = getCycle(player);

  // The starting slot in cycle
  const startSlotId = player === 'A'
    ? (`a${pitIndex}` as Slot)
    : (`b${pitIndex}` as Slot);

  // Pick up all coins
  const coins = getSlotValue(newBoard, startSlotId);
  if (coins === 0) {
    return { board: newBoard, extraTurn: false, steps: [] };
  }
  setSlotValue(newBoard, startSlotId, 0);

  // Find start position in cycle (the slot AFTER the picked-up slot)
  const startIdx = cycle.indexOf(startSlotId);
  const steps: SowStep[] = [];

  let lastSlot: Slot = startSlotId;
  for (let i = 0; i < coins; i++) {
    const idx = (startIdx + 1 + i) % cycle.length;
    const slot = cycle[idx];
    incSlot(newBoard, slot);
    lastSlot = slot;
    steps.push({
      target: slot,
      boardAfter: cloneBoard(newBoard),
    });
  }

  // Extra turn only if last coin landed in the player's OWN store pit
  const ownPit: Slot = player === 'A' ? 'pitR' : 'pitL';
  const extraTurn = lastSlot === ownPit;

  // No capture rule — coins simply stay where they land.

  return { board: newBoard, extraTurn, steps };
}

/**
 * Check if the game is over (either side's pits are all empty).
 * Returns true if the game has ended. Does NOT mutate the board.
 */
export function isGameOver(board: BoardState): boolean {
  const aEmpty = board.a[0] === 0 && board.a[1] === 0 && board.a[2] === 0;
  const bEmpty = board.b[0] === 0 && board.b[1] === 0 && board.b[2] === 0;
  return aEmpty || bEmpty;
}

/**
 * Finalize the board when the game is over:
 * remaining coins on each side go to that side's goal.
 * Mutates the board in place.
 */
export function finalizeBoard(board: BoardState): void {
  // Sweep remaining A-side coins into A's goal (pitR)
  board.pitR += board.a[0] + board.a[1] + board.a[2];
  board.a = [0, 0, 0];
  // Sweep remaining B-side coins into B's goal (pitL)
  board.pitL += board.b[0] + board.b[1] + board.b[2];
  board.b = [0, 0, 0];
}

/**
 * Check winner after the game ends (standard Mancala rules).
 * When one side's pits are all empty, remaining coins on the OTHER side
 * go to that other player's goal. Then compare goals.
 *
 * Returns 'A', 'B', or 'draw'. Returns null if the game is not over.
 */
export function checkWinner(board: BoardState): Player | null {
  if (!isGameOver(board)) return null;

  // Finalize on a copy to determine winner without mutating input
  const b = cloneBoard(board);
  finalizeBoard(b);

  // 引き分けなし: 同点の場合は後手(B)の勝ち（先手有利を相殺）
  if (b.pitR > b.pitL) return 'A';
  return 'B';
}

/**
 * Check if current player gets extra turn based on last sow result.
 */
export function checkExtraTurn(result: SowResult): boolean {
  return result.extraTurn;
}

/**
 * Count total coins on one side.
 */
export function sideTotal(board: BoardState, player: Player): number {
  const pits = player === 'A' ? board.a : board.b;
  return pits[0] + pits[1] + pits[2];
}

/**
 * Get the opponent of the given player.
 */
export function opponent(player: Player): Player {
  return player === 'A' ? 'B' : 'A';
}

export { createInitialBoard };
