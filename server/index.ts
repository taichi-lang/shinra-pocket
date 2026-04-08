import express from "express";
import http from "http";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

import { testConnection } from "./db/connection";
import { registerGameHandler } from "./socket/gameHandler";
import authRoutes from "./routes/auth";
import rankingRoutes from "./routes/ranking";
import matchmakingRoutes from "./routes/matchmaking";
import codesRoutes from "./routes/codes";
import adminRoutes from "./routes/admin";

// ─── Config ──────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || "3001", 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

// ─── Express App ─────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ─── Middleware ──────────────────────────────────────────
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

// ─── Health Check ────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── API Routes ──────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/ranking", rankingRoutes);
app.use("/api/matchmaking", matchmakingRoutes);
app.use("/api/codes", codesRoutes);
app.use("/api/admin", adminRoutes);

// ─── Admin Dashboard (static HTML) ─────────────────────
app.use("/admin", express.static(path.join(__dirname, "admin")));

// ─── Socket.io ───────────────────────────────────────────
const io = new SocketIOServer(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

registerGameHandler(io);

// ─── Start Server ────────────────────────────────────────
async function start(): Promise<void> {
  // Test DB connection (non-blocking — server starts regardless)
  const dbOk = await testConnection();
  if (!dbOk) {
    console.warn("[Server] Starting without database — some features will be unavailable");
  }

  server.listen(PORT, () => {
    console.log(`[Server] Shinra Pocket server running on port ${PORT}`);
    console.log(`[Server] Health check: http://localhost:${PORT}/health`);
    console.log(`[Server] Socket.io ready`);
  });
}

start().catch((err) => {
  console.error("[Server] Fatal error:", err);
  process.exit(1);
});

export { app, server, io };
