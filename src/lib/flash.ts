import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * One-off "you just did X" marker. Result pages (signed out, password updated,
 * message sent…) only render right after the action that leads to them, so
 * typing their URL directly just goes home.
 */
export const FLASH_COOKIE = "dd_flash";
export const FLASH_MAX_AGE = 60 * 5;

export type FlashKind = "signed-out" | "password-updated" | "email-verified" | "message-sent" | "account-suspended" | "account-deactivated" | "account-deleted";

export const flashCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: FLASH_MAX_AGE,
};

/** For server actions and route handlers. */
export async function setFlash(kind: FlashKind) {
  (await cookies()).set(FLASH_COOKIE, kind, flashCookieOptions);
}

export async function hasFlash(kind: FlashKind) {
  return (await cookies()).get(FLASH_COOKIE)?.value === kind;
}

/** For result pages: leave unless the matching action just happened. */
export async function requireFlash(kind: FlashKind, fallback = "/") {
  if (!(await hasFlash(kind))) redirect(fallback);
}
