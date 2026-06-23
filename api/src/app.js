import cors from "cors";
import express from "express";
import { config } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { adminRouter } from "./modules/admin/admin.router.js";
import { authRouter } from "./modules/auth/auth.router.js";
import { checkinRouter } from "./modules/checkins/checkin.router.js";
import { eventRouter } from "./modules/events/event.router.js";
import { healthRouter } from "./modules/health/health.router.js";
import { paymentRouter } from "./modules/payments/payment.router.js";
import { participantRouter } from "./modules/participants/participant.router.js";
import { registrationRouter } from "./modules/registrations/registration.router.js";
import { ticketRouter } from "./modules/tickets/ticket.router.js";

const allowedOrigins = new Set([
  config.frontendUrl,
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173"
]);

export const app = express();

app.disable("x-powered-by");
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin not allowed by CORS"));
    }
  })
);
app.use(express.json({ limit: "100kb" }));

app.use("/health", healthRouter);
app.use("/api/v1/organizer/auth", authRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/events", eventRouter);
app.use("/api/v1/registrations", registrationRouter);
app.use("/api/v1/participants", participantRouter);
app.use("/api/v1/checkins", checkinRouter);
app.use("/api/v1", paymentRouter);
app.use("/api/v1", ticketRouter);

app.use(notFoundHandler);
app.use(errorHandler);