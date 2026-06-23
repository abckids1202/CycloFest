import { Router } from "express";
import { requireStaffApiKey } from "../../middleware/staff-auth.js";
import { asyncHandler } from "../../utilities/async-handler.js";
import {
  createTicketQrToken,
  getTicket,
  revokeTicketById,
  validateTicket
} from "./ticket.service.js";

export const ticketRouter = Router();

ticketRouter.get(
  "/registrations/:registrationId/ticket",
  asyncHandler(async (request, response) => {
    const ticket = await getTicket(
      request.params.registrationId,
      request.get("X-Registration-Token")
    );
    response.json(ticket);
  })
);

ticketRouter.post(
  "/registrations/:registrationId/ticket/qr-token",
  asyncHandler(async (request, response) => {
    const token = await createTicketQrToken(
      request.params.registrationId,
      request.get("X-Registration-Token")
    );
    response.status(201).json(token);
  })
);

ticketRouter.post(
  "/tickets/validate",
  requireStaffApiKey,
  asyncHandler(async (request, response) => {
    const ticket = await validateTicket(request.body);
    response.json(ticket);
  })
);

ticketRouter.post(
  "/tickets/:ticketId/revoke",
  requireStaffApiKey,
  asyncHandler(async (request, response) => {
    const ticket = await revokeTicketById(
      request.params.ticketId,
      request.body
    );
    response.json(ticket);
  })
);