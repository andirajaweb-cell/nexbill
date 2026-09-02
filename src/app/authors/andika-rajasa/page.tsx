import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/app/layout";
import { PillarNav, PillarFooter } from "@/components/pillar/PillarPage";
import { Breadcrumb } from "@/components/seo/Breadcrumb";
import { AUTHORS } from "@/components/blog/BlogArticle";

// E-E-A-T author page (docs/SEO-ARCHITECTURE.md §9) — real person, real role, real bio, matching
// exactly what AUTHORS["andika-rajasa"] carries so this page can never drift from the byline shown
// on his articles. Article list below is maintained by hand for now (same static-page approach as
// the rest of Phase 4) — revisit if/when blog posts move to the DB-backed contentPages table.
const author = AUTHORS["andika-rajasa"];

const ARTICLES = [
  { title: "Cara Menghitung Tarif Sewa PS yang Tepat (Per Jam, Paket, dan Member)", href: "/blog/billing-dan-operasional/cara-hitung-tarif-sewa-ps" },
  { title: "BEP (Break Even Point) Rental PS: Cara Hitung dan Simulasinya", href: "/blog/billing-dan-operasional/bep-rental-ps" },
  { title: "5 Kesalahan Kasir Rental PS yang Bikin Kas Bocor", href: "/blog/billing-dan-operasional/kesalahan-kasir-rental-ps" },
  { title: "Cara Tutup Shift Kasir Rental PS yang Rapi dan Anti Selisih", href: "/blog/billing-dan-operasional/cara-tutup-shift-kasir-rental-ps" },
  { title: "Sewa PS4 vs PS5: Menentukan Harga yang Adil untuk Keduanya", href: "/blog/billing-dan-operasional/harga-sewa-ps4-vs-ps5" },
  { title: "Kapan Waktunya Rental PS Anda Butuh Sistem Multi-Cabang?", href: "/blog/billing-dan-operasional/kapan-butuh-sistem-multi-cabang" },
];

export const metadata: Metadata = {
  title: `${author.name} — ${author.role}`,
  description: `${author.name}, ${author.role}. ${author.bio}`,
  alternates: { canonical: `${SITE_URL}/authors/${author.slug}` },
};

export default function AndikaRajasaAuthorPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: author.name,
      jobTitle: author.role,
      description: author.bio,
      url: `${SITE_URL}/authors/${author.slug}`,
    },
  };

  return (
    <div className="min-h-screen bg-[#050810] text-[#eef2fb]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PillarNav lang="id" />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <Breadcrumb items={[{ label: "Beranda", href: "/" }, { label: "Blog", href: "/blog" }, { label: author.name }]} />

        <div className="mt-6 flex items-center gap-4">
          <div className="h-16 w-16 shrink-0 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-2xl font-bold text-[#050810]">
            {author.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-black">{author.name}</h1>
            <div className="text-sm text-cyan-400 mt-0.5">{author.role}</div>
          </div>
        </div>
        <p className="mt-5 text-neutral-400 leading-relaxed max-w-xl">{author.bio}</p>

        <h2 className="mt-12 text-sm font-semibold text-neutral-500 uppercase tracking-wide">Artikel dari {author.name}</h2>
        <ul className="mt-4 divide-y divide-white/5">
          {ARTICLES.map((a, i) => (
            <li key={i} className="py-4">
              <Link href={a.href} className="text-white hover:text-cyan-400 transition-colors font-medium">
                {a.title}
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <PillarFooter lang="id" />
    </div>
  );
}
