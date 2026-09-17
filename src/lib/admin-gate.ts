/**
 * The admin area is invisible unless the browser carries a signed "gate"
 * cookie. The cookie is issued only after an admin signs in (see /welcome), so
 * anyone probing /admin gets the same 404 as any unknown page. Real protection
 * still comes from the session role check on every admin page and action.
 *
 * Uses Web Crypto so it runs in the proxy as well as in route handlers.
 */

export const ADMIN_GATE_COOKIE = process.env.NODE_ENV === "production" ? "__Host-dd_gate" : "dd_gate";
export const ADMIN_GATE_MAX_AGE = 60 * 60 * 24 * 7;

const encoder = new TextEncoder();

function toBase64Url(bytes: ArrayBuffer) {
  return Buffer.from(bytes).toString("base64url");
}

async function sign(payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(`admin-gate:${process.env.BETTER_AUTH_SECRET ?? ""}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toBase64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
}

export async function createAdminGate(userId: string) {
  const payload = `${userId}.${Date.now() + ADMIN_GATE_MAX_AGE * 1000}`;
  return `${payload}.${await sign(payload)}`;
}

export async function verifyAdminGate(value: string | undefined) {
  if (!value) return false;
  const cut = value.lastIndexOf(".");
  if (cut < 0) return false;
  const payload = value.slice(0, cut);
  const expires = Number(payload.split(".").pop());
  if (!Number.isFinite(expires) || expires < Date.now()) return false;
  const expected = await sign(payload);
  const given = value.slice(cut + 1);
  if (expected.length !== given.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

export const adminGateCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: ADMIN_GATE_MAX_AGE,
};
