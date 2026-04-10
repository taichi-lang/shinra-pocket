import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || (() => { console.warn('[AUTH] JWT_SECRET not set, using random secret (tokens will not persist across restarts)'); return require('crypto').randomBytes(32).toString('hex'); })();

export interface AuthPayload {
  userId: string;
  username: string;
}

/** Extend Express Request to carry authenticated user data. */
export interface AuthRequest extends Request {
  user?: AuthPayload;
}

/**
 * Middleware: verify JWT from Authorization header.
 * Expects: `Authorization: Bearer <token>`
 */
export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authorization token required" });
    return;
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Helper: sign a JWT for a user.
 */
export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
