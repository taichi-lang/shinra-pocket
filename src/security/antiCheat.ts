/**
 * antiCheat — Client-side anti-cheat measures for ShinraPocket.
 *
 * 1. Ticket validation    — detect impossible ticket counts
 * 2. Game state integrity — hash game state for server verification
 * 3. Move signing         — HMAC-signed moves for server verification
 * 4. Timing anomaly       — detect impossible move speeds
 * 5. Memory obfuscation   — XOR-based value hiding
 */

import { type TicketState, FREE_DAILY_TICKETS, MAX_AD_TICKETS_PER_DAY } from '../monetize/ticketTypes';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_POSSIBLE_TICKETS = FREE_DAILY_TICKETS + MAX_AD_TICKETS_PER_DAY + 999; // 999 bonus cap
const MIN_MOVE_INTERVAL_MS = 50; // Faster than human possible
const OBFUSCATION_KEY = 0xa7b3c5d9; // XOR key for memory obfuscation

// ---------------------------------------------------------------------------
// 1. Ticket Validation
// ---------------------------------------------------------------------------

export interface TicketValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Check ticket state for impossible / tampered values.
 */
export function validateTicketState(state: TicketState): TicketValidationResult {
  // Negative values are impossible
  if (state.freeTickets < 0) {
    return { valid: false, reason: 'negative_free_tickets' };
  }
  if (state.adTickets < 0) {
    return { valid: false, reason: 'negative_ad_tickets' };
  }
  if (state.bonusTickets < 0) {
    return { valid: false, reason: 'negative_bonus_tickets' };
  }

  // Free tickets can never exceed the daily max
  if (state.freeTickets > FREE_DAILY_TICKETS) {
    return { valid: false, reason: 'free_tickets_exceed_max' };
  }

  // Ad tickets earned today can never exceed the daily limit
  if (state.adTicketsUsedToday > MAX_AD_TICKETS_PER_DAY) {
    return { valid: false, reason: 'ad_watches_exceed_max' };
  }

  // Ad tickets in hand cannot exceed total ad watches today
  if (state.adTickets > state.adTicketsUsedToday) {
    return { valid: false, reason: 'ad_tickets_exceed_watches' };
  }

  // Total tickets should not exceed a sane maximum
  const total = state.freeTickets + state.adTickets + state.bonusTickets;
  if (total > MAX_POSSIBLE_TICKETS) {
    return { valid: false, reason: 'total_exceeds_maximum' };
  }

  // Non-integer values indicate tampering
  if (
    !Number.isInteger(state.freeTickets) ||
    !Number.isInteger(state.adTickets) ||
    !Number.isInteger(state.bonusTickets)
  ) {
    return { valid: false, reason: 'non_integer_values' };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// 2. Game State Integrity — SHA-256 hash
// ---------------------------------------------------------------------------

/**
 * Produce a SHA-256 hex digest of the given game state object.
 * Uses a deterministic JSON serialization (sorted keys).
 */
export async function hashGameState(state: Record<string, unknown>): Promise<string> {
  const sorted = JSON.stringify(state, Object.keys(state).sort());
  // Use SubtleCrypto (available in React Native Hermes via expo-crypto polyfill)
  const encoder = new TextEncoder();
  const data = encoder.encode(sorted);
  try {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback: simple FNV-1a hash (not cryptographic, but functional)
    return fnv1aHash(sorted);
  }
}

/** FNV-1a 32-bit fallback hash. */
function fnv1aHash(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

// ---------------------------------------------------------------------------
// 3. Move Signing — HMAC token
// ---------------------------------------------------------------------------

/**
 * Create an HMAC-signed move token for server verification.
 * The server holds the same secret and can verify integrity.
 */
export async function createMoveToken(
  move: Record<string, unknown>,
  timestamp: number,
): Promise<string> {
  const payload = JSON.stringify({ move, timestamp });
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode('shinra_move_secret'), // TODO: use env/config
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
    const hexSig = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return `${btoa(payload)}.${hexSig}`;
  } catch {
    // Fallback: FNV-based "token" (weaker, but functional offline)
    return `${btoa(payload)}.${fnv1aHash(payload)}`;
  }
}

// ---------------------------------------------------------------------------
// 4. Timing Anomaly Detection
// ---------------------------------------------------------------------------

export interface MoveRecord {
  timestamp: number; // ms since epoch
}

export interface TimingCheckResult {
  anomaly: boolean;
  suspiciousCount: number;
  details: string[];
}

/**
 * Detect impossibly fast move sequences (< 50ms between moves).
 * Returns anomaly=true if any intervals are below the threshold.
 */
export function checkTimingAnomaly(moves: MoveRecord[]): TimingCheckResult {
  const details: string[] = [];
  let suspiciousCount = 0;

  for (let i = 1; i < moves.length; i++) {
    const interval = moves[i].timestamp - moves[i - 1].timestamp;
    if (interval < MIN_MOVE_INTERVAL_MS) {
      suspiciousCount++;
      details.push(`Move ${i}: ${interval}ms interval (min ${MIN_MOVE_INTERVAL_MS}ms)`);
    }
  }

  return {
    anomaly: suspiciousCount > 0,
    suspiciousCount,
    details,
  };
}

// ---------------------------------------------------------------------------
// 5. Memory Obfuscation — XOR-based
// ---------------------------------------------------------------------------

/**
 * Obfuscate a numeric value for in-memory storage.
 * XOR with a fixed key so plain values don't appear in memory dumps.
 */
export function obfuscateValue(value: number): number {
  // Convert to 32-bit integer and XOR
  return (value ^ OBFUSCATION_KEY) >>> 0;
}

/**
 * Reverse the obfuscation to retrieve the original value.
 */
export function deobfuscateValue(obfuscated: number): number {
  // XOR is its own inverse
  const raw = (obfuscated ^ OBFUSCATION_KEY) >>> 0;
  // Handle sign: values originally < 0x80000000 stay positive
  return raw > 0x7fffffff ? raw - 0x100000000 : raw;
}
