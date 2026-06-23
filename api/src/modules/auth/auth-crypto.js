import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const keyLength = 64;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, keyLength);
  return `scrypt$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(password, storedHash) {
  const [algorithm, saltText, keyText] = String(storedHash).split("$");
  if (algorithm !== "scrypt" || !saltText || !keyText) return false;

  const salt = Buffer.from(saltText, "base64url");
  const storedKey = Buffer.from(keyText, "base64url");
  const receivedKey = await scrypt(password, salt, storedKey.length);

  return (
    storedKey.length === receivedKey.length &&
    timingSafeEqual(storedKey, receivedKey)
  );
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}