/**
 * SoundMap — Registry of all sound effects in ShinraPocket
 *
 * Each entry maps a sound name to its asset source.
 * Audio files should be placed in assets/audio/sfx/ and assets/audio/bgm/.
 *
 * NOTE: The require() calls below reference placeholder paths.
 * Replace with actual audio file paths once assets are available.
 */

// ============================================================
// Sound Effect Keys
// ============================================================

export type SFXName =
  | 'coinPlace'
  | 'coinMove'
  | 'victory'
  | 'defeat'
  | 'timerWarning'
  | 'uiTap'
  | 'uiBack'
  | 'matchFound'
  | 'gameStart'
  | 'turnChange'
  | 'combo'
  | 'error'
  | 'reward'
  | 'levelUp'
  | 'countdown321';

export type BGMName =
  | 'lobby'
  | 'game1_coinboard'
  | 'game2'
  | 'game3'
  | 'game4'
  | 'game5'
  | 'game6_quiz'
  | 'battle'
  | 'results';

// ============================================================
// SFX Map
// ============================================================

/**
 * Sound effect definitions with metadata.
 * `source` will be populated with require() calls once audio files exist.
 */
export interface SoundDef {
  key: string;
  description: string;
  descriptionJa: string;
  category: 'gameplay' | 'ui' | 'feedback' | 'timer';
  /** require() asset — null means file not yet available */
  source: number | null;
  /** Default volume multiplier (0.0-1.0) relative to SFX channel */
  volume: number;
}

export const SFX_MAP: Record<SFXName, SoundDef> = {
  coinPlace: {
    key: 'coinPlace',
    description: 'Coin placed on board',
    descriptionJa: 'コインをボードに配置',
    category: 'gameplay',
    source: require('../../assets/audio/sfx/coin_place.mp3'),
    volume: 1.0,
  },
  coinMove: {
    key: 'coinMove',
    description: 'Coin moved on board',
    descriptionJa: 'コインを移動',
    category: 'gameplay',
    source: require('../../assets/audio/sfx/coin_move.mp3'),
    volume: 0.8,
  },
  victory: {
    key: 'victory',
    description: 'Game victory fanfare',
    descriptionJa: '勝利ファンファーレ',
    category: 'feedback',
    source: require('../../assets/audio/sfx/victory.mp3'),
    volume: 1.0,
  },
  defeat: {
    key: 'defeat',
    description: 'Game defeat sound',
    descriptionJa: '敗北サウンド',
    category: 'feedback',
    source: require('../../assets/audio/sfx/defeat.mp3'),
    volume: 0.9,
  },
  timerWarning: {
    key: 'timerWarning',
    description: 'Timer countdown warning (last 5 seconds)',
    descriptionJa: 'タイマー警告（残り5秒）',
    category: 'timer',
    source: require('../../assets/audio/sfx/timer_warning.mp3'),
    volume: 0.7,
  },
  uiTap: {
    key: 'uiTap',
    description: 'UI button tap',
    descriptionJa: 'UIボタンタップ',
    category: 'ui',
    source: require('../../assets/audio/sfx/ui_tap.mp3'),
    volume: 0.5,
  },
  uiBack: {
    key: 'uiBack',
    description: 'UI back / cancel',
    descriptionJa: 'UI戻る・キャンセル',
    category: 'ui',
    source: require('../../assets/audio/sfx/ui_back.mp3'),
    volume: 0.5,
  },
  matchFound: {
    key: 'matchFound',
    description: 'Online match found',
    descriptionJa: 'オンラインマッチ成立',
    category: 'feedback',
    source: require('../../assets/audio/sfx/match_found.mp3'),
    volume: 1.0,
  },
  gameStart: {
    key: 'gameStart',
    description: 'Game start signal',
    descriptionJa: 'ゲーム開始合図',
    category: 'feedback',
    source: require('../../assets/audio/sfx/game_start.mp3'),
    volume: 1.0,
  },
  turnChange: {
    key: 'turnChange',
    description: 'Turn change notification',
    descriptionJa: 'ターン切替通知',
    category: 'gameplay',
    source: require('../../assets/audio/sfx/turn_change.mp3'),
    volume: 0.6,
  },
  combo: {
    key: 'combo',
    description: 'Combo / chain reaction',
    descriptionJa: 'コンボ・連鎖',
    category: 'gameplay',
    source: require('../../assets/audio/sfx/combo.mp3'),
    volume: 1.0,
  },
  error: {
    key: 'error',
    description: 'Invalid action / error',
    descriptionJa: '無効な操作・エラー',
    category: 'ui',
    source: require('../../assets/audio/sfx/error.mp3'),
    volume: 0.6,
  },
  reward: {
    key: 'reward',
    description: 'Reward received',
    descriptionJa: '報酬獲得',
    category: 'feedback',
    source: require('../../assets/audio/sfx/reward.mp3'),
    volume: 1.0,
  },
  levelUp: {
    key: 'levelUp',
    description: 'Level up',
    descriptionJa: 'レベルアップ',
    category: 'feedback',
    source: require('../../assets/audio/sfx/level_up.mp3'),
    volume: 1.0,
  },
  countdown321: {
    key: 'countdown321',
    description: '3-2-1 countdown beep',
    descriptionJa: '3-2-1カウントダウン音',
    category: 'timer',
    source: require('../../assets/audio/sfx/countdown.mp3'),
    volume: 0.8,
  },
};

// ============================================================
// BGM Map
// ============================================================

export interface BGMDef {
  key: string;
  description: string;
  descriptionJa: string;
  source: number | null;
  volume: number;
}

export const BGM_MAP: Record<BGMName, BGMDef> = {
  lobby: {
    key: 'lobby',
    description: 'Main menu / lobby music',
    descriptionJa: 'メインメニュー・ロビーBGM',
    source: require('../../assets/audio/bgm/lobby.mp3'),
    volume: 0.6,
  },
  game1_coinboard: {
    key: 'game1_coinboard',
    description: 'Coin Board game BGM',
    descriptionJa: 'コインボードゲームBGM',
    source: require('../../assets/audio/bgm/game1_coinboard.mp3'),
    volume: 0.5,
  },
  game2: {
    key: 'game2',
    description: 'Game 2 BGM',
    descriptionJa: 'ゲーム2 BGM',
    source: require('../../assets/audio/bgm/game2.mp3'),
    volume: 0.5,
  },
  game3: {
    key: 'game3',
    description: 'Game 3 BGM',
    descriptionJa: 'ゲーム3 BGM',
    source: require('../../assets/audio/bgm/game3.mp3'),
    volume: 0.5,
  },
  game4: {
    key: 'game4',
    description: 'Game 4 BGM',
    descriptionJa: 'ゲーム4 BGM',
    source: require('../../assets/audio/bgm/game4.mp3'),
    volume: 0.5,
  },
  game5: {
    key: 'game5',
    description: 'Game 5 BGM',
    descriptionJa: 'ゲーム5 BGM',
    source: require('../../assets/audio/bgm/game5.mp3'),
    volume: 0.5,
  },
  game6_quiz: {
    key: 'game6_quiz',
    description: '3x3 Quiz game BGM',
    descriptionJa: '3x3クイズゲームBGM',
    source: require('../../assets/audio/bgm/game6_quiz.mp3'),
    volume: 0.5,
  },
  battle: {
    key: 'battle',
    description: 'Online battle BGM',
    descriptionJa: 'オンラインバトルBGM',
    source: require('../../assets/audio/bgm/battle.mp3'),
    volume: 0.6,
  },
  results: {
    key: 'results',
    description: 'Results screen BGM',
    descriptionJa: 'リザルト画面BGM',
    source: require('../../assets/audio/bgm/results.mp3'),
    volume: 0.5,
  },
};

/**
 * Get all SFX entries as an array of [key, source] for batch loading.
 * Filters out sounds with null source (no file yet).
 */
export function getLoadableSFX(): Array<[string, number]> {
  return Object.values(SFX_MAP)
    .filter((def): def is SoundDef & { source: number } => def.source !== null)
    .map(def => [def.key, def.source]);
}

/**
 * Get all SFX keys.
 */
export function getAllSFXKeys(): SFXName[] {
  return Object.keys(SFX_MAP) as SFXName[];
}

/**
 * Get all BGM keys.
 */
export function getAllBGMKeys(): BGMName[] {
  return Object.keys(BGM_MAP) as BGMName[];
}
