import { randomUUID } from "node:crypto";
import { createMockWebhookSignature } from "../../../integrations/payments/mock-payment-gateway.js";

const orderId = process.argv[2];
const status = (process.argv[3] ?? "PAID").toUpperCase();

if (!orderId) {
  throw new Error(
    "Usage: npm run payment:mock --workspace=@cycling/api -- MOCK-ORDER-ID PAID"
  );
}

const payload = {
  eventId: randomUUID(),
  orderId,
  status,
  transactionId: `MOCK-TXN-${Date.now()}`,
  paymentMethod: "mock-card"
};

const response = await fetch(
  "http://localhost:8000/api/v1/payments/webhooks/mock",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Payment-Signature": createMockWebhookSignature(payload)
    },
    body: JSON.stringify(payload)
  }
);

console.log(response.status, await response.text());

if (!response.ok) {
  process.exitCode = 1;
}