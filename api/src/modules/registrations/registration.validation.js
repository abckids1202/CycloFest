const jerseySizes = new Set(["XS", "S", "M", "L", "XL", "XXL"]);

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanPhone(value) {
  return cleanText(value).replace(/[^\d+]/g, "");
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export function validateRegistrationInput(body) {
  const input = {
    categoryId: cleanText(body.categoryId),
    fullName: cleanText(body.fullName),
    email: cleanText(body.email).toLowerCase(),
    phone: cleanPhone(body.phone),
    birthDate: cleanText(body.birthDate),
    emergencyName: cleanText(body.emergencyName),
    emergencyPhone: cleanPhone(body.emergencyPhone),
    jerseySize: cleanText(body.jerseySize).toUpperCase(),
    waiverAccepted: body.waiverAccepted === true
  };

  const errors = {};

  if (!input.categoryId) errors.categoryId = "Choose a cycling category.";
  if (input.fullName.length < 3) errors.fullName = "Enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    errors.email = "Enter a valid email address.";
  }
  if (input.phone.replace(/\D/g, "").length < 9) {
    errors.phone = "Enter a valid phone number.";
  }
  if (!isValidDate(input.birthDate)) {
    errors.birthDate = "Enter a valid date of birth.";
  }
  if (input.emergencyName.length < 3) {
    errors.emergencyName = "Enter an emergency contact name.";
  }
  if (input.emergencyPhone.replace(/\D/g, "").length < 9) {
    errors.emergencyPhone = "Enter a valid emergency phone number.";
  }
  if (!jerseySizes.has(input.jerseySize)) {
    errors.jerseySize = "Choose a valid jersey size.";
  }
  if (!input.waiverAccepted) {
    errors.waiverAccepted = "The event waiver must be accepted.";
  }

  if (Object.keys(errors).length > 0) {
    const error = new Error("Registration validation failed.");
    error.statusCode = 422;
    error.code = "VALIDATION_ERROR";
    error.details = errors;
    throw error;
  }

  return input;
}
