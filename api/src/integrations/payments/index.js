import { config } from "../../config/env.js";
import { MockPaymentGateway } from "./mock-payment-gateway.js";

const providers = {
  mock: new MockPaymentGateway()
};

export function getPaymentGateway(provider = config.paymentProvider) {
  const gateway = providers[provider];
  if (!gateway) {
    const error = new Error(`Payment provider "${provider}" is not supported.`);
    error.statusCode = 400;
    error.code = "PAYMENT_PROVIDER_NOT_SUPPORTED";
    throw error;
  }
  return gateway;
}

export function paymentProviderConfigured() {
  if (config.paymentProvider === "mock") {
    return Boolean(config.paymentWebhookSecret);
  }
  return false;
}