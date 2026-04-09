/**
 * rankingService — Ranking system for ShinraPocket.
 *
 * Rating: starts at 100, +1 per win, -1 per loss (min 0), draw = no change.
 * Stored on server, cached locally via AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const RANKING_STORAGE_KEY = '@shinra_ranking';
const API_BASE = 'https://api.shinrapocket.example.com'; // TODO: real URL

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlayerRanking {
  playerId: string;
  displayName: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
}

type GameResult = 'win' | 'loss' | 'draw';

// ---------------------------------------------------------------------------
// Local cache helpers
// ---------------------------------------------------------------------------

async function getCachedRanking(): Promise<PlayerRanking | null> {
  try {
    const raw = await AsyncStorage.getItem(RANKING_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PlayerRanking) : null;
  } catch {
    return null;
  }
}

async function setCachedRanking(ranking: PlayerRanking): Promise<void> {
  try {
    await AsyncStorage.setItem(RANKING_STORAGE_KEY, JSON.stringify(ranking));
  } catch (error) {
    console.error('[RankingService] Cache write failed:', error);
  }
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialise a new player with rating 100.
 * Called once on first launch / account creation.
 */
export async function initRanking(playerId: string, displayName = 'Player'): Promise<void> {
  const initial: PlayerRanking = {
    playerId,
    displayName,
    rating: 100,
    wins: 0,
    losses: 0,
    draws: 0,
  };

  // Try to register on server; fall back to local-only
  try {
    await fetchJson(`${API_BASE}/api/ranking/update`, {
      method: 'POST',
      body: JSON.stringify({ playerId, result: 'init', displayName }),
    });
  } catch {
    // Server unreachable — local cache only for now
  }

  await setCachedRanking(initial);
}

/**
 * Get the local player's ranking.
 * Tries server first, falls back to cache.
 */
export async function getMyRanking(playerId: string): Promise<PlayerRanking> {
  try {
    const remote = await fetchJson<PlayerRanking>(
      `${API_BASE}/api/ranking/player/${playerId}`,
    );
    await setCachedRanking(remote);
    return remote;
  } catch {
    const cached = await getCachedRanking();
    if (cached) return cached;
    // Fallback default
    return {
      playerId,
      displayName: 'Player',
      rating: 100,
      wins: 0,
      losses: 0,
      draws: 0,
    };
  }
}

/**
 * Get the leaderboard (top players sorted by rating descending).
 */
export async function getLeaderboard(limit = 100, gameType?: string): Promise<PlayerRanking[]> {
  try {
    const params = new URLSearchParams({ limit: String(limit) });
    if (gameType) params.set('gameType', gameType);
    return await fetchJson<PlayerRanking[]>(
      `${API_BASE}/api/ranking/leaderboard?${params}`,
    );
  } catch {
    // Return empty list when server is unreachable
    return [];
  }
}

/**
 * Update rating after a game result and sync with server.
 * Returns the new rating value.
 *
 * win  => rating += 1
 * loss => rating = max(0, rating - 1)
 * draw => no change
 */
export async function updateRating(
  playerId: string,
  result: GameResult,
): Promise<number> {
  // Optimistic local update
  const current = await getMyRanking(playerId);
  let newRating = current.rating;

  switch (result) {
    case 'win':
      newRating += 1;
      current.wins += 1;
      break;
    case 'loss':
      newRating = Math.max(0, newRating - 1);
      current.losses += 1;
      break;
    case 'draw':
      current.draws += 1;
      break;
  }

  current.rating = newRating;
  await setCachedRanking(current);

  // Sync to server (fire-and-forget with retry awareness)
  try {
    const serverResult = await fetchJson<{ newRating: number }>(
      `${API_BASE}/api/ranking/update`,
      {
        method: 'POST',
        body: JSON.stringify({ playerId, result }),
      },
    );
    // Server is authoritative — use its rating
    current.rating = serverResult.newRating;
    await setCachedRanking(current);
    return serverResult.newRating;
  } catch {
    // Offline — local value is used until next sync
    return newRating;
  }
}
