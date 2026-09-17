import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

export const ADMIN_COOKIE = "ros2_admin_session";
const SESSION_TTL_SECONDS = 12 * 60 * 60; // 12 hours
export const DRAFT_COOKIE_PREFIX = "ros2_draft_";

function sessionSecret(): Uint8Array {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("ADMIN_SESSION_SECRET is not configured.");
  return new TextEncoder().encode(s);
}

export async function createAdminSession(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(sessionSecret());
}

export async function verifyAdminSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, sessionSecret());
    return true;
  } catch {
    return false;
  }
}

/** Generate a random draft resume token (returned once to the browser). */
export function generateResumeToken(): string {
  return randomBytes(32).toString("hex"); // 64 chars
}

/** SHA-256 hash of the resume token for storage (token itself is never stored). */
export function hashResumeToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Constant-time comparison of stored hash vs presented token's hash. */
export function resumeTokenMatches(storedHash: string | null, token: string): boolean {
  if (!storedHash || !token) return false;
  const a = Buffer.from(storedHash, "hex");
  const b = Buffer.from(hashResumeToken(token), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
