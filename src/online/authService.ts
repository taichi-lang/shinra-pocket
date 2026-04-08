// === Anonymous Auth Service ===
// Handles JWT token acquisition and storage for online play.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config';

// ─── Configuration ──────────────────────────────────────
export const SERVER_URL = CONFIG.SERVER_URL;

const STORAGE_KEY_TOKEN = '@shinra_pocket_auth_token';
const STORAGE_KEY_PLAYER_ID = '@shinra_pocket_player_id';

// ─── Token helpers ──────────────────────────────────────

/** Decode the payload of a JWT (no verification — that happens server-side). */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(payload);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Returns true if the token exists and is not expired (with 60s margin). */
function isTokenValid(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return false;
  const nowSec = Math.floor(Date.now() / 1000);
  return payload.exp > nowSec + 60; // 60s safety margin
}

// ─── Public API ─────────────────────────────────────────

/**
 * Get a valid JWT token, reusing a stored one when possible.
 * If no token exists or it is expired, requests a new anonymous token from the server.
 */
export async function getOrCreateToken(): Promise<string> {
  // Try stored token first
  const stored = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
  if (stored && isTokenValid(stored)) {
    return stored;
  }

  // Request new anonymous token
  const response = await fetch(`${SERVER_URL}/api/auth/anonymous`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error(`Auth failed: ${response.status}`);
  }

  const data = await response.json();
  const { token, playerId } = data as { token: string; playerId: string };

  // Persist
  await AsyncStorage.setItem(STORAGE_KEY_TOKEN, token);
  await AsyncStorage.setItem(STORAGE_KEY_PLAYER_ID, playerId);

  return token;
}

/**
 * Return the playerId from the stored token (decoded client-side).
 * Returns null if no valid token is stored.
 */
export async function getPlayerId(): Promise<string | null> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY_PLAYER_ID);
  if (stored) return stored;

  // Fallback: decode from token
  const token = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
  if (!token) return null;

  const payload = decodeJwtPayload(token);
  return (payload?.userId as string) ?? null;
}
