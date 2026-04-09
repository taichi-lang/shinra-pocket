import { Router, Request, Response } from "express";
import pool from "../db/connection";

const router = Router();

/**
 * POST /api/codes/redeem
 * Validate a serial/promo code and return its details.
 *
 * Body: { code: string, deviceId?: string }
 * Response: { valid: true, code, tickets, expiresAt, maxRedemptions } | { valid: false }
 *
 * Database table (create if not exists):
 *   serial_codes (code TEXT PRIMARY KEY, tickets INT, expires_at TIMESTAMPTZ, max_redemptions INT, current_redemptions INT DEFAULT 0)
 *   serial_code_redemptions (code TEXT, device_id TEXT, redeemed_at TIMESTAMPTZ DEFAULT NOW(), PRIMARY KEY(code, device_id))
 */
router.post("/redeem", async (req: Request, res: Response) => {
  try {
    const { code, deviceId } = req.body as { code?: string; deviceId?: string };

    if (!code || typeof code !== "string") {
      res.json({ valid: false });
      return;
    }

    const normalized = code.trim().toUpperCase();

    // Look up code in the database
    const result = await pool.query(
      `SELECT code, tickets, expires_at, max_redemptions, current_redemptions
       FROM serial_codes
       WHERE code = $1`,
      [normalized]
    );

    if (result.rows.length === 0) {
      res.json({ valid: false });
      return;
    }

    const row = result.rows[0];

    // Check expiry (null = no expiry)
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      res.json({ valid: false, reason: "expired" });
      return;
    }

    // Check max redemptions (0 = unlimited)
    if (
      row.max_redemptions > 0 &&
      row.current_redemptions >= row.max_redemptions
    ) {
      res.json({ valid: false, reason: "max_reached" });
      return;
    }

    // Check per-device redemption if deviceId provided
    if (deviceId) {
      const existing = await pool.query(
        `SELECT 1 FROM serial_code_redemptions WHERE code = $1 AND device_id = $2`,
        [normalized, deviceId]
      );
      if (existing.rows.length > 0) {
        res.json({ valid: false, reason: "already_redeemed" });
        return;
      }

      // Record redemption
      await pool.query(
        `INSERT INTO serial_code_redemptions (code, device_id) VALUES ($1, $2)`,
        [normalized, deviceId]
      );
      await pool.query(
        `UPDATE serial_codes SET current_redemptions = current_redemptions + 1 WHERE code = $1`,
        [normalized]
      );
    }

    res.json({
      valid: true,
      code: row.code,
      tickets: row.tickets,
      expiresAt: row.expires_at,
      maxRedemptions: row.max_redemptions,
    });
  } catch (err) {
    console.error("[Codes] Redeem error:", err);
    res.status(500).json({ valid: false, error: "Internal server error" });
  }
});

export default router;
