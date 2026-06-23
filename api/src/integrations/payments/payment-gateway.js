export class PaymentGateway {
  async createPayment(_payment) {
    throw new Error("createPayment must be implemented by a payment provider.");
  }

  verifyWebhook(_headers, _payload) {
    throw new Error("verifyWebhook must be implemented by a payment provider.");
  }

  parseWebhook(_payload) {
    throw new Error("parseWebhook must be implemented by a payment provider.");
  }
}