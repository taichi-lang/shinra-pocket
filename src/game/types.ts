// === コインの種類 ===
export type CoinType = 'fire' | 'water' | 'swirl';

// === セル状態 ===
export type CellState = 'player' | 'cpu' | 'opponent' | null;

// === ゲームフェーズ ===
export type GamePhase = 'place' | 'move';

// === ターン ===
export type Turn = 'player' | 'cpu' | 'opponent';

// === 難易度 ===
export type Difficulty = 'normal' | 'hard';

// === コイン情報 ===
export interface CoinInfo {
  emoji: string;
  colors: [string, string]; // gradient colors
  label: string;
  description: string;
}

// === コインデータ ===
export const COINS: Record<CoinType, CoinInfo> = {
  fire: {
    emoji: '🔥',
    colors: ['#ffaa44', '#cc2200'],
    label: '火のコイン',
    description: '熱き炎で勝利を掴め',
  },
  water: {
    emoji: '💧',
    colors: ['#44ddff', '#0044cc'],
    label: '水のコイン',
    description: '冷静な判断で勝利へ',
  },
  swirl: {
    emoji: '🌀',
    colors: ['#dd88ff', '#5500cc'],
    label: '紫の渦コイン',
    description: '神秘の力で圧倒せよ',
  },
};

// === CPU コインマッピング ===
export const CPU_COIN_MAP: Record<CoinType, CoinType> = {
  fire: 'water',
  water: 'swirl',
  swirl: 'fire',
};

// === 勝利ライン ===
export const WIN_LINES: [number, number, number][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // 横
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // 縦
  [0, 4, 8], [2, 4, 6],             // 斜め
];

// === 隣接セル ===
export const ADJACENTS: Record<number, number[]> = {
  0: [1, 3, 4],
  1: [0, 2, 3, 4, 5],
  2: [1, 4, 5],
  3: [0, 1, 4, 6, 7],
  4: [0, 1, 2, 3, 5, 6, 7, 8],
  5: [1, 2, 4, 7, 8],
  6: [3, 4, 7],
  7: [3, 4, 5, 6, 8],
  8: [4, 5, 7],
};

// === ゲーム状態 ===
export interface GameState {
  board: CellState[];
  phase: GamePhase;
  turn: Turn;
  playerPlaced: number;
  cpuPlaced: number;
  selected: number | null;
  active: boolean;
  moveRound: number;
  winLine: number[] | null;
}

// === 初期ゲーム状態 ===
export function createInitialGameState(): GameState {
  return {
    board: Array(9).fill(null),
    phase: 'place',
    turn: 'player',
    playerPlaced: 0,
    cpuPlaced: 0,
    selected: null,
    active: true,
    moveRound: 0,
    winLine: null,
  };
}
