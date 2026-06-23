import { Router } from "express";
import { asyncHandler } from "../../utilities/async-handler.js";
import { getLiveness, getReadiness } from "./health.service.js";

export const healthRouter = Router();

healthRouter.get("/", asyncHandler(async (_request, response) => {
  const readiness = await getReadiness();
  response.json({
    ...getLiveness(),
    readiness
  });
}));

healthRouter.get("/live", (_request, response) => {
  response.json(getLiveness());
});

healthRouter.get(
  "/ready",
  asyncHandler(async (_request, response) => {
    const readiness = await getReadiness();
    response.status(readiness.ready ? 200 : 503).json(readiness);
  })
);