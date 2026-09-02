import type { Metadata } from "next";
import { SITE_URL } from "../layout";

// Per-route metadata for a client-component page.tsx (see root layout.tsx for why: metadata
// can only be exported from a server component, and about/page.tsx is "use client"). Without
// this file, /about silently inherited the ROOT layout's canonical (SITE_URL, i.e. the
// homepage) and title/description — telling Google "this page is a duplicate of the homepage,
// index that instead," which actively hurt /about's own indexing.
export const metadata: Metadata = {
  title: "Tentang Kami",
  description: "NEXBILL — sistem billing all-in-one untuk rental PlayStation di Indonesia dan Asia Tenggara. Kenali tim dan misi kami.",
  alternates: { canonical: `${SITE_URL}/about` },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
