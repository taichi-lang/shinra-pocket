/**
 * serialCodeService — Serial / promo code redemption for ShinraPocket.
 *
 * Codes are distributed on social media (Instagram, Twitter, etc.).
 * Each code can be redeemed once per device.
 * Redeemed codes are tracked in AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { addBonusTickets } from './ticketStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SerialCode {
  code: string;
  tickets: number;        // how many tickets to award
  expiresAt: string;      // ISO date string
  maxRedemptions: number; // total allowed globally (0 = unlimited)
}

export interface RedeemResult {
  success: boolean;
  tickets?: number;
  error?: string;
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

const API_BASE = 'https://api.shinrapocket.com'; // placeholder

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
