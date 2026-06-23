import { createHash, timingSafeEqual } from "node:crypto";
import { pool } from "../../database/pool.js";

function hashToken(token) {
  return createHash("sha256").update(token).digest();
}

function tokenMatches(token, storedHash) {
  if (!token || !storedHash) return false;
  const received = hashToken(token);
  const stored = Buffer.from(storedHash, "hex");
  return stored.length === received.length && timingSafeEqual(stored, received);
}

function mapParticipant(row) {
  return {
    registrationId: row.public_id,
    registrationStatus: row.status,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    birthDate:
      row.birth_date instanceof Date
        ? row.birth_date.toISOString().slice(0, 10)
        : String(row.birth_date).slice(0, 10),
    jerseySize: row.jersey_size,
    emergencyContact: {
      fullName: row.emergency_name,
      phone: row.emergency_phone
    }
  };
}

async function findAuthorizedParticipant(client, publicId, accessToken) {
  const result = await client.query(
    `SELECT
      registration.id AS registration_id,
      registration.public_id,
      registration.status,
      registration.access_token_hash,
      participant.id AS participant_id,
      participant.full_name,
      participant.email,
      participant.phone,
      participant.birth_date,
      registration.jersey_size,
      emergency.id AS emergency_id,
      emergency.full_name AS emergency_name,
      emergency.phone AS emergency_phone
     FROM registrations AS registration
     JOIN participants AS participant
       ON participant.id = registration.participant_id
     JOIN emergency_contacts AS emergency
       ON emergency.participant_id = participant.id
     WHERE registration.public_id = $1`,
    [publicId]
  );

  const participant = result.rows[0];
  if (!participant || !tokenMatches(accessToken, participant.access_token_hash)) {
    return null;
  }
  return participant;
}

export async function findParticipant(publicId, accessToken) {
  const participant = await findAuthorizedParticipant(
    pool,
    publicId,
    accessToken
  );
  return participant ? mapParticipant(participant) : null;
}

export async function updateParticipant(publicId, accessToken, update) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const participant = await findAuthorizedParticipant(
      client,
      publicId,
      accessToken
    );
    if (!participant) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query(
      `UPDATE participants
       SET full_name = COALESCE($2, full_name),
           phone = COALESCE($3, phone),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [
        participant.participant_id,
        update.fullName ?? null,
        update.phone ?? null
      ]
    );

    await client.query(
      `UPDATE emergency_contacts
       SET full_name = COALESCE($2, full_name),
           phone = COALESCE($3, phone),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [
        participant.emergency_id,
        update.emergencyName ?? null,
        update.emergencyPhone ?? null
      ]
    );

    if (update.jerseySize) {
      await client.query(
        `UPDATE registrations
         SET jersey_size = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [participant.registration_id, update.jerseySize]
      );
    }

    await client.query("COMMIT");
    return findParticipant(publicId, accessToken);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}