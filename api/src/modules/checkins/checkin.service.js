import { databaseConfigured } from "../../database/pool.js";
import {
  createCheckin,
  findRegistrationCheckins
} from "./checkin.repository.js";
import { validateCheckinInput } from "./checkin.validation.js";

function requireDatabase() {
  if (!databaseConfigured) {
    const error = new Error(
      "Check-in storage is unavailable until PostgreSQL is configured."
    );
    error.statusCode = 503;
    error.code = "DATABASE_NOT_CONFIGURED";
    error.expose = true;
    throw error;
  }
}

export async function scanCheckin(body) {
  const input = validateCheckinInput(body);
  requireDatabase();
  return createCheckin(input);
}

export async function listCheckins(publicId) {
  requireDatabase();
  return findRegistrationCheckins(publicId.toUpperCase());
}