import { databaseConfigured } from "../../database/pool.js";
import {
  findParticipant,
  updateParticipant
} from "./participant.repository.js";
import { validateParticipantUpdate } from "./participant.validation.js";

function requireDatabase() {
  if (!databaseConfigured) {
    const error = new Error(
      "Participant storage is unavailable until PostgreSQL is configured."
    );
    error.statusCode = 503;
    error.code = "DATABASE_NOT_CONFIGURED";
    error.expose = true;
    throw error;
  }
}

function requireAccessToken(token) {
  if (!token) {
    const error = new Error("A registration access token is required.");
    error.statusCode = 401;
    error.code = "ACCESS_TOKEN_REQUIRED";
    throw error;
  }
}

export async function getParticipant(publicId, accessToken) {
  requireAccessToken(accessToken);
  requireDatabase();
  const participant = await findParticipant(publicId, accessToken);
  if (!participant) {
    const error = new Error("Registration access was denied.");
    error.statusCode = 403;
    error.code = "REGISTRATION_ACCESS_DENIED";
    throw error;
  }
  return participant;
}

export async function editParticipant(publicId, accessToken, body) {
  const update = validateParticipantUpdate(body);
  requireAccessToken(accessToken);
  requireDatabase();
  const participant = await updateParticipant(publicId, accessToken, update);
  if (!participant) {
    const error = new Error("Registration access was denied.");
    error.statusCode = 403;
    error.code = "REGISTRATION_ACCESS_DENIED";
    throw error;
  }
  return participant;
}