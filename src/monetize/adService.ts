/**
 * AdService — Google Mobile Ads integration for ShinraPocket
 *
 * Uses `react-native-google-mobile-ads` (v16+), which is compatible with
 * Expo SDK 52 managed workflow via its built-in config plugin.
 *
 * IMPORTANT:
 *  - This package does NOT work in Expo Go. You must use a development build
 *    (EAS Build or local `npx expo run:android` / `npx expo run:ios`).
 *  - The config plugin is registered in app.json under "plugins".
 *  - Test ad unit IDs are used in __DEV__ mode; swap the production IDs in
 *    AD_UNIT_IDS before release.
 *
 * Ad types supported:
 *  - Banner (via getBannerAdProps for <BannerAd /> component)
 *  - Interstitial (load + show, with throttle support)
 *  - Rewarded (load + show, with earnAdTicket() integration)
 */

import { Platform } from 'react-native';
import { earnAdTicket } from './ticketStore';

// Lazy-load react-native-google-mobile-ads to avoid crash in Expo Go
let MobileAds: any = null;
let InterstitialAd: any = null;
let RewardedAd: any = null;
let AdEventType: any = {};
let RewardedAdEventType: any = {};
let BannerAdSize: any = {};
let TestIds: any = { BANNER: '', INTERSTITIAL: '', REWARDED: '' };
let _adsAvailable = false;

try {
  const ads = require('react-native-google-mobile-ads');
  MobileAds = ads.default;
  InterstitialAd = ads.InterstitialAd;
  RewardedAd = ads.RewardedAd;
  AdEventType = ads.AdEventType;
  RewardedAdEventType = ads.RewardedAdEventType;
  BannerAdSize = ads.BannerAdSize;
  TestIds = ads.TestIds;
  _adsAvailable = true;
} catch {
  console.warn('[AdService] react-native-google-mobile-ads not available (Expo Go)');
}

// ---------------------------------------------------------------------------
// Ad Unit IDs
// ---------------------------------------------------------------------------

/** Production ad unit IDs (AdMob). */
const AD_UNIT_IDS = {
  banner: Platform.select({
    ios: 'ca-app-pub-6631407651376127/2888033776',
    android: 'ca-app-pub-6631407651376127/4722093268',
    default: 'ca-app-pub-6631407651376127/4722093268',
  })!,
  interstitial: Platform.select({
    ios: 'ca-app-pub-6631407651376127/2832193452',
    android: 'ca-app-pub-6631407651376127/2155842934',
    default: 'ca-app-pub-6631407651376127/2155842934',
  })!,
  rewarded: Platform.select({
    ios: 'ca-app-pub-6631407651376127/8661338276',
    android: 'ca-app-pub-6631407651376127/5871523409',
    default: 'ca-app-pub-6631407651376127/5871523409',
  })!,
};

/** Google-provided test ad unit IDs (safe for development). */
const TEST_AD_UNIT_IDS = {
  banner: TestIds.BANNER,
  interstitial: TestIds.INTERSTITIAL,
  rewarded: TestIds.REWARDED,
};

const IS_DEV = __DEV__;

function getAdUnitId(type: 'banner' | 'interstitial' | 'rewarded'): string {
  return IS_DEV ? TEST_AD_UNIT_IDS[type] : AD_UNIT_IDS[type];
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AdEventCallback = (event: { type: string; payload?: unknown }) => void;

interface AdServiceState {
  isInitialized: boolean;
  adsRemoved: boolean;
  interstitialShowCount: number;
  interstitialAd: InterstitialAd | null;
  interstitialLoaded: boolean;
  rewardedAd: RewardedAd | null;
  rewardedLoaded: boolean;
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

const state: AdServiceState = {
  isInitialized: false,
  adsRemoved: false,
  interstitialShowCount: 0,
  interstitialAd: null,
  interstitialLoaded: false,
  rewardedAd: null,
  rewardedLoaded: false,
};

// Keep references to unsubscribe functions so we can clean up listeners
let interstitialUnsubscribers: (() => void)[] = [];
let rewardedUnsubscribers: (() => void)[] = [];

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Initialize the Google Mobile Ads SDK. Call once at app startup.
 * Must be awaited before loading/showing any ads.
 */
export async function initializeAds(): Promise<void> {
  if (state.isInitialized) return;

  try {
    await MobileAds().initialize();
    state.isInitialized = true;
    console.log('[AdService] Google Mobile Ads SDK initialized');
  } catch (error) {
    console.error('[AdService] SDK initialization failed:', error);
  }
}

// ---------------------------------------------------------------------------
// Interstitial
// ---------------------------------------------------------------------------

/**
 * Create and load a new interstitial ad.
 * Resolves to true if the ad loaded successfully.
 */
export async function loadInterstitial(): Promise<boolean> {
  if (state.adsRemoved) return false;

  // Clean up previous listeners
  interstitialUnsubscribers.forEach((unsub) => unsub());
  interstitialUnsubscribers = [];

  return new Promise<boolean>((resolve) => {
    const ad = InterstitialAd.createForAdRequest(getAdUnitId('interstitial'), {
      requestNonPersonalizedAdsOnly: true,
    });

    const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      state.interstitialLoaded = true;
      state.interstitialAd = ad;
      console.log('[AdService] Interstitial loaded');
      resolve(true);
    });

    const unsubError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
      console.warn('[AdService] Interstitial load error:', error);
      state.interstitialLoaded = false;
      resolve(false);
    });

    interstitialUnsubscribers.push(unsubLoaded, unsubError);

    ad.load();
  });
}

/**
 * Show a loaded interstitial ad.
 * @param everyNthTime Only show every Nth call (e.g. 3 = every 3rd game).
 * @param onClosed    Optional callback when the ad is dismissed.
 */
export async function showInterstitial(
  everyNthTime: number = 1,
  onClosed?: AdEventCallback,
): Promise<boolean> {
  if (state.adsRemoved) return false;

  state.interstitialShowCount++;
  if (state.interstitialShowCount % everyNthTime !== 0) return false;

  try {
    if (!state.interstitialLoaded || !state.interstitialAd) {
      const loaded = await loadInterstitial();
      if (!loaded) return false;
    }

    const ad = state.interstitialAd!;

    return new Promise<boolean>((resolve) => {
      const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
        unsubClosed();
        state.interstitialLoaded = false;
        state.interstitialAd = null;
        onClosed?.({ type: 'closed' });

        // Pre-load next interstitial
        loadInterstitial();
        resolve(true);
      });

      ad.show();
    });
  } catch (error) {
    console.warn('[AdService] Failed to show interstitial:', error);
    state.interstitialLoaded = false;
    state.interstitialAd = null;
    return false;
  }
}

// ---------------------------------------------------------------------------
// Rewarded
// ---------------------------------------------------------------------------

/**
 * Create and load a new rewarded ad.
 * Resolves to true if the ad loaded successfully.
 */
export async function loadRewarded(): Promise<boolean> {
  // Clean up previous listeners
  rewardedUnsubscribers.forEach((unsub) => unsub());
  rewardedUnsubscribers = [];

  return new Promise<boolean>((resolve) => {
    const ad = RewardedAd.createForAdRequest(getAdUnitId('rewarded'), {
      requestNonPersonalizedAdsOnly: true,
    });

    const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      state.rewardedLoaded = true;
      state.rewardedAd = ad;
      console.log('[AdService] Rewarded ad loaded');
      resolve(true);
    });

    const unsubError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
      console.warn('[AdService] Rewarded ad load error:', error);
      state.rewardedLoaded = false;
      resolve(false);
    });

    rewardedUnsubscribers.push(unsubLoaded, unsubError);

    ad.load();
  });
}

/**
 * Show a rewarded ad. On successful completion the user earns 1 ad ticket
 * via ticketStore.earnAdTicket().
 *
 * @param onRewarded Optional callback with reward details.
 * @param onClosed   Optional callback when the ad is dismissed.
 * @returns true if the ad was shown and the reward was earned.
 */
export async function showRewarded(
  onRewarded?: (reward: { type: string; amount: number }) => void,
  onClosed?: AdEventCallback,
): Promise<boolean> {
  try {
    if (!state.rewardedLoaded || !state.rewardedAd) {
      const loaded = await loadRewarded();
      if (!loaded) return false;
    }

    const ad = state.rewardedAd!;

    return new Promise<boolean>((resolve) => {
      let rewarded = false;

      const unsubEarned = ad.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        (reward) => {
          rewarded = true;
          console.log('[AdService] Reward earned:', reward);
          onRewarded?.({
            type: reward.type,
            amount: reward.amount,
          });
        },
      );

      const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
        unsubEarned();
        unsubClosed();
        state.rewardedLoaded = false;
        state.rewardedAd = null;
        onClosed?.({ type: 'closed' });

        if (rewarded) {
          // Grant a ticket via the ticket store
          earnAdTicket().then((granted) => {
            if (!granted) {
              console.log('[AdService] Ad ticket not granted (daily limit reached)');
            }
          });
        }

        // Pre-load next rewarded ad
        loadRewarded();
        resolve(rewarded);
      });

      ad.show();
    });
  } catch (error) {
    console.warn('[AdService] Failed to show rewarded ad:', error);
    state.rewardedLoaded = false;
    state.rewardedAd = null;
    return false;
  }
}

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------

/**
 * Return props for the <BannerAd /> component from react-native-google-mobile-ads.
 *
 * Usage:
 * ```tsx
 * import { BannerAd } from 'react-native-google-mobile-ads';
 * import { getBannerAdProps } from '@/monetize/adService';
 *
 * function MyScreen() {
 *   if (areAdsRemoved()) return null;
 *   return <BannerAd {...getBannerAdProps()} />;
 * }
 * ```
 */
export function getBannerAdProps() {
  return {
    unitId: getAdUnitId('banner'),
    size: BannerAdSize.ANCHORED_ADAPTIVE_BANNER,
    requestOptions: {
      requestNonPersonalizedAdsOnly: true,
    },
  };
}

/** @deprecated Use getBannerAdProps() instead. Kept for backward compat. */
export function getBannerConfig() {
  return getBannerAdProps();
}

// ---------------------------------------------------------------------------
// Ads-removed state
// ---------------------------------------------------------------------------

/** Mark ads as removed (e.g. after a subscription purchase). */
export function setAdsRemoved(removed: boolean): void {
  state.adsRemoved = removed;
  console.log('[AdService] Ads removed:', removed);
}

/** Check if ads are currently removed. */
export function areAdsRemoved(): boolean {
  return state.adsRemoved;
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export default {
  initializeAds,
  loadInterstitial,
  showInterstitial,
  loadRewarded,
  showRewarded,
  setAdsRemoved,
  areAdsRemoved,
  getBannerAdProps,
  getBannerConfig,
};
