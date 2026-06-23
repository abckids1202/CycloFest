import { currentEvent } from "../../event-data.js";
import { closeDatabase, pool } from "../pool.js";

if (!pool) {
  throw new Error("DATABASE_URL is missing. PostgreSQL cannot be seeded.");
}

const eventId = "2a2dc68d-83fd-4bdd-b7f4-6c8f718bc542";
const categoryIds = [
  "9474ba04-222e-4b8f-9263-b3e3600e6466",
  "ac99e7be-7a34-4ca3-92a0-443e1a5ec46d",
  "84e143ce-a44d-4d4d-9e7f-b6c31dc018c6"
];

const client = await pool.connect();

try {
  await client.query("BEGIN");

  await client.query(
    `INSERT INTO events (
      id, slug, name, tagline, description, event_date, date_label, location,
      venue, registration_open, prize_pool, max_distance_km, race_pack,
      after_party, status
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
    )
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      tagline = EXCLUDED.tagline,
      description = EXCLUDED.description,
      event_date = EXCLUDED.event_date,
      date_label = EXCLUDED.date_label,
      location = EXCLUDED.location,
      venue = EXCLUDED.venue,
      registration_open = EXCLUDED.registration_open,
      prize_pool = EXCLUDED.prize_pool,
      max_distance_km = EXCLUDED.max_distance_km,
      race_pack = EXCLUDED.race_pack,
      after_party = EXCLUDED.after_party,
      status = EXCLUDED.status,
      updated_at = CURRENT_TIMESTAMP`,
    [
      eventId,
      currentEvent.id,
      currentEvent.name,
      currentEvent.tagline,
      currentEvent.description,
      currentEvent.date,
      currentEvent.dateLabel,
      currentEvent.location,
      currentEvent.venue,
      currentEvent.registrationOpen,
      currentEvent.prizePool,
      currentEvent.maxDistanceKm,
      currentEvent.racePack,
      currentEvent.afterParty,
      "REGISTRATION_OPEN"
    ]
  );

  await client.query(
    `UPDATE events
     SET default_language = 'id',
         supported_languages = ARRAY['id', 'en'],
         timezone = 'Asia/Jakarta',
         registration_target = NULL,
         payment_provider = NULL,
         translations = $2::jsonb,
         map_config = '{}'::jsonb,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [eventId, JSON.stringify(currentEvent.translations)]
  );

  for (const [index, category] of currentEvent.categories.entries()) {
    await client.query(
      `INSERT INTO event_categories (
        id, event_id, slug, name, description, distance_km, price, capacity,
        registered_count, level, duration_label, color, featured, sort_order
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      )
      ON CONFLICT (event_id, slug) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        distance_km = EXCLUDED.distance_km,
        price = EXCLUDED.price,
        capacity = EXCLUDED.capacity,
        registered_count = EXCLUDED.registered_count,
        level = EXCLUDED.level,
        duration_label = EXCLUDED.duration_label,
        color = EXCLUDED.color,
        featured = EXCLUDED.featured,
        sort_order = EXCLUDED.sort_order,
        updated_at = CURRENT_TIMESTAMP`,
      [
        categoryIds[index],
        eventId,
        category.id,
        category.name,
        category.description,
        category.distanceKm,
        category.price,
        category.capacity,
        category.registered,
        category.level,
        category.duration,
        category.color,
        Boolean(category.featured),
        index
      ]
    );
  }

  await client.query("DELETE FROM schedule_items WHERE event_id = $1", [eventId]);
  for (const [index, item] of currentEvent.schedule.entries()) {
    await client.query(
      `INSERT INTO schedule_items (
        event_id, start_time, title, description, item_type, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [eventId, item.time, item.title, item.description, item.type, index]
    );
  }

  await client.query("DELETE FROM checkpoints WHERE event_id = $1", [eventId]);
  for (const [index, checkpoint] of currentEvent.checkpoints.entries()) {
    await client.query(
      `INSERT INTO checkpoints (
        event_id, kilometer, name, detail, sort_order
      ) VALUES ($1, $2, $3, $4, $5)`,
      [eventId, checkpoint.kilometer, checkpoint.name, checkpoint.detail, index]
    );
  }

  const roleTemplates = [
    {
      key: "OWNER",
      name: "Event owner",
      permissions: ["*"]
    },
    {
      key: "CONTENT_MANAGER",
      name: "Content manager",
      permissions: ["event:read", "event:write", "content:write"]
    },
    {
      key: "REGISTRATION_MANAGER",
      name: "Registration manager",
      permissions: ["event:read", "registration:read", "registration:write"]
    },
    {
      key: "CHECKIN_STAFF",
      name: "Check-in staff",
      permissions: ["event:read", "checkin:write", "ticket:validate"]
    },
    {
      key: "FINANCE",
      name: "Finance",
      permissions: ["event:read", "payment:read", "report:read"]
    }
  ];

  for (const role of roleTemplates) {
    await client.query(
      `INSERT INTO organizer_roles (
        event_id, role_key, name, permissions, is_system
      ) VALUES ($1, $2, $3, $4, TRUE)
      ON CONFLICT (event_id, role_key) DO UPDATE SET
        name = EXCLUDED.name,
        permissions = EXCLUDED.permissions`,
      [eventId, role.key, role.name, role.permissions]
    );
  }

  await client.query("COMMIT");
  console.log("CycloFest seed data inserted.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await closeDatabase();
}