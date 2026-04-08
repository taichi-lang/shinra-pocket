/**
 * ticketTypes — Type definitions for the ShinraPocket ticket system.
 */

/** Persisted ticket state */
export interface TicketState {
  /** Daily free tickets remaining (0-5) */
  freeTickets: number;
  /** Extra tickets earned via ad watches today */
  adTickets: number;
  /** How many ad watches the player has used today (max 3) */
  adTicketsUsedToday: number;
  /** Date string 'YYYY-MM-DD' used to detect daily reset */
  lastResetDate: string;
  /** Whether the player holds an active subscription */
  isSubscriber: boolean;
  /** Bonus tickets from serial codes — do NOT reset daily */
  bonusTickets: number;
}

/** Game difficulty levels */
export type Difficulty = 'easy' | 'normal' | 'hard';

/** Game play modes */
export type GameMode = 'cpu' | 'local' | 'online';

/** All recognised game IDs */
export type GameId =
  | 'game1'
  | 'game2'
  | 'game3'
  | 'game4'
  | 'game5'
  | 'game6';

/** Constants */
export const FREE_DAILY_TICKETS = 5;
export const MAX_AD_TICKETS_PER_DAY = 3;
export const STORAGE_KEY = '@shinra_tickets';
