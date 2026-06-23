import { Router } from "express";
import { asyncHandler } from "../../utilities/async-handler.js";
import {
  getRegistration,
  registerParticipant
} from "./registration.service.js";

export const registrationRouter = Router();

registrationRouter.post(
  "/",
  asyncHandler(async (request, response) => {
    const registration = await registerParticipant(request.body);
    response.status(201).json(registration);
  })
);

registrationRouter.get(
  "/:publicId",
  asyncHandler(async (request, response) => {
    const registration = await getRegistration(
      request.params.publicId,
      request.get("X-Registration-Token")
    );
    response.json(registration);
  })
);