import { looksLikeQrToken } from "../tickets/ticket-token.js";

const checkinTypes = new Set([
  "RACE_PACK_COLLECTED",
  "EVENT_ENTRY",
  "START_CONFIRMED",
  "FINISH_CONFIRMED"
]);

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function validateCheckinInput(body) {
  const input = {
    registrationId: cleanText(body.registrationId).toUpperCase(),
    qrToken: cleanText(body.qrToken),
    checkinType: cleanText(body.checkinType).toUpperCase(),
    staffName: cleanText(body.staffName),
    notes: cleanText(body.notes)
  };
  const errors = {};

  if (!input.registrationId && !input.qrToken) {
    errors.ticket = "Scan a QR token or enter a registration ID.";
  } else if (
    input.registrationId &&
    !/^CF26-[A-F0-9]{8}$/.test(input.registrationId)
  ) {
    errors.registrationId = "Enter a valid CycloFest registration ID.";
  } else if (input.qrToken && !looksLikeQrToken(input.qrToken)) {
    errors.qrToken = "The ticket QR token is invalid.";
  }
  if (!checkinTypes.has(input.checkinType)) {
    errors.checkinType = "Choose a valid check-in type.";
  }
  if (input.staffName.length < 2) {
    errors.staffName = "Enter the staff member's name.";
  }
  if (input.notes.length > 500) {
    errors.notes = "Notes cannot exceed 500 characters.";
  }

  if (Object.keys(errors).length > 0) {
    const error = new Error("Check-in validation failed.");
    error.statusCode = 422;
    error.code = "VALIDATION_ERROR";
    error.details = errors;
    throw error;
  }
  return input;
}