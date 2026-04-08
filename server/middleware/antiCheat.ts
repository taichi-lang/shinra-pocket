/**
 * antiCheat middleware — Server-side anti-cheat for ShinraPocket.
 *
 * - Rate limiter: max 60 requests per minute per IP
 * - Move validation: reject moves with impossible timing
 * - Ranking update validation: only from active game rooms
 */

import { Request, Response, NextFunction } from "express";

// ---------------------------------------------------------------------------
// 1. Rate Limiter (60 req/min per IP)
// ---------------------------------------------------------------------------

interface RateBucket {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, RateBucket>();
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

/** Clean up expired buckets periodically to avoid memory leaks. */
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of rateBuckets) {
    if (now > bucket.resetAt) {
      rateBuckets.delete(ip);
    }
  }
}, 60_000);

/**
 * Express middleware: rate-limit requests to 60/min per IP.
 */
export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();

  let bucket = rateBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + RATE_WINDOW_MS };
    rateBuckets.set(ip, bucket);
  }

  bucket.count++;

  res.setHeader("X-RateLimit-Limit", RATE_LIMIT);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, RATE_LIMIT - bucket.count));
  res.setHeader("X-RateLimit-Reset", Math.ceil(bucket.resetAt / 1000));

  if (bucket.count > RATE_LIMIT) {
    res.status(429).json({ error: "Too many requests. Try again later." });
    return;
  }

  next();
}

// ---------------------------------------------------------------------------
// 2. Move Validation — reject impossible timing
// ---------------------------------------------------------------------------

const MIN_MOVE_INTERVAL_MS = 50;

interface MovePayload {
  moves?: Array<{ timestamp: number }>;
  move?: { timestamp: number };
}

/**
 * Express middleware: validate that move timestamps are humanly possible.
 * Attach to routes that accept move data.
 */
export function validateMoveTiming(req: Request, res: Response, next: NextFunction): void {
  const body = req.body as MovePayload;

  if (body.moves && Array.isArray(body.moves)) {
    for (let i = 1; i < body.moves.length; i++) {
      const interval = body.moves[i].timestamp - body.moves[i - 1].timestamp;
      if (interval < MIN_MOVE_INTERVAL_MS) {
        console.warn(
          `[AntiCheat] Suspicious move timing from ${req.ip}: ${interval}ms at move ${i}`
        );
        res.status(400).json({
          error: "Invalid move timing detected",
          code: "TIMING_ANOMALY",
        });
        return;
      }
    }
  }

  next();
}

// ---------------------------------------------------------------------------
// 3. Ranking Update Validation — only from active game rooms
// ---------------------------------------------------------------------------

/** In-memory set of active game room IDs. Managed by the game server. */
const activeGameRooms = new Set<string>();

/** Register a game room as active. Call when a game starts. */
export function registerGameRoom(roomId: string): void {
  activeGameRooms.add(roomId);
}

/** Remove a game room. Call when a game ends. */
export function unregisterGameRoom(roomId: string): void {
  activeGameRooms.delete(roomId);
}

/** Check if a game room is currently active. */
export function isGameRoomActive(roomId: string): boolean {
  return activeGameRooms.has(roomId);
}

/**
 * Express middleware: only allow ranking updates that reference an active game room.
 */
export function validateRankingUpdate(req: Request, res: Response, next: NextFunction): void {
  const { roomId } = req.body as { roomId?: string };

  if (!roomId) {
    res.status(400).json({
      error: "roomId is required for ranking updates",
      code: "MISSING_ROOM_ID",
    });
    return;
  }

  if (!isGameRoomActive(roomId)) {
    console.warn(
      `[AntiCheat] Ranking update attempted for inactive room ${roomId} from ${req.ip}`
    );
    res.status(403).json({
      error: "Game room is not active",
      code: "INVALID_ROOM",
    });
    return;
  }

  next();
}
