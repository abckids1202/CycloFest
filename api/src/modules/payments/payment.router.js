import { Router } from "express";
import { asyncHandler } from "../../utilities/async-handler.js";
import {
  createRegistrationPayment,
  getPayment,
  receivePaymentWebhook
} from "./payment.service.js";

export const paymentRouter = Router();

paymentRouter.post(
  "/registrations/:registrationId/payments",
  asyncHandler(async (request, response) => {
    const payment = await createRegistrationPayment(
      request.params.registrationId,
      request.get("X-Registration-Token"),
      request.body
    );
    response.status(201).json(payment);
  })
);

paymentRouter.get(
  "/payments/:paymentId",
  asyncHandler(async (request, response) => {
    const payment = await getPayment(
      request.params.paymentId,
      request.get("X-Registration-Token")
    );
    response.json(payment);
  })
);

paymentRouter.post(
  "/payments/webhooks/:provider",
  asyncHandler(async (request, response) => {
    const result = await receivePaymentWebhook(
      request.params.provider,
      request.headers,
      request.body
    );
    response.json({ received: true, ...result });
  })
);