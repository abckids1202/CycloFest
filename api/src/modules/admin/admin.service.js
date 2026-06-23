import {
  archiveAdminActivity,
  archiveAdminSponsor,
  archiveAdminVenue,
  getAdminEventDetails,
  getAdminRegistrationDetail,
  getAdminOverview,
  listAdminRegistrations,
  listAdminContent,
  saveAdminActivity,
  saveAdminSponsor,
  saveAdminVenue,
  updateAdminEventDetails
} from "./admin.repository.js";
import {
  validateActivityInput,
  validateEventDetailsInput,
  validateSponsorInput,
  validateVenueInput
} from "./admin.validation.js";
import {
  loadRegistrationMessages,
  loadMessagingSettings,
  resendTicket,
  sendEventBroadcast,
  sendPaymentReminder,
  updateMessagingSettings
} from "../messages/message.service.js";

export async function loadAdminOverview(organizer, authorizedMembership) {
  const membership = authorizedMembership ?? organizer.memberships[0];
  if (!membership) {
    const error = new Error("This organizer has no active event membership.");
    error.statusCode = 403;
    error.code = "ORGANIZER_MEMBERSHIP_REQUIRED";
    throw error;
  }

  const overview = await getAdminOverview(membership.eventId);
  if (!overview) {
    const error = new Error("The organizer event was not found.");
    error.statusCode = 404;
    error.code = "EVENT_NOT_FOUND";
    throw error;
  }

  return overview;
}

function getAuthorizedMembership(organizer, authorizedMembership) {
  const membership = authorizedMembership ?? organizer.memberships[0];
  if (!membership) {
    const error = new Error("This organizer has no active event membership.");
    error.statusCode = 403;
    error.code = "ORGANIZER_MEMBERSHIP_REQUIRED";
    throw error;
  }
  return membership;
}

export async function loadAdminEventDetails(organizer, authorizedMembership) {
  const membership = getAuthorizedMembership(organizer, authorizedMembership);
  const eventDetails = await getAdminEventDetails(membership.eventId);

  if (!eventDetails) {
    const error = new Error("The organizer event was not found.");
    error.statusCode = 404;
    error.code = "EVENT_NOT_FOUND";
    throw error;
  }

  return eventDetails;
}

export async function saveAdminEventDetails(organizer, authorizedMembership, body) {
  const membership = getAuthorizedMembership(organizer, authorizedMembership);
  const input = validateEventDetailsInput(body);
  const eventDetails = await updateAdminEventDetails(
    membership.eventId,
    input,
    organizer.user.id
  );

  if (!eventDetails) {
    const error = new Error("The organizer event was not found.");
    error.statusCode = 404;
    error.code = "EVENT_NOT_FOUND";
    throw error;
  }

  return eventDetails;
}

export async function loadAdminMessagingSettings(organizer, authorizedMembership) {
  const membership = getAuthorizedMembership(organizer, authorizedMembership);
  return loadMessagingSettings(membership.eventId);
}

export async function saveAdminMessagingSettings(organizer, authorizedMembership, body) {
  const membership = getAuthorizedMembership(organizer, authorizedMembership);
  return updateMessagingSettings(membership.eventId, body, organizer.user.id);
}

export async function loadAdminContent(organizer, authorizedMembership) {
  const membership = getAuthorizedMembership(organizer, authorizedMembership);
  const content = await listAdminContent(membership.eventId);
  if (!content) {
    const error = new Error("The organizer event was not found.");
    error.statusCode = 404;
    error.code = "EVENT_NOT_FOUND";
    throw error;
  }
  return content;
}

function cleanRegistrationFilters(query = {}) {
  return {
    search: typeof query.search === "string" ? query.search.trim().slice(0, 120) : "",
    status: typeof query.status === "string" ? query.status.trim().toUpperCase() : "ALL",
    paymentStatus:
      typeof query.paymentStatus === "string"
        ? query.paymentStatus.trim().toUpperCase()
        : "ALL",
    ticketStatus:
      typeof query.ticketStatus === "string"
        ? query.ticketStatus.trim().toUpperCase()
        : "ALL",
    page: Number(query.page ?? 1),
    pageSize: Number(query.pageSize ?? 20)
  };
}

export async function loadAdminRegistrations(organizer, authorizedMembership, query) {
  const membership = getAuthorizedMembership(organizer, authorizedMembership);
  return listAdminRegistrations({
    eventSlug: membership.eventId,
    ...cleanRegistrationFilters(query)
  });
}

export async function loadAdminRegistrationDetail(
  organizer,
  authorizedMembership,
  registrationId
) {
  const membership = getAuthorizedMembership(organizer, authorizedMembership);
  const detail = await getAdminRegistrationDetail(membership.eventId, registrationId);

  if (!detail) {
    const error = new Error("The registration was not found.");
    error.statusCode = 404;
    error.code = "REGISTRATION_NOT_FOUND";
    throw error;
  }

  return detail;
}

export async function loadAdminRegistrationMessages(
  organizer,
  authorizedMembership,
  registrationId
) {
  const membership = getAuthorizedMembership(organizer, authorizedMembership);
  return loadRegistrationMessages(membership.eventId, registrationId);
}

export async function resendAdminTicket(
  organizer,
  authorizedMembership,
  registrationId
) {
  const membership = getAuthorizedMembership(organizer, authorizedMembership);
  return resendTicket(membership.eventId, registrationId, organizer.user.id);
}

export async function sendAdminPaymentReminder(
  organizer,
  authorizedMembership,
  registrationId
) {
  const membership = getAuthorizedMembership(organizer, authorizedMembership);
  return sendPaymentReminder(membership.eventId, registrationId, organizer.user.id);
}

export async function sendAdminEventBroadcast(
  organizer,
  authorizedMembership,
  body
) {
  const membership = getAuthorizedMembership(organizer, authorizedMembership);
  return sendEventBroadcast(membership.eventId, body, organizer.user.id);
}

export async function saveVenue(organizer, authorizedMembership, body) {
  const membership = getAuthorizedMembership(organizer, authorizedMembership);
  return saveAdminVenue(
    membership.eventId,
    validateVenueInput(body),
    organizer.user.id
  );
}

export async function archiveVenue(organizer, authorizedMembership, venueId) {
  const membership = getAuthorizedMembership(organizer, authorizedMembership);
  const archived = await archiveAdminVenue(membership.eventId, venueId, organizer.user.id);
  if (!archived) {
    const error = new Error("The venue was not found.");
    error.statusCode = 404;
    error.code = "VENUE_NOT_FOUND";
    throw error;
  }
}

export async function saveSponsor(organizer, authorizedMembership, body, sponsorId) {
  const membership = getAuthorizedMembership(organizer, authorizedMembership);
  return saveAdminSponsor(
    membership.eventId,
    validateSponsorInput(body),
    organizer.user.id,
    sponsorId
  );
}

export async function archiveSponsor(organizer, authorizedMembership, sponsorId) {
  const membership = getAuthorizedMembership(organizer, authorizedMembership);
  const archived = await archiveAdminSponsor(
    membership.eventId,
    sponsorId,
    organizer.user.id
  );
  if (!archived) {
    const error = new Error("The sponsor was not found.");
    error.statusCode = 404;
    error.code = "SPONSOR_NOT_FOUND";
    throw error;
  }
}

export async function saveActivity(organizer, authorizedMembership, body) {
  const membership = getAuthorizedMembership(organizer, authorizedMembership);
  return saveAdminActivity(
    membership.eventId,
    validateActivityInput(body),
    organizer.user.id
  );
}

export async function archiveActivity(organizer, authorizedMembership, activityId) {
  const membership = getAuthorizedMembership(organizer, authorizedMembership);
  const archived = await archiveAdminActivity(
    membership.eventId,
    activityId,
    organizer.user.id
  );
  if (!archived) {
    const error = new Error("The activity was not found.");
    error.statusCode = 404;
    error.code = "ACTIVITY_NOT_FOUND";
    throw error;
  }
}
