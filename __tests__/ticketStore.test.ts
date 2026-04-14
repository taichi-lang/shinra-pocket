import {
  FREE_DAILY_TICKETS,
  MAX_AD_TICKETS_PER_DAY,
} from '../src/monetize/ticketTypes';

// Shared mock storage reference
const mockAsyncStorage = {
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: mockAsyncStorage,
}));

// Mock antiCheat so obfuscation is transparent in tests
jest.mock('../src/security/antiCheat', () => ({
  validateTicketState: () => ({ valid: true }),
  obfuscateValue: (v: number) => v,
  deobfuscateValue: (v: number) => v,
}));

// Mock analytics to avoid __DEV__ reference errors
jest.mock('../src/analytics/analyticsService', () => ({
  logEvent: jest.fn(),
  logScreenView: jest.fn(),
  initAnalytics: jest.fn(),
}));

// Mock userProfile so isGuestUser returns false (logged-in user gets free tickets)
jest.mock('../src/services/userProfile', () => ({
  isGuestUser: jest.fn(() => Promise.resolve(false)),
}));

// Define __DEV__ for test environment
(globalThis as any).__DEV__ = true;

// We need to re-import the module fresh for each test to reset internal state
let ticketStore: typeof import('../src/monetize/ticketStore');

beforeEach(() => {
  jest.resetModules();
  mockAsyncStorage.getItem.mockReset().mockResolvedValue(null);
  mockAsyncStorage.setItem.mockReset().mockResolvedValue(undefined);
  mockAsyncStorage.removeItem.mockReset().mockResolvedValue(undefined);

  ticketStore = require('../src/monetize/ticketStore');
});

// ============================================================
// 1. Default State
// ============================================================
describe('getTicketState (default)', () => {
  it('returns default state with 5 free tickets', () => {
    const state = ticketStore.getTicketState();
    expect(state.freeTickets).toBe(FREE_DAILY_TICKETS);
    expect(state.adTickets).toBe(0);
    expect(state.bonusTickets).toBe(0);
    expect(state.isSubscriber).toBe(false);
  });

  it('getTotalTickets returns 5 by default', () => {
    expect(ticketStore.getTotalTickets()).toBe(FREE_DAILY_TICKETS);
  });
});

// ============================================================
// 2. Ticket Consumption Order: ad -> free -> bonus
// ============================================================
describe('consumeTicket order', () => {
  it('consumes ad tickets first', async () => {
    await ticketStore.earnAdTicket();
    expect(ticketStore.getTicketState().adTickets).toBe(1);

    const result = await ticketStore.consumeTicket();
    expect(result).toBe(true);
    expect(ticketStore.getTicketState().adTickets).toBe(0);
    expect(ticketStore.getTicketState().freeTickets).toBe(FREE_DAILY_TICKETS);
  });

  it('consumes free tickets after ad tickets are gone', async () => {
    const result = await ticketStore.consumeTicket();
    expect(result).toBe(true);
    expect(ticketStore.getTicketState().freeTickets).toBe(FREE_DAILY_TICKETS - 1);
  });

  it('consumes bonus tickets last', async () => {
    // Zero out free and ad tickets first
    for (let i = 0; i < FREE_DAILY_TICKETS; i++) {
      await ticketStore.consumeTicket();
    }
    expect(ticketStore.getTicketState().freeTickets).toBe(0);

    await ticketStore.addBonusTickets(3);
    const result = await ticketStore.consumeTicket();
    expect(result).toBe(true);
    expect(ticketStore.getTicketState().bonusTickets).toBe(2);
  });

  it('returns false when no tickets available', async () => {
    for (let i = 0; i < FREE_DAILY_TICKETS; i++) {
      await ticketStore.consumeTicket();
    }
    const result = await ticketStore.consumeTicket();
    expect(result).toBe(false);
  });
});

// ============================================================
// 3. needsTicket() for various combinations
// ============================================================
describe('needsTicket', () => {
  it('game6 never needs a ticket', () => {
    expect(ticketStore.needsTicket('game6', 'easy', 'cpu')).toBe(false);
    expect(ticketStore.needsTicket('game6', 'hard', 'cpu')).toBe(false);
    expect(ticketStore.needsTicket('game6', 'normal', 'local')).toBe(false);
  });

  it('cpu + easy/normal is free', () => {
    expect(ticketStore.needsTicket('game1', 'easy', 'cpu')).toBe(false);
    expect(ticketStore.needsTicket('game2', 'normal', 'cpu')).toBe(false);
  });

  it('cpu + hard is free (no ticket required for any CPU mode)', () => {
    expect(ticketStore.needsTicket('game1', 'hard', 'cpu')).toBe(false);
    expect(ticketStore.needsTicket('game3', 'hard', 'cpu')).toBe(false);
  });

  it('local mode always costs a ticket', () => {
    expect(ticketStore.needsTicket('game1', 'easy', 'local')).toBe(true);
    expect(ticketStore.needsTicket('game2', 'normal', 'local')).toBe(true);
  });

  it('online mode always costs a ticket', () => {
    expect(ticketStore.needsTicket('game1', 'easy', 'online')).toBe(true);
    expect(ticketStore.needsTicket('game4', 'hard', 'online')).toBe(true);
  });
});

// ============================================================
// 4. canPlay() logic
// ============================================================
describe('canPlay', () => {
  it('game6 requires subscription', () => {
    expect(ticketStore.canPlay('game6', 'easy', 'cpu')).toBe(false);
  });

  it('game6 allowed for subscribers', async () => {
    await ticketStore.setSubscriber(true);
    expect(ticketStore.canPlay('game6', 'easy', 'cpu')).toBe(true);
  });

  it('free modes are always allowed', () => {
    expect(ticketStore.canPlay('game1', 'easy', 'cpu')).toBe(true);
    expect(ticketStore.canPlay('game2', 'normal', 'cpu')).toBe(true);
  });

  it('ticket-requiring mode allowed when tickets available', () => {
    expect(ticketStore.canPlay('game1', 'hard', 'cpu')).toBe(true);
  });

  it('ticket-requiring mode blocked when no tickets', async () => {
    for (let i = 0; i < FREE_DAILY_TICKETS; i++) {
      await ticketStore.consumeTicket();
    }
    // cpu modes are always free now, so use local/online which still require tickets
    expect(ticketStore.canPlay('game1', 'easy', 'local')).toBe(false);
    expect(ticketStore.canPlay('game1', 'normal', 'online')).toBe(false);
  });
});

// ============================================================
// 5. Subscriber Bypass
// ============================================================
describe('subscriber bypass', () => {
  it('subscribers have infinite tickets', async () => {
    await ticketStore.setSubscriber(true);
    expect(ticketStore.getTotalTickets()).toBe(Infinity);
  });

  it('subscribers never consume tickets', async () => {
    await ticketStore.setSubscriber(true);
    const result = await ticketStore.consumeTicket();
    expect(result).toBe(true);
    // Free tickets unchanged
    expect(ticketStore.getTicketState().freeTickets).toBe(FREE_DAILY_TICKETS);
  });

  it('subscribers can play any game/mode', async () => {
    await ticketStore.setSubscriber(true);
    expect(ticketStore.canPlay('game1', 'hard', 'cpu')).toBe(true);
    expect(ticketStore.canPlay('game6', 'hard', 'cpu')).toBe(true);
    expect(ticketStore.canPlay('game3', 'normal', 'online')).toBe(true);
  });

  it('isGame6Unlocked reflects subscriber status', async () => {
    expect(ticketStore.isGame6Unlocked()).toBe(false);
    await ticketStore.setSubscriber(true);
    expect(ticketStore.isGame6Unlocked()).toBe(true);
  });
});

// ============================================================
// 6. earnAdTicket() daily limit
// ============================================================
describe('earnAdTicket', () => {
  it('earns an ad ticket', async () => {
    const result = await ticketStore.earnAdTicket();
    expect(result).toBe(true);
    expect(ticketStore.getTicketState().adTickets).toBe(1);
    expect(ticketStore.getTicketState().adTicketsUsedToday).toBe(1);
  });

  it('allows up to MAX_AD_TICKETS_PER_DAY watches', async () => {
    for (let i = 0; i < MAX_AD_TICKETS_PER_DAY; i++) {
      const result = await ticketStore.earnAdTicket();
      expect(result).toBe(true);
    }
    expect(ticketStore.getTicketState().adTickets).toBe(MAX_AD_TICKETS_PER_DAY);
  });

  it('rejects after reaching daily ad limit', async () => {
    for (let i = 0; i < MAX_AD_TICKETS_PER_DAY; i++) {
      await ticketStore.earnAdTicket();
    }
    const result = await ticketStore.earnAdTicket();
    expect(result).toBe(false);
    expect(ticketStore.getTicketState().adTickets).toBe(MAX_AD_TICKETS_PER_DAY);
  });
});

// ============================================================
// 7. addBonusTickets()
// ============================================================
describe('addBonusTickets', () => {
  it('adds bonus tickets', async () => {
    await ticketStore.addBonusTickets(10);
    expect(ticketStore.getTicketState().bonusTickets).toBe(10);
  });

  it('accumulates bonus tickets', async () => {
    await ticketStore.addBonusTickets(5);
    await ticketStore.addBonusTickets(3);
    expect(ticketStore.getTicketState().bonusTickets).toBe(8);
  });

  it('bonus tickets count toward total', async () => {
    await ticketStore.addBonusTickets(10);
    expect(ticketStore.getTotalTickets()).toBe(FREE_DAILY_TICKETS + 10);
  });
});

// ============================================================
// 8. Daily Reset Logic
// ============================================================
describe('initTicketStore / resetIfNewDay', () => {
  it('loads default state when nothing stored', async () => {
    await ticketStore.initTicketStore();
    expect(ticketStore.getTicketState().freeTickets).toBe(FREE_DAILY_TICKETS);
  });

  it('resets daily counters when stored date differs from today', async () => {
    const oldState = {
      freeTickets: 1,
      adTickets: 2,
      adTicketsUsedToday: 2,
      lastResetDate: '2020-01-01', // definitely in the past
      isSubscriber: false,
      bonusTickets: 7,
    };
    (mockAsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(oldState));

    await ticketStore.initTicketStore();

    const state = ticketStore.getTicketState();
    expect(state.freeTickets).toBe(FREE_DAILY_TICKETS);
    expect(state.adTickets).toBe(0);
    expect(state.adTicketsUsedToday).toBe(0);
    // Bonus tickets should survive daily reset
    expect(state.bonusTickets).toBe(7);
  });

  it('persist is called on reset', async () => {
    const oldState = {
      freeTickets: 1,
      adTickets: 2,
      adTicketsUsedToday: 2,
      lastResetDate: '2020-01-01',
      isSubscriber: false,
      bonusTickets: 0,
    };
    (mockAsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(oldState));

    await ticketStore.initTicketStore();
    expect(mockAsyncStorage.setItem).toHaveBeenCalled();
  });
});
