import "server-only";
import crypto from "node:crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { env, features, isProduction } from "@/lib/env";

/* -------------------------------------------------------------------------- */
/* Request identity                                                            */
/* -------------------------------------------------------------------------- */

/** Best-effort client IP (Vercel / Cloudflare set these). Used only for rate limiting. */
export async function clientIp() {
  const h = await headers();
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/** One-way hash so raw IPs are never stored. */
export const hashIdentifier = (value: string) =>
  crypto.createHmac("sha256", env.BETTER_AUTH_SECRET).update(value).digest("base64url").slice(0, 32);

/* -------------------------------------------------------------------------- */
/* Rate limiting (Postgres-backed, works across serverless instances)          */
/* -------------------------------------------------------------------------- */

/**
 * Fixed-window limiter. Returns false when the caller is over the limit.
 * The upsert + conditional update is atomic per key, so parallel requests
 * can't slip past the limit.
 */
export async function rateLimit(name: string, identifier: string, max: number, windowSeconds: number) {
  const key = `app:${name}:${hashIdentifier(identifier)}`;
  const now = BigInt(Date.now());
  const windowStart = now - BigInt(windowSeconds * 1000);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "rateLimit" ("id", "key", "count", "lastRequest")
    VALUES (${crypto.randomUUID()}, ${key}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "rateLimit"."lastRequest" < ${windowStart} THEN 1 ELSE "rateLimit"."count" + 1 END,
      "lastRequest" = CASE WHEN "rateLimit"."lastRequest" < ${windowStart} THEN ${now} ELSE "rateLimit"."lastRequest" END
    RETURNING "count"`;
  return (rows[0]?.count ?? 0) <= max;
}

/* -------------------------------------------------------------------------- */
/* Cloudflare Turnstile (bot protection)                                       */
/* -------------------------------------------------------------------------- */

export async function verifyTurnstile(token: string | undefined | null, ip?: string) {
  if (!features.turnstile) return !isProduction; // allowed only in development
  if (!token) return false;
  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY!, response: token });
  if (ip && ip !== "unknown") body.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Output encoding                                                             */
/* -------------------------------------------------------------------------- */

const htmlEscapes: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => htmlEscapes[c]);

/** Neutralises spreadsheet formula injection in CSV exports. */
export const csvCell = (value: unknown) => {
  const s = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

/* -------------------------------------------------------------------------- */
/* Encryption at rest (seller payout details)                                  */
/* -------------------------------------------------------------------------- */

function encryptionKey() {
  if (env.ENCRYPTION_KEY) {
    const key = Buffer.from(env.ENCRYPTION_KEY, "base64");
    if (key.length !== 32) throw new Error("ENCRYPTION_KEY must be 32 bytes, base64-encoded");
    return key;
  }
  if (isProduction) throw new Error("ENCRYPTION_KEY is not set");
  // Development only: derive a stable key from the auth secret.
  return crypto.createHash("sha256").update(`dev-encryption:${env.BETTER_AUTH_SECRET}`).digest();
}

export function encrypt(plaintext: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function decrypt(payload: string) {
  const [version, iv, tag, data] = payload.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Unrecognised ciphertext");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

/* -------------------------------------------------------------------------- */
/* URLs                                                                        */
/* -------------------------------------------------------------------------- */

/** Blocks SSRF targets: only public http(s) hosts, no credentials, no private ranges. */
export function isPublicHttpUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) return false;
  if (/^(0|10|127)\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\.|^192\.168\.|^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(host)) return false;
  if (host.includes(":") && (/^(::1?|fc|fd|fe80)/i.test(host) || host.startsWith("::ffff:"))) return false;
  return true;
}

/** Same-origin relative path for post-login redirects (prevents open redirects). */
export const safeRedirectPath = (next: string | null | undefined, fallback = "/dashboard") =>
  next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;

/* -------------------------------------------------------------------------- */
/* Outbound requests                                                           */
/* -------------------------------------------------------------------------- */

const privateIp = (ip: string) =>
  /^(0|10|127)\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\.|^192\.168\.|^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|^(22[4-9]|2[3-5]\d)\./.test(ip) ||
  /^(::1?$|fc|fd|fe80|::ffff:(0|10|127|169\.254|172\.(1[6-9]|2\d|3[01])|192\.168)\.)/i.test(ip);

/**
 * fetch() for admin-supplied URLs (link checks, RSS feeds). Resolves DNS and
 * re-validates every redirect hop, so a public hostname can't point or bounce
 * the server at internal addresses.
 */
export async function safeFetch(url: string, init: RequestInit & { timeoutMs?: number } = {}, maxRedirects = 5): Promise<Response> {
  const { lookup } = await import("node:dns/promises");
  let current = url;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    if (!isPublicHttpUrl(current)) throw new Error("Blocked URL");
    const { hostname } = new URL(current);
    const addresses = await lookup(hostname.replace(/^\[|\]$/g, ""), { all: true });
    if (!addresses.length || addresses.some((a) => privateIp(a.address))) throw new Error("Blocked address");
    const res = await fetch(current, {
      ...init,
      redirect: "manual",
      signal: AbortSignal.timeout(init.timeoutMs ?? 8000),
      headers: { "User-Agent": "DestinyDotsBot/1.0 (+https://destinydots.in)", ...init.headers },
    });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      current = new URL(location, current).toString();
      continue;
    }
    return res;
  }
  throw new Error("Too many redirects");
}
