/**
 * analyticsService — Analytics wrapper for ShinraPocket.
 *
 * Ready for Firebase Analytics integration when Firebase project is created.
 * Currently logs events to console in __DEV__ mode.
 */

// ---------------------------------------------------------------------------
// Event type definitions
// ---------------------------------------------------------------------------

export type GameEvent = {
  game_start: { gameId: string; difficulty: string; mode: string };
  game_end: { gameId: string; result: string; duration: number };
  ticket_consumed: { gameId: string; mode: string };
  ticket_earned_ad: { count: number };
  ticket_earned_serial: { code: string; amount: number };
  subscription_started: Record<string, never>;
  subscription_cancelled: Record<string, never>;
  screen_view: { screen: string };
  ad_shown: { type: 'banner' | 'interstitial' | 'rewarded' };
  online_match_start: { gameId: string };
  online_match_end: { gameId: string; result: string };
};

type EventName = keyof GameEvent;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let initialized = false;
let userId: string | null = null;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize analytics.
 * Currently a no-op — will wire up Firebase Analytics when the project is created.
 */
export function initAnalytics(): void {
  if (initialized) return;
  initialized = true;

  if (__DEV__) {
    console.log('[Analytics] Initialized (dev mode — events logged to console)');
  }

  // TODO: Initialize Firebase Analytics here
  // e.g. import analytics from '@react-native-firebase/analytics';
}

/**
 * Log an analytics event with typed parameters.
 */
export function logEvent<K extends EventName>(
  name: K,
  params: GameEvent[K],
): void {
  if (!initialized) {
    if (__DEV__) console.warn('[Analytics] logEvent called before init');
    return;
  }

  if (__DEV__) {
    console.log(`[Analytics] ${name}`, params);
  }

  // TODO: Forward to Firebase Analytics
  // e.g. analytics().logEvent(name, params);
}

/**
 * Log a screen view event.
 */
export function logScreenView(screenName: string): void {
  logEvent('screen_view', { screen: screenName });

  // TODO: Also call analytics().logScreenView({ screen_name: screenName });
}

/**
 * Set the user ID for analytics attribution.
 */
export function setUserId(id: string): void {
  userId = id;

  if (__DEV__) {
    console.log(`[Analytics] setUserId: ${id}`);
  }

  // TODO: analytics().setUserId(id);
}

/**
 * Get the current user ID (if set).
 */
export function getUserId(): string | null {
  return userId;
}
