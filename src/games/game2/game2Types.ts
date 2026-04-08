// Game2 Types — 一騎打ち (One-on-One) with stacking

import { CoinType, Difficulty } from '../../game/types';

// === コインの数字 ===
export type CoinNumber = 1 | 2;

// === プレイヤー識別 ===
export type Player = 'player' | 'cpu';

// === スタック内の1枚のコイン ===
export interface StackCoin {
  owner: Player;
  number: CoinNumber;
  coinType: CoinType; // fire / water / swirl (for display)
}

// === 1マスの状態（最大2層） ===
export interface StackCell {
  bottom: StackCoin | null;
  top: StackCoin | null;
}

// === 手持ちコインの残数 ===
export interface Hand {
  count1: number; // 「1」の残り枚数 (初期2)
  count2: number; // 「2」の残り枚数 (初期2)
}

// === アクション種別 ===
export type ActionType = 'place' | 'move';

// === ゲームフェーズ ===
export type Game2Phase =
  | 'selectAction'    // 配置 or 移動を選ぶ
  | 'selectHandCoin'  // 手持ちのどのコインを置くか
  | 'selectTarget'    // 置く先 or 移動先を選ぶ
  | 'selectBoardCoin' // ボード上のどのコインを動かすか
  | 'cpuThinking'     // CPU思考中
  | 'gameOver';       // 終了

// === ゲーム状態 ===
export interface Game2State {
  board: StackCell[];          // 9マス
  turn: Player;
  phase: Game2Phase;
  playerHand: Hand;
  cpuHand: Hand;
  selectedAction: ActionType | null;
  selectedCoinNumber: CoinNumber | null; // 配置時に選んだコイン番号
  selectedBoardIndex: number | null;     // 移動時に選んだマス
  winner: Player | 'draw' | null;
  winLine: number[] | null;
  active: boolean;
  turnCount: number;
}

// === Game2 設定 ===
export interface Game2Config {
  difficulty: Difficulty;
  playerCoin: CoinType;
  cpuCoin: CoinType;
  cpuDelay: number;
}

export const DEFAULT_GAME2_CONFIG: Omit<Game2Config, 'playerCoin' | 'cpuCoin'> = {
  difficulty: 'normal',
  cpuDelay: 800,
};

// === 初期状態生成 ===
export function createEmptyCell(): StackCell {
  return { bottom: null, top: null };
}

export function createInitialGame2State(): Game2State {
  return {
    board: Array.from({ length: 9 }, () => createEmptyCell()),
    turn: 'player',
    phase: 'selectAction',
    playerHand: { count1: 2, count2: 2 },
    cpuHand: { count1: 2, count2: 2 },
    selectedAction: null,
    selectedCoinNumber: null,
    selectedBoardIndex: null,
    winner: null,
    winLine: null,
    active: true,
    turnCount: 0,
  };
}

// === AI用: 配置アクション ===
export interface PlaceAction {
  type: 'place';
  coinNumber: CoinNumber;
  targetIndex: number;
}

// === AI用: 移動アクション ===
export interface MoveAction {
  type: 'move';
  fromIndex: number;
  toIndex: number;
}

export type GameAction = PlaceAction | MoveAction;

// === 結果 ===
export type Game2Result = 'player' | 'cpu' | 'draw';
