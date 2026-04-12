import express from "express";
import http from "http";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

import { testConnection, runMigrations } from "./db/connection";
import { registerGameHandler } from "./socket/gameHandler";
import authRoutes from "./routes/auth";
import rankingRoutes from "./routes/ranking";
import matchmakingRoutes from "./routes/matchmaking";
import codesRoutes from "./routes/codes";
import adminRoutes from "./routes/admin";
import reportsRouter from "./routes/reports";

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

// ─── DB Health Check (debug) ────────────────────────────
app.get("/health/db", async (_req, res) => {
  try {
    const pool = (await import("./db/connection")).default;
    const r = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    res.json({ status: "ok", tables: r.rows.map((x: any) => x.table_name) });
  } catch (err: any) {
    res.json({ status: "error", message: err.message });
  }
});

// ─── API Routes ──────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/ranking", rankingRoutes);
app.use("/api/matchmaking", matchmakingRoutes);
app.use("/api/codes", codesRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reports", reportsRouter);

// ─── Legal Pages (プライバシーポリシー・利用規約) ────────
app.get("/legal/privacy", (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>プライバシーポリシー - Shinra Pocket</title>
<style>body{font-family:sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#0a0a1a;color:#e0e0e0}
h1{color:#ffd700;font-size:22px}h2{color:#ffd700;font-size:16px;margin-top:24px}p{line-height:1.7;font-size:14px}</style></head>
<body>
<h1>プライバシーポリシー</h1>
<p>最終更新日: 2026年4月10日</p>
<h2>1. 収集する情報</h2>
<p>Shinra Pocket（以下「本アプリ」）は、アプリの改善およびサービス提供のために、以下の情報を収集する場合があります。</p>
<p>・端末識別子（匿名ID）<br>・ゲームプレイデータ（スコア、対戦結果等）<br>・アプリの利用状況（画面遷移、エラーログ等）</p>
<h2>2. 情報の利用目的</h2>
<p>収集した情報は、サービスの提供・改善、不正利用の防止、ユーザーサポートの目的で利用します。</p>
<h2>3. 第三者への提供</h2>
<p>法令に基づく場合を除き、ユーザーの同意なく個人情報を第三者に提供することはありません。</p>
<h2>4. お問い合わせ</h2>
<p>プライバシーに関するお問い合わせは、アプリ内の設定画面またはSNSアカウントよりご連絡ください。</p>
<p style="margin-top:32px;color:#888;font-size:12px">Shinra Wonderful Toys</p>
</body></html>`);
});

app.get("/legal/terms", (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>利用規約 - Shinra Pocket</title>
<style>body{font-family:sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#0a0a1a;color:#e0e0e0}
h1{color:#ffd700;font-size:22px}h2{color:#ffd700;font-size:16px;margin-top:24px}p{line-height:1.7;font-size:14px}</style></head>
<body>
<h1>利用規約</h1>
<p>最終更新日: 2026年4月10日</p>
<h2>1. 本規約の適用</h2>
<p>本利用規約（以下「本規約」）は、Shinra Pocket（以下「本アプリ」）の利用に関する条件を定めるものです。</p>
<h2>2. 禁止事項</h2>
<p>ユーザーは以下の行為を行ってはなりません。</p>
<p>・不正アクセスやチート行為<br>・他のユーザーへの迷惑行為<br>・アプリの逆コンパイル・改変<br>・法令に違反する行為</p>
<h2>3. アプリ内課金</h2>
<p>本アプリにはアプリ内課金が含まれます。購入後の返金は、各プラットフォーム（App Store / Google Play）の規約に従います。</p>
<h2>4. 免責事項</h2>
<p>本アプリの利用により生じた損害について、開発者は一切の責任を負いません。</p>
<h2>5. 規約の変更</h2>
<p>本規約は予告なく変更される場合があります。変更後の規約は、本ページに掲載した時点で効力を生じます。</p>
<p style="margin-top:32px;color:#888;font-size:12px">Shinra Wonderful Toys</p>
</body></html>`);
});

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
  // Test DB connection and run migrations (non-blocking — server starts regardless)
  if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
    console.warn("[Server] No DATABASE_URL or DB_HOST set — skipping DB initialization");
  } else {
    const dbOk = await testConnection();
    if (dbOk) {
      try {
        await runMigrations();
      } catch (err) {
        console.error("[Server] Migration failed:", err);
      }
    } else {
      console.warn("[Server] Starting without database — some features will be unavailable");
    }
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
