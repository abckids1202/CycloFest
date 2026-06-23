import { looksLikeQrToken } from "./ticket-token.js";

export function validateTicketScan(body) {
  const qrToken =
    typeof body.qrToken === "string" ? body.qrToken.trim() : "";
  if (!looksLikeQrToken(qrToken)) {
    const error = new Error("The ticket QR token is invalid.");
    error.statusCode = 422;
    error.code = "INVALID_TICKET_TOKEN";
    throw error;
  }
  return { qrToken };
}

export function validateRevocation(body) {
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 5 || reason.length > 300) {
    const error = new Error("Enter a revocation reason from 5 to 300 characters.");
    error.statusCode = 422;
    error.code = "VALIDATION_ERROR";
    error.details = {
      reason: "Revocation reason must contain 5 to 300 characters."
    };
    throw error;
  }
  return { reason };
}