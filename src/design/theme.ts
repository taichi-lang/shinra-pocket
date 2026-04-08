/**
 * Shinra Pocket - Design System Theme
 * Dark space background with gold accents, glass morphism cards.
 */

import { Dimensions, TextStyle, ViewStyle } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Colors ───────────────────────────────────────────────
export const COLORS = {
  // Backgrounds
  bg: '#050510',
  bgLight: '#0a0a1e',
  bgGradientStart: '#1a0a2e',
  bgGradientEnd: '#0d1b3e',
  splashBg: '#0d0820',
  splashGradientStart: '#2d1b69',

  // Accent
  gold: '#ffd700',
  goldDark: '#b8960f',
  goldLight: '#ffe866',
  orange: '#ff8c00',
  red: '#ff4455',
  green: '#44ff88',
  blue: '#88aaff',

  // Text
  textPrimary: '#ffffff',
  textSecondary: '#9988bb',
  textMuted: '#554477',
  textDark: '#444444',
  textGold: '#ffd700',

  // Cards / Glass
  cardBg: 'rgba(255,255,255,0.04)',
  cardBgHover: 'rgba(255,255,255,0.08)',
  cardBorder: 'rgba(255,255,255,0.09)',
  cardBorderActive: 'rgba(255,215,0,0.45)',
  glassBg: 'rgba(255,255,255,0.06)',
  glassBorder: 'rgba(255,255,255,0.12)',

  // Overlays
  overlay: 'rgba(5,5,16,0.7)',
  overlayLight: 'rgba(5,5,16,0.4)',
  overlayDark: 'rgba(0,0,0,0.85)',

  // Coin gradients
  fire: ['#ffaa44', '#cc2200'] as [string, string],
  water: ['#44ddff', '#0044cc'] as [string, string],
  swirl: ['#dd88ff', '#5500cc'] as [string, string],

  // Button gradients
  buttonPrimary: ['#ffd700', '#b8960f'] as [string, string],
  buttonSecondary: ['#333355', '#1a1a33'] as [string, string],
  buttonDanger: ['#ff4455', '#aa1122'] as [string, string],
} as const;

// ─── Sizes ────────────────────────────────────────────────
export const SIZES = {
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,

  // Board
  boardSize: Math.min(SCREEN_WIDTH - 32, 320),
  cellSize: Math.min(SCREEN_WIDTH - 32, 320) / 3 - 8,

  // Coins
  coinSize: 54,
  coinSizeSmall: 32,
  coinSizeMedium: 44,
  coinSizeLarge: 72,

  // Spacing scale (4px base)
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,

  // Border radii
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 16,
  radiusXl: 24,
  radiusFull: 999,

  // Button heights
  buttonHeight: 52,
  buttonHeightSm: 40,
  buttonHeightLg: 60,

  // Icon
  iconSm: 20,
  iconMd: 24,
  iconLg: 32,
} as const;

// ─── Fonts ────────────────────────────────────────────────
export const FONTS = {
  regular: { fontWeight: '400' as const },
  medium: { fontWeight: '500' as const },
  semibold: { fontWeight: '600' as const },
  bold: { fontWeight: '700' as const },
  heavy: { fontWeight: '900' as const },
} as const;

// ─── Typography presets ───────────────────────────────────
export const TYPOGRAPHY: Record<string, TextStyle> = {
  h1: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  h3: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textPrimary,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  goldTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.gold,
    letterSpacing: 2,
    textShadowColor: 'rgba(255,215,0,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
} as const;

// ─── Shadow presets ───────────────────────────────────────
export const SHADOWS: Record<string, ViewStyle> = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  gold: {
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

// ─── Animation durations ──────────────────────────────────
export const DURATIONS = {
  fast: 150,
  normal: 300,
  slow: 500,
  xslow: 800,
} as const;
