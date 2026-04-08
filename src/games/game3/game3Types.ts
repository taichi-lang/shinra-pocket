// ============================================================
// Game3: 三つ巴 — Types
// ============================================================

import type { CoinType, Difficulty } from '../../game/types';

// Re-export shared types used across games
export type { CoinType, Difficulty };
export { COINS, WIN_LINES } from '../../game/types';

// === 3 Players ===
export type Player = 'fire' | 'water' | 'swirl';

export const PLAYERS: Player[] = ['fire', 'water', 'swirl'];

export const PLAYER_EMOJI: Record<Player, string> = {
  fire: '🔥',
  water: '💧',
  swirl: '🌀',
};

export const PLAYER_LABEL: Record<Player, string> = {
  fire: '火',
  water: '水',
  swirl: '渦',
};

// === Coin Number (strength) ===
export type CoinNumber = 1 | 2 | 3;

// === A single layer in a stack ===
export interface StackLayer {
  owner: Player;
  number: CoinNumber;
}

// === A cell on the board (stack of 0-3 layers) ===
export type StackCell = StackLayer[];

// === Player hand: how many of each number remain ===
export interface PlayerHand {
  1: number; // starts at 2
  2: number; // starts at 2
  3: number; // starts at 2
}

export function createFullHand(): PlayerHand {
  return { 1: 2, 2: 2, 3: 2 };
}

// === Game mode ===
export type Game3Mode = 'vsCPU' | 'local3P';

// === Game phase ===
export type Game3Phase =
  | 'modeSelect'   // choosing mode / difficulty
  | 'playing'      // main gameplay
  | 'turnSwitch'   // local mode: "next player" splash
  | 'finished';    // someone won (or draw)

// === Action the current player can take ===
export type ActionType = 'placeFromHand' | 'moveOnBoard';

// === A placement action ===
export interface PlaceAction {
  type: 'place';
  coinNumber: CoinNumber;
  targetCell: number; // 0-8
}

// === A move action ===
export interface MoveAction {
  type: 'move';
  fromCell: number; // 0-8
  toCell: number;   // 0-8
}

export type Game3Action = PlaceAction | MoveAction;

// === Full game state ===
export interface Game3State {
  board: StackCell[];            // 9 cells
  hands: Record<Player, PlayerHand>;
  currentPlayer: Player;
  phase: Game3Phase;
  mode: Game3Mode;
  difficulty: Difficulty;
  winner: Player | null;
  winLine: number[] | null;
  turnCount: number;
  // UI state
  selectedHandCoin: CoinNumber | null;
  selectedBoardCell: number | null;
}

// === Initial state factory ===
export function createInitialGame3State(
  mode: Game3Mode = 'vsCPU',
  difficulty: Difficulty = 'normal',
): Game3State {
  return {
    board: Array.from({ length: 9 }, () => [] as StackLayer[]),
    hands: {
      fire: createFullHand(),
      water: createFullHand(),
      swirl: createFullHand(),
    },
    currentPlayer: 'fire',
    phase: 'playing',
    mode,
    difficulty,
    winner: null,
    winLine: null,
    turnCount: 0,
    selectedHandCoin: null,
    selectedBoardCell: null,
  };
}

// === Config ===
export interface Game3Config {
  mode: Game3Mode;
  difficulty: Difficulty;
  cpuDelay: number; // ms
}

export const DEFAULT_GAME3_CONFIG: Game3Config = {
  mode: 'vsCPU',
  difficulty: 'normal',
  cpuDelay: 700,
};
