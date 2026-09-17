import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const isLive = process.env.VERCEL_ENV ? process.env.VERCEL_ENV === "production" : true;
  if (!isLive) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin",
        "/dashboard",
        "/onboarding",
        "/welcome",
        "/learn",
        "/settings",
        "/billing",
        "/invoices",
        "/payment",
        "/marketplace",
        "/resume",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
