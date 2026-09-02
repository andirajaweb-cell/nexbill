import type { MetadataRoute } from "next";
import { SITE_URL } from "./layout";

// Auto-generated /robots.txt (Next.js App Router convention). Blocks crawlers from private/
// per-outlet/dynamic surfaces (dashboard, platform-admin, API, receipts, payments) while leaving
// the marketing site and public booking pages open — then points at the sitemap so Google
// discovers every allowed page without needing internal-link crawling alone.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/dashboard/*",
        "/platform-admin",
        "/platform-admin/*",
        "/api/*",
        "/receipt/*",
        "/payment/*",
        "/reset-password",
        "/lupa-password",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
