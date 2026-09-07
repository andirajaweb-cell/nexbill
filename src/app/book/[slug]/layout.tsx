import type { Metadata } from "next";
import { db } from "@/db/client";
import { outlets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resolveOutletDisplayName } from "@/lib/outlets/membership";
import { SITE_URL } from "@/lib/site-config";

/**
 * Per-outlet metadata for /book/[slug] (src/app/book/[slug]/page.tsx is a "use client" component
 * — metadata can only be exported from a server component, same reason /about and the bare
 * /book route each have their own layout.tsx; see those files). Without this, every outlet's
 * public booking page silently inherited the ROOT layout's title/description/canonical/OG image
 * (NEXBILL's homepage) — wrong on three counts: it told Google every outlet page duplicates the
 * homepage (suppressing indexing of pages that are actually unique, real content — an outlet's
 * name, address, live unit availability), it showed the wrong title/preview when an outlet
 * shared their own link on WhatsApp/social, and outlets never got their own logo as the social
 * preview image even though `outlets.logoUrl` already exists.
 *
 * Closes the known gap flagged in docs/SEO-ARCHITECTURE.md §1.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const canonical = `${SITE_URL}/book/${slug}`;

  const [row] = await db
    .select({ id: outlets.id, address: outlets.address, logoUrl: outlets.logoUrl })
    .from(outlets)
    .where(eq(outlets.slug, slug))
    .limit(1);

  // Unknown/dead slug — mirrors the page's own "Outlet tidak ditemukan" error state.
  // noindex: nothing real for Google to index behind a link that doesn't resolve to anything.
  if (!row) {
    return {
      title: "Booking Tidak Ditemukan",
      description: "Link booking ini tidak valid atau outlet sudah tidak terdaftar.",
      alternates: { canonical },
      robots: { index: false, follow: false },
    };
  }

  // "Business Name + Nama Cabang" — same helper the public outlet-info API uses, so the title a
  // customer sees in Google/WhatsApp preview matches what they see once the page actually loads.
  const name = await resolveOutletDisplayName(row.id);
  const description = row.address
    ? `Booking online rental PlayStation di ${name} — ${row.address}. Cek ketersediaan unit real-time dan booking langsung tanpa antre.`
    : `Booking online rental PlayStation di ${name}. Cek ketersediaan unit real-time dan booking langsung tanpa antre.`;
  const ogImage = row.logoUrl || `${SITE_URL}/og-image.jpg`;

  return {
    title: `Booking ${name}`,
    description,
    alternates: { canonical },
    // Real, unique per-outlet content (name/address/live availability) is legitimate to index —
    // left indexable even when the outlet has online booking currently switched off, since the
    // page still shows their contact info as a fallback rather than being a dead end.
    robots: { index: true, follow: true },
    openGraph: {
      title: `Booking ${name}`,
      description,
      url: canonical,
      images: [{ url: ogImage, alt: name }],
    },
    twitter: {
      card: "summary_large_image",
      title: `Booking ${name}`,
      description,
      images: [ogImage],
    },
  };
}

export default function BookOutletLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
