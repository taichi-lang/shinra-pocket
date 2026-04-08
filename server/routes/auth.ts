import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import pool from "../db/connection";
import { AuthRequest, requireAuth, signToken } from "../middleware/auth";

const router = Router();
const SALT_ROUNDS = 10;

// ─── Anonymous Auth ─────────────────────────────────────
// Returns a JWT for anonymous players (no account required).
router.post("/anonymous", (req: Request, res: Response) => {
  try {
    const displayName =
      typeof req.body?.displayName === "string" && req.body.displayName.trim()
        ? req.body.displayName.trim().slice(0, 32)
        : `Player_${uuidv4().slice(0, 6)}`;

    const playerId = uuidv4();
    const token = signToken({ userId: playerId, username: displayName });

    res.json({ token, playerId, displayName });
  } catch (err) {
    console.error("[Auth] Anonymous auth error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Register ────────────────────────────────────────────
router.post("/register", async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: "username and password are required" });
      return;
    }
    if (username.length < 3 || username.length > 32) {
      res.status(400).json({ error: "username must be 3-32 characters" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "password must be at least 6 characters" });
      return;
    }

    // Check if username already exists
    const existing = await pool.query(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );
    if (existing.rows.length > 0) {
      res.status(409).json({ error: "Username already taken" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO users (username, password_hash)
       VALUES ($1, $2)
       RETURNING id, username, rating, created_at`,
      [username, passwordHash]
    );

    const user = result.rows[0];
    const token = signToken({ userId: user.id, username: user.username });

    res.status(201).json({ token, user: { id: user.id, username: user.username, rating: user.rating } });
  } catch (err) {
    console.error("[Auth] Register error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Login ───────────────────────────────────────────────
router.post("/login", async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: "username and password are required" });
      return;
    }

    const result = await pool.query(
      "SELECT id, username, password_hash, rating FROM users WHERE username = $1",
      [username]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    const token = signToken({ userId: user.id, username: user.username });

    res.json({ token, user: { id: user.id, username: user.username, rating: user.rating } });
  } catch (err) {
    console.error("[Auth] Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Profile (authenticated) ─────────────────────────────
router.get("/profile", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT id, username, rating, created_at FROM users WHERE id = $1",
      [req.user!.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error("[Auth] Profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
