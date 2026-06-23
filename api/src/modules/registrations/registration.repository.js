import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual
} from "node:crypto";
import { pool } from "../../database/pool.js";

const holdMinutes = 30;
const waiverVersion = "2026-01";

function createPublicId() {
  return `CF26-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function createAccessToken() {
  return randomBytes(32).toString("base64url");
}

function hashAccessToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function tokenMatches(token, storedHash) {
  if (!token || !storedHash) return false;
  const received = Buffer.from(hashAccessToken(token), "hex");
  const stored = Buffer.from(storedHash, "hex");
  return stored.length === received.length && timingSafeEqual(stored, received);
}

function mapRegistration(row) {
  return {
    id: row.public_id,
    status: row.status,
    participant: {
      fullName: row.full_name,
      email: row.email,
      phone: row.phone
    },
    category: {
      id: row.category_slug,
      name: row.category_name,
      distanceKm: row.distance_km
    },
    jerseySize: row.jersey_size,
    subtotal: Number(row.subtotal),
    discountAmount: Number(row.discount_amount),
    totalAmount: Number(row.total_amount),
    holdExpiresAt: row.hold_expires_at,
    createdAt: row.created_at
  };
}

export async function createPendingRegistration(input) {
  if (!pool) {
    throw new Error("PostgreSQL is not configured.");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const categoryResult = await client.query(
      `SELECT
        category.id,
        category.event_id,
        category.slug,
        category.name,
        category.distance_km,
        category.price,
        category.capacity,
        category.registered_count,
        event.registration_open,
        event.status AS event_status
       FROM event_categories AS category
       JOIN events AS event ON event.id = category.event_id
       WHERE category.slug = $1
         AND category.is_active = TRUE
       FOR UPDATE OF category`,
      [input.categoryId]
    );

    const category = categoryResult.rows[0];
    if (!category) {
      const error = new Error("The selected category does not exist.");
      error.statusCode = 404;
      error.code = "CATEGORY_NOT_FOUND";
      throw error;
    }

    if (!category.registration_open || category.event_status !== "REGISTRATION_OPEN") {
      const error = new Error("Registration is not open for this event.");
      error.statusCode = 409;
      error.code = "REGISTRATION_CLOSED";
      throw error;
    }

    if (category.registered_count >= category.capacity) {
      const error = new Error("The selected category is full.");
      error.statusCode = 409;
      error.code = "CATEGORY_FULL";
      throw error;
    }

    const duplicateResult = await client.query(
      `SELECT registration.public_id
       FROM registrations AS registration
       JOIN participants AS participant
         ON participant.id = registration.participant_id
       WHERE registration.event_id = $1
         AND participant.email = $2
         AND registration.status NOT IN ('CANCELLED', 'PAYMENT_EXPIRED')
       LIMIT 1`,
      [category.event_id, input.email]
    );

    if (duplicateResult.rows[0]) {
      const error = new Error("This email already has an active registration.");
      error.statusCode = 409;
      error.code = "DUPLICATE_REGISTRATION";
      error.details = { registrationId: duplicateResult.rows[0].public_id };
      throw error;
    }

    const participantId = randomUUID();
    const emergencyContactId = randomUUID();
    const registrationId = randomUUID();
    const publicId = createPublicId();
    const accessToken = createAccessToken();

    await client.query(
      `INSERT INTO participants (
        id, full_name, email, phone, birth_date
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        participantId,
        input.fullName,
        input.email,
        input.phone,
        input.birthDate
      ]
    );

    await client.query(
      `INSERT INTO emergency_contacts (
        id, participant_id, full_name, phone
      ) VALUES ($1, $2, $3, $4)`,
      [
        emergencyContactId,
        participantId,
        input.emergencyName,
        input.emergencyPhone
      ]
    );

    const registrationResult = await client.query(
      `INSERT INTO registrations (
        id,
        public_id,
        event_id,
        participant_id,
        category_id,
        jersey_size,
        status,
        subtotal,
        discount_amount,
        total_amount,
        waiver_version,
        waiver_accepted_at,
        hold_expires_at,
        access_token_hash
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 'PENDING_PAYMENT',
        $7, 0, $7, $8, CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP + ($9 * INTERVAL '1 minute'),
        $10
      )
      RETURNING *`,
      [
        registrationId,
        publicId,
        category.event_id,
        participantId,
        category.id,
        input.jerseySize,
        category.price,
        waiverVersion,
        holdMinutes,
        hashAccessToken(accessToken)
      ]
    );

    await client.query(
      `UPDATE event_categories
       SET registered_count = registered_count + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [category.id]
    );

    await client.query("COMMIT");

    return {
      ...mapRegistration({
      ...registrationResult.rows[0],
      full_name: input.fullName,
      email: input.email,
      phone: input.phone,
      category_slug: category.slug,
      category_name: category.name,
      distance_km: category.distance_km
      }),
      accessToken
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function findRegistrationByPublicId(publicId, accessToken) {
  if (!pool) {
    throw new Error("PostgreSQL is not configured.");
  }

  const result = await pool.query(
    `SELECT
      registration.*,
      participant.full_name,
      participant.email,
      participant.phone,
      registration.access_token_hash,
      category.slug AS category_slug,
      category.name AS category_name,
      category.distance_km
     FROM registrations AS registration
     JOIN participants AS participant
       ON participant.id = registration.participant_id
     JOIN event_categories AS category
       ON category.id = registration.category_id
     WHERE registration.public_id = $1`,
    [publicId]
  );

  const registration = result.rows[0];
  if (
    !registration ||
    !tokenMatches(accessToken, registration.access_token_hash)
  ) {
    return null;
  }
  return mapRegistration(registration);
}