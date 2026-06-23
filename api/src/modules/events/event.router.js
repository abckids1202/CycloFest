import { Router } from "express";
import { asyncHandler } from "../../utilities/async-handler.js";
import { getCurrentEvent } from "./event.service.js";

export const eventRouter = Router();

eventRouter.get(
  "/current",
  asyncHandler(async (request, response) => {
    const event = await getCurrentEvent(request.query.lang);
    response.set("X-Data-Source", event.source);
    response.set("Content-Language", event.language);
    response.json(event.data);
  })
);