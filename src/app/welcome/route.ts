import { NextResponse } from "next/server";
import { ADMIN_GATE_COOKIE, adminGateCookieOptions, createAdminGate } from "@/lib/admin-gate";
import { getSession, homeFor, isAdmin } from "@/lib/session";

/**
 * Post-sign-in router: admins → admin area, new students → onboarding, others
 * → dashboard or `next`. Also issues the admin gate cookie (see lib/admin-gate).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next");
  const session = await getSession();
  if (!session) {
    const login = new URL("/login", url);
    if (next) login.searchParams.set("next", next);
    return NextResponse.redirect(login);
  }
  if (session.user.banned) return NextResponse.redirect(new URL("/account-suspended", url));

  const target = await homeFor(session.user, next);
  const response = NextResponse.redirect(new URL(target, url));
  if (isAdmin(session.user)) response.cookies.set(ADMIN_GATE_COOKIE, await createAdminGate(session.user.id), adminGateCookieOptions);
  return response;
}
