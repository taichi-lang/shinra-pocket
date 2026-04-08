import { Router, Request, Response, NextFunction } from "express";
import pool from "../db/connection";
import { io } from "../index";

const router = Router();

// ─── Server start time (for uptime calculation) ─────────
const serverStartTime = Date.now();

// ─── In-memory maintenance state ────────────────────────
let maintenanceState = {
  enabled: false,
  message: "",
};

// ─── Admin API Key Middleware ────────────────────────────
const ADMIN_KEY = process.env.ADMIN_API_KEY || "shinra-admin-secret-key";

function requireAdminKey(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers["x-admin-key"];
  if (key !== ADMIN_KEY) {
    res.status(403).json({ error: "Forbidden: invalid admin key" });
    return;
  }
  next();
}

router.use(requireAdminKey);

// ─── GET /stats — App statistics ────────────────────────
router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const totalUsersResult = await pool.query("SELECT COUNT(*) AS count FROM users");
    const totalUsers = parseInt(totalUsersResult.rows[0].count, 10);

    // Active today: users who have a game_result created today
    const activeTodayResult = await pool.query(
      `SELECT COUNT(DISTINCT sub.uid) AS count FROM (
         SELECT player1_id AS uid FROM game_results WHERE created_at >= CURRENT_DATE
         UNION
         SELECT player2_id AS uid FROM game_results WHERE created_at >= CURRENT_DATE
       ) sub`
    );
    const activeToday = parseInt(activeTodayResult.rows[0].count, 10);

    const totalGamesResult = await pool.query("SELECT COUNT(*) AS count FROM game_results");
    const totalGames = parseInt(totalGamesResult.rows[0].count, 10);

    // Online users from Socket.io
    const onlineUsers = io?.engine?.clientsCount ?? 0;

    const serverUptime = Math.floor((Date.now() - serverStartTime) / 1000);

    res.json({ totalUsers, activeToday, totalGames, onlineUsers, serverUptime });
  } catch (err) {
    console.error("[Admin] Stats error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /users — User list ─────────────────────────────
router.get("/users", async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const search = (req.query.search as string) || "";
    const offset = (page - 1) * limit;

    let whereClause = "";
    const params: (string | number)[] = [];

    if (search) {
      whereClause = "WHERE u.username ILIKE $1";
      params.push(`%${search}%`);
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) AS count FROM users u ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const paramOffset = params.length;
    const usersResult = await pool.query(
      `SELECT u.id AS "playerId", u.username AS "displayName", u.rating,
              COALESCE(r.wins, 0) AS wins, COALESCE(r.losses, 0) AS losses,
              u.created_at AS "lastSeen",
              FALSE AS "isSubscriber",
              COALESCE(b.banned, FALSE) AS "isBanned"
       FROM users u
       LEFT JOIN rankings r ON r.user_id = u.id
       LEFT JOIN (SELECT user_id, TRUE AS banned FROM banned_users) b ON b.user_id = u.id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${paramOffset + 1} OFFSET $${paramOffset + 2}`,
      [...params, limit, offset]
    );

    res.json({ users: usersResult.rows, total, page, limit });
  } catch (err) {
    console.error("[Admin] Users list error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /users/:id — Single user detail ────────────────
router.get("/users/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const userResult = await pool.query(
      `SELECT u.id, u.username, u.rating, u.created_at,
              COALESCE(r.wins, 0) AS wins, COALESCE(r.losses, 0) AS losses,
              COALESCE(r.draws, 0) AS draws, COALESCE(r.display_name, u.username) AS display_name
       FROM users u
       LEFT JOIN rankings r ON r.user_id = u.id
       WHERE u.id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const gamesResult = await pool.query(
      `SELECT id, game_type, player1_id, player2_id, winner_id, created_at
       FROM game_results
       WHERE player1_id = $1 OR player2_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [id]
    );

    const banResult = await pool.query(
      "SELECT reason, banned_at FROM banned_users WHERE user_id = $1",
      [id]
    );

    res.json({
      user: userResult.rows[0],
      games: gamesResult.rows,
      ban: banResult.rows[0] || null,
    });
  } catch (err) {
    console.error("[Admin] User detail error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /maintenance — Toggle maintenance mode ────────
router.post("/maintenance", (req: Request, res: Response) => {
  const { enabled, message } = req.body as { enabled: boolean; message: string };
  maintenanceState = {
    enabled: !!enabled,
    message: message || "",
  };

  // Broadcast maintenance status to all connected clients
  if (io) {
    io.emit("maintenance", maintenanceState);
  }

  console.log(`[Admin] Maintenance mode ${maintenanceState.enabled ? "ENABLED" : "DISABLED"}: ${maintenanceState.message}`);
  res.json(maintenanceState);
});

// ─── GET /maintenance — Get maintenance status ──────────
router.get("/maintenance", (_req: Request, res: Response) => {
  res.json(maintenanceState);
});

// ─── POST /broadcast — Send announcement ────────────────
router.post("/broadcast", (req: Request, res: Response) => {
  const { message, type } = req.body as { message: string; type: "info" | "warning" | "maintenance" };

  if (!message) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  if (io) {
    io.emit("broadcast", { message, type: type || "info", timestamp: new Date().toISOString() });
  }

  console.log(`[Admin] Broadcast (${type || "info"}): ${message}`);
  res.json({ success: true, message, type: type || "info" });
});

// ─── POST /serial-codes — Create new serial code ────────
router.post("/serial-codes", async (req: Request, res: Response) => {
  try {
    const { code, tickets, expiresAt, maxRedemptions } = req.body as {
      code: string;
      tickets: number;
      expiresAt: string;
      maxRedemptions: number;
    };

    if (!code || !tickets) {
      res.status(400).json({ error: "code and tickets are required" });
      return;
    }

    const normalized = code.trim().toUpperCase();

    await pool.query(
      `INSERT INTO serial_codes (code, tickets, expires_at, max_redemptions, current_redemptions)
       VALUES ($1, $2, $3, $4, 0)
       ON CONFLICT (code) DO UPDATE SET tickets = $2, expires_at = $3, max_redemptions = $4`,
      [normalized, tickets, expiresAt || null, maxRedemptions || 0]
    );

    res.status(201).json({ success: true, code: normalized, tickets, expiresAt, maxRedemptions });
  } catch (err) {
    console.error("[Admin] Create serial code error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /serial-codes — List all serial codes ──────────
router.get("/serial-codes", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT code, tickets, expires_at AS "expiresAt", max_redemptions AS "maxRedemptions",
              current_redemptions AS "currentRedemptions"
       FROM serial_codes
       ORDER BY expires_at DESC NULLS LAST`
    );

    res.json({ codes: result.rows });
  } catch (err) {
    console.error("[Admin] List serial codes error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /ban — Ban a user ─────────────────────────────
router.post("/ban", async (req: Request, res: Response) => {
  try {
    const { playerId, reason } = req.body as { playerId: string; reason: string };

    if (!playerId) {
      res.status(400).json({ error: "playerId is required" });
      return;
    }

    // Ensure banned_users table exists
    await pool.query(
      `CREATE TABLE IF NOT EXISTS banned_users (
         user_id UUID PRIMARY KEY REFERENCES users(id),
         reason  TEXT NOT NULL DEFAULT '',
         banned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
       )`
    );

    await pool.query(
      `INSERT INTO banned_users (user_id, reason)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET reason = $2, banned_at = NOW()`,
      [playerId, reason || ""]
    );

    console.log(`[Admin] Banned user ${playerId}: ${reason}`);
    res.json({ success: true, playerId, reason });
  } catch (err) {
    console.error("[Admin] Ban error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /unban — Unban a user ─────────────────────────
router.post("/unban", async (req: Request, res: Response) => {
  try {
    const { playerId } = req.body as { playerId: string };

    if (!playerId) {
      res.status(400).json({ error: "playerId is required" });
      return;
    }

    await pool.query("DELETE FROM banned_users WHERE user_id = $1", [playerId]);

    console.log(`[Admin] Unbanned user ${playerId}`);
    res.json({ success: true, playerId });
  } catch (err) {
    console.error("[Admin] Unban error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { maintenanceState };
export default router;
