import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware, isAPIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { admin, captcha, haveIBeenPwned } from "better-auth/plugins";
import { ADMIN_GATE_COOKIE, adminGateCookieOptions } from "@/lib/admin-gate";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { passwordChangedTemplate, resetPasswordTemplate, verifyEmailTemplate, welcomeTemplate } from "@/lib/email-templates";
import { env, features, isProduction } from "@/lib/env";
import { FLASH_COOKIE, flashCookieOptions, type FlashKind } from "@/lib/flash";

const adminEmails = env.ADMIN_EMAILS.split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const googleEnabled = features.google;

/** Email must be confirmed before password sign-in whenever email can actually be delivered. */
export const requireEmailVerification = isProduction || features.email;

export const auth = betterAuth({
  appName: "Destiny Dots",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.BETTER_AUTH_URL, env.NEXT_PUBLIC_SITE_URL],
  database: prismaAdapter(db, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: !requireEmailVerification,
    requireEmailVerification,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail(user.email, resetPasswordTemplate(user.name, url));
    },
    onPasswordReset: async ({ user }) => {
      await sendEmail(user.email, passwordChangedTemplate(user.name));
    },
  },

  emailVerification: {
    sendOnSignUp: requireEmailVerification,
    sendOnSignIn: requireEmailVerification,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail(user.email, verifyEmailTemplate(user.name, url));
    },
    afterEmailVerification: async (user) => {
      await sendEmail(user.email, welcomeTemplate(user.name));
    },
  },

  socialProviders: googleEnabled
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID!,
          clientSecret: env.GOOGLE_CLIENT_SECRET!,
          prompt: "select_account",
        },
      }
    : undefined,

  account: {
    // Google accounts with the same verified email link to one user.
    accountLinking: { enabled: true, trustedProviders: ["google"] },
  },

  user: {
    changeEmail: { enabled: false },
    deleteUser: { enabled: false },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    // Saves a database lookup on most requests. Bans also revoke sessions server-side;
    // role and profile changes reach an open browser within five minutes.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },

  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60 * 10, max: 5 },
      "/request-password-reset": { window: 60 * 10, max: 3 },
      "/send-verification-email": { window: 60 * 10, max: 3 },
      "/change-password": { window: 60 * 10, max: 5 },
    },
  },

  advanced: {
    useSecureCookies: isProduction,
    ipAddress: { ipAddressHeaders: ["cf-connecting-ip", "x-real-ip", "x-forwarded-for"] },
  },

  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      const returned = ctx.context.returned;
      const failed = isAPIError(returned);
      const flash = (kind: FlashKind) => ctx.setCookie(FLASH_COOKIE, kind, flashCookieOptions);
      switch (ctx.path) {
        case "/change-password": {
          // Security notice after an in-app password change.
          const user = ctx.context.session?.user;
          if (!failed && user) await sendEmail(user.email, passwordChangedTemplate(user.name));
          break;
        }
        // Unlock the matching result page for a few minutes (see lib/flash).
        case "/sign-out":
          flash("signed-out");
          // Hide the admin area again on this browser.
          ctx.setCookie(ADMIN_GATE_COOKIE, "", { ...adminGateCookieOptions, maxAge: 0 });
          break;
        case "/reset-password":
          if (!failed) flash("password-updated");
          break;
        case "/verify-email":
          flash("email-verified");
          break;
        case "/sign-in/email":
          if (failed && returned.body?.code === "BANNED_USER") flash("account-suspended");
          break;
      }
    }),
  },

  databaseHooks: {
    session: {
      create: {
        // Signing in again reactivates a paused account.
        after: async (session) => {
          await db.user.updateMany({ where: { id: session.userId, deactivatedAt: { not: null }, deletedAt: null }, data: { deactivatedAt: null } });
        },
      },
    },
    user: {
      create: {
        // Promote configured emails to admin; everyone else is a student.
        before: async (user) => ({
          data: { ...user, role: adminEmails.includes(user.email.toLowerCase()) ? "admin" : "student" },
        }),
        after: async (user) => {
          await db.profile.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
          // Google sign-ups arrive already verified; email sign-ups get the welcome email after verifying.
          if (user.emailVerified || !requireEmailVerification) await sendEmail(user.email, welcomeTemplate(user.name));
        },
      },
    },
  },

  plugins: [
    admin({ defaultRole: "student", adminRoles: ["admin"] }),
    haveIBeenPwned({ customPasswordCompromisedMessage: "This password has appeared in a data breach. Please choose a different one." }),
    ...(features.turnstile
      ? [
          captcha({
            provider: "cloudflare-turnstile",
            secretKey: env.TURNSTILE_SECRET_KEY!,
            endpoints: ["/sign-up/email", "/sign-in/email", "/request-password-reset"],
          }),
        ]
      : []),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
