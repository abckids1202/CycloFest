import { databaseConfigured } from "../../database/pool.js";
import {
  createPendingRegistration,
  findRegistrationByPublicId
} from "./registration.repository.js";
import { sendRegistrationConfirmation } from "../messages/message.service.js";
import { validateRegistrationInput } from "./registration.validation.js";

function requireDatabase() {
  if (!databaseConfigured) {
    const error = new Error(
      "Registration storage is unavailable until PostgreSQL is configured."
    );
    error.statusCode = 503;
    error.code = "DATABASE_NOT_CONFIGURED";
    error.expose = true;
    throw error;
  }
}

export async function registerParticipant(body) {
  const input = validateRegistrationInput(body);
  requireDatabase();
  const registration = await createPendingRegistration(input);
  sendRegistrationConfirmation(registration.id).catch((error) => {
    console.error("Registration confirmation message failed", error);
  });
  return registration;
}

export async function getRegistration(publicId, accessToken) {
  if (!accessToken) {
    const error = new Error("A registration access token is required.");
    error.statusCode = 401;
    error.code = "ACCESS_TOKEN_REQUIRED";
    throw error;
  }
  requireDatabase();

  const registration = await findRegistrationByPublicId(publicId, accessToken);
  if (!registration) {
    const error = new Error("Registration access was denied.");
    error.statusCode = 403;
    error.code = "REGISTRATION_ACCESS_DENIED";
    throw error;
  }

  return registration;
}
