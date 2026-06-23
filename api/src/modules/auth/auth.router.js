import { Router } from "express";
import {
  readBearerToken,
  requireOrganizer
} from "../../middleware/organizer-auth.js";
import { asyncHandler } from "../../utilities/async-handler.js";
import {
  loginOrganizer,
  logoutOrganizer
} from "./auth.service.js";

export const authRouter = Router();

authRouter.post(
  "/login",
  asyncHandler(async (request, response) => {
    const session = await loginOrganizer(request.body);
    response.json(session);
  })
);

authRouter.get(
  "/me",
  requireOrganizer,
  asyncHandler(async (request, response) => {
    response.json({
      user: request.organizer.user,
      memberships: request.organizer.memberships,
      expiresAt: request.organizer.expiresAt
    });
  })
);

authRouter.post(
  "/logout",
  requireOrganizer,
  asyncHandler(async (request, response) => {
    await logoutOrganizer(readBearerToken(request));
    response.status(204).end();
  })
);