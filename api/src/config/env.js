function readBoolean(value, fallback = false) {
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
}

function readPositiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

export const config = Object.freeze({
  environment: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 8000),
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
  databaseUrl: process.env.DATABASE_URL ?? "",
  databaseSsl: readBoolean(process.env.DATABASE_SSL),
  organizerSessionHours: readPositiveNumber(
    process.env.ORGANIZER_SESSION_HOURS,
    12
  ),
  staffApiKey: process.env.STAFF_API_KEY ?? "",
  paymentProvider: process.env.PAYMENT_PROVIDER ?? "mock",
  paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET ?? "",
  paymentReturnUrl:
    process.env.PAYMENT_RETURN_URL ??
    process.env.FRONTEND_URL ??
    "http://localhost:5173"
});

export function requireDatabaseUrl() {
  if (!config.databaseUrl) {
    throw new Error(
      "DATABASE_URL is missing. Copy the PostgreSQL URL from .env.example into .env."
    );
  }

  return config.databaseUrl;
}