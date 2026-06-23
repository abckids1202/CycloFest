import { Router } from "express";
import {
  requireOrganizer,
  requirePermission
} from "../../middleware/organizer-auth.js";
import { asyncHandler } from "../../utilities/async-handler.js";
import {
  archiveActivity,
  archiveSponsor,
  archiveVenue,
  loadAdminEventDetails,
  loadAdminContent,
  loadAdminMessagingSettings,
  loadAdminOverview,
  loadAdminRegistrationDetail,
  loadAdminRegistrationMessages,
  loadAdminRegistrations,
  saveActivity,
  saveAdminEventDetails,
  saveAdminMessagingSettings,
  saveSponsor,
  saveVenue,
  resendAdminTicket,
  sendAdminEventBroadcast,
  sendAdminPaymentReminder
} from "./admin.service.js";

export const adminRouter = Router();

adminRouter.use(requireOrganizer);

adminRouter.get(
  "/overview",
  requirePermission("event:read"),
  asyncHandler(async (request, response) => {
    response.json(
      await loadAdminOverview(request.organizer, request.organizerMembership)
    );
  })
);

adminRouter.get(
  "/event-details",
  requirePermission("event:read"),
  asyncHandler(async (request, response) => {
    response.json(
      await loadAdminEventDetails(
        request.organizer,
        request.organizerMembership
      )
    );
  })
);

adminRouter.put(
  "/event-details",
  requirePermission("event:write"),
  asyncHandler(async (request, response) => {
    response.json(
      await saveAdminEventDetails(
        request.organizer,
        request.organizerMembership,
        request.body
      )
    );
  })
);

adminRouter.get(
  "/messages/settings",
  requirePermission("event:read"),
  asyncHandler(async (request, response) => {
    response.json(
      await loadAdminMessagingSettings(
        request.organizer,
        request.organizerMembership
      )
    );
  })
);

adminRouter.put(
  "/messages/settings",
  requirePermission("event:write"),
  asyncHandler(async (request, response) => {
    response.json(
      await saveAdminMessagingSettings(
        request.organizer,
        request.organizerMembership,
        request.body
      )
    );
  })
);

adminRouter.get(
  "/content",
  requirePermission("content:write"),
  asyncHandler(async (request, response) => {
    response.json(
      await loadAdminContent(request.organizer, request.organizerMembership)
    );
  })
);

adminRouter.get(
  "/registrations",
  requirePermission("registration:read"),
  asyncHandler(async (request, response) => {
    response.json(
      await loadAdminRegistrations(
        request.organizer,
        request.organizerMembership,
        request.query
      )
    );
  })
);

adminRouter.get(
  "/registrations/:registrationId",
  requirePermission("registration:read"),
  asyncHandler(async (request, response) => {
    response.json(
      await loadAdminRegistrationDetail(
        request.organizer,
        request.organizerMembership,
        request.params.registrationId
      )
    );
  })
);

adminRouter.get(
  "/registrations/:registrationId/messages",
  requirePermission("registration:read"),
  asyncHandler(async (request, response) => {
    response.json(
      await loadAdminRegistrationMessages(
        request.organizer,
        request.organizerMembership,
        request.params.registrationId
      )
    );
  })
);

adminRouter.post(
  "/registrations/:registrationId/messages/resend-ticket",
  requirePermission("registration:write"),
  asyncHandler(async (request, response) => {
    response.json(
      await resendAdminTicket(
        request.organizer,
        request.organizerMembership,
        request.params.registrationId
      )
    );
  })
);

adminRouter.post(
  "/registrations/:registrationId/messages/payment-reminder",
  requirePermission("registration:write"),
  asyncHandler(async (request, response) => {
    response.json(
      await sendAdminPaymentReminder(
        request.organizer,
        request.organizerMembership,
        request.params.registrationId
      )
    );
  })
);

adminRouter.post(
  "/messages/broadcast",
  requirePermission("registration:write"),
  asyncHandler(async (request, response) => {
    response.json(
      await sendAdminEventBroadcast(
        request.organizer,
        request.organizerMembership,
        request.body
      )
    );
  })
);

adminRouter.put(
  "/venues",
  requirePermission("content:write"),
  asyncHandler(async (request, response) => {
    response.json(
      await saveVenue(request.organizer, request.organizerMembership, {
        ...request.body,
        slug: request.params.venueId ?? request.body.slug
      })
    );
  })
);

adminRouter.put(
  "/venues/:venueId",
  requirePermission("content:write"),
  asyncHandler(async (request, response) => {
    response.json(
      await saveVenue(request.organizer, request.organizerMembership, {
        ...request.body,
        slug: request.params.venueId
      })
    );
  })
);

adminRouter.delete(
  "/venues/:venueId",
  requirePermission("content:write"),
  asyncHandler(async (request, response) => {
    await archiveVenue(
      request.organizer,
      request.organizerMembership,
      request.params.venueId
    );
    response.status(204).end();
  })
);

adminRouter.put(
  "/sponsors",
  requirePermission("content:write"),
  asyncHandler(async (request, response) => {
    response.json(
      await saveSponsor(
        request.organizer,
        request.organizerMembership,
        request.body,
        request.params.sponsorId
      )
    );
  })
);

adminRouter.put(
  "/sponsors/:sponsorId",
  requirePermission("content:write"),
  asyncHandler(async (request, response) => {
    response.json(
      await saveSponsor(
        request.organizer,
        request.organizerMembership,
        request.body,
        request.params.sponsorId
      )
    );
  })
);

adminRouter.delete(
  "/sponsors/:sponsorId",
  requirePermission("content:write"),
  asyncHandler(async (request, response) => {
    await archiveSponsor(
      request.organizer,
      request.organizerMembership,
      request.params.sponsorId
    );
    response.status(204).end();
  })
);

adminRouter.put(
  "/activities",
  requirePermission("content:write"),
  asyncHandler(async (request, response) => {
    response.json(
      await saveActivity(request.organizer, request.organizerMembership, {
        ...request.body,
        slug: request.params.activityId ?? request.body.slug
      })
    );
  })
);

adminRouter.put(
  "/activities/:activityId",
  requirePermission("content:write"),
  asyncHandler(async (request, response) => {
    response.json(
      await saveActivity(request.organizer, request.organizerMembership, {
        ...request.body,
        slug: request.params.activityId
      })
    );
  })
);

adminRouter.delete(
  "/activities/:activityId",
  requirePermission("content:write"),
  asyncHandler(async (request, response) => {
    await archiveActivity(
      request.organizer,
      request.organizerMembership,
      request.params.activityId
    );
    response.status(204).end();
  })
);
