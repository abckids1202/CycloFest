import { config } from "../../config/env.js";
import {
  checkDatabaseConnection,
  databaseConfigured
} from "../../database/pool.js";
import { paymentProviderConfigured } from "../../integrations/payments/index.js";

const startedAt = new Date();

export function getLiveness() {
  return {
    status: "ok",
    service: "cyclofest-api",
    environment: config.environment,
    startedAt: startedAt.toISOString(),
    uptimeSeconds: Math.floor(process.uptime())
  };
}

export async function getReadiness() {
  const checks = {
    database: {
      configured: databaseConfigured,
      connected: false
    },
    payments: {
      provider: config.paymentProvider,
      configured: paymentProviderConfigured()
    }
  };

  if (databaseConfigured) {
    try {
      const database = await checkDatabaseConnection();
      checks.database.connected = database.connected;
      checks.database.name = database.database;
    } catch {
      checks.database.connected = false;
    }
  }

  const ready =
    checks.database.configured &&
    checks.database.connected &&
    checks.payments.configured;

  return {
    ready,
    status: ready ? "ready" : "not_ready",
    checks
  };
}