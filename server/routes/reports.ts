import { Router, Request, Response, NextFunction } from "express";
import pool from "../db/connection";

const router = Router();

// ─── Sanitization Helpers ────────────────────────────────

/** Strip HTML tags, code blocks, and potential prompt-injection patterns. */
function sanitizeInput(str: string, maxLen: number): string {
  return str
    .slice(0, maxLen)
    .replace(/<[^>]*>/g, "")                        // strip HTML tags
    .replace(/```[\s\S]*?```/g, "")                  // strip code blocks
    .replace(/\[INST\][\s\S]*?\[\/INST\]/gi, "")     // strip prompt injection patterns
    .replace(/<\|.*?\|>/g, "")                        // strip special tokens
    .replace(/<<SYS>>[\s\S]*?<<\/SYS>>/gi, "")       // strip system prompt patterns
    .trim();
}

/** Escape HTML entities for safe storage / display. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Report Rate Limiter (5 per IP per hour) ────────────

interface ReportRateBucket {
  count: number;
  resetAt: number;
}

const reportRateBuckets = new Map<string, ReportRateBucket>();
const REPORT_RATE_LIMIT = 5;
const REPORT_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/** Clean up expired buckets periodically to avoid memory leaks. */
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of reportRateBuckets) {
    if (now > bucket.resetAt) {
      reportRateBuckets.delete(ip);
    }
  }
}, 60_000);

function reportRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();

  let bucket = reportRateBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + REPORT_RATE_WINDOW_MS };
    reportRateBuckets.set(ip, bucket);
  }

  bucket.count++;

  if (bucket.count > REPORT_RATE_LIMIT) {
    res.status(429).json({ error: "Too many reports. Max 5 per hour." });
    return;
  }

  next();
}

// ─── Admin API Key Middleware (reusable) ─────────────────
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

function requireAdminKey(req: Request, res: Response, next: NextFunction): void {
  if (!ADMIN_API_KEY) {
    res.status(503).json({ error: "Admin API not configured" });
    return;
  }
  const key = req.headers["x-admin-key"];
  if (key !== ADMIN_API_KEY) {
    res.status(403).json({ error: "Forbidden: invalid admin key" });
    return;
  }
  next();
}

// ─── POST / — Submit error report (no auth, rate-limited) ─
router.post("/", reportRateLimiter, async (req: Request, res: Response) => {
  try {
    const { playerId, screenName, description, deviceInfo, timestamp, appVersion } = req.body as {
      playerId?: string;
      screenName: string;
      description: string;
      deviceInfo?: string;
      timestamp: string;
      appVersion?: string;
    };

    // --- Required field validation ---
    if (!screenName || !description) {
      res.status(400).json({ error: "screenName and description are required" });
      return;
    }

    // --- Sanitize & length-limit all inputs ---
    const cleanDescription = sanitizeInput(description, 2000);
    if (!cleanDescription) {
      res.status(400).json({ error: "description must not be empty" });
      return;
    }
    const cleanScreenName = sanitizeInput(screenName, 100);
    const cleanDeviceInfo = deviceInfo ? sanitizeInput(deviceInfo, 500) : null;
    const cleanAppVersion = appVersion ? sanitizeInput(appVersion, 50) : null;
    const cleanPlayerId = playerId ? sanitizeInput(playerId, 100) : null;
    const cleanTimestamp = timestamp || new Date().toISOString();

    // --- Escape HTML entities before DB storage ---
    const safeDescription = escapeHtml(cleanDescription);
    const safeScreenName = escapeHtml(cleanScreenName);
    const safeDeviceInfo = cleanDeviceInfo ? escapeHtml(cleanDeviceInfo) : null;
    const safeAppVersion = cleanAppVersion ? escapeHtml(cleanAppVersion) : null;
    const safePlayerId = cleanPlayerId ? escapeHtml(cleanPlayerId) : null;

    const result = await pool.query(
      `INSERT INTO error_reports (player_id, screen_name, description, device_info, app_version, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [safePlayerId, safeScreenName, safeDescription, safeDeviceInfo, safeAppVersion, cleanTimestamp]
    );

    const reportId = result.rows[0].id;
    console.log(`[Reports] New error report #${reportId} from ${safePlayerId || "anonymous"} on ${safeScreenName}`);
    res.status(201).json({ success: true, reportId });
  } catch (err) {
    console.error("[Reports] Submit error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET / — List reports (admin only) ──────────────────
router.get("/", requireAdminKey, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const status = (req.query.status as string) || "";
    const offset = (page - 1) * limit;

    // Validate status filter if provided
    const validStatuses = ["open", "investigating", "resolved", "closed"];
    if (status && !validStatuses.includes(status)) {
      res.status(400).json({ error: "Invalid status filter" });
      return;
    }

    let whereClause = "";
    const params: (string | number)[] = [];

    if (status) {
      whereClause = "WHERE status = $1";
      params.push(status);
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) AS count FROM error_reports ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const paramOffset = params.length;
    const reportsResult = await pool.query(
      `SELECT id, player_id AS "playerId", screen_name AS "screenName",
              description, device_info AS "deviceInfo", app_version AS "appVersion",
              status, admin_note AS "adminNote",
              compensation_tickets AS "compensationTickets",
              compensation_message AS "compensationMessage",
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM error_reports
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramOffset + 1} OFFSET $${paramOffset + 2}`,
      [...params, limit, offset]
    );

    res.json({ reports: reportsResult.rows, total, page, limit });
  } catch (err) {
    console.error("[Reports] List error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /:id — Update report status (admin only) ─────
router.patch("/:id", requireAdminKey, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body as {
      status: "open" | "investigating" | "resolved" | "closed";
      adminNote?: string;
    };

    const validStatuses = ["open", "investigating", "resolved", "closed"];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ error: "status must be one of: open, investigating, resolved, closed" });
      return;
    }

    // Validate id is a positive integer
    const idNum = parseInt(id, 10);
    if (isNaN(idNum) || idNum < 1) {
      res.status(400).json({ error: "Invalid report ID" });
      return;
    }

    // Sanitize admin note if provided
    const cleanAdminNote = adminNote !== undefined ? escapeHtml(sanitizeInput(adminNote, 2000)) : null;

    const result = await pool.query(
      `UPDATE error_reports
       SET status = $1, admin_note = COALESCE($2, admin_note), updated_at = NOW()
       WHERE id = $3
       RETURNING id`,
      [status, cleanAdminNote, idNum]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    console.log(`[Reports] Report #${id} status updated to ${status}`);
    res.json({ success: true, id: parseInt(id, 10), status });
  } catch (err) {
    console.error("[Reports] Update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /:id/compensate — Send apology tickets (admin only) ──
router.post("/:id/compensate", requireAdminKey, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tickets, message } = req.body as { tickets: number; message?: string };

    // Validate id is a positive integer
    const idNum = parseInt(id, 10);
    if (isNaN(idNum) || idNum < 1) {
      res.status(400).json({ error: "Invalid report ID" });
      return;
    }

    // Validate tickets is a positive integer
    if (!tickets || !Number.isInteger(tickets) || tickets < 1) {
      res.status(400).json({ error: "tickets must be a positive integer" });
      return;
    }
    if (tickets > 10000) {
      res.status(400).json({ error: "tickets cannot exceed 10000" });
      return;
    }

    // Get the report to check it has a playerId
    const reportResult = await pool.query(
      "SELECT player_id FROM error_reports WHERE id = $1",
      [idNum]
    );

    if (reportResult.rows.length === 0) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    const playerId = reportResult.rows[0].player_id;
    if (!playerId) {
      res.status(400).json({ error: "Cannot compensate: report has no associated player" });
      return;
    }

    // Sanitize message if provided
    const cleanMessage = message ? escapeHtml(sanitizeInput(message, 500)) : null;

    // Record the compensation in the report
    await pool.query(
      `UPDATE error_reports
       SET compensation_tickets = $1, compensation_message = $2, updated_at = NOW()
       WHERE id = $3`,
      [tickets, cleanMessage, idNum]
    );

    console.log(`[Reports] Compensation sent: ${tickets} tickets to player ${playerId} for report #${idNum}`);
    res.json({ success: true, ticketsSent: tickets });
  } catch (err) {
    console.error("[Reports] Compensate error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
