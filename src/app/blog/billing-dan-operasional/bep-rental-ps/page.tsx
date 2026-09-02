import type { Metadata } from "next";
import { SITE_URL } from "@/app/layout";
import { BlogArticle, blogArticleJsonLd } from "@/components/blog/BlogArticle";

const TITLE = "BEP (Break Even Point) Rental PS: Cara Hitung dan Simulasinya";
const DEK = "Sebelum tanya \"kapan balik modal\", jawab dulu pertanyaan yang lebih mendasar: berapa jam sewa per bulan yang dibutuhkan supaya outlet Anda tidak rugi?";
const PUBLISHED = "2026-08-10";
const URL = `${SITE_URL}/blog/billing-dan-operasional/bep-rental-ps`;

export const metadata: Metadata = {
  title: TITLE,
  description: DEK,
  alternates: { canonical: URL },
};

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogArticleJsonLd({ title: TITLE, dek: DEK, authorSlug: "andika-rajasa", publishedAt: PUBLISHED, url: URL })) }} />
      <BlogArticle
        clusterLabel="Billing & Operasional"
        clusterHref="/blog/billing-dan-operasional"
        title={TITLE}
        dek={DEK}
        authorSlug="andika-rajasa"
        publishedAt={PUBLISHED}
        readingTime="8 menit baca"
        relatedPillars={[
          { label: "Sistem rental PS untuk multi-cabang →", href: "/sistem-rental-ps" },
          { label: "Billing rental PS presisi detik →", href: "/billing-rental-ps" },
        ]}
        relatedArticles={[
          { label: "Cara Menghitung Tarif Sewa PS yang Tepat", href: "/blog/billing-dan-operasional/cara-hitung-tarif-sewa-ps" },
          { label: "5 Kesalahan Kasir Rental PS yang Bikin Kas Bocor", href: "/blog/billing-dan-operasional/kesalahan-kasir-rental-ps" },
        ]}
      >
        <p>
          BEP (Break Even Point) adalah titik di mana total pendapatan sama persis dengan total biaya — belum untung, tapi juga sudah tidak rugi. Bagi bisnis rental PS, mengetahui BEP penting di dua momen: sebelum buka outlet (untuk menilai apakah rencana bisnisnya masuk akal) dan setelah berjalan (untuk tahu berapa jam sewa minimum yang harus tercapai tiap bulan).
        </p>

        <h2>Rumus Dasar BEP, Diadaptasi untuk Rental PS</h2>
        <p>
          Rumus BEP klasik adalah <strong>Biaya Tetap ÷ (Tarif per Jam − Biaya Variabel per Jam)</strong>. Hasilnya adalah jumlah jam sewa yang harus terjual per bulan supaya impas.
        </p>
        <ul>
          <li><strong>Biaya tetap</strong> — pengeluaran yang jumlahnya sama tiap bulan tidak peduli ramai atau sepi: sewa tempat, gaji staf tetap, cicilan unit PS/TV, internet, langganan sistem.</li>
          <li><strong>Biaya variabel per jam</strong> — biaya yang muncul hanya saat unit benar-benar disewa: listrik tambahan per sesi, perkiraan biaya perawatan per jam pakai.</li>
        </ul>

        <h2>Contoh Simulasi Angka</h2>
        <p>
          <em>Angka berikut contoh ilustrasi untuk memperjelas cara hitungnya — bukan data outlet tertentu.</em>
        </p>
        <p>
          Misalnya biaya tetap bulanan sebuah outlet kecil (sewa tempat, gaji 1 kasir, cicilan unit) sekitar Rp6.000.000. Tarif sewa Rp6.000/jam, dan biaya variabel per jam (listrik + perawatan) sekitar Rp1.500/jam. Maka:
        </p>
        <p>
          BEP = Rp6.000.000 ÷ (Rp6.000 − Rp1.500) = Rp6.000.000 ÷ Rp4.500 ≈ <strong>1.334 jam sewa per bulan</strong>.
        </p>
        <p>
          Kalau outlet punya 5 unit dan buka 12 jam sehari (5 × 12 × 30 = 1.800 jam kapasitas maksimum per bulan), berarti utilisasi minimum yang dibutuhkan adalah sekitar 74% dari kapasitas total supaya impas. Angka ini yang jadi patokan realistis: apakah target itu masuk akal untuk lokasi dan target pasar Anda?
        </p>

        <h2>Kenapa BEP Sering Meleset dari Rencana Awal</h2>
        <p>
          Dalam praktiknya, BEP yang dihitung di atas kertas sering meleset karena tiga hal:
        </p>
        <ul>
          <li><strong>Utilisasi unit tidak merata</strong> — unit favorit (biasanya PS5 dengan TV bagus) selalu penuh, sementara unit lain menganggur, sehingga rata-rata utilisasi riil lebih rendah dari asumsi.</li>
          <li><strong>Kebocoran billing manual</strong> — kalau durasi sewa dihitung manual dan sering meleset (dibulatkan ke bawah demi kecepatan, misalnya), pendapatan riil bisa lebih rendah dari yang seharusnya tertagih.</li>
          <li><strong>Biaya tetap yang diremehkan</strong> — biaya perawatan dan penggantian aksesori yang hilang/rusak sering tidak dimasukkan di awal, padahal ini nyata dan berulang.</li>
        </ul>

        <h2>Cara Mempercepat BEP Tanpa Menaikkan Tarif</h2>
        <p>
          Ada dua jalur yang tidak melibatkan menaikkan harga: menaikkan utilisasi (booking online supaya slot kosong lebih mudah terisi, promosi jam sepi) dan menutup kebocoran pendapatan (billing presisi per detik, bukan estimasi kasir). Dari dua jalur ini, menutup kebocoran biasanya memberi dampak lebih cepat terlihat — karena itu bukan pendapatan baru yang harus dicari, tapi pendapatan yang sebenarnya sudah ada namun selama ini tidak tertagih penuh.
        </p>
      </BlogArticle>
    </>
  );
}
