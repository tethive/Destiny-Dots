"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

/** Browser-side Better Auth client (same origin as the app). */
export const authClient = createAuthClient({ plugins: [adminClient()] });

export const { useSession, signOut } = authClient;

export type AuthResult =
  | { ok: true; redirectTo: string }
  | { ok: true; verifyEmail: true }
  | { ok: false; error: string; unverified?: boolean };

/** Only allow same-site relative redirects from `?next=`. */
export function safeNext(next: string | null | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return undefined;
  return next;
}

/** After any successful sign-in the server decides where to go (role, onboarding). */
const welcome = (next?: string) => `/welcome${next ? `?next=${encodeURIComponent(next)}` : ""}`;
/** Where the link in a verification email lands (Better Auth appends ?error=… on failure). */
const verified = (next?: string) => `/email-verified${next ? `?next=${encodeURIComponent(next)}` : ""}`;

const captchaHeaders = (token?: string | null) => (token ? { headers: { "x-captcha-response": token } } : undefined);

function message(error: { message?: string; code?: string; status?: number } | null | undefined, fallback: string) {
  if (!error) return fallback;
  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "That email and password don't match. Try again or reset your password.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "An account with this email already exists. Log in instead.";
    case "BANNED_USER":
      return "This account has been suspended. Contact support for help.";
    case "EMAIL_NOT_VERIFIED":
      return "Please confirm your email first — we've just sent you a fresh link.";
    case "PASSWORD_COMPROMISED":
      return "This password has appeared in a data breach. Please choose a different one.";
    case "VERIFICATION_FAILED":
    case "MISSING_RESPONSE":
      return "We couldn't verify you're human. Please try again.";
  }
  if (error.status === 429) return "Too many attempts. Please wait a minute and try again.";
  return error.message || fallback;
}

export async function signInWithEmail(input: { email: string; password: string; next?: string; captcha?: string | null }): Promise<AuthResult> {
  const { error } = await authClient.signIn.email(
    { email: input.email, password: input.password, callbackURL: verified(input.next) },
    captchaHeaders(input.captcha),
  );
  if (error) return { ok: false, error: message(error, "Could not sign you in."), unverified: error.code === "EMAIL_NOT_VERIFIED" };
  return { ok: true, redirectTo: welcome(input.next) };
}

export async function signInWithGoogle(input: { next?: string }): Promise<AuthResult> {
  const { error } = await authClient.signIn.social({ provider: "google", callbackURL: welcome(input.next) });
  if (error) return { ok: false, error: message(error, "Google sign-in is not available right now.") };
  return { ok: true, redirectTo: welcome(input.next) };
}

export async function signUp(input: {
  name: string;
  email: string;
  password: string;
  next?: string;
  captcha?: string | null;
}): Promise<AuthResult> {
  const { data, error } = await authClient.signUp.email(
    { name: input.name, email: input.email, password: input.password, callbackURL: verified(input.next) },
    captchaHeaders(input.captcha),
  );
  if (error) return { ok: false, error: message(error, "Could not create your account.") };
  // No session token means the account must confirm its email first.
  if (!data?.token) return { ok: true, verifyEmail: true };
  return { ok: true, redirectTo: welcome(input.next) };
}

export async function resendVerification(input: { email: string; next?: string }) {
  const { error } = await authClient.sendVerificationEmail({ email: input.email, callbackURL: verified(input.next) });
  return error ? { ok: false, error: message(error, "Could not send the email.") } : { ok: true };
}

export async function requestPasswordReset(input: { email: string; captcha?: string | null }): Promise<{ ok: boolean; error?: string }> {
  // The same response whether or not an account exists, so the UI never reveals it.
  const { error } = await authClient
    .requestPasswordReset({ email: input.email, redirectTo: "/reset-password" }, captchaHeaders(input.captcha))
    .catch(() => ({ error: null }));
  if (error && (error.status === 429 || error.code === "VERIFICATION_FAILED" || error.code === "MISSING_RESPONSE")) {
    return { ok: false, error: message(error, "Please try again.") };
  }
  return { ok: true };
}

export async function resetPassword(input: { token: string; password: string }): Promise<AuthResult> {
  const { error } = await authClient.resetPassword({ newPassword: input.password, token: input.token });
  if (error) return { ok: false, error: message(error, "This reset link is invalid or has expired.") };
  return { ok: true, redirectTo: "/password-updated" };
}
