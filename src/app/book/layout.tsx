import type { Metadata } from "next";
import { SITE_URL } from "../layout";

// The bare /book route (no [slug]) is a deliberate dead-end informational message, not real
// content (see page.tsx) — it must never be indexed or shown as a search result, and it should
// NOT be in sitemap.ts. Every real outlet's booking page lives at /book/[slug] instead, which has
// its own generateMetadata() in book/[slug]/layout.tsx pulling each outlet's real name/address/
// logo — intentionally still left out of this shared sitemap, since each is merchant-specific
// content NEXBILL doesn't control, not the company's own marketing content (indexing happens
// organically via the per-outlet robots/canonical tags, not sitemap submission).
export const metadata: Metadata = {
  title: "Link Booking Tidak Lengkap",
  alternates: { canonical: `${SITE_URL}/book` },
  robots: { index: false, follow: false },
};

export default function BookIndexLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
