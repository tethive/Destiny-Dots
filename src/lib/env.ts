import "server-only";
import { z } from "zod";

/**
 * Server environment, validated once at startup (see src/instrumentation.ts).
 * In production the app refuses to start without the essentials, so a missing
 * key fails loudly at deploy time instead of silently at checkout.
 */
const optional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.url(),
  NEXT_PUBLIC_SITE_URL: z.url(),
  ADMIN_EMAILS: z.string().default(""),

  GOOGLE_CLIENT_ID: optional,
  GOOGLE_CLIENT_SECRET: optional,

  RAZORPAY_KEY_ID: optional,
  RAZORPAY_KEY_SECRET: optional,
  RAZORPAY_WEBHOOK_SECRET: optional,

  RESEND_API_KEY: optional,
  EMAIL_FROM: optional,
  CONTACT_INBOX: optional,

  NEXT_PUBLIC_TURNSTILE_SITE_KEY: optional,
  TURNSTILE_SECRET_KEY: optional,

  S3_ENDPOINT: optional,
  S3_REGION: optional,
  S3_BUCKET: optional,
  S3_ACCESS_KEY_ID: optional,
  S3_SECRET_ACCESS_KEY: optional,

  /** 32-byte key (base64) for encrypting seller payout details. */
  ENCRYPTION_KEY: optional,
  /** Shared secret Vercel Cron sends as a Bearer token. */
  CRON_SECRET: optional,

  ADZUNA_APP_ID: optional,
  ADZUNA_APP_KEY: optional,
  JOOBLE_API_KEY: optional,
});

type Env = z.infer<typeof schema>;

/** Keys that must be present before the site can take real users and money. */
const requiredInProduction: (keyof Env)[] = [
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "TURNSTILE_SECRET_KEY",
  "S3_ENDPOINT",
  "S3_BUCKET",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "ENCRYPTION_KEY",
  "CRON_SECRET",
];

function load(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}

export const env = load();
export const isProduction = env.NODE_ENV === "production";

/** Throws with the full list of missing production keys. Called from instrumentation. */
export function assertProductionEnv() {
  if (!isProduction || process.env.SKIP_ENV_CHECK === "1") return;
  const missing = requiredInProduction.filter((k) => !env[k]);
  if (env.BETTER_AUTH_URL.startsWith("http://")) missing.push("BETTER_AUTH_URL (must be https)" as keyof Env);
  if (missing.length) {
    throw new Error(`Missing production configuration — see docs/PRODUCTION_SETUP.md:\n  - ${missing.join("\n  - ")}`);
  }
}

export const features = {
  google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  razorpay: Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET),
  email: Boolean(env.RESEND_API_KEY),
  turnstile: Boolean(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY),
  objectStorage: Boolean(env.S3_ENDPOINT && env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY),
  adzuna: Boolean(env.ADZUNA_APP_ID && env.ADZUNA_APP_KEY),
  jooble: Boolean(env.JOOBLE_API_KEY),
};
