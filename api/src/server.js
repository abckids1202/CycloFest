import { app } from "./app.js";
import { config } from "./config/env.js";
import { closeDatabase, databaseConfigured } from "./database/pool.js";

const server = app.listen(config.port, () => {
  const source = databaseConfigured ? "PostgreSQL" : "static fallback data";
  console.log(`Cycling API running at http://localhost:${config.port}`);
  console.log(`Event data source: ${source}`);
});

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down.`);
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

