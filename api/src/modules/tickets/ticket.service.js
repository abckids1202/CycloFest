import { databaseConfigured } from "../../database/pool.js";
import {
  findAuthorizedTicket,
  revokeTicket,
  rotateTicketToken,
  validateTicketByToken
} from "./ticket.repository.js";
import {
  validateRevocation,
  validateTicketScan
} from "./ticket.validation.js";

function requireDatabase() {
  if (!databaseConfigured) {
    const error = new Error(
      "Ticket storage is unavailable until PostgreSQL is configured."
    );
    error.statusCode = 503;
    error.code = "DATABASE_NOT_CONFIGURED";
    error.expose = true;
    throw error;
  }
}

function requireRegistrationToken(token) {
  if (!token) {
    const error = new Error("A registration access token is required.");
    error.statusCode = 401;
    error.code = "ACCESS_TOKEN_REQUIRED";
    throw error;
  }
}

export async function getTicket(registrationId, accessToken) {
  requireRegistrationToken(accessToken);
  requireDatabase();
  const ticket = await findAuthorizedTicket(registrationId, accessToken);
  if (!ticket) {
    const error = new Error("Ticket access was denied or ticket is not issued.");
    error.statusCode = 404;
    error.code = "TICKET_NOT_FOUND";
    throw error;
  }
  return ticket;
}

export async function createTicketQrToken(registrationId, accessToken) {
  requireRegistrationToken(accessToken);
  requireDatabase();
  const result = await rotateTicketToken(registrationId, accessToken);
  if (!result) {
    const error = new Error("Ticket access was denied or ticket is not issued.");
    error.statusCode = 404;
    error.code = "TICKET_NOT_FOUND";
    throw error;
  }
  return result;
}

export async function validateTicket(body) {
  const input = validateTicketScan(body);
  requireDatabase();
  const ticket = await validateTicketByToken(input.qrToken);
  if (!ticket) {
    const error = new Error("Ticket is invalid.");
    error.statusCode = 404;
    error.code = "TICKET_INVALID";
    throw error;
  }
  return ticket;
}

export async function revokeTicketById(ticketId, body) {
  const input = validateRevocation(body);
  requireDatabase();
  const ticket = await revokeTicket(ticketId, input.reason);
  if (!ticket) {
    const error = new Error("Ticket not found.");
    error.statusCode = 404;
    error.code = "TICKET_NOT_FOUND";
    throw error;
  }
  return {
    id: ticket.public_id,
    participantNumber: ticket.participant_number,
    status: "REVOKED",
    revokedAt: ticket.revoked_at,
    revokeReason: ticket.revoke_reason
  };
}