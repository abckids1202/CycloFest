import { query } from "../../database/pool.js";
import { randomUUID } from "node:crypto";

function toDateString(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export async function getAdminOverview(eventSlug) {
  const result = await query(
    `SELECT
       event.slug,
       event.name,
       event.status,
       event.event_date,
       event.registration_target,
       COUNT(DISTINCT registration.id) AS registration_count,
       COUNT(DISTINCT registration.id)
         FILTER (WHERE registration.status = 'CONFIRMED') AS confirmed_count,
       COUNT(DISTINCT venue.id) AS venue_count,
       COUNT(DISTINCT activity.id) AS activity_count,
       COUNT(DISTINCT sponsor.id) AS sponsor_count
     FROM events AS event
     LEFT JOIN registrations AS registration ON registration.event_id = event.id
     LEFT JOIN venues AS venue
       ON venue.event_id = event.id AND venue.is_active = TRUE
     LEFT JOIN activities AS activity
       ON activity.event_id = event.id AND activity.is_active = TRUE
     LEFT JOIN sponsors AS sponsor
       ON sponsor.event_id = event.id AND sponsor.is_active = TRUE
     WHERE event.slug = $1
     GROUP BY event.id`,
    [eventSlug]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    event: {
      id: row.slug,
      name: row.name,
      status: row.status,
      date: row.event_date,
      registrationTarget: row.registration_target
    },
    totals: {
      registrations: Number(row.registration_count),
      confirmed: Number(row.confirmed_count),
      venues: Number(row.venue_count),
      activities: Number(row.activity_count),
      sponsors: Number(row.sponsor_count)
    }
  };
}

export async function getAdminEventDetails(eventSlug) {
  const result = await query(
    `SELECT
       id,
       slug,
       name,
       tagline,
       description,
       event_date,
       date_label,
       location,
       venue,
       status,
       registration_target,
       default_language,
       supported_languages,
       translations
     FROM events
     WHERE slug = $1`,
    [eventSlug]
  );

  const event = result.rows[0];
  if (!event) return null;

  return {
    id: event.slug,
    status: event.status,
    name: event.name,
    tagline: event.tagline,
    description: event.description,
    date: toDateString(event.event_date),
    dateLabel: event.date_label,
    location: event.location,
    venue: event.venue,
    registrationTarget: event.registration_target,
    defaultLanguage: event.default_language,
    supportedLanguages: event.supported_languages,
    translations: event.translations ?? {}
  };
}

export async function updateAdminEventDetails(eventSlug, input, userId) {
  const result = await query(
    `UPDATE events
     SET name = $2,
         tagline = $3,
         description = $4,
         event_date = $5,
         date_label = $6,
         location = $7,
         venue = $8,
         registration_target = $9,
         status = $10::varchar,
         registration_open = $10::varchar = 'REGISTRATION_OPEN',
         translations = $11::jsonb,
         updated_at = CURRENT_TIMESTAMP
     WHERE slug = $1
     RETURNING id, slug`,
    [
      eventSlug,
      input.name,
      input.tagline,
      input.description,
      input.date,
      input.dateLabel,
      input.location,
      input.venue,
      input.registrationTarget,
      input.status,
      JSON.stringify(input.translations)
    ]
  );

  const event = result.rows[0];
  if (!event) return null;

  await query(
    `INSERT INTO organizer_audit_log (
      event_id, user_id, action, entity_type, entity_id, metadata
    ) VALUES (
      $1, $2, 'event.details_saved', 'event', $3, $4::jsonb
    )`,
    [
      event.id,
      userId,
      event.slug,
      JSON.stringify({ fields: Object.keys(input), mode: "draft" })
    ]
  );

  return getAdminEventDetails(eventSlug);
}

async function getEventId(eventSlug) {
  const result = await query("SELECT id FROM events WHERE slug = $1", [eventSlug]);
  return result.rows[0]?.id ?? null;
}

async function writeAudit(eventId, userId, action, entityType, entityId, metadata = {}) {
  await query(
    `INSERT INTO organizer_audit_log (
      event_id, user_id, action, entity_type, entity_id, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [eventId, userId, action, entityType, entityId, JSON.stringify(metadata)]
  );
}

function mapVenue(row) {
  return {
    id: row.slug,
    name: row.name,
    description: row.description,
    address: row.address,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    type: row.venue_type,
    mapLabel: row.map_label,
    pinType: row.pin_type,
    sortOrder: row.sort_order,
    translations: row.translations ?? {},
    updatedAt: row.updated_at
  };
}

function mapSponsor(row) {
  return {
    id: row.id,
    name: row.name,
    tier: row.tier,
    venueId: row.venue_slug,
    logoUrl: row.logo_url,
    websiteUrl: row.website_url,
    description: row.description,
    sortOrder: row.sort_order,
    translations: row.translations ?? {},
    updatedAt: row.updated_at
  };
}

function mapActivity(row) {
  return {
    id: row.slug,
    venueId: row.venue_slug,
    name: row.name,
    description: row.description,
    type: row.activity_type,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    sortOrder: row.sort_order,
    translations: row.translations ?? {},
    updatedAt: row.updated_at
  };
}

function mapAdminRegistrationRow(row) {
  return {
    id: row.registration_public_id,
    status: row.registration_status,
    category: {
      id: row.category_slug,
      name: row.category_name,
      distanceKm: row.distance_km
    },
    participant: {
      fullName: row.full_name,
      email: row.email,
      phone: row.phone
    },
    jerseySize: row.jersey_size,
    totalAmount: Number(row.total_amount),
    holdExpiresAt: row.hold_expires_at,
    confirmedAt: row.confirmed_at,
    createdAt: row.created_at,
    payment: row.payment_public_id
      ? {
          id: row.payment_public_id,
          provider: row.provider,
          providerOrderId: row.provider_order_id,
          amount: Number(row.payment_amount),
          currency: row.currency,
          method: row.payment_method,
          status: row.payment_status,
          checkoutUrl: row.checkout_url,
          expiresAt: row.payment_expires_at,
          paidAt: row.paid_at,
          createdAt: row.payment_created_at
        }
      : null,
    ticket: row.ticket_public_id
      ? {
          id: row.ticket_public_id,
          participantNumber: row.participant_number,
          status: row.ticket_revoked_at ? "REVOKED" : "ACTIVE",
          issuedAt: row.issued_at,
          revokedAt: row.ticket_revoked_at,
          revokeReason: row.revoke_reason
        }
      : null,
    checkins: {
      count: Number(row.checkin_count ?? 0),
      latestAt: row.latest_checkin_at
    }
  };
}

function participantFilters(filters) {
  const clauses = ["event.slug = $1"];
  const values = [filters.eventSlug];

  if (filters.status && filters.status !== "ALL") {
    values.push(filters.status);
    clauses.push(`registration.status = $${values.length}`);
  }

  if (filters.paymentStatus && filters.paymentStatus !== "ALL") {
    if (filters.paymentStatus === "NONE") {
      clauses.push("payment.id IS NULL");
    } else {
      values.push(filters.paymentStatus);
      clauses.push(`payment.status = $${values.length}`);
    }
  }

  if (filters.ticketStatus && filters.ticketStatus !== "ALL") {
    if (filters.ticketStatus === "NONE") {
      clauses.push("ticket.id IS NULL");
    } else if (filters.ticketStatus === "ACTIVE") {
      clauses.push("ticket.id IS NOT NULL AND ticket.revoked_at IS NULL");
    } else if (filters.ticketStatus === "REVOKED") {
      clauses.push("ticket.revoked_at IS NOT NULL");
    }
  }

  if (filters.search) {
    values.push(`%${filters.search.toLowerCase()}%`);
    clauses.push(`(
      LOWER(participant.full_name) LIKE $${values.length}
      OR LOWER(participant.email) LIKE $${values.length}
      OR registration.public_id ILIKE $${values.length}
      OR ticket.participant_number ILIKE $${values.length}
    )`);
  }

  return { clauses, values };
}

export async function listAdminRegistrations(filters) {
  const page = Math.max(Number(filters.page ?? 1), 1);
  const pageSize = Math.min(Math.max(Number(filters.pageSize ?? 20), 1), 100);
  const offset = (page - 1) * pageSize;
  const builtFilters = participantFilters(filters);

  const fromSql = `
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
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS checkin_count, MAX(checked_in_at) AS latest_checkin_at
      FROM checkins AS checkin
      WHERE checkin.registration_id = registration.id
    ) AS checkin_summary ON TRUE
    WHERE ${builtFilters.clauses.join(" AND ")}
  `;

  const [totalResult, listResult] = await Promise.all([
    query(`SELECT COUNT(DISTINCT registration.id) AS total ${fromSql}`, builtFilters.values),
    query(
      `SELECT
        registration.public_id AS registration_public_id,
        registration.status AS registration_status,
        registration.jersey_size,
        registration.total_amount,
        registration.hold_expires_at,
        registration.confirmed_at,
        registration.created_at,
        participant.full_name,
        participant.email,
        participant.phone,
        category.slug AS category_slug,
        category.name AS category_name,
        category.distance_km,
        payment.public_id AS payment_public_id,
        payment.provider,
        payment.provider_order_id,
        payment.amount AS payment_amount,
        payment.currency,
        payment.payment_method,
        payment.status AS payment_status,
        payment.checkout_url,
        payment.expires_at AS payment_expires_at,
        payment.paid_at,
        payment.created_at AS payment_created_at,
        ticket.public_id AS ticket_public_id,
        ticket.participant_number,
        ticket.issued_at,
        ticket.revoked_at AS ticket_revoked_at,
        ticket.revoke_reason,
        checkin_summary.checkin_count,
        checkin_summary.latest_checkin_at
       ${fromSql}
       ORDER BY registration.created_at DESC
       LIMIT $${builtFilters.values.length + 1}
       OFFSET $${builtFilters.values.length + 2}`,
      [...builtFilters.values, pageSize, offset]
    )
  ]);

  return {
    items: listResult.rows.map(mapAdminRegistrationRow),
    page,
    pageSize,
    total: Number(totalResult.rows[0]?.total ?? 0)
  };
}

export async function getAdminRegistrationDetail(eventSlug, registrationPublicId) {
  const result = await query(
    `SELECT
      registration.public_id AS registration_public_id,
      registration.status AS registration_status,
      registration.jersey_size,
      registration.subtotal,
      registration.discount_amount,
      registration.total_amount,
      registration.waiver_version,
      registration.waiver_accepted_at,
      registration.hold_expires_at,
      registration.confirmed_at,
      registration.cancelled_at,
      registration.created_at,
      registration.updated_at,
      participant.full_name,
      participant.email,
      participant.phone,
      participant.birth_date,
      emergency.full_name AS emergency_name,
      emergency.phone AS emergency_phone,
      category.slug AS category_slug,
      category.name AS category_name,
      category.distance_km,
      payment.public_id AS payment_public_id,
      payment.provider,
      payment.provider_order_id,
      payment.provider_transaction_id,
      payment.amount AS payment_amount,
      payment.currency,
      payment.payment_method,
      payment.status AS payment_status,
      payment.checkout_url,
      payment.expires_at AS payment_expires_at,
      payment.paid_at,
      payment.created_at AS payment_created_at,
      ticket.public_id AS ticket_public_id,
      ticket.participant_number,
      ticket.issued_at,
      ticket.revoked_at AS ticket_revoked_at,
      ticket.revoke_reason,
      COALESCE(checkin_summary.checkins, '[]'::json) AS checkins
     FROM registrations AS registration
     JOIN events AS event ON event.id = registration.event_id
     JOIN participants AS participant ON participant.id = registration.participant_id
     JOIN emergency_contacts AS emergency ON emergency.participant_id = participant.id
     JOIN event_categories AS category ON category.id = registration.category_id
     LEFT JOIN LATERAL (
       SELECT *
       FROM payments AS payment
       WHERE payment.registration_id = registration.id
       ORDER BY payment.created_at DESC
       LIMIT 1
     ) AS payment ON TRUE
     LEFT JOIN tickets AS ticket ON ticket.registration_id = registration.id
     LEFT JOIN LATERAL (
       SELECT json_agg(
         json_build_object(
           'type', checkin.checkin_type,
           'checkedInAt', checkin.checked_in_at,
           'checkedInBy', checkin.checked_in_by,
           'notes', checkin.notes
         )
         ORDER BY checkin.checked_in_at DESC
       ) AS checkins
       FROM checkins AS checkin
       WHERE checkin.registration_id = registration.id
     ) AS checkin_summary ON TRUE
     WHERE event.slug = $1
       AND registration.public_id = $2`,
    [eventSlug, registrationPublicId]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    ...mapAdminRegistrationRow(row),
    participant: {
      fullName: row.full_name,
      email: row.email,
      phone: row.phone,
      birthDate: toDateString(row.birth_date)
    },
    emergencyContact: {
      fullName: row.emergency_name,
      phone: row.emergency_phone
    },
    subtotal: Number(row.subtotal),
    discountAmount: Number(row.discount_amount),
    waiverVersion: row.waiver_version,
    waiverAcceptedAt: row.waiver_accepted_at,
    cancelledAt: row.cancelled_at,
    updatedAt: row.updated_at,
    payment: row.payment_public_id
      ? {
          ...mapAdminRegistrationRow(row).payment,
          providerTransactionId: row.provider_transaction_id
        }
      : null,
    checkins: row.checkins ?? []
  };
}

export async function listAdminContent(eventSlug) {
  const eventId = await getEventId(eventSlug);
  if (!eventId) return null;

  const [venues, sponsors, activities] = await Promise.all([
    query(
      `SELECT *
       FROM venues
       WHERE event_id = $1 AND is_active = TRUE
       ORDER BY sort_order, name`,
      [eventId]
    ),
    query(
      `SELECT sponsors.*, venues.slug AS venue_slug
       FROM sponsors
       LEFT JOIN venues ON venues.id = sponsors.venue_id
       WHERE sponsors.event_id = $1 AND sponsors.is_active = TRUE
       ORDER BY sponsors.sort_order, sponsors.name`,
      [eventId]
    ),
    query(
      `SELECT activities.*, venues.slug AS venue_slug
       FROM activities
       LEFT JOIN venues ON venues.id = activities.venue_id
       WHERE activities.event_id = $1 AND activities.is_active = TRUE
       ORDER BY activities.sort_order, activities.starts_at NULLS LAST, activities.name`,
      [eventId]
    )
  ]);

  return {
    venues: venues.rows.map(mapVenue),
    sponsors: sponsors.rows.map(mapSponsor),
    activities: activities.rows.map(mapActivity)
  };
}

export async function saveAdminVenue(eventSlug, input, userId) {
  const eventId = await getEventId(eventSlug);
  if (!eventId) return null;

  const result = await query(
    `INSERT INTO venues (
      id, event_id, slug, name, description, address, latitude, longitude,
      venue_type, map_label, pin_type, translations, sort_order, is_active
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, TRUE
    )
    ON CONFLICT (event_id, slug) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      address = EXCLUDED.address,
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      venue_type = EXCLUDED.venue_type,
      map_label = EXCLUDED.map_label,
      pin_type = EXCLUDED.pin_type,
      translations = EXCLUDED.translations,
      sort_order = EXCLUDED.sort_order,
      is_active = TRUE,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *`,
    [
      randomUUID(),
      eventId,
      input.slug,
      input.name,
      input.description,
      input.address,
      input.latitude,
      input.longitude,
      input.type,
      input.mapLabel,
      input.pinType,
      JSON.stringify(input.translations),
      input.sortOrder
    ]
  );

  await writeAudit(eventId, userId, "venue.saved", "venue", input.slug);
  return mapVenue(result.rows[0]);
}

export async function archiveAdminVenue(eventSlug, venueSlug, userId) {
  const eventId = await getEventId(eventSlug);
  if (!eventId) return null;

  const result = await query(
    `UPDATE venues
     SET is_active = FALSE,
         updated_at = CURRENT_TIMESTAMP
     WHERE event_id = $1 AND slug = $2
     RETURNING slug`,
    [eventId, venueSlug]
  );

  if (!result.rows[0]) return null;
  await writeAudit(eventId, userId, "venue.archived", "venue", venueSlug);
  return true;
}

export async function saveAdminSponsor(eventSlug, input, userId, sponsorId) {
  const eventId = await getEventId(eventSlug);
  if (!eventId) return null;

  const id = sponsorId || randomUUID();
  let venueId = null;
  if (input.venueId) {
    const venueResult = await query(
      "SELECT id FROM venues WHERE event_id = $1 AND slug = $2 AND is_active = TRUE",
      [eventId, input.venueId]
    );
    venueId = venueResult.rows[0]?.id ?? null;
  }

  const result = await query(
    `INSERT INTO sponsors (
      id, event_id, venue_id, name, tier, logo_url, website_url, description,
      translations, sort_order, is_active
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, TRUE
    )
    ON CONFLICT (id) DO UPDATE SET
      venue_id = EXCLUDED.venue_id,
      name = EXCLUDED.name,
      tier = EXCLUDED.tier,
      logo_url = EXCLUDED.logo_url,
      website_url = EXCLUDED.website_url,
      description = EXCLUDED.description,
      translations = EXCLUDED.translations,
      sort_order = EXCLUDED.sort_order,
      is_active = TRUE,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *`,
    [
      id,
      eventId,
      venueId,
      input.name,
      input.tier,
      input.logoUrl,
      input.websiteUrl,
      input.description,
      JSON.stringify(input.translations),
      input.sortOrder
    ]
  );

  await writeAudit(eventId, userId, "sponsor.saved", "sponsor", id);
  return mapSponsor({ ...result.rows[0], venue_slug: input.venueId || null });
}

export async function archiveAdminSponsor(eventSlug, sponsorId, userId) {
  const eventId = await getEventId(eventSlug);
  if (!eventId) return null;

  const result = await query(
    `UPDATE sponsors
     SET is_active = FALSE,
         updated_at = CURRENT_TIMESTAMP
     WHERE event_id = $1 AND id = $2
     RETURNING id`,
    [eventId, sponsorId]
  );

  if (!result.rows[0]) return null;
  await writeAudit(eventId, userId, "sponsor.archived", "sponsor", sponsorId);
  return true;
}

export async function saveAdminActivity(eventSlug, input, userId) {
  const eventId = await getEventId(eventSlug);
  if (!eventId) return null;

  let venueId = null;
  if (input.venueId) {
    const venueResult = await query(
      "SELECT id FROM venues WHERE event_id = $1 AND slug = $2 AND is_active = TRUE",
      [eventId, input.venueId]
    );
    venueId = venueResult.rows[0]?.id ?? null;
  }

  const result = await query(
    `INSERT INTO activities (
      id, event_id, venue_id, slug, name, description, activity_type,
      starts_at, ends_at, translations, sort_order, is_active
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, TRUE
    )
    ON CONFLICT (event_id, slug) DO UPDATE SET
      venue_id = EXCLUDED.venue_id,
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      activity_type = EXCLUDED.activity_type,
      starts_at = EXCLUDED.starts_at,
      ends_at = EXCLUDED.ends_at,
      translations = EXCLUDED.translations,
      sort_order = EXCLUDED.sort_order,
      is_active = TRUE,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *`,
    [
      randomUUID(),
      eventId,
      venueId,
      input.slug,
      input.name,
      input.description,
      input.type,
      input.startsAt,
      input.endsAt,
      JSON.stringify(input.translations),
      input.sortOrder
    ]
  );

  await writeAudit(eventId, userId, "activity.saved", "activity", input.slug);
  return {
    ...mapActivity({ ...result.rows[0], venue_slug: input.venueId || null })
  };
}

export async function archiveAdminActivity(eventSlug, activitySlug, userId) {
  const eventId = await getEventId(eventSlug);
  if (!eventId) return null;

  const result = await query(
    `UPDATE activities
     SET is_active = FALSE,
         updated_at = CURRENT_TIMESTAMP
     WHERE event_id = $1 AND slug = $2
     RETURNING slug`,
    [eventId, activitySlug]
  );

  if (!result.rows[0]) return null;
  await writeAudit(eventId, userId, "activity.archived", "activity", activitySlug);
  return true;
}
