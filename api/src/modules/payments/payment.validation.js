const allowedWebhookProviders = new Set(["mock"]);

export function validateCreatePayment(body = {}) {
  const paymentMethod =
    typeof body.paymentMethod === "string" ? body.paymentMethod.trim() : "";
  if (paymentMethod.length > 60) {
    const error = new Error("Payment method cannot exceed 60 characters.");
    error.statusCode = 422;
    error.code = "VALIDATION_ERROR";
    error.details = { paymentMethod: "Payment method is too long." };
    throw error;
  }
  return { paymentMethod: paymentMethod || null };
}

export function validateWebhookProvider(provider) {
  const normalized = String(provider).toLowerCase();
  if (!allowedWebhookProviders.has(normalized)) {
    const error = new Error("The payment provider is not supported.");
    error.statusCode = 404;
    error.code = "PAYMENT_PROVIDER_NOT_SUPPORTED";
    throw error;
  }
  return normalized;
}