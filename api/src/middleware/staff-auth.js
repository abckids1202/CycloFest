import { timingSafeEqual } from "node:crypto";
import { config } from "../config/env.js";

function keysMatch(received, expected) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

export function requireStaffApiKey(request, _response, next) {
  if (!config.staffApiKey) {
    const error = new Error(
      "STAFF_API_KEY is not configured for staff-only endpoints."
    );
    error.statusCode = 503;
    error.code = "STAFF_AUTH_NOT_CONFIGURED";
    error.expose = true;
    next(error);
    return;
  }

  const receivedKey = request.get("X-Staff-Key") ?? "";
  if (!keysMatch(receivedKey, config.staffApiKey)) {
    const error = new Error("Staff authorization failed.");
    error.statusCode = 401;
    error.code = "STAFF_UNAUTHORIZED";
    next(error);
    return;
  }

  next();
}

