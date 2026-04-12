/**
 * serialCodeService — Serial / promo code redemption for ShinraPocket.
 *
 * Codes are distributed on social media (Instagram, Twitter, etc.).
 * Each code can be redeemed once per device.
 * Redeemed codes are tracked in AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { addBonusTickets, setSubscriber } from './ticketStore';
import { setAdsRemoved } from './adService';
import { CONFIG } from '../config';
import { isGuestUser } from '../services/userProfile';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SerialCode {
  code: string;
  tickets: number;        // how many tickets to award
  expiresAt: string;      // ISO date string
  maxRedemptions: number; // total allowed globally (0 = unlimited)
}

/** Developer promo code type — triggers special actions instead of just tickets. */
type DevCodeAction = 'premium' | 'reset' | '99tickets';

interface DevCode {
  code: string;
  action: DevCodeAction;
}

export interface RedeemResult {
  success: boolean;
  tickets?: number;
  error?: string;
  /** Custom message for developer promo codes. */
  devMessage?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = '@shinra_redeemed_codes';

/** Built-in promotional codes for launch. */
const BUILTIN_CODES: SerialCode[] = [
  { code: 'SHINRA2026', tickets: 10, expiresAt: '2026-12-31T23:59:59Z', maxRedemptions: 0 },
  { code: 'INSTAGRAM5', tickets: 5, expiresAt: '2026-06-30T23:59:59Z', maxRedemptions: 0 },
  { code: 'LAUNCH3', tickets: 3, expiresAt: '2026-05-31T23:59:59Z', maxRedemptions: 0 },
];

/** Developer promo codes — always work (no expiry, production-safe). */
const DEV_CODES: DevCode[] = [
  { code: 'DEVPREMIUM',   action: 'premium' },
  { code: 'DEVRESET',     action: 'reset' },
  { code: 'DEV99TICKETS', action: '99tickets' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loadRedeemedCodes(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch (e) {
    console.error('[SerialCode] Failed to load redeemed codes:', e);
  }
  return [];
}

async function saveRedeemedCodes(codes: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
  } catch (e) {
    console.error('[SerialCode] Failed to save redeemed codes:', e);
  }
}

function findBuiltinCode(code: string): SerialCode | undefined {
  return BUILTIN_CODES.find((c) => c.code === code);
}

function findDevCode(code: string): DevCode | undefined {
  return DEV_CODES.find((c) => c.code === code);
}

/**
 * Execute a developer promo code action.
 * Dev codes can be redeemed multiple times (no "already redeemed" check).
 */
async function executeDevCode(devCode: DevCode): Promise<RedeemResult> {
  switch (devCode.action) {
    case 'premium':
      await setSubscriber(true);
      setAdsRemoved(true);
      return {
        success: true,
        devMessage: '\u{1F511} 開発者モード: プレミアム有効化',
      };

    case 'reset':
      await setSubscriber(false);
      setAdsRemoved(false);
      return {
        success: true,
        devMessage: '\u{1F504} リセット完了: 無料ユーザーに戻りました',
      };

    case '99tickets':
      await addBonusTickets(99);
      return {
        success: true,
        tickets: 99,
        devMessage: '\u{1F3AB} 99枚のボーナスチケットを獲得！',
      };

    default:
      return { success: false, error: 'invalid' };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Attempt to redeem a serial code.
 * Validates the code, checks expiry, checks if already redeemed on this device,
 * then awards bonus tickets.
 */
export async function redeemCode(rawCode: string): Promise<RedeemResult> {
  const code = rawCode.trim().toUpperCase();

  if (!code) {
    return { success: false, error: 'invalid' };
  }

  // Dev codes bypass normal redemption flow (can be used multiple times)
  const devCode = findDevCode(code);
  if (devCode) {
    return executeDevCode(devCode);
  }

  // Guest users cannot redeem serial codes (dev codes are exempt)
  const guest = await isGuestUser();
  if (guest) {
    return { success: false, error: 'guest_not_allowed' };
  }

  // Check if already redeemed on this device
  const redeemed = await loadRedeemedCodes();
  if (redeemed.includes(code)) {
    return { success: false, error: 'already_redeemed' };
  }

  // Try server-side validation first (optional — fallback to built-in)
  let matched: SerialCode | undefined;
  try {
    matched = await validateOnServer(code);
  } catch {
    // Server unavailable — fall back to built-in codes
    matched = findBuiltinCode(code);
  }

  if (!matched) {
    return { success: false, error: 'invalid' };
  }

  // Check expiry
  if (new Date(matched.expiresAt) < new Date()) {
    return { success: false, error: 'expired' };
  }

  // Award bonus tickets (these do NOT count toward daily limits)
  await addBonusTickets(matched.tickets);

  // Mark as redeemed
  redeemed.push(code);
  await saveRedeemedCodes(redeemed);

  return { success: true, tickets: matched.tickets };
}

/**
 * Returns list of codes already redeemed on this device.
 */
export async function getRedeemedCodes(): Promise<string[]> {
  return loadRedeemedCodes();
}

/**
 * Check whether a specific code has already been redeemed on this device.
 */
export async function isCodeRedeemed(code: string): Promise<boolean> {
  const redeemed = await loadRedeemedCodes();
  return redeemed.includes(code.trim().toUpperCase());
}

// ---------------------------------------------------------------------------
// Server validation (optional)
// ---------------------------------------------------------------------------

const API_BASE = CONFIG.SERVER_URL;

async function validateOnServer(code: string): Promise<SerialCode | undefined> {
  const res = await fetch(`${API_BASE}/api/codes/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  if (!res.ok) return undefined;

  const data = await res.json();
  if (data.valid) {
    return {
      code: data.code,
      tickets: data.tickets,
      expiresAt: data.expiresAt,
      maxRedemptions: data.maxRedemptions ?? 0,
    };
  }
  return undefined;
}
