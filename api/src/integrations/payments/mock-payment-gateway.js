import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../../config/env.js";
import { PaymentGateway } from "./payment-gateway.js";

function signaturePayload(payload) {
  return [
    payload.eventId,
    payload.orderId,
    payload.status,
    payload.transactionId ?? ""
  ].join(".");
}

function sign(payload) {
  return createHmac("sha256", config.paymentWebhookSecret)
    .update(signaturePayload(payload))
    .digest("hex");
}

export class MockPaymentGateway extends PaymentGateway {
  async createPayment(payment) {
    return {
      providerOrderId: `MOCK-${payment.publicId}`,
      checkoutUrl: `${config.paymentReturnUrl}?mockPayment=${payment.publicId}`,
      expiresAt: payment.expiresAt
    };
  }

  verifyWebhook(headers, payload) {
    if (!config.paymentWebhookSecret) return false;
    const received = headers["x-payment-signature"] ?? "";
    const expected = sign(payload);
    const receivedBuffer = Buffer.from(received);
    const expectedBuffer = Buffer.from(expected);
    return (
      receivedBuffer.length === expectedBuffer.length &&
      timingSafeEqual(receivedBuffer, expectedBuffer)
    );
  }

  parseWebhook(payload) {
    const statuses = new Set([
      "PENDING",
      "PAID",
      "FAILED",
      "EXPIRED",
      "CANCELLED",
      "REFUNDED"
    ]);
    if (
      typeof payload.eventId !== "string" ||
      typeof payload.orderId !== "string" ||
      !statuses.has(payload.status)
    ) {
      const error = new Error("The payment webhook payload is invalid.");
      error.statusCode = 422;
      error.code = "INVALID_WEBHOOK_PAYLOAD";
      throw error;
    }
    return {
      eventId: payload.eventId,
      orderId: payload.orderId,
      status: payload.status,
      transactionId: payload.transactionId ?? null,
      paymentMethod: payload.paymentMethod ?? "mock",
      eventType: `payment.${payload.status.toLowerCase()}`,
      raw: payload
    };
  }
}

export function createMockWebhookSignature(payload) {
  if (!config.paymentWebhookSecret) {
    throw new Error("PAYMENT_WEBHOOK_SECRET is not configured.");
  }
  return sign(payload);
}