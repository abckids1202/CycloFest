import assert from "node:assert/strict";
import test from "node:test";
import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  verifyPassword
} from "./auth-crypto.js";
import {
  normalizeEmail,
  validateBootstrapInput,
  validateLoginInput,
  validatePassword
} from "./auth.validation.js";

test("password hashes verify the right password only", async () => {
  const hash = await hashPassword("CycloFestOwner2026");

  assert.equal(await verifyPassword("CycloFestOwner2026", hash), true);
  assert.equal(await verifyPassword("WrongPassword2026", hash), false);
  assert.equal(hash.includes("CycloFestOwner2026"), false);
});

test("session tokens are random and stored as fixed hashes", () => {
  const first = createSessionToken();
  const second = createSessionToken();

  assert.notEqual(first, second);
  assert.equal(hashSessionToken(first).length, 64);
  assert.equal(hashSessionToken(first), hashSessionToken(first));
});

test("organizer emails are normalized", () => {
  assert.equal(normalizeEmail(" Owner@Example.COM "), "owner@example.com");
  assert.deepEqual(validateLoginInput({
    email: " Owner@Example.COM ",
    password: "anything"
  }), {
    email: "owner@example.com",
    password: "anything"
  });
});

test("owner bootstrap requires a strong password", () => {
  assert.ok(validatePassword("short").length > 0);
  assert.deepEqual(validatePassword("CycloFestOwner2026"), []);
  assert.throws(
    () =>
      validateBootstrapInput({
        email: "owner@example.com",
        fullName: "Event Owner",
        password: "short"
      }),
    (error) => error.code === "VALIDATION_ERROR"
  );
});