function validationError(details) {
  const error = new Error("The organizer account details are invalid.");
  error.statusCode = 400;
  error.code = "VALIDATION_ERROR";
  error.details = details;
  return error;
}

export function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function validatePassword(password) {
  const value = String(password ?? "");
  const errors = [];

  if (value.length < 12) errors.push("Use at least 12 characters.");
  if (value.length > 128) errors.push("Use no more than 128 characters.");
  if (!/[a-z]/.test(value)) errors.push("Add a lowercase letter.");
  if (!/[A-Z]/.test(value)) errors.push("Add an uppercase letter.");
  if (!/\d/.test(value)) errors.push("Add a number.");

  return errors;
}

export function validateLoginInput(body = {}) {
  const email = normalizeEmail(body.email);
  const password = String(body.password ?? "");
  const details = {};

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    details.email = "Enter a valid email address.";
  }
  if (!password) details.password = "Enter your password.";

  if (Object.keys(details).length > 0) throw validationError(details);
  return { email, password };
}

export function validateBootstrapInput(input = {}) {
  const email = normalizeEmail(input.email);
  const fullName = String(input.fullName ?? "").trim();
  const password = String(input.password ?? "");
  const details = {};

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    details.email = "Enter a valid email address.";
  }
  if (fullName.length < 2 || fullName.length > 160) {
    details.fullName = "Use between 2 and 160 characters.";
  }

  const passwordErrors = validatePassword(password);
  if (passwordErrors.length > 0) details.password = passwordErrors;

  if (Object.keys(details).length > 0) throw validationError(details);
  return { email, fullName, password };
}