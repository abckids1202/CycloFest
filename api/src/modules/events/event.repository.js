import { query } from "../../database/pool.js";

function toNumber(value) {
  return Number(value);
}

function toDateString(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

export async function findCurrentEvent() {
  const eventResult = await query(
    `SELECT *
     FROM events
     WHERE status IN ('PUBLISHED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED')
     ORDER BY event_date ASC
     LIMIT 1`
  );

  const event = eventResult.rows[0];
  if (!event) return null;

  const [
    categoriesResult,
    scheduleResult,
    checkpointsResult,
    venuesResult,
    activitiesResult,
    sponsorsResult
  ] = await Promise.all([
    query(
      `SELECT *
       FROM event_categories
       WHERE event_id = $1 AND is_active = TRUE
       ORDER BY sort_order, distance_km`,
      [event.id]
    ),
    query(
      `SELECT *
       FROM schedule_items
       WHERE event_id = $1
       ORDER BY sort_order, start_time`,
      [event.id]
    ),
    query(
      `SELECT *
       FROM checkpoints
       WHERE event_id = $1
       ORDER BY sort_order, kilometer`,
      [event.id]
    ),
    query(
      `SELECT *
       FROM venues
       WHERE event_id = $1 AND is_active = TRUE
       ORDER BY sort_order, name`,
      [event.id]
    ),
    query(
      `SELECT activities.*, venues.slug AS venue_slug
       FROM activities
       LEFT JOIN venues ON venues.id = activities.venue_id
       WHERE activities.event_id = $1 AND activities.is_active = TRUE
       ORDER BY activities.sort_order, activities.starts_at NULLS LAST`,
      [event.id]
    ),
    query(
      `SELECT sponsors.*, venues.slug AS venue_slug
       FROM sponsors
       LEFT JOIN venues ON venues.id = sponsors.venue_id
       WHERE sponsors.event_id = $1 AND sponsors.is_active = TRUE
       ORDER BY sponsors.sort_order, sponsors.name`,
      [event.id]
    )
  ]);

  return {
    id: event.slug,
    name: event.name,
    tagline: event.tagline,
    description: event.description,
    date: toDateString(event.event_date),
    dateLabel: event.date_label,
    location: event.location,
    venue: event.venue,
    registrationOpen: event.registration_open,
    prizePool: toNumber(event.prize_pool),
    maxDistanceKm: event.max_distance_km,
    racePack: event.race_pack,
    afterParty: event.after_party,
    status: event.status,
    defaultLanguage: event.default_language,
    supportedLanguages: event.supported_languages,
    timezone: event.timezone,
    registrationTarget: event.registration_target,
    paymentProvider: event.payment_provider,
    translations: event.translations,
    map: event.map_config,
    categories: categoriesResult.rows.map((category) => ({
      id: category.slug,
      name: category.name,
      description: category.description,
      distanceKm: category.distance_km,
      price: toNumber(category.price),
      capacity: category.capacity,
      registered: category.registered_count,
      level: category.level,
      duration: category.duration_label,
      color: category.color,
      featured: category.featured,
      translations: category.translations
    })),
    schedule: scheduleResult.rows.map((item) => ({
      time: item.start_time.slice(0, 5),
      title: item.title,
      description: item.description,
      type: item.item_type,
      translations: item.translations
    })),
    checkpoints: checkpointsResult.rows.map((checkpoint) => ({
      kilometer: checkpoint.kilometer,
      name: checkpoint.name,
      detail: checkpoint.detail,
      translations: checkpoint.translations
    })),
    venues: venuesResult.rows.map((venue) => ({
      id: venue.slug,
      name: venue.name,
      description: venue.description,
      address: venue.address,
      latitude: venue.latitude === null ? null : toNumber(venue.latitude),
      longitude: venue.longitude === null ? null : toNumber(venue.longitude),
      type: venue.venue_type,
      mapLabel: venue.map_label,
      pinType: venue.pin_type,
      translations: venue.translations
    })),
    activities: activitiesResult.rows.map((activity) => ({
      id: activity.slug,
      venueId: activity.venue_slug,
      name: activity.name,
      description: activity.description,
      type: activity.activity_type,
      startsAt: activity.starts_at,
      endsAt: activity.ends_at,
      translations: activity.translations
    })),
    sponsors: sponsorsResult.rows.map((sponsor) => ({
      id: sponsor.id,
      venueId: sponsor.venue_slug,
      name: sponsor.name,
      tier: sponsor.tier,
      logoUrl: sponsor.logo_url,
      websiteUrl: sponsor.website_url,
      description: sponsor.description,
      translations: sponsor.translations
    }))
  };
}
