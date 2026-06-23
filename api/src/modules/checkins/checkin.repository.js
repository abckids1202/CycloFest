import { randomUUID } from "node:crypto";
import { pool } from "../../database/pool.js";
import { hashQrToken } from "../tickets/ticket-token.js";

function mapCheckin(row) {
  return {
    id: row.id,
    registrationId: row.public_id,
    participantName: row.full_name,
    categoryName: row.category_name,
    checkinType: row.checkin_type,
    checkedInAt: row.checked_in_at,
    checkedInBy: row.checked_in_by,
    notes: row.notes
  };
}

export async function createCheckin(input) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const registrationResult = await client.query(
      `SELECT
        registration.id,
        registration.public_id,
        registration.status,
        participant.full_name,
        category.name AS category_name,
        ticket.revoked_at
       FROM registrations AS registration
       JOIN participants AS participant
         ON participant.id = registration.participant_id
       JOIN event_categories AS category
         ON category.id = registration.category_id
       LEFT JOIN tickets AS ticket
         ON ticket.registration_id = registration.id
       WHERE (
         ($1::varchar IS NOT NULL AND registration.public_id = $1)
         OR
         ($2::varchar IS NOT NULL AND ticket.qr_token_hash = $2)
       )
       FOR UPDATE OF registration`,
      [
        input.registrationId || null,
        input.qrToken ? hashQrToken(input.qrToken) : null
      ]
    );
    const registration = registrationResult.rows[0];
    if (!registration) {
      const error = new Error("Registration or ticket was not found.");
      error.statusCode = 404;
      error.code = "TICKET_NOT_FOUND";
      throw error;
    }
    if (input.qrToken && registration.revoked_at) {
      const error = new Error("This ticket has been revoked.");
      error.statusCode = 409;
      error.code = "TICKET_REVOKED";
      throw error;
    }
    if (!["PAID", "CONFIRMED", "CHECKED_IN"].includes(registration.status)) {
      const error = new Error(
        `Registration cannot be checked in while status is ${registration.status}.`
      );
      error.statusCode = 409;
      error.code = "REGISTRATION_NOT_ELIGIBLE";
      throw error;
    }

    const duplicate = await client.query(
      `SELECT checked_in_at, checked_in_by
       FROM checkins
       WHERE registration_id = $1 AND checkin_type = $2`,
      [registration.id, input.checkinType]
    );
    if (duplicate.rows[0]) {
      const error = new Error("This check-in was already recorded.");
      error.statusCode = 409;
      error.code = "DUPLICATE_CHECKIN";
      error.details = {
        checkedInAt: duplicate.rows[0].checked_in_at,
        checkedInBy: duplicate.rows[0].checked_in_by
      };
      throw error;
    }

    const result = await client.query(
      `INSERT INTO checkins (
        id, registration_id, checkin_type, checked_in_by, notes
       ) VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        randomUUID(),
        registration.id,
        input.checkinType,
        input.staffName,
        input.notes || null
      ]
    );

    if (input.checkinType === "EVENT_ENTRY") {
      await client.query(
        `UPDATE registrations
         SET status = 'CHECKED_IN', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [registration.id]
      );
    }
    await client.query("COMMIT");
    return mapCheckin({
      ...result.rows[0],
      public_id: registration.public_id,
      full_name: registration.full_name,
      category_name: registration.category_name
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function findRegistrationCheckins(publicId) {
  const result = await pool.query(
    `SELECT
      checkin.*,
      registration.public_id,
      participant.full_name,
      category.name AS category_name
     FROM checkins AS checkin
     JOIN registrations AS registration
       ON registration.id = checkin.registration_id
     JOIN participants AS participant
       ON participant.id = registration.participant_id
     JOIN event_categories AS category
       ON category.id = registration.category_id
     WHERE registration.public_id = $1
     ORDER BY checkin.checked_in_at`,
    [publicId]
  );
  return result.rows.map(mapCheckin);
}