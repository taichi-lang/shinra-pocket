import { Router, Response } from "express";
import { AuthRequest, requireAuth } from "../middleware/auth";

const router = Router();

// ─── In-memory matchmaking queues (per game type) ────────
interface QueueEntry {
  userId: string;
  username: string;
  rating: number;
  joinedAt: number;
}

const queues = new Map<string, QueueEntry[]>();

function getQueue(gameType: string): QueueEntry[] {
  if (!queues.has(gameType)) {
    queues.set(gameType, []);
  }
  return queues.get(gameType)!;
}

// ─── Join Queue ──────────────────────────────────────────
router.post("/join", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { gameType, rating } = req.body;
    const userId = req.user!.userId;
    const username = req.user!.username;

    if (!gameType) {
      res.status(400).json({ error: "gameType is required" });
      return;
    }

    const queue = getQueue(gameType);

    // Prevent duplicate join
    const alreadyInQueue = queue.some((e) => e.userId === userId);
    if (alreadyInQueue) {
      res.status(409).json({ error: "Already in queue" });
      return;
    }

    const entry: QueueEntry = {
      userId,
      username,
      rating: rating || 1000,
      joinedAt: Date.now(),
    };

    queue.push(entry);

    // Try to find a match (closest rating within 200 range, expanding over time)
    const match = findMatch(queue, entry);

    if (match) {
      // Remove both players from queue
      const idx1 = queue.indexOf(entry);
      if (idx1 !== -1) queue.splice(idx1, 1);
      const idx2 = queue.indexOf(match);
      if (idx2 !== -1) queue.splice(idx2, 1);

      const roomId = `${gameType}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      res.json({
        matched: true,
        roomId,
        opponent: { userId: match.userId, username: match.username, rating: match.rating },
      });
      return;
    }

    res.json({
      matched: false,
      position: queue.length,
      message: "Waiting for an opponent...",
    });
  } catch (err) {
    console.error("[Matchmaking] Join error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Leave Queue ─────────────────────────────────────────
router.post("/leave", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { gameType } = req.body;
    const userId = req.user!.userId;

    if (!gameType) {
      res.status(400).json({ error: "gameType is required" });
      return;
    }

    const queue = getQueue(gameType);
    const idx = queue.findIndex((e) => e.userId === userId);

    if (idx === -1) {
      res.status(404).json({ error: "Not in queue" });
      return;
    }

    queue.splice(idx, 1);
    res.json({ message: "Left the queue" });
  } catch (err) {
    console.error("[Matchmaking] Leave error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Queue Status ────────────────────────────────────────
router.get("/status/:gameType", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { gameType } = req.params;
    const queue = getQueue(gameType);
    const userId = req.user!.userId;

    const position = queue.findIndex((e) => e.userId === userId);

    res.json({
      gameType,
      queueSize: queue.length,
      inQueue: position !== -1,
      position: position !== -1 ? position + 1 : null,
    });
  } catch (err) {
    console.error("[Matchmaking] Status error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Helpers ─────────────────────────────────────────────

function findMatch(queue: QueueEntry[], player: QueueEntry): QueueEntry | null {
  if (queue.length < 2) return null;

  // Expand rating range based on wait time (100 per 10 seconds, max 500)
  const waitSeconds = (Date.now() - player.joinedAt) / 1000;
  const ratingRange = Math.min(100 + Math.floor(waitSeconds / 10) * 100, 500);

  let bestMatch: QueueEntry | null = null;
  let bestDiff = Infinity;

  for (const candidate of queue) {
    if (candidate.userId === player.userId) continue;

    const diff = Math.abs(candidate.rating - player.rating);
    if (diff <= ratingRange && diff < bestDiff) {
      bestDiff = diff;
      bestMatch = candidate;
    }
  }

  return bestMatch;
}

/** Exported for Socket.io integration */
export { queues, getQueue, findMatch };
export default router;
