import pg from "pg";
import { config } from "../config/env.js";

const { Pool } = pg;

export const databaseConfigured = Boolean(config.databaseUrl);

export const pool = databaseConfigured
  ? new Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    })
  : null;

export async function query(text, values = []) {
  if (!pool) {
    throw new Error("PostgreSQL is not configured.");
  }

  return pool.query(text, values);
}

export async function checkDatabaseConnection() {
  if (!pool) {
    return { configured: false, connected: false };
  }

  const result = await pool.query("SELECT current_database() AS database, NOW() AS checked_at");
  return {
    configured: true,
    connected: true,
    database: result.rows[0].database,
    checkedAt: result.rows[0].checked_at
  };
}

export async function closeDatabase() {
  if (pool) {
    await pool.end();
  }
}