import {
  createHash,
  randomBytes,
  timingSafeEqual
} from "node:crypto";

const qrPrefix = "CFT1";

export function createQrToken() {
  return `${qrPrefix}.${randomBytes(32).toString("base64url")}`;
}

export function hashQrToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function qrTokenMatches(token, storedHash) {
  if (!token || !storedHash) return false;
  const received = Buffer.from(hashQrToken(token), "hex");
  const stored = Buffer.from(storedHash, "hex");
  return stored.length === received.length && timingSafeEqual(stored, received);
}

export function looksLikeQrToken(value) {
  return (
    typeof value === "string" &&
    /^CFT1\.[A-Za-z0-9_-]{43}$/.test(value)
  );
}