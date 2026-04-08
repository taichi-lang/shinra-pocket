import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const COLORS = {
  bg: '#050510',
  bgGradientStart: '#1a0a2e',
  bgGradientEnd: '#0d1b3e',
  splashBg: '#0d0820',
  splashGradientStart: '#2d1b69',

  gold: '#ffd700',
  orange: '#ff8c00',
  red: '#ff4455',
  blue: '#88aaff',

  textPrimary: '#ffffff',
  textSecondary: '#9988bb',
  textMuted: '#554477',
  textDark: '#444444',

  cardBg: 'rgba(255,255,255,0.04)',
  cardBorder: 'rgba(255,255,255,0.09)',
  cardBorderActive: 'rgba(255,215,0,0.45)',

  fire: ['#ffaa44', '#cc2200'] as [string, string],
  water: ['#44ddff', '#0044cc'] as [string, string],
  swirl: ['#dd88ff', '#5500cc'] as [string, string],
};

export const SIZES = {
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  boardSize: Math.min(SCREEN_WIDTH - 32, 320),
  cellSize: Math.min(SCREEN_WIDTH - 32, 320) / 3 - 8,
  coinSize: 54,
  coinSizeSmall: 32,
  coinSizeLarge: 72,
};

export const FONTS = {
  regular: { fontWeight: '400' as const },
  bold: { fontWeight: '700' as const },
  heavy: { fontWeight: '900' as const },
};
