import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  database: process.env.DB_NAME || "shinra_pocket",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

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

export default pool;
