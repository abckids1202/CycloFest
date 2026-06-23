import { Router } from "express";
import { requireStaffApiKey } from "../../middleware/staff-auth.js";
import { asyncHandler } from "../../utilities/async-handler.js";
import { listCheckins, scanCheckin } from "./checkin.service.js";

export const checkinRouter = Router();
checkinRouter.use(requireStaffApiKey);

checkinRouter.post(
  "/scan",
  asyncHandler(async (request, response) => {
    const checkin = await scanCheckin(request.body);
    response.status(201).json(checkin);
  })
);

checkinRouter.get(
  "/registrations/:registrationId",
  asyncHandler(async (request, response) => {
    const checkins = await listCheckins(request.params.registrationId);
    response.json({ checkins });
  })
);