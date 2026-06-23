function validationError(details) {
  const error = new Error("The event details are invalid.");
  error.statusCode = 400;
  error.code = "VALIDATION_ERROR";
  error.details = details;
  return error;
}

function cleanText(value, maxLength) {
  const text = String(value ?? "").trim();
  return text.slice(0, maxLength);
}

function cleanNullableText(value, maxLength) {
  const text = cleanText(value, maxLength);
  return text || null;
}

function createSlug(value) {
  return cleanText(value, 120)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function cleanNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

const eventStatuses = new Set([
  "DRAFT",
  "PUBLISHED",
  "REGISTRATION_OPEN",
  "REGISTRATION_CLOSED"
]);

function cleanTranslation(value = {}) {
  return {
    name: cleanText(value.name, 160),
    tagline: cleanNullableText(value.tagline, 200),
    description: cleanNullableText(value.description, 3000),
    dateLabel: cleanNullableText(value.dateLabel, 80),
    location: cleanNullableText(value.location, 160),
    venue: cleanNullableText(value.venue, 160)
  };
}

export function validateEventDetailsInput(body = {}) {
  const translations = {
    id: cleanTranslation(body.translations?.id),
    en: cleanTranslation(body.translations?.en)
  };
  const details = {};

  if (!translations.id.name && !translations.en.name) {
    details.name = "Enter the event name in Indonesian or English.";
  }

  let eventDate = null;
  if (body.date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.date))) {
      details.date = "Use YYYY-MM-DD format.";
    } else {
      eventDate = String(body.date);
    }
  }

  let registrationTarget = null;
  if (
    body.registrationTarget !== null &&
    body.registrationTarget !== undefined &&
    body.registrationTarget !== ""
  ) {
    registrationTarget = Number(body.registrationTarget);
    if (
      !Number.isInteger(registrationTarget) ||
      registrationTarget < 0 ||
      registrationTarget > 1000000
    ) {
      details.registrationTarget = "Use a whole number between 0 and 1,000,000.";
    }
  }

  const status = cleanText(body.status || "DRAFT", 30).toUpperCase();
  if (!eventStatuses.has(status)) {
    details.status = "Choose Draft, Published, Registration Open, or Registration Closed.";
  }

  if (Object.keys(details).length > 0) throw validationError(details);

  const primary = translations.en.name ? translations.en : translations.id;
  return {
    name: primary.name,
    tagline: primary.tagline ?? translations.id.tagline,
    description: primary.description ?? translations.id.description,
    date: eventDate,
    dateLabel: primary.dateLabel ?? translations.id.dateLabel,
    location: primary.location ?? translations.id.location,
    venue: primary.venue ?? translations.id.venue,
    status,
    registrationTarget,
    translations
  };
}

export function validateVenueInput(body = {}) {
  const details = {};
  const name = cleanText(body.name, 160);
  const slug = createSlug(body.slug || name);
  const latitude = cleanNumber(body.latitude);
  const longitude = cleanNumber(body.longitude);

  if (!name) details.name = "Enter a venue name.";
  if (!slug) details.slug = "Enter a valid venue slug.";
  if (Number.isNaN(latitude) || (latitude !== null && (latitude < -90 || latitude > 90))) {
    details.latitude = "Use a latitude between -90 and 90.";
  }
  if (Number.isNaN(longitude) || (longitude !== null && (longitude < -180 || longitude > 180))) {
    details.longitude = "Use a longitude between -180 and 180.";
  }
  if ((latitude === null) !== (longitude === null)) {
    details.coordinates = "Latitude and longitude must be set together.";
  }

  if (Object.keys(details).length > 0) throw validationError(details);

  return {
    slug,
    name,
    description: cleanNullableText(body.description, 2000),
    address: cleanNullableText(body.address, 1000),
    latitude,
    longitude,
    type: cleanText(body.type || "VENUE", 40).toUpperCase(),
    mapLabel: cleanNullableText(body.mapLabel, 80),
    pinType: cleanText(body.pinType || body.type || "VENUE", 40).toUpperCase(),
    sortOrder: Number.isInteger(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
    translations: body.translations && typeof body.translations === "object" ? body.translations : {}
  };
}

export function validateSponsorInput(body = {}) {
  const details = {};
  const name = cleanText(body.name, 160);
  if (!name) details.name = "Enter a sponsor name.";
  if (Object.keys(details).length > 0) throw validationError(details);

  return {
    name,
    tier: cleanNullableText(body.tier, 60),
    venueId: cleanNullableText(body.venueId, 120),
    logoUrl: cleanNullableText(body.logoUrl, 1000),
    websiteUrl: cleanNullableText(body.websiteUrl, 1000),
    description: cleanNullableText(body.description, 2000),
    sortOrder: Number.isInteger(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
    translations: body.translations && typeof body.translations === "object" ? body.translations : {}
  };
}

export function validateActivityInput(body = {}) {
  const details = {};
  const name = cleanText(body.name, 160);
  const slug = createSlug(body.slug || name);

  if (!name) details.name = "Enter an activity name.";
  if (!slug) details.slug = "Enter a valid activity slug.";
  if (body.endsAt && body.startsAt && new Date(body.endsAt) < new Date(body.startsAt)) {
    details.endsAt = "End time must be after start time.";
  }

  if (Object.keys(details).length > 0) throw validationError(details);

  return {
    slug,
    venueId: cleanNullableText(body.venueId, 120),
    name,
    description: cleanNullableText(body.description, 2000),
    type: cleanText(body.type || "GENERAL", 40).toUpperCase(),
    startsAt: body.startsAt || null,
    endsAt: body.endsAt || null,
    sortOrder: Number.isInteger(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
    translations: body.translations && typeof body.translations === "object" ? body.translations : {}
  };
}
