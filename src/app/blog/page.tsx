import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/app/layout";
import { PillarNav, PillarFooter } from "@/components/pillar/PillarPage";
import { Breadcrumb } from "@/components/seo/Breadcrumb";

// Blog index (docs/SEO-ARCHITECTURE.md §12 Phase 4). Only one cluster exists so far
// (billing-dan-operasional) — this page is written to scale to more clusters without a redesign,
// but deliberately doesn't list clusters/articles that don't exist yet (no placeholder cards).
export const metadata: Metadata = {
  title: "Blog NEXBILL — Bisnis, Billing & Operasional Rental PlayStation",
  description: "Panduan praktis mengelola bisnis rental PlayStation — dari cara hitung tarif sewa, BEP, sampai operasional kasir harian, ditulis dari pengalaman langsung.",
  alternates: { canonical: `${SITE_URL}/blog` },
};

const CLUSTERS = [
  {
    slug: "billing-dan-operasional",
    label: "Billing & Operasional",
    desc: "Cara hitung tarif sewa, BEP, dan operasional kasir rental PS sehari-hari.",
    articleCount: 6,
  },
];

export default function BlogIndexPage() {
  return (
    <div className="min-h-screen bg-[#050810] text-[#eef2fb]">
      <PillarNav lang="id" />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <Breadcrumb items={[{ label: "Beranda", href: "/" }, { label: "Blog" }]} />
        <h1 className="mt-5 text-3xl font-black">Blog NEXBILL</h1>
        <p className="mt-3 text-neutral-400 leading-relaxed max-w-xl">
          Panduan praktis mengelola bisnis rental PlayStation, ditulis dari pengalaman langsung mengoperasikan outlet — bukan konten generik.
        </p>

        <div className="mt-10 space-y-4">
          {CLUSTERS.map((c) => (
            <Link
              key={c.slug}
              href={`/blog/${c.slug}`}
              className="block rounded-xl border border-white/10 bg-white/[0.02] p-5 hover:border-cyan-400/30 transition-colors"
            >
              <div className="font-semibold text-white">{c.label}</div>
              <p className="mt-1.5 text-sm text-neutral-400">{c.desc}</p>
              <div className="mt-2 text-xs text-cyan-400">{c.articleCount} artikel →</div>
            </Link>
          ))}
        </div>
      </main>
      <PillarFooter lang="id" />
    </div>
  );
}
