import { Router, Request, Response } from "express";
import pool from "../db/connection";
import { AuthRequest, requireAuth } from "../middleware/auth";
import { rateLimiter, validateRankingUpdate } from "../middleware/antiCheat";

const router = Router();

// Apply rate limiter to all ranking routes
router.use(rateLimiter);

// ─── Get Leaderboard ────────────────────────────────────
// GET /api/ranking/leaderboard?limit=100
router.get("/leaderboard", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 200);

    const result = await pool.query(
      `SELECT r.user_id   AS "playerId",
              u.username   AS "displayName",
              r.rating,
              r.wins,
              r.losses,
              r.draws
       FROM rankings r
       JOIN users u ON u.id = r.user_id
       ORDER BY r.rating DESC, r.wins DESC
       LIMIT $1`,
      [limit]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("[Ranking] Leaderboard error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Get Single Player Ranking ──────────────────────────
// GET /api/ranking/player/:id
router.get("/player/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT r.user_id   AS "playerId",
              u.username   AS "displayName",
              r.rating,
              r.wins,
              r.losses,
              r.draws
       FROM rankings r
       JOIN users u ON u.id = r.user_id
       WHERE r.user_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Player not found" });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("[Ranking] Player lookup error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Get Rankings by game type (legacy) ─────────────────
router.get("/:gameType", async (req: Request, res: Response) => {
  try {
    const { gameType } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await pool.query(
      `SELECT r.user_id   AS "playerId",
              u.username   AS "displayName",
              r.wins,
              r.losses,
              0            AS draws,
              r.rating
       FROM rankings_legacy r
       JOIN users u ON u.id = r.user_id
       WHERE r.game_type = $1
       ORDER BY r.rating DESC
       LIMIT $2 OFFSET $3`,
      [gameType, limit, offset]
    );

    res.json({ gameType, rankings: result.rows });
  } catch (err) {
    console.error("[Ranking] Get rankings error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Update ranking after a game (simple +1/-1 system) ──
// POST /api/ranking/update
// Body: { playerId, result: 'win'|'loss'|'draw', roomId }
router.post(
  "/update",
  requireAuth,
  validateRankingUpdate,
  async (req: AuthRequest, res: Response) => {
    let client;

    try {
      client = await pool.connect();
    } catch (err) {
      console.error("[Ranking] DB connection error:", err);
      res.status(503).json({ error: "Database unavailable" });
      return;
    }

    try {
      const { playerId, result } = req.body as {
        playerId: string;
        result: "win" | "loss" | "draw";
      };

      if (!playerId || !["win", "loss", "draw"].includes(result)) {
        res
          .status(400)
          .json({ error: "playerId and result ('win'|'loss'|'draw') are required" });
        return;
      }

      await client.query("BEGIN");

      // Upsert ranking row (default rating = 100)
      await client.query(
        `INSERT INTO rankings (user_id, rating)
         VALUES ($1, 100)
         ON CONFLICT (user_id) DO NOTHING`,
        [playerId]
      );

      // Apply simple +1 / -1 update
      let ratingChange: string;
      let winsInc: number;
      let lossesInc: number;
      let drawsInc: number;

      switch (result) {
        case "win":
          ratingChange = "rating + 1";
          winsInc = 1;
          lossesInc = 0;
          drawsInc = 0;
          break;
        case "loss":
          ratingChange = "GREATEST(0, rating - 1)";
          winsInc = 0;
          lossesInc = 1;
          drawsInc = 0;
          break;
        case "draw":
          ratingChange = "rating";
          winsInc = 0;
          lossesInc = 0;
          drawsInc = 1;
          break;
      }

      const updated = await client.query(
        `UPDATE rankings
         SET rating     = ${ratingChange},
             wins       = wins   + $1,
             losses     = losses + $2,
             draws      = draws  + $3,
             updated_at = NOW()
         WHERE user_id = $4
         RETURNING rating`,
        [winsInc, lossesInc, drawsInc, playerId]
      );

      await client.query("COMMIT");

      const newRating = updated.rows[0]?.rating ?? 100;
      res.json({ playerId, newRating, result });
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      console.error("[Ranking] Update error:", err);
      res.status(500).json({ error: "Internal server error" });
    } finally {
      client.release();
    }
  }
);

export default router;
