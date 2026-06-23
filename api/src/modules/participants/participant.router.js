import { Router } from "express";
import { asyncHandler } from "../../utilities/async-handler.js";
import {
  editParticipant,
  getParticipant
} from "./participant.service.js";

export const participantRouter = Router();

participantRouter.get(
  "/:registrationId",
  asyncHandler(async (request, response) => {
    const participant = await getParticipant(
      request.params.registrationId,
      request.get("X-Registration-Token")
    );
    response.json(participant);
  })
);

participantRouter.patch(
  "/:registrationId",
  asyncHandler(async (request, response) => {
    const participant = await editParticipant(
      request.params.registrationId,
      request.get("X-Registration-Token"),
      request.body
    );
    response.json(participant);
  })
);