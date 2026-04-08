/**
 * ticketStore — Ticket system core for ShinraPocket.
 *
 * Business rules:
 *  - 5 free tickets daily, reset at midnight (no carry-over)
 *  - CPU battles are free; only "hard" difficulty costs 1 ticket
 *  - Local / Online battles cost 1 ticket each
 *  - Subscribers ($3.5/mo): unlimited tickets, Game6 unlocked, no ads
 *  - Watching an ad earns 1 extra ticket (max 3 per day)
 *  - Ticket consumption always requires a confirmation dialog (handled by UI)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type TicketState,
  type Difficulty,
  type GameMode,
  type GameId,
  FREE_DAILY_TICKETS,
  MAX_AD_TICKETS_PER_DAY,
  STORAGE_KEY,
} from './ticketTypes';
import { logEvent } from '../analytics/analyticsService';
import {
  validateTicketState,
  obfuscateValue,
  deobfuscateValue,
} from '../security/antiCheat';

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let state: TicketState = createDefaultState();

function createDefaultState(): TicketState {
  return {
    freeTickets: FREE_DAILY_TICKETS,
    adTickets: 0,
    adTicketsUsedToday: 0,
    lastResetDate: todayString(),
    isSubscriber: false,
    bonusTickets: 0,
  };
}

function todayString(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

/**
 * Save current state to AsyncStorage.
 * Ticket counts are obfuscated before writing to make memory/storage
 * tampering more difficult.
 */
export async function persist(): Promise<void> {
  try {
    const obfuscated = {
      ...state,
      freeTickets: obfuscateValue(state.freeTickets),
      adTickets: obfuscateValue(state.adTickets),
      bonusTickets: obfuscateValue(state.bonusTickets),
      _obfuscated: true,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(obfuscated));
  } catch (error) {
    console.error('[TicketStore] Failed to persist:', error);
  }
}

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

/**
 * Load ticket state from AsyncStorage.
 * If the stored date differs from today the daily counters are reset.
 * Call once at app startup.
 */
export async function initTicketStore(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);

      // Deobfuscate if stored in obfuscated form
      if (parsed._obfuscated) {
        parsed.freeTickets = deobfuscateValue(parsed.freeTickets);
        parsed.adTickets = deobfuscateValue(parsed.adTickets);
        parsed.bonusTickets = deobfuscateValue(parsed.bonusTickets);
        delete parsed._obfuscated;
      }

      state = parsed as TicketState;

      // Anti-cheat: validate loaded state
      const check = validateTicketState(state);
      if (!check.valid) {
        console.warn(
          `[TicketStore] Tampered state detected (${check.reason}), resetting to defaults`,
        );
        state = createDefaultState();
      }
    }
  } catch (error) {
    console.error('[TicketStore] Failed to load state, using defaults:', error);
    state = createDefaultState();
  }

  await resetIfNewDay();
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Return a shallow copy of the current ticket state. */
export function getTicketState(): Readonly<TicketState> {
  return { ...state };
}

/**
 * Total available tickets.
 * Subscribers effectively have unlimited tickets (Infinity).
 */
export function getTotalTickets(): number {
  if (state.isSubscriber) return Infinity;
  return state.freeTickets + state.adTickets + (state.bonusTickets ?? 0);
}

/** Returns true when the subscriber has Game6 unlocked. */
export function isGame6Unlocked(): boolean {
  return state.isSubscriber;
}

/**
 * Determine whether a particular game / difficulty / mode combination
 * requires spending a ticket.
 *
 * Rules:
 *  - game6 is a single-player puzzle; it never costs a ticket
 *    (but is locked for non-subscribers — see canPlay)
 *  - cpu + any difficulty except "hard" => free
 *  - cpu + hard => 1 ticket
 *  - local => 1 ticket
 *  - online => 1 ticket
 */
export function needsTicket(
  gameId: GameId,
  difficulty: Difficulty,
  mode: GameMode,
): boolean {
  // Game6 is a standalone puzzle — no ticket cost
  if (gameId === 'game6') return false;

  if (mode === 'cpu') {
    return difficulty === 'hard';
  }

  // local and online always cost a ticket
  return true;
}

/**
 * Check whether the player is allowed to start a game.
 *
 *  - Game6 requires an active subscription (regardless of tickets).
 *  - If the mode/difficulty doesn't need a ticket, always allowed.
 *  - Subscribers bypass ticket checks.
 *  - Otherwise the player needs at least 1 ticket.
 */
export function canPlay(
  gameId: GameId,
  difficulty: Difficulty,
  mode: GameMode,
): boolean {
  // Game6: subscriber-only
  if (gameId === 'game6') return state.isSubscriber;

  if (!needsTicket(gameId, difficulty, mode)) return true;
  if (state.isSubscriber) return true;

  return getTotalTickets() >= 1;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Consume one ticket. Ad-earned tickets are spent first, then free tickets.
 * Returns true on success, false if insufficient tickets.
 * Subscribers never consume tickets.
 */
export async function consumeTicket(): Promise<boolean> {
  if (state.isSubscriber) return true;

  // Anti-cheat: validate state integrity before consumption
  const check = validateTicketState(state);
  if (!check.valid) {
    console.warn(`[TicketStore] Integrity check failed (${check.reason}), resetting`);
    state = createDefaultState();
    await persist();
    return false;
  }

  if (getTotalTickets() < 1) return false;

  if (state.adTickets > 0) {
    state.adTickets -= 1;
  } else if (state.freeTickets > 0) {
    state.freeTickets -= 1;
  } else if ((state.bonusTickets ?? 0) > 0) {
    state.bonusTickets -= 1;
  }

  await persist();
  logEvent('ticket_consumed', { gameId: 'unknown', mode: 'cpu' });
  return true;
}

/**
 * Award one ticket for watching an ad.
 * Returns false if the player has already watched the maximum ads today.
 */
export async function earnAdTicket(): Promise<boolean> {
  if (state.adTicketsUsedToday >= MAX_AD_TICKETS_PER_DAY) return false;

  state.adTickets += 1;
  state.adTicketsUsedToday += 1;
  await persist();
  logEvent('ticket_earned_ad', { count: state.adTicketsUsedToday });
  return true;
}

/**
 * Add bonus tickets (from serial codes, promotions, etc.).
 * Bonus tickets do NOT reset daily — they carry over indefinitely.
 */
export async function addBonusTickets(amount: number): Promise<void> {
  state.bonusTickets = (state.bonusTickets ?? 0) + amount;
  await persist();
  logEvent('ticket_earned_serial', { code: 'bonus', amount });
}

/** Toggle subscriber status and persist. */
export async function setSubscriber(active: boolean): Promise<void> {
  state.isSubscriber = active;
  await persist();
}

// ---------------------------------------------------------------------------
// Daily reset
// ---------------------------------------------------------------------------

/**
 * If the current date is later than lastResetDate, reset daily counters.
 * Free tickets go back to 5; ad-earned tickets and watch count reset to 0.
 * Persists automatically when a reset occurs.
 */
export async function resetIfNewDay(): Promise<void> {
  const today = todayString();
  if (state.lastResetDate === today) return;

  state.freeTickets = FREE_DAILY_TICKETS;
  state.adTickets = 0;
  state.adTicketsUsedToday = 0;
  state.lastResetDate = today;
  await persist();
}

// ---------------------------------------------------------------------------
// Default export (convenience)
// ---------------------------------------------------------------------------

export default {
  initTicketStore,
  getTicketState,
  getTotalTickets,
  consumeTicket,
  earnAdTicket,
  addBonusTickets,
  setSubscriber,
  isGame6Unlocked,
  needsTicket,
  canPlay,
  resetIfNewDay,
  persist,
};
