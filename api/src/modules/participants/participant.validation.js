const allowedFields = new Set([
  "fullName",
  "phone",
  "emergencyName",
  "emergencyPhone",
  "jerseySize"
]);
const jerseySizes = new Set(["XS", "S", "M", "L", "XL", "XXL"]);

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanPhone(value) {
  return cleanText(value).replace(/[^\d+]/g, "");
}

export function validateParticipantUpdate(body) {
  const unknownFields = Object.keys(body).filter(
    (field) => !allowedFields.has(field)
  );
  if (unknownFields.length > 0) {
    const error = new Error("The update contains unsupported fields.");
    error.statusCode = 422;
    error.code = "VALIDATION_ERROR";
    error.details = { fields: unknownFields };
    throw error;
  }

  const update = {};
  const errors = {};

  if ("fullName" in body) {
    update.fullName = cleanText(body.fullName);
    if (update.fullName.length < 3) errors.fullName = "Enter your full name.";
  }
  if ("phone" in body) {
    update.phone = cleanPhone(body.phone);
    if (update.phone.replace(/\D/g, "").length < 9) {
      errors.phone = "Enter a valid phone number.";
    }
  }
  if ("emergencyName" in body) {
    update.emergencyName = cleanText(body.emergencyName);
    if (update.emergencyName.length < 3) {
      errors.emergencyName = "Enter an emergency contact name.";
    }
  }
  if ("emergencyPhone" in body) {
    update.emergencyPhone = cleanPhone(body.emergencyPhone);
    if (update.emergencyPhone.replace(/\D/g, "").length < 9) {
      errors.emergencyPhone = "Enter a valid emergency phone number.";
    }
  }
  if ("jerseySize" in body) {
    update.jerseySize = cleanText(body.jerseySize).toUpperCase();
    if (!jerseySizes.has(update.jerseySize)) {
      errors.jerseySize = "Choose a valid jersey size.";
    }
  }

  if (Object.keys(update).length === 0) {
    errors.body = "Provide at least one participant field to update.";
  }

  if (Object.keys(errors).length > 0) {
    const error = new Error("Participant validation failed.");
    error.statusCode = 422;
    error.code = "VALIDATION_ERROR";
    error.details = errors;
    throw error;
  }

  return update;
}