import {
  findMessagingRegistration,
  findMessagingRegistrationByPublicId,
  getMessagingSettings,
  insertMessage,
  listBroadcastRecipients,
  listRecentMessagesForRegistration,
  saveMessagingSettings
} from "./message.repository.js";

const defaultTemplates = {
  registrationConfirmation: {
    subject: "Registration received for {{eventName}}",
    body: "Hi {{fullName}}, your registration {{registrationId}} is received for {{categoryName}}. Please complete payment before {{holdExpiresAt}}."
  },
  paymentReminder: {
    subject: "Payment reminder for {{eventName}}",
    body: "Hi {{fullName}}, your CycloFest payment is still pending. Complete payment here: {{checkoutUrl}}"
  },
  ticketConfirmation: {
    subject: "Your {{eventName}} ticket is ready",
    body: "Hi {{fullName}}, your ticket is ready. Participant number: {{participantNumber}}. Show your QR ticket in the CycloFest app."
  },
  ticketResend: {
    subject: "Your {{eventName}} ticket",
    body: "Hi {{fullName}}, here is your ticket reminder. Registration: {{registrationId}}. Participant number: {{participantNumber}}."
  },
  eventBroadcast: {
    subject: "{{title}}",
    body: "{{body}}"
  }
};

const emailProviders = new Set(["mock", "sendgrid", "mailgun", "resend", "ses"]);
const whatsappProviders = new Set(["mock", "whatsapp_cloud", "twilio", "qontak", "wati"]);

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(amount ?? 0));
}

function cleanBroadcastInput(body = {}) {
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 140) : "";
  const bodyText = typeof body.body === "string" ? body.body.trim().slice(0, 1200) : "";
  const target = typeof body.target === "string" ? body.target.trim().toUpperCase() : "ALL";
  const channels = Array.isArray(body.channels)
    ? body.channels.map((channel) => String(channel).trim().toUpperCase())
    : ["EMAIL", "WHATSAPP"];
  const allowedTargets = new Set(["ALL", "CONFIRMED", "PENDING_PAYMENT"]);
  const allowedChannels = new Set(["EMAIL", "WHATSAPP"]);
  const selectedChannels = channels.filter((channel) => allowedChannels.has(channel));
  const details = {};

  if (title.length < 3) details.title = "Use at least 3 characters.";
  if (bodyText.length < 8) details.body = "Use at least 8 characters.";
  if (!allowedTargets.has(target)) details.target = "Choose ALL, CONFIRMED, or PENDING_PAYMENT.";
  if (selectedChannels.length === 0) details.channels = "Choose email, WhatsApp, or both.";

  if (Object.keys(details).length > 0) {
    const error = new Error("The broadcast message is invalid.");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    error.details = details;
    throw error;
  }

  return { title, body: bodyText, target, channels: selectedChannels };
}

function cleanNullableText(value, maxLength) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  return cleaned.slice(0, maxLength);
}

function keySaved(value) {
  return typeof value === "string" && value.length > 0;
}

function mapMessagingSettings(row) {
  return {
    emailProvider: row?.email_provider ?? "mock",
    emailApiKeySaved: keySaved(row?.email_api_key),
    senderEmail: row?.sender_email ?? "",
    senderName: row?.sender_name ?? "",
    whatsappProvider: row?.whatsapp_provider ?? "mock",
    whatsappApiKeySaved: keySaved(row?.whatsapp_api_key),
    whatsappPhoneNumber: row?.whatsapp_phone_number ?? "",
    templates: {
      ...defaultTemplates,
      ...(row?.templates ?? {})
    },
    updatedAt: row?.updated_at ?? null
  };
}

function validateMessagingSettingsInput(body = {}) {
  const emailProvider = cleanNullableText(body.emailProvider, 40) ?? "mock";
  const whatsappProvider = cleanNullableText(body.whatsappProvider, 40) ?? "mock";
  const senderEmail = cleanNullableText(body.senderEmail, 254);
  const senderName = cleanNullableText(body.senderName, 120);
  const whatsappPhoneNumber = cleanNullableText(body.whatsappPhoneNumber, 40);
  const emailApiKey = cleanNullableText(body.emailApiKey, 2000);
  const whatsappApiKey = cleanNullableText(body.whatsappApiKey, 2000);
  const incomingTemplates = body.templates && typeof body.templates === "object"
    ? body.templates
    : {};
  const details = {};

  if (!emailProviders.has(emailProvider)) {
    details.emailProvider = "Choose a supported email provider.";
  }
  if (!whatsappProviders.has(whatsappProvider)) {
    details.whatsappProvider = "Choose a supported WhatsApp provider.";
  }
  if (senderEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) {
    details.senderEmail = "Enter a valid sender email.";
  }

  const templates = {};
  for (const [key, fallback] of Object.entries(defaultTemplates)) {
    const incoming = incomingTemplates[key] ?? {};
    templates[key] = {
      subject: cleanNullableText(incoming.subject, 180) ?? fallback.subject,
      body: cleanNullableText(incoming.body, 1600) ?? fallback.body
    };
  }

  if (Object.keys(details).length > 0) {
    const error = new Error("The messaging settings are invalid.");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    error.details = details;
    throw error;
  }

  return {
    emailProvider,
    emailApiKey,
    senderEmail,
    senderName,
    whatsappProvider,
    whatsappApiKey,
    whatsappPhoneNumber,
    templates
  };
}

function requireRegistration(context, registrationPublicId) {
  if (!context) {
    const error = new Error(`Registration ${registrationPublicId} was not found.`);
    error.statusCode = 404;
    error.code = "REGISTRATION_NOT_FOUND";
    throw error;
  }
}

function messageTargets(context, channels = ["EMAIL", "WHATSAPP"]) {
  return channels.flatMap((channel) => {
    if (channel === "EMAIL" && context.email) {
      return [{ channel, recipient: context.email }];
    }
    if (channel === "WHATSAPP" && context.phone) {
      return [{ channel, recipient: context.phone }];
    }
    return [];
  });
}

async function sendRegistrationMessages(context, type, subject, body, createdBy = null, channels) {
  const targets = messageTargets(context, channels);
  const messages = [];

  for (const target of targets) {
    messages.push(await insertMessage({
      eventId: context.event_id,
      registrationId: context.registration_id,
      channel: target.channel,
      type,
      recipient: target.recipient,
      subject: target.channel === "EMAIL" ? subject : null,
      body,
      createdBy,
      metadata: {
        eventSlug: context.event_slug,
        registrationId: context.registration_public_id,
        participantName: context.full_name
      }
    }));
  }

  return messages;
}

export async function sendRegistrationConfirmation(registrationPublicId) {
  const context = await findMessagingRegistrationByPublicId(registrationPublicId);
  requireRegistration(context, registrationPublicId);

  return sendRegistrationMessages(
    context,
    "REGISTRATION_CONFIRMATION",
    `Registration received for ${context.event_name}`,
    `Hi ${context.full_name}, your ${context.event_name} registration (${context.registration_public_id}) is received for ${context.category_name}. Please complete payment before ${context.hold_expires_at}. Total: ${formatRupiah(context.total_amount)}.`,
    null,
    ["EMAIL", "WHATSAPP"]
  );
}

export async function sendTicketConfirmation(registrationPublicId) {
  const context = await findMessagingRegistrationByPublicId(registrationPublicId);
  requireRegistration(context, registrationPublicId);
  if (!context.ticket_public_id) return [];

  return sendRegistrationMessages(
    context,
    "TICKET_CONFIRMATION",
    `Your ${context.event_name} ticket is ready`,
    `Hi ${context.full_name}, your ${context.event_name} ticket is ready. Registration: ${context.registration_public_id}. Participant number: ${context.participant_number}. Show your QR ticket in the CycloFest app at check-in.`,
    null,
    ["EMAIL", "WHATSAPP"]
  );
}

export async function resendTicket(eventSlug, registrationPublicId, createdBy) {
  const context = await findMessagingRegistration(eventSlug, registrationPublicId);
  requireRegistration(context, registrationPublicId);
  if (!context.ticket_public_id) {
    const error = new Error("This participant does not have an issued ticket yet.");
    error.statusCode = 409;
    error.code = "TICKET_NOT_ISSUED";
    throw error;
  }

  return sendRegistrationMessages(
    context,
    "TICKET_RESEND",
    `Resent ticket for ${context.event_name}`,
    `Hi ${context.full_name}, here is your resent ticket reminder for ${context.event_name}. Registration: ${context.registration_public_id}. Participant number: ${context.participant_number}. Open the CycloFest app to display your QR ticket.`,
    createdBy,
    ["EMAIL", "WHATSAPP"]
  );
}

export async function sendPaymentReminder(eventSlug, registrationPublicId, createdBy) {
  const context = await findMessagingRegistration(eventSlug, registrationPublicId);
  requireRegistration(context, registrationPublicId);
  if (!["PENDING_PAYMENT", "CREATED", "PENDING"].includes(context.payment_status ?? context.registration_status)) {
    const error = new Error("This registration is not waiting for payment.");
    error.statusCode = 409;
    error.code = "PAYMENT_NOT_PENDING";
    throw error;
  }

  return sendRegistrationMessages(
    context,
    "PAYMENT_REMINDER",
    `Payment reminder for ${context.event_name}`,
    `Hi ${context.full_name}, your ${context.event_name} registration (${context.registration_public_id}) is waiting for payment. Total: ${formatRupiah(context.total_amount)}.${context.checkout_url ? ` Checkout: ${context.checkout_url}` : ""}`,
    createdBy,
    ["EMAIL", "WHATSAPP"]
  );
}

export async function sendEventBroadcast(eventSlug, body, createdBy) {
  const input = cleanBroadcastInput(body);
  const recipients = await listBroadcastRecipients(eventSlug, input.target);
  const messages = [];

  for (const recipient of recipients) {
    for (const channel of input.channels) {
      const target = channel === "EMAIL" ? recipient.email : recipient.phone;
      if (!target) continue;
      messages.push(await insertMessage({
        eventId: recipient.event_id,
        registrationId: recipient.registration_id,
        channel,
        type: "EVENT_UPDATE_BROADCAST",
        recipient: target,
        subject: channel === "EMAIL" ? input.title : null,
        body: `${input.title}\n\n${input.body}`,
        createdBy,
        metadata: {
          target: input.target,
          registrationId: recipient.registration_public_id,
          participantName: recipient.full_name
        }
      }));
    }
  }

  return {
    target: input.target,
    channels: input.channels,
    participants: recipients.length,
    messagesSent: messages.length,
    messages
  };
}

export async function loadRegistrationMessages(eventSlug, registrationPublicId) {
  const context = await findMessagingRegistration(eventSlug, registrationPublicId);
  requireRegistration(context, registrationPublicId);
  return listRecentMessagesForRegistration(registrationPublicId);
}

export async function loadMessagingSettings(eventSlug) {
  const settings = await getMessagingSettings(eventSlug);
  return mapMessagingSettings(settings);
}

export async function updateMessagingSettings(eventSlug, body, userId) {
  const input = validateMessagingSettingsInput(body);
  const settings = await saveMessagingSettings(eventSlug, input, userId);
  if (!settings) {
    const error = new Error("The organizer event was not found.");
    error.statusCode = 404;
    error.code = "EVENT_NOT_FOUND";
    throw error;
  }
  return mapMessagingSettings(settings);
}
