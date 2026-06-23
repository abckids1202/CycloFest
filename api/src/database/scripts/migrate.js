import { fileURLToPath } from "node:url";
import { runner } from "node-pg-migrate";
import { config, requireDatabaseUrl } from "../../config/env.js";

const direction = process.argv[2] === "down" ? "down" : "up";
const migrationsDirectory = fileURLToPath(new URL("../migrations", import.meta.url));

await runner({
  databaseUrl: requireDatabaseUrl(),
  dir: migrationsDirectory,
  direction,
  count: direction === "down" ? 1 : undefined,
  migrationsTable: "pgmigrations",
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
  verbose: true
});