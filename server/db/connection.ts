import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Use DATABASE_URL if available (Render), otherwise fall back to individual vars
// Determine SSL config: external Render URLs need SSL, internal ones don't
const dbUrl = process.env.DATABASE_URL || "";
const needsSsl = dbUrl.includes(".render.com:");  // external has .render.com:5432
const sslConfig = needsSsl ? { rejectUnauthorized: false } : false;

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfig as any,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
    }
  : {
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432", 10),
      database: process.env.DB_NAME || "shinra_pocket",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

const pool = new Pool(poolConfig);

pool.on("error", (err) => {
  console.error("[DB] Unexpected error on idle client:", err);
});

/**
 * Test the database connection on startup.
 * Returns true if the connection succeeds, false otherwise.
 */
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    console.log("[DB] PostgreSQL connected successfully");
    return true;
  } catch (err) {
    console.error("[DB] Connection failed:", err);
    return false;
  }
}

/**
 * Run schema.sql against the database to auto-create tables.
 * Uses CREATE TABLE IF NOT EXISTS so it's safe to run multiple times.
 */
export async function runMigrations(): Promise<void> {
  const fs = await import("fs");
  const path = await import("path");

  const schemaPath = path.join(__dirname, "schema.sql");
  if (!fs.existsSync(schemaPath)) {
    console.warn("[DB] schema.sql not found, skipping migrations");
    return;
  }

  const sql = fs.readFileSync(schemaPath, "utf-8");
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log("[DB] Schema migrations applied successfully");
  } finally {
    client.release();
  }
}

export default pool;
