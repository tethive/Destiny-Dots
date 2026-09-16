import type { NextConfig } from "next";

// Domain slugs used before the 11-domain catalogue.
const oldDomains: Record<string, string> = { "data-ai": "ai-ml", cloud: "cloud-computing", "web-dev": "full-stack" };
// Paths whose domain changed when domains were split.
const movedPaths = [
  { slug: "data-analyst", from: "data-ai", to: "data-analysis" },
  { slug: "business-analyst", from: "data-ai", to: "data-analysis" },
  { slug: "data-engineer", from: "data-ai", to: "data-engineering" },
  { slug: "penetration-tester", from: "cybersecurity", to: "ethical-hacking" },
];

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: 'camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=(self "https://checkout.razorpay.com" "https://api.razorpay.com")' },
  // Allows the Razorpay and Google sign-in popups to talk back to this page.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Private files are never cached by shared caches.
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
  async redirects() {
    return [
      ...movedPaths.map(({ slug, from, to }) => ({
        source: `/:prefix(browse|resources)/${from}/${slug}`,
        destination: `/resources/${to}/${slug}`,
        permanent: true,
      })),
      ...Object.entries(oldDomains).flatMap(([from, to]) => [
        { source: `/:prefix(browse|resources)/${from}`, destination: `/resources/${to}`, permanent: true },
        { source: `/:prefix(browse|resources)/${from}/:path*`, destination: `/resources/${to}/:path*`, permanent: true },
      ]),
      // "Browse" was renamed to "Resources"
      { source: "/browse", destination: "/resources", permanent: true },
      { source: "/browse/:path*", destination: "/resources/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
