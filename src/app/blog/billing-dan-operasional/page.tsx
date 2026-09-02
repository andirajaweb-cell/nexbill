import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/app/layout";
import { PillarNav, PillarFooter } from "@/components/pillar/PillarPage";
import { Breadcrumb } from "@/components/seo/Breadcrumb";

// Cluster hub page — the "pillar" of the topic cluster (docs/SEO-ARCHITECTURE.md §6): every
// article in this cluster links back up here, and this page links out to all of them.
export const metadata: Metadata = {
  title: "Billing & Operasional Rental PS — Blog NEXBILL",
  description: "Panduan cara hitung tarif sewa PS, BEP, tutup shift kasir, dan operasional harian rental PlayStation — kumpulan artikel billing & operasional NEXBILL.",
  alternates: { canonical: `${SITE_URL}/blog/billing-dan-operasional` },
};

const ARTICLES = [
  { title: "Cara Menghitung Tarif Sewa PS yang Tepat (Per Jam, Paket, dan Member)", dek: "Metode cost-plus dan break-even untuk menentukan tarif sewa PS yang tidak rugi tapi tetap kompetitif.", href: "/blog/billing-dan-operasional/cara-hitung-tarif-sewa-ps" },
  { title: "BEP (Break Even Point) Rental PS: Cara Hitung dan Simulasinya", dek: "Rumus BEP dijelaskan dengan contoh simulasi angka, supaya Anda tahu kapan modal outlet balik.", href: "/blog/billing-dan-operasional/bep-rental-ps" },
  { title: "5 Kesalahan Kasir Rental PS yang Bikin Kas Bocor", dek: "Kebocoran kas rental PS jarang karena dicuri — biasanya karena lima kesalahan operasional ini.", href: "/blog/billing-dan-operasional/kesalahan-kasir-rental-ps" },
  { title: "Cara Tutup Shift Kasir Rental PS yang Rapi dan Anti Selisih", dek: "Checklist tutup shift langkah demi langkah supaya kas fisik dan catatan transaksi selalu cocok.", href: "/blog/billing-dan-operasional/cara-tutup-shift-kasir-rental-ps" },
  { title: "Sewa PS4 vs PS5: Menentukan Harga yang Adil untuk Keduanya", dek: "Strategi harga diferensiasi antar generasi konsol supaya keduanya tetap laku disewa.", href: "/blog/billing-dan-operasional/harga-sewa-ps4-vs-ps5" },
  { title: "Kapan Waktunya Rental PS Anda Butuh Sistem Multi-Cabang?", dek: "Tanda-tanda outlet Anda sudah siap ekspansi, dan apa yang berubah secara operasional saat buka cabang kedua.", href: "/blog/billing-dan-operasional/kapan-butuh-sistem-multi-cabang" },
];

export default function BillingDanOperasionalClusterPage() {
  return (
    <div className="min-h-screen bg-[#050810] text-[#eef2fb]">
      <PillarNav lang="id" />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <Breadcrumb items={[{ label: "Beranda", href: "/" }, { label: "Blog", href: "/blog" }, { label: "Billing & Operasional" }]} />
        <h1 className="mt-5 text-3xl font-black">Billing & Operasional Rental PS</h1>
        <p className="mt-3 text-neutral-400 leading-relaxed max-w-xl">
          Enam panduan praktis seputar tarif, BEP, dan operasional kasir harian rental PlayStation — ditulis oleh pemilik outlet, bukan sekadar teori.
        </p>

        <div className="mt-10 divide-y divide-white/5">
          {ARTICLES.map((a, i) => (
            <Link key={i} href={a.href} className="block py-5 group">
              <div className="font-semibold text-white group-hover:text-cyan-400 transition-colors">{a.title}</div>
              <p className="mt-1.5 text-sm text-neutral-400">{a.dek}</p>
            </Link>
          ))}
        </div>
      </main>
      <PillarFooter lang="id" />
    </div>
  );
}
