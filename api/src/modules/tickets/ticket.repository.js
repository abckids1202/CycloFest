import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual
} from "node:crypto";
import { pool } from "../../database/pool.js";
import { createQrToken, hashQrToken } from "./ticket-token.js";

function createTicketPublicId() {
  return `TKT-${randomBytes(6).toString("hex").toUpperCase()}`;
}

function participantNumber(publicId) {
  return publicId.replace("CF26-", "CF26-");
}

function registrationTokenMatches(token, storedHash) {
  if (!token || !storedHash) return false;
  const received = createHash("sha256").update(token).digest();
  const stored = Buffer.from(storedHash, "hex");
  return stored.length === received.length && timingSafeEqual(stored, received);
}

function mapTicket(row, qrToken = undefined) {
  const result = {
    id: row.ticket_public_id,
    registrationId: row.registration_public_id,
    participantNumber: row.participant_number,
    status: row.revoked_at ? "REVOKED" : "ACTIVE",
    issuedAt: row.issued_at,
    revokedAt: row.revoked_at,
    revokeReason: row.revoke_reason,
    participant: {
      fullName: row.full_name
    },
    category: {
      id: row.category_slug,
      name: row.category_name,
      distanceKm: row.distance_km
    },
    event: {
      name: row.event_name,
      date: row.event_date,
      location: row.event_location,
      venue: row.event_venue
    }
  };

  if (qrToken) {
    result.qrToken = qrToken;
    result.qrPayload = `cyclofest:ticket:${qrToken}`;
  }

  return result;
}

export async function issueTicketForRegistration(client, registrationId) {
  const existing = await client.query(
    `SELECT id
     FROM tickets
     WHERE registration_id = $1`,
    [registrationId]
  );
  if (existing.rows[0]) {
    return { created: false };
  }

  const registrationResult = await client.query(
    `SELECT public_id, status
     FROM registrations
     WHERE id = $1
     FOR UPDATE`,
    [registrationId]
  );
  const registration = registrationResult.rows[0];
  if (!registration || !["CONFIRMED", "CHECKED_IN"].includes(registration.status)) {
    return { created: false };
  }

  const qrToken = createQrToken();
  await client.query(
    `INSERT INTO tickets (
      id, public_id, registration_id, participant_number, qr_token_hash
     ) VALUES ($1, $2, $3, $4, $5)`,
    [
      randomUUID(),
      createTicketPublicId(),
      registrationId,
      participantNumber(registration.public_id),
      hashQrToken(qrToken)
    ]
  );
  return { created: true, qrToken };
}

export async function findAuthorizedTicket(registrationPublicId, accessToken) {
  const result = await pool.query(
    `SELECT
      ticket.public_id AS ticket_public_id,
      ticket.participant_number,
      ticket.issued_at,
      ticket.revoked_at,
      ticket.revoke_reason,
      registration.public_id AS registration_public_id,
      registration.access_token_hash,
      participant.full_name,
      category.slug AS category_slug,
      category.name AS category_name,
      category.distance_km,
      event.name AS event_name,
      event.event_date,
      event.location AS event_location,
      event.venue AS event_venue
     FROM tickets AS ticket
     JOIN registrations AS registration
       ON registration.id = ticket.registration_id
     JOIN participants AS participant
       ON participant.id = registration.participant_id
     JOIN event_categories AS category
       ON category.id = registration.category_id
     JOIN events AS event
       ON event.id = registration.event_id
     WHERE registration.public_id = $1`,
    [registrationPublicId]
  );
  const ticket = result.rows[0];
  if (
    !ticket ||
    !registrationTokenMatches(accessToken, ticket.access_token_hash)
  ) {
    return null;
  }
  return mapTicket(ticket);
}

export async function rotateTicketToken(
  registrationPublicId,
  accessToken
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `SELECT
        ticket.id,
        registration.access_token_hash,
        ticket.revoked_at
       FROM tickets AS ticket
       JOIN registrations AS registration
         ON registration.id = ticket.registration_id
       WHERE registration.public_id = $1
       FOR UPDATE OF ticket`,
      [registrationPublicId]
    );
    const ticket = result.rows[0];
    if (
      !ticket ||
      !registrationTokenMatches(accessToken, ticket.access_token_hash)
    ) {
      await client.query("ROLLBACK");
      return null;
    }
    if (ticket.revoked_at) {
      const error = new Error("A revoked ticket cannot receive a new QR token.");
      error.statusCode = 409;
      error.code = "TICKET_REVOKED";
      throw error;
    }
    const qrToken = createQrToken();
    await client.query(
      `UPDATE tickets
       SET qr_token_hash = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [ticket.id, hashQrToken(qrToken)]
    );
    await client.query("COMMIT");
    return { qrToken, qrPayload: `cyclofest:ticket:${qrToken}` };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function validateTicketByToken(qrToken) {
  const result = await pool.query(
    `SELECT
      ticket.public_id AS ticket_public_id,
      ticket.participant_number,
      ticket.issued_at,
      ticket.revoked_at,
      ticket.revoke_reason,
      registration.public_id AS registration_public_id,
      registration.status AS registration_status,
      participant.full_name,
      category.slug AS category_slug,
      category.name AS category_name,
      category.distance_km,
      event.name AS event_name,
      event.event_date,
      event.location AS event_location,
      event.venue AS event_venue
     FROM tickets AS ticket
     JOIN registrations AS registration
       ON registration.id = ticket.registration_id
     JOIN participants AS participant
       ON participant.id = registration.participant_id
     JOIN event_categories AS category
       ON category.id = registration.category_id
     JOIN events AS event
       ON event.id = registration.event_id
     WHERE ticket.qr_token_hash = $1`,
    [hashQrToken(qrToken)]
  );
  const ticket = result.rows[0];
  if (!ticket) return null;
  return {
    ...mapTicket(ticket),
    registrationStatus: ticket.registration_status,
    valid:
      !ticket.revoked_at &&
      ["CONFIRMED", "CHECKED_IN"].includes(ticket.registration_status)
  };
}

export async function revokeTicket(ticketPublicId, reason) {
  const result = await pool.query(
    `UPDATE tickets
     SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP),
         revoke_reason = COALESCE(revoke_reason, $2),
         updated_at = CURRENT_TIMESTAMP
     WHERE public_id = $1
     RETURNING public_id, participant_number, revoked_at, revoke_reason`,
    [ticketPublicId, reason]
  );
  return result.rows[0] ?? null;
}