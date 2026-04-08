/**
 * crashReporter — Crash reporting wrapper for ShinraPocket.
 *
 * Ready for Firebase Crashlytics or Sentry integration.
 * Currently logs errors to console in __DEV__ mode.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Breadcrumb {
  timestamp: number;
  message: string;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let initialized = false;
let userId: string | null = null;
const breadcrumbs: Breadcrumb[] = [];
const MAX_BREADCRUMBS = 50;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize crash reporter.
 * Currently a no-op — will wire up Crashlytics/Sentry when configured.
 */
export function initCrashReporter(): void {
  if (initialized) return;
  initialized = true;

  if (__DEV__) {
    console.log('[CrashReporter] Initialized (dev mode — errors logged to console)');
  }

  // TODO: Initialize Firebase Crashlytics or Sentry here
  // e.g. import crashlytics from '@react-native-firebase/crashlytics';
}

/**
 * Log a non-fatal error with optional context.
 */
export function logError(error: Error, context?: string): void {
  if (__DEV__) {
    console.error(`[CrashReporter] ${context ?? 'Error'}:`, error);
  }

  // TODO: Forward to Crashlytics
  // crashlytics().recordError(error);

  // Attach breadcrumbs and context as custom attributes
  // if (context) crashlytics().setAttribute('error_context', context);
}

/**
 * Set the user identifier for crash reports.
 */
export function setUser(id: string): void {
  userId = id;

  if (__DEV__) {
    console.log(`[CrashReporter] setUser: ${id}`);
  }

  // TODO: crashlytics().setUserId(id);
}

/**
 * Get the current user ID (if set).
 */
export function getUser(): string | null {
  return userId;
}

/**
 * Add a breadcrumb for debugging.
 * Breadcrumbs are attached to the next crash report.
 */
export function addBreadcrumb(message: string): void {
  const crumb: Breadcrumb = {
    timestamp: Date.now(),
    message,
  };

  breadcrumbs.push(crumb);

  // Keep only the most recent breadcrumbs
  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs.shift();
  }

  if (__DEV__) {
    console.log(`[CrashReporter] Breadcrumb: ${message}`);
  }

  // TODO: crashlytics().log(message);
}

/**
 * Get all stored breadcrumbs (for debugging).
 */
export function getBreadcrumbs(): readonly Breadcrumb[] {
  return breadcrumbs;
}
