import type { MetadataRoute } from "next";
import { SITE_URL } from "./layout";

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
    // Blog engine (docs/SEO-ARCHITECTURE.md §6, Phase 4) — first topic cluster, "Billing &
    // Operasional", plus its 6 real articles and the author profile page (E-E-A-T).
    { path: "/blog", priority: 0.8, changeFrequency: "weekly" },
    { path: "/blog/billing-dan-operasional", priority: 0.8, changeFrequency: "weekly" },
    { path: "/blog/billing-dan-operasional/cara-hitung-tarif-sewa-ps", priority: 0.7, changeFrequency: "monthly" },
    { path: "/blog/billing-dan-operasional/bep-rental-ps", priority: 0.7, changeFrequency: "monthly" },
    { path: "/blog/billing-dan-operasional/kesalahan-kasir-rental-ps", priority: 0.7, changeFrequency: "monthly" },
    { path: "/blog/billing-dan-operasional/cara-tutup-shift-kasir-rental-ps", priority: 0.7, changeFrequency: "monthly" },
    { path: "/blog/billing-dan-operasional/harga-sewa-ps4-vs-ps5", priority: 0.7, changeFrequency: "monthly" },
    { path: "/blog/billing-dan-operasional/kapan-butuh-sistem-multi-cabang", priority: 0.7, changeFrequency: "monthly" },
    { path: "/authors/andika-rajasa", priority: 0.5, changeFrequency: "monthly" },
    // NOTE: bare /book is intentionally excluded — it's a dead-end "link tidak lengkap" message,
    // not real content (see book/layout.tsx, which sets noindex on it). Real per-outlet booking
    // pages live at /book/[slug] and are merchant-specific, not NEXBILL marketing content, so
    // they don't belong in this sitemap either.
    { path: "/daftar", priority: 0.9, changeFrequency: "monthly" },
    { path: "/login", priority: 0.5, changeFrequency: "yearly" },
    { path: "/syarat-ketentuan", priority: 0.3, changeFrequency: "yearly" },
    { path: "/kebijakan-cookie", priority: 0.3, changeFrequency: "yearly" },
    { path: "/kebijakan-refund", priority: 0.3, changeFrequency: "yearly" },
  ];

  return routes.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
