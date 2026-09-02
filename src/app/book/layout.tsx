import type { Metadata } from "next";
import { SITE_URL } from "../layout";

// The bare /book route (no [slug]) is a deliberate dead-end informational message, not real
// content (see page.tsx) — it must never be indexed or shown as a search result, and it should
// NOT be in sitemap.ts. Every real outlet's booking page lives at /book/[slug] instead (has no
// metadata export of its own yet — a separate follow-up, since per-outlet SEO/OG tags need their
// own generateMetadata() pulling each outlet's name/logo, which is out of scope here) and is
// intentionally left out of this shared sitemap too, since each is merchant-specific content
// NEXBILL doesn't control, not the company's own marketing content.
export const metadata: Metadata = {
  title: "Link Booking Tidak Lengkap",
  alternates: { canonical: `${SITE_URL}/book` },
  robots: { index: false, follow: false },
};

export default function BookIndexLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
