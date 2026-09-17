import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/** Routes that need a signed-in user. Real authorisation (role, bans) happens in server layouts. */
const protectedPrefixes = [
  "/dashboard",
  "/onboarding",
  "/welcome",
  "/my-paths",
  "/explore",
  "/learn",
  "/certifications",
  "/jobs",
  "/updates",
  "/resume",
  "/marketplace",
  "/bookmarks",
  "/achievements",
  "/billing",
  "/invoices",
  "/payment",
  "/settings",
  "/admin",
];

const isDev = process.env.NODE_ENV === "development";

function storageOrigin() {
  try {
    return process.env.S3_ENDPOINT ? new URL(process.env.S3_ENDPOINT).origin : "";
  } catch {
    return "";
  }
}

/**
 * Strict, nonce-based Content Security Policy. Only scripts carrying this
 * request's nonce (and scripts they load) can run, which blocks injected
 * script tags even if some markup ever slipped through.
 */
function contentSecurityPolicy(nonce: string) {
  const storage = storageOrigin();
  const directives = {
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "media-src": ["'self'", "blob:", ...(storage ? [storage] : [])],
    "connect-src": [
      "'self'",
      "https://api.razorpay.com",
      "https://lumberjack.razorpay.com",
      "https://challenges.cloudflare.com",
      ...(storage ? [storage, storage.replace("://", "://*.")] : []),
      ...(isDev ? ["ws:"] : []),
    ],
    // In-app viewer: video platforms, Google Docs, and pages that allow embedding.
    "frame-src": ["'self'", "https:"],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'", "https://api.razorpay.com", "https://accounts.google.com"],
    "frame-ancestors": ["'none'"],
    ...(isDev ? {} : { "upgrade-insecure-requests": [] }),
  };
  return Object.entries(directives)
    .map(([k, v]) => [k, ...v].join(" "))
    .join("; ");
}

const maintenanceOpen = ["/maintenance", "/admin", "/login", "/forgot-password", "/reset-password"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (process.env.MAINTENANCE_MODE === "1" && !maintenanceOpen.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/maintenance";
    url.search = "";
    return NextResponse.rewrite(url, { status: 503, headers: { "Retry-After": "1800" } });
  }

  if (protectedPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`)) && !getSessionCookie(request)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: skip API routes, Next internals and static files.
      source: "/((?!api/|_next/static|_next/image|favicon|apple-touch-icon|site.webmanifest|logo|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml|mjs|js|css|woff2?)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
