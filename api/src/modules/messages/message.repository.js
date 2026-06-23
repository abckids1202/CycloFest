import { randomUUID } from "node:crypto";
import { pool } from "../../database/pool.js";

function mapMessage(row) {
  return {
    id: row.id,
    registrationId: row.registration_public_id ?? null,
    channel: row.channel,
    type: row.message_type,
    recipient: row.recipient,
    subject: row.subject,
    body: row.body,
    status: row.status,
    provider: row.provider,
    providerMessageId: row.provider_message_id,
    errorMessage: row.error_message,
    metadata: row.metadata ?? {},
    sentAt: row.sent_at,
    createdAt: row.created_at
  };
}

export async function findMessagingRegistration(eventSlug, registrationPublicId) {
  const result = await pool.query(
    `SELECT
       event.id AS event_id,
       event.slug AS event_slug,
       event.name AS event_name,
       event.date_label,
       event.location,
       event.venue,
       registration.id AS registration_id,
       registration.public_id AS registration_public_id,
       registration.status AS registration_status,
       registration.total_amount,
       registration.hold_expires_at,
       participant.full_name,
       participant.email,
       participant.phone,
       category.name AS category_name,
       category.distance_km,
       payment.public_id AS payment_public_id,
       payment.checkout_url,
       payment.status AS payment_status,
       payment.expires_at AS payment_expires_at,
       ticket.public_id AS ticket_public_id,
       ticket.participant_number
     FROM registrations AS registration
     JOIN events AS event ON event.id = registration.event_id
     JOIN participants AS participant ON participant.id = registration.participant_id
     JOIN event_categories AS category ON category.id = registration.category_id
     LEFT JOIN LATERAL (
       SELECT *
       FROM payments AS payment
       WHERE payment.registration_id = registration.id
       ORDER BY payment.created_at DESC
       LIMIT 1
     ) AS payment ON TRUE
     LEFT JOIN tickets AS ticket ON ticket.registration_id = registration.id
     WHERE event.slug = $1
       AND registration.public_id = $2`,
    [eventSlug, registrationPublicId]
  );
  return result.rows[0] ?? null;
}

export async function findMessagingRegistrationByPublicId(registrationPublicId) {
  const result = await pool.query(
    `SELECT event.slug
     FROM registrations AS registration
     JOIN events AS event ON event.id = registration.event_id
     WHERE registration.public_id = $1`,
    [registrationPublicId]
  );
  const eventSlug = result.rows[0]?.slug;
  if (!eventSlug) return null;
  return findMessagingRegistration(eventSlug, registrationPublicId);
}

export async function insertMessage(message) {
  const result = await pool.query(
    `INSERT INTO message_outbox (
       id, event_id, registration_id, channel, message_type, recipient,
       subject, body, status, provider, provider_message_id, metadata,
       created_by, sent_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6,
       $7, $8, 'SENT', 'mock', $9, $10::jsonb,
       $11, CURRENT_TIMESTAMP
     )
     RETURNING *`,
    [
      randomUUID(),
      message.eventId,
      message.registrationId ?? null,
      message.channel,
      message.type,
      message.recipient,
      message.subject ?? null,
      message.body,
      `mock-${randomUUID()}`,
      JSON.stringify(message.metadata ?? {}),
      message.createdBy ?? null
    ]
  );
  return mapMessage(result.rows[0]);
}

export async function listRecentMessagesForRegistration(registrationPublicId) {
  const result = await pool.query(
    `SELECT message.*, registration.public_id AS registration_public_id
     FROM message_outbox AS message
     LEFT JOIN registrations AS registration ON registration.id = message.registration_id
     WHERE registration.public_id = $1
     ORDER BY message.created_at DESC
     LIMIT 12`,
    [registrationPublicId]
  );
  return result.rows.map(mapMessage);
}

export async function listBroadcastRecipients(eventSlug, target) {
  const values = [eventSlug];
  const clauses = [
    "event.slug = $1",
    "registration.status NOT IN ('CANCELLED', 'REFUNDED')"
  ];

  if (target === "CONFIRMED") {
    clauses.push("registration.status IN ('CONFIRMED', 'CHECKED_IN')");
  }
  if (target === "PENDING_PAYMENT") {
    clauses.push("registration.status = 'PENDING_PAYMENT'");
  }

  const result = await pool.query(
    `SELECT
       event.id AS event_id,
       registration.id AS registration_id,
       registration.public_id AS registration_public_id,
       participant.full_name,
       participant.email,
       participant.phone
     FROM registrations AS registration
     JOIN events AS event ON event.id = registration.event_id
     JOIN participants AS participant ON participant.id = registration.participant_id
     WHERE ${clauses.join(" AND ")}
     ORDER BY registration.created_at DESC`,
    values
  );
  return result.rows;
}

export async function getEventIdForMessaging(eventSlug) {
  const result = await pool.query("SELECT id FROM events WHERE slug = $1", [eventSlug]);
  return result.rows[0]?.id ?? null;
}

export async function getMessagingSettings(eventSlug) {
  const result = await pool.query(
    `SELECT settings.*
     FROM events AS event
     LEFT JOIN messaging_settings AS settings ON settings.event_id = event.id
     WHERE event.slug = $1`,
    [eventSlug]
  );
  return result.rows[0] ?? null;
}

export async function saveMessagingSettings(eventSlug, input, userId) {
  const eventId = await getEventIdForMessaging(eventSlug);
  if (!eventId) return null;

  const result = await pool.query(
    `INSERT INTO messaging_settings (
       event_id, email_provider, email_api_key, sender_email, sender_name,
       whatsapp_provider, whatsapp_api_key, whatsapp_phone_number,
       templates, updated_by
     ) VALUES (
       $1, $2, $3, $4, $5,
       $6, $7, $8,
       $9::jsonb, $10
     )
     ON CONFLICT (event_id) DO UPDATE SET
       email_provider = EXCLUDED.email_provider,
       email_api_key = COALESCE(EXCLUDED.email_api_key, messaging_settings.email_api_key),
       sender_email = EXCLUDED.sender_email,
       sender_name = EXCLUDED.sender_name,
       whatsapp_provider = EXCLUDED.whatsapp_provider,
       whatsapp_api_key = COALESCE(EXCLUDED.whatsapp_api_key, messaging_settings.whatsapp_api_key),
       whatsapp_phone_number = EXCLUDED.whatsapp_phone_number,
       templates = EXCLUDED.templates,
       updated_by = EXCLUDED.updated_by,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [
      eventId,
      input.emailProvider,
      input.emailApiKey,
      input.senderEmail,
      input.senderName,
      input.whatsappProvider,
      input.whatsappApiKey,
      input.whatsappPhoneNumber,
      JSON.stringify(input.templates),
      userId
    ]
  );
  return result.rows[0];
}
