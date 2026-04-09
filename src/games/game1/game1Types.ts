// Game1 Types — Re-export core types and add Game1-specific config

export type {
  CoinType,
  CellState,
  GamePhase,
  Turn,
  Difficulty,
  CoinInfo,
  GameState,
} from '../../game/types';

export {
  COINS,
  CPU_COIN_MAP,
  WIN_LINES,
  ADJACENTS,
  createInitialGameState,
} from '../../game/types';

// === Game1 タイマー設定 ===
export interface Game1TimerConfig {
  /** 移動フェーズの初期制限時間（秒） */
  initialTime: number;
  /** ラウンドごとの時間短縮（秒） */
  decrementPerRound: number;
  /** 最小制限時間（秒） */
  minimumTime: number;
}

export const DEFAULT_TIMER_CONFIG: Game1TimerConfig = {
  initialTime: 5,
  decrementPerRound: 1,
  minimumTime: 1,
};

// === Game1 設定 ===
export interface Game1Config {
  /** 難易度 */
  difficulty: 'normal' | 'hard';
  /** プレイヤーのコイン種類 */
  playerCoin: import('../../game/types').CoinType;
  /** CPUのコイン種類 */
  cpuCoin: import('../../game/types').CoinType;
  /** タイマー設定 */
  timer: Game1TimerConfig;
  /** CPU思考遅延（ミリ秒） */
  cpuDelay: number;
}

export const DEFAULT_GAME1_CONFIG: Omit<Game1Config, 'playerCoin' | 'cpuCoin'> = {
  difficulty: 'normal',
  timer: DEFAULT_TIMER_CONFIG,
  cpuDelay: 800,
};

// === Game1 結果 ===
export type Game1Result = 'player' | 'cpu' | 'draw' | 'timeout';
