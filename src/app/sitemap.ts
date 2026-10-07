import type { MetadataRoute } from "next";
import { SITE_URL } from "./layout";
import { allBlogPaths } from "@/components/blog/blog-data";

// Auto-generated /sitemap.xml (Next.js App Router convention). Only public marketing pages are
// listed here — /dashboard, /platform-admin, /api, /receipt, /payment, /book/[slug] etc. are
// private/dynamic/per-outlet routes that should never be indexed (see robots.ts, which blocks
// them outright). Keeping this list in sync with real routes under src/app is what lets Google
// discover every public page without relying on internal link-crawling alone.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "", priority: 1, changeFrequency: "weekly" },
    { path: "/about", priority: 0.8, changeFrequency: "monthly" },
    // SEO pillar pages (docs/SEO-ARCHITECTURE.md §2-3, Phase 1) — 4 Indonesian + 4 English
    // counterparts, each targeting one distinct primary keyword. Priority just below the
    // homepage since these are the site's main organic-acquisition surfaces alongside it.
    { path: "/billing-rental-ps", priority: 0.9, changeFrequency: "monthly" },
    { path: "/aplikasi-rental-ps", priority: 0.9, changeFrequency: "monthly" },
    { path: "/software-rental-ps", priority: 0.9, changeFrequency: "monthly" },
    { path: "/sistem-rental-ps", priority: 0.9, changeFrequency: "monthly" },
    { path: "/en/playstation-rental-billing-software", priority: 0.9, changeFrequency: "monthly" },
    { path: "/en/playstation-rental-app", priority: 0.9, changeFrequency: "monthly" },
    { path: "/en/playstation-rental-management-software", priority: 0.9, changeFrequency: "monthly" },
    { path: "/en/ps-rental-system", priority: 0.9, changeFrequency: "monthly" },
    // Blog engine (docs/SEO-ARCHITECTURE.md §6, Phase 4) — Indonesian (/blog) + English (/en/blog),
    // every index/cluster/article listed from blog-data.ts so the sitemap can't drift from the routes,
    // plus the author profile page in both languages (E-E-A-T).
    ...allBlogPaths().map((path) => {
      const isArticle = path.split("/").filter(Boolean).length === (path.startsWith("/en/") ? 4 : 3);
      return { path, priority: isArticle ? 0.7 : 0.8, changeFrequency: isArticle ? ("monthly" as const) : ("weekly" as const) };
    }),
    { path: "/authors/andika-rajasa", priority: 0.5, changeFrequency: "monthly" },
    { path: "/en/authors/andika-rajasa", priority: 0.5, changeFrequency: "monthly" },
    // NOTE: bare /book is intentionally excluded — it's a dead-end "link tidak lengkap" message,
    // not real content (see book/layout.tsx, which sets noindex on it). Real per-outlet booking
    // pages live at /book/[slug] and are merchant-specific, not NEXBILL marketing content, so
    // they don't belong in this sitemap either.
    { path: "/daftar", priority: 0.9, changeFrequency: "monthly" },
    { path: "/login", priority: 0.5, changeFrequency: "yearly" },
    { path: "/syarat-ketentuan", priority: 0.3, changeFrequency: "yearly" },
    { path: "/kebijakan-cookie", priority: 0.3, changeFrequency: "yearly" },
    { path: "/kebijakan-refund", priority: 0.3, changeFrequency: "yearly" },
    { path: "/kebijakan-privasi", priority: 0.3, changeFrequency: "yearly" },
    { path: "/hapus-akun", priority: 0.2, changeFrequency: "yearly" },
  ];

  return routes.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
