import { config } from "../../config/env.js";
import { databaseConfigured } from "../../database/pool.js";
import {
  getPaymentGateway,
  paymentProviderConfigured
} from "../../integrations/payments/index.js";
import {
  findAuthorizedPayment,
  preparePayment,
  processPaymentWebhook,
  saveCreatedPayment
} from "./payment.repository.js";
import { sendTicketConfirmation } from "../messages/message.service.js";
import {
  validateCreatePayment,
  validateWebhookProvider
} from "./payment.validation.js";

function requireDatabase() {
  if (!databaseConfigured) {
    const error = new Error(
      "Payment storage is unavailable until PostgreSQL is configured."
    );
    error.statusCode = 503;
    error.code = "DATABASE_NOT_CONFIGURED";
    error.expose = true;
    throw error;
  }
}

function requirePaymentProvider() {
  if (!paymentProviderConfigured()) {
    const error = new Error(
      "The payment provider is not fully configured."
    );
    error.statusCode = 503;
    error.code = "PAYMENT_PROVIDER_NOT_CONFIGURED";
    error.expose = true;
    throw error;
  }
}

function requireAccessToken(token) {
  if (!token) {
    const error = new Error("A registration access token is required.");
    error.statusCode = 401;
    error.code = "ACCESS_TOKEN_REQUIRED";
    throw error;
  }
}

export async function createRegistrationPayment(
  registrationId,
  accessToken,
  body
) {
  const input = validateCreatePayment(body);
  requireAccessToken(accessToken);
  requireDatabase();
  requirePaymentProvider();
  const prepared = await preparePayment(
    registrationId,
    accessToken,
    config.paymentProvider,
    input.paymentMethod
  );
  if (!prepared.authorized) {
    const error = new Error("Registration access was denied.");
    error.statusCode = 403;
    error.code = "REGISTRATION_ACCESS_DENIED";
    throw error;
  }
  if (prepared.existing) return prepared.payment;

  const gateway = getPaymentGateway(config.paymentProvider);
  const gatewayPayment = await gateway.createPayment(prepared.payment);
  return saveCreatedPayment(prepared.payment, gatewayPayment);
}

export async function getPayment(publicId, accessToken) {
  requireAccessToken(accessToken);
  requireDatabase();
  const payment = await findAuthorizedPayment(publicId, accessToken);
  if (!payment) {
    const error = new Error("Payment access was denied.");
    error.statusCode = 403;
    error.code = "PAYMENT_ACCESS_DENIED";
    throw error;
  }
  return payment;
}

export async function receivePaymentWebhook(providerName, headers, payload) {
  const provider = validateWebhookProvider(providerName);
  requireDatabase();
  requirePaymentProvider();
  const gateway = getPaymentGateway(provider);
  if (!gateway.verifyWebhook(headers, payload)) {
    const error = new Error("Payment webhook signature verification failed.");
    error.statusCode = 401;
    error.code = "INVALID_WEBHOOK_SIGNATURE";
    throw error;
  }
  const event = gateway.parseWebhook(payload);
  const result = await processPaymentWebhook(provider, event);
  if (
    result.status === "PAID" &&
    result.registrationId &&
    !result.duplicate &&
    !result.ignored
  ) {
    sendTicketConfirmation(result.registrationId).catch((error) => {
      console.error("Ticket confirmation message failed", error);
    });
  }
  return result;
}
