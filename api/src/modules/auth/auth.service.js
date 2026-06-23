import { config } from "../../config/env.js";
import { databaseConfigured } from "../../database/pool.js";
import {
  createSessionToken,
  hashPassword,
  verifyPassword
} from "./auth-crypto.js";
import {
  bootstrapOwner,
  createSession,
  findSessionWithAccess,
  findUserForLogin,
  revokeSession
} from "./auth.repository.js";
import {
  validateBootstrapInput,
  validateLoginInput
} from "./auth.validation.js";

function requireDatabase() {
  if (!databaseConfigured) {
    const error = new Error(
      "Organizer authentication is unavailable until PostgreSQL is configured."
    );
    error.statusCode = 503;
    error.code = "DATABASE_NOT_CONFIGURED";
    error.expose = true;
    throw error;
  }
}

function unauthorized() {
  const error = new Error("The email or password is incorrect.");
  error.statusCode = 401;
  error.code = "INVALID_CREDENTIALS";
  return error;
}

export async function loginOrganizer(body) {
  const input = validateLoginInput(body);
  requireDatabase();

  const user = await findUserForLogin(input.email);
  const passwordMatches = user
    ? await verifyPassword(input.password, user.password_hash)
    : (await hashPassword(input.password)) && false;

  if (!user || user.status !== "ACTIVE" || !passwordMatches) {
    throw unauthorized();
  }

  const token = createSessionToken();
  const expiresAt = new Date(
    Date.now() + config.organizerSessionHours * 60 * 60 * 1000
  );
  await createSession(user.id, token, expiresAt);
  const session = await findSessionWithAccess(token);

  return {
    token,
    expiresAt,
    user: session.user,
    memberships: session.memberships
  };
}

export async function getOrganizerSession(token) {
  requireDatabase();
  if (!token) return null;
  return findSessionWithAccess(token);
}

export async function logoutOrganizer(token) {
  requireDatabase();
  if (token) await revokeSession(token);
}

export async function createInitialOwner(input) {
  const validated = validateBootstrapInput(input);
  requireDatabase();
  const passwordHash = await hashPassword(validated.password);
  return bootstrapOwner(validated, passwordHash);
}