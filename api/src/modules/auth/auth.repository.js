import { randomUUID } from "node:crypto";
import { pool, query } from "../../database/pool.js";
import { hashSessionToken } from "./auth-crypto.js";

function mapMembership(row) {
  return {
    eventId: row.event_slug,
    eventName: row.event_name,
    role: {
      key: row.role_key,
      name: row.role_name
    },
    permissions: row.permissions
  };
}

export async function findUserForLogin(email) {
  const result = await query(
    `SELECT id, email, full_name, password_hash, status, preferred_language
     FROM organizer_users
     WHERE email = $1`,
    [email]
  );
  return result.rows[0] ?? null;
}

export async function createSession(userId, token, expiresAt) {
  const sessionId = randomUUID();

  await query(
    `INSERT INTO organizer_sessions (
      id, user_id, token_hash, expires_at
    ) VALUES ($1, $2, $3, $4)`,
    [sessionId, userId, hashSessionToken(token), expiresAt]
  );

  await query(
    `UPDATE organizer_users
     SET last_login_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [userId]
  );

  return sessionId;
}

export async function findSessionWithAccess(token) {
  const sessionResult = await query(
    `SELECT
       session.id AS session_id,
       session.expires_at,
       user_account.id AS user_id,
       user_account.email,
       user_account.full_name,
       user_account.preferred_language
     FROM organizer_sessions AS session
     JOIN organizer_users AS user_account ON user_account.id = session.user_id
     WHERE session.token_hash = $1
       AND session.revoked_at IS NULL
       AND session.expires_at > CURRENT_TIMESTAMP
       AND user_account.status = 'ACTIVE'`,
    [hashSessionToken(token)]
  );

  const session = sessionResult.rows[0];
  if (!session) return null;

  const membershipsResult = await query(
    `SELECT
       event.slug AS event_slug,
       event.name AS event_name,
       role.role_key,
       role.name AS role_name,
       role.permissions
     FROM organizer_memberships AS membership
     JOIN events AS event ON event.id = membership.event_id
     JOIN organizer_roles AS role ON role.id = membership.role_id
     WHERE membership.user_id = $1
       AND membership.status = 'ACTIVE'
     ORDER BY event.name, role.name`,
    [session.user_id]
  );

  await query(
    `UPDATE organizer_sessions
     SET last_used_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [session.session_id]
  );

  return {
    sessionId: session.session_id,
    expiresAt: session.expires_at,
    user: {
      id: session.user_id,
      email: session.email,
      fullName: session.full_name,
      preferredLanguage: session.preferred_language
    },
    memberships: membershipsResult.rows.map(mapMembership)
  };
}

export async function revokeSession(token) {
  const result = await query(
    `UPDATE organizer_sessions
     SET revoked_at = CURRENT_TIMESTAMP
     WHERE token_hash = $1
       AND revoked_at IS NULL
     RETURNING id`,
    [hashSessionToken(token)]
  );
  return Boolean(result.rows[0]);
}

export async function bootstrapOwner(input, passwordHash) {
  if (!pool) throw new Error("PostgreSQL is not configured.");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const eventResult = await client.query(
      `SELECT id, slug, name
       FROM events
       ORDER BY created_at
       LIMIT 1
       FOR UPDATE`
    );
    const event = eventResult.rows[0];
    if (!event) {
      const error = new Error("Seed the event before creating its owner.");
      error.code = "EVENT_REQUIRED";
      throw error;
    }

    const roleResult = await client.query(
      `SELECT id
       FROM organizer_roles
       WHERE event_id = $1 AND role_key = 'OWNER'`,
      [event.id]
    );
    const ownerRole = roleResult.rows[0];
    if (!ownerRole) {
      const error = new Error("The OWNER role is missing. Run the database seed.");
      error.code = "OWNER_ROLE_REQUIRED";
      throw error;
    }

    const userId = randomUUID();
    const userResult = await client.query(
      `INSERT INTO organizer_users (
        id, email, full_name, password_hash, status
      ) VALUES ($1, $2, $3, $4, 'ACTIVE')
      ON CONFLICT (email) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        password_hash = EXCLUDED.password_hash,
        status = 'ACTIVE',
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, email, full_name`,
      [userId, input.email, input.fullName, passwordHash]
    );
    const user = userResult.rows[0];

    await client.query(
      `UPDATE organizer_sessions
       SET revoked_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [user.id]
    );

    await client.query(
      `INSERT INTO organizer_memberships (
        id, event_id, user_id, role_id, status
      ) VALUES ($1, $2, $3, $4, 'ACTIVE')
      ON CONFLICT (event_id, user_id) DO UPDATE SET
        role_id = EXCLUDED.role_id,
        status = 'ACTIVE',
        updated_at = CURRENT_TIMESTAMP`,
      [randomUUID(), event.id, user.id, ownerRole.id]
    );

    await client.query(
      `INSERT INTO organizer_audit_log (
        event_id, user_id, action, entity_type, entity_id
      ) VALUES ($1, $2, 'organizer.owner_bootstrapped', 'organizer_user', $3)`,
      [event.id, user.id, user.id]
    );

    await client.query("COMMIT");
    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name
      },
      event: {
        id: event.slug,
        name: event.name
      },
      role: "OWNER"
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

