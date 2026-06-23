import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual
} from "node:crypto";
import { pool } from "../../database/pool.js";
import { issueTicketForRegistration } from "../tickets/ticket.repository.js";

function createPublicId() {
  return `PAY-${randomBytes(6).toString("hex").toUpperCase()}`;
}

function tokenMatches(token, storedHash) {
  if (!token || !storedHash) return false;
  const received = createHash("sha256").update(token).digest();
  const stored = Buffer.from(storedHash, "hex");
  return stored.length === received.length && timingSafeEqual(stored, received);
}

function mapPayment(row) {
  return {
    id: row.public_id,
    registrationId: row.registration_public_id,
    provider: row.provider,
    amount: Number(row.amount),
    currency: row.currency,
    paymentMethod: row.payment_method,
    status: row.status,
    checkoutUrl: row.checkout_url,
    expiresAt: row.expires_at,
    paidAt: row.paid_at,
    createdAt: row.created_at
  };
}

export async function preparePayment(
  registrationPublicId,
  accessToken,
  provider,
  paymentMethod
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const registrationResult = await client.query(
      `SELECT registration.*
       FROM registrations AS registration
       WHERE registration.public_id = $1
       FOR UPDATE`,
      [registrationPublicId]
    );
    const registration = registrationResult.rows[0];
    if (
      !registration ||
      !tokenMatches(accessToken, registration.access_token_hash)
    ) {
      await client.query("ROLLBACK");
      return { authorized: false };
    }

    if (registration.status !== "PENDING_PAYMENT") {
      const error = new Error(
        `A payment cannot be created while registration status is ${registration.status}.`
      );
      error.statusCode = 409;
      error.code = "REGISTRATION_NOT_PAYABLE";
      throw error;
    }
    if (new Date(registration.hold_expires_at) <= new Date()) {
      const error = new Error("The registration payment hold has expired.");
      error.statusCode = 409;
      error.code = "REGISTRATION_HOLD_EXPIRED";
      throw error;
    }

    const existingResult = await client.query(
      `SELECT payment.*, registration.public_id AS registration_public_id
       FROM payments AS payment
       JOIN registrations AS registration
         ON registration.id = payment.registration_id
       WHERE payment.registration_id = $1
         AND payment.status IN ('CREATED', 'PENDING')
         AND payment.expires_at > CURRENT_TIMESTAMP
       ORDER BY payment.created_at DESC
       LIMIT 1`,
      [registration.id]
    );
    if (existingResult.rows[0]) {
      await client.query("COMMIT");
      return {
        authorized: true,
        existing: true,
        payment: mapPayment(existingResult.rows[0])
      };
    }

    const payment = {
      id: randomUUID(),
      publicId: createPublicId(),
      registrationId: registration.id,
      registrationPublicId: registration.public_id,
      provider,
      amount: Number(registration.total_amount),
      currency: "IDR",
      paymentMethod,
      expiresAt: registration.hold_expires_at
    };
    await client.query("COMMIT");
    return { authorized: true, existing: false, payment };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function saveCreatedPayment(payment, gatewayPayment) {
  try {
    const result = await pool.query(
      `INSERT INTO payments (
        id, public_id, registration_id, provider, provider_order_id,
        amount, currency, payment_method, status, checkout_url, expires_at
       ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', $9, $10
       )
       RETURNING *,
         $11::varchar AS registration_public_id`,
      [
        payment.id,
        payment.publicId,
        payment.registrationId,
        payment.provider,
        gatewayPayment.providerOrderId,
        payment.amount,
        payment.currency,
        payment.paymentMethod,
        gatewayPayment.checkoutUrl,
        gatewayPayment.expiresAt,
        payment.registrationPublicId
      ]
    );
    return mapPayment(result.rows[0]);
  } catch (error) {
    if (error.code !== "23505") throw error;
    const existing = await pool.query(
      `SELECT payment.*, registration.public_id AS registration_public_id
       FROM payments AS payment
       JOIN registrations AS registration
         ON registration.id = payment.registration_id
       WHERE payment.registration_id = $1
         AND payment.status IN ('CREATED', 'PENDING')
       ORDER BY payment.created_at DESC
       LIMIT 1`,
      [payment.registrationId]
    );
    if (!existing.rows[0]) throw error;
    return mapPayment(existing.rows[0]);
  }
}

export async function findAuthorizedPayment(publicId, accessToken) {
  const result = await pool.query(
    `SELECT
      payment.*,
      registration.public_id AS registration_public_id,
      registration.access_token_hash
     FROM payments AS payment
     JOIN registrations AS registration
       ON registration.id = payment.registration_id
     WHERE payment.public_id = $1`,
    [publicId]
  );
  const payment = result.rows[0];
  if (!payment || !tokenMatches(accessToken, payment.access_token_hash)) {
    return null;
  }
  return mapPayment(payment);
}

export async function processPaymentWebhook(provider, event) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const duplicate = await client.query(
      `SELECT processed_at
       FROM payment_events
       WHERE provider = $1 AND provider_event_id = $2`,
      [provider, event.eventId]
    );
    if (duplicate.rows[0]) {
      await client.query("ROLLBACK");
      return { duplicate: true };
    }

    const paymentResult = await client.query(
      `SELECT
         payment.*,
         registration.category_id,
         registration.public_id AS registration_public_id,
         registration.status AS registration_status
       FROM payments AS payment
       JOIN registrations AS registration
         ON registration.id = payment.registration_id
       WHERE payment.provider = $1 AND payment.provider_order_id = $2
       FOR UPDATE OF payment`,
      [provider, event.orderId]
    );
    const payment = paymentResult.rows[0];

    await client.query(
      `INSERT INTO payment_events (
        payment_id, provider, provider_event_id, event_type, payload_json,
        signature_valid
       ) VALUES ($1, $2, $3, $4, $5, TRUE)`,
      [
        payment?.id ?? null,
        provider,
        event.eventId,
        event.eventType,
        JSON.stringify(event.raw)
      ]
    );

    if (!payment) {
      const error = new Error("The webhook payment order was not found.");
      error.statusCode = 404;
      error.code = "PAYMENT_ORDER_NOT_FOUND";
      throw error;
    }

    const sameStatus = payment.status === event.status;
    const cannotLeaveFailure = ["FAILED", "EXPIRED", "CANCELLED"].includes(
      payment.status
    );
    const paidCanOnlyRefund =
      ["PAID", "SETTLED"].includes(payment.status) &&
      event.status !== "REFUNDED";
    const refundIsFinal = payment.status === "REFUNDED";

    if (sameStatus || cannotLeaveFailure || paidCanOnlyRefund || refundIsFinal) {
      await client.query(
        `UPDATE payment_events
         SET processed_at = CURRENT_TIMESTAMP
         WHERE provider = $1 AND provider_event_id = $2`,
        [provider, event.eventId]
      );
      await client.query("COMMIT");
      return { duplicate: false, ignored: true, status: payment.status };
    }

    await client.query(
      `UPDATE payments
       SET status = $2::varchar,
           provider_transaction_id = COALESCE($3::varchar, provider_transaction_id),
           payment_method = COALESCE($4::varchar, payment_method),
           paid_at = CASE WHEN $2::varchar = 'PAID' THEN CURRENT_TIMESTAMP ELSE paid_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [
        payment.id,
        event.status,
        event.transactionId,
        event.paymentMethod
      ]
    );

    if (event.status === "PAID") {
      const confirmedRegistration = await client.query(
        `UPDATE registrations
         SET status = 'CONFIRMED',
             confirmed_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND status = 'PENDING_PAYMENT'`,
        [payment.registration_id]
      );
      if (confirmedRegistration.rowCount > 0) {
        const ticketResult = await issueTicketForRegistration(client, payment.registration_id);
        payment.ticket_issued = ticketResult.created;
      }
    }

    if (event.status === "REFUNDED") {
      await client.query(
        `UPDATE registrations
         SET status = 'REFUNDED',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [payment.registration_id]
      );
      await client.query(
        `UPDATE tickets
         SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP),
             revoke_reason = COALESCE(
               revoke_reason,
               'Registration payment was refunded.'
             ),
             updated_at = CURRENT_TIMESTAMP
         WHERE registration_id = $1`,
        [payment.registration_id]
      );
    }

    if (["FAILED", "EXPIRED", "CANCELLED"].includes(event.status)) {
      const registrationUpdate = await client.query(
        `UPDATE registrations
         SET status = 'PAYMENT_EXPIRED',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND status = 'PENDING_PAYMENT'
         RETURNING category_id`,
        [payment.registration_id]
      );
      if (registrationUpdate.rows[0]) {
        await client.query(
          `UPDATE event_categories
           SET registered_count = GREATEST(registered_count - 1, 0),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [registrationUpdate.rows[0].category_id]
        );
      }
    }

    await client.query(
      `UPDATE payment_events
       SET processed_at = CURRENT_TIMESTAMP
       WHERE provider = $1 AND provider_event_id = $2`,
      [provider, event.eventId]
    );
    await client.query("COMMIT");
    return {
      duplicate: false,
      ignored: false,
      status: event.status,
      registrationId: payment.registration_public_id,
      ticketIssued: Boolean(payment.ticket_issued)
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
