/**
 * Shinra Pocket - Shared Animation Definitions
 * Reanimated 3 worklet-based animation presets.
 */

import {
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  withRepeat,
  Easing,
  type WithTimingConfig,
  type WithSpringConfig,
  SharedValue,
} from 'react-native-reanimated';

// ─── Spring configs ───────────────────────────────────────
export const SPRING_CONFIGS = {
  /** Snappy press feedback */
  press: {
    damping: 15,
    stiffness: 300,
    mass: 0.8,
  } satisfies WithSpringConfig,

  /** Bouncy entrance */
  bouncy: {
    damping: 12,
    stiffness: 180,
    mass: 1,
  } satisfies WithSpringConfig,

  /** Gentle movement */
  gentle: {
    damping: 20,
    stiffness: 120,
    mass: 1,
  } satisfies WithSpringConfig,

  /** Stiff / precise */
  stiff: {
    damping: 28,
    stiffness: 400,
    mass: 0.6,
  } satisfies WithSpringConfig,
} as const;

// ─── Timing configs ──────────────────────────────────────
export const TIMING_CONFIGS = {
  fadeIn: {
    duration: 300,
    easing: Easing.out(Easing.cubic),
  } satisfies WithTimingConfig,

  fadeOut: {
    duration: 200,
    easing: Easing.in(Easing.cubic),
  } satisfies WithTimingConfig,

  slide: {
    duration: 400,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  } satisfies WithTimingConfig,

  slow: {
    duration: 600,
    easing: Easing.inOut(Easing.cubic),
  } satisfies WithTimingConfig,
} as const;

// ─── Animation builders (worklet-safe) ───────────────────

/** Button press scale: 1 -> 0.93 -> 1 */
export function pressAnimation(scale: SharedValue<number>) {
  'worklet';
  scale.value = withSequence(
    withSpring(0.93, SPRING_CONFIGS.press),
    withSpring(1, SPRING_CONFIGS.press),
  );
}

/** Scale in from 0 to 1 with bounce */
export function scaleIn(scale: SharedValue<number>, delay = 0) {
  'worklet';
  scale.value = 0;
  scale.value = withDelay(delay, withSpring(1, SPRING_CONFIGS.bouncy));
}

/** Fade in from 0 to 1 */
export function fadeIn(opacity: SharedValue<number>, delay = 0) {
  'worklet';
  opacity.value = 0;
  opacity.value = withDelay(delay, withTiming(1, TIMING_CONFIGS.fadeIn));
}

/** Fade out from 1 to 0 */
export function fadeOut(opacity: SharedValue<number>) {
  'worklet';
  opacity.value = withTiming(0, TIMING_CONFIGS.fadeOut);
}

/** Slide up from offset to 0 */
export function slideUp(
  translateY: SharedValue<number>,
  from = 40,
  delay = 0,
) {
  'worklet';
  translateY.value = from;
  translateY.value = withDelay(delay, withTiming(0, TIMING_CONFIGS.slide));
}

/** Continuous pulse: scale between min and max */
export function pulse(
  scale: SharedValue<number>,
  min = 0.95,
  max = 1.05,
) {
  'worklet';
  scale.value = withRepeat(
    withSequence(
      withTiming(max, { duration: 800, easing: Easing.inOut(Easing.sin) }),
      withTiming(min, { duration: 800, easing: Easing.inOut(Easing.sin) }),
    ),
    -1,
    true,
  );
}

/** Coin flip rotation (Y axis): 0 -> 360 */
export function coinFlip(rotateY: SharedValue<number>, delay = 0) {
  'worklet';
  rotateY.value = 0;
  rotateY.value = withDelay(
    delay,
    withTiming(360, { duration: 600, easing: Easing.out(Easing.cubic) }),
  );
}

/** Shake on X axis for error feedback */
export function shake(translateX: SharedValue<number>) {
  'worklet';
  translateX.value = withSequence(
    withTiming(-8, { duration: 50 }),
    withTiming(8, { duration: 50 }),
    withTiming(-6, { duration: 50 }),
    withTiming(6, { duration: 50 }),
    withTiming(0, { duration: 50 }),
  );
}

/** Staggered entrance helper: returns delay for index */
export function staggerDelay(index: number, baseDelay = 60): number {
  return index * baseDelay;
}
