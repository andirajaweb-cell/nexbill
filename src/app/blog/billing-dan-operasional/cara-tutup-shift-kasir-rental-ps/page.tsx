import type { Metadata } from "next";
import { SITE_URL } from "@/app/layout";
import { BlogArticle, blogArticleJsonLd } from "@/components/blog/BlogArticle";

const TITLE = "Cara Tutup Shift Kasir Rental PS yang Rapi dan Anti Selisih";
const DEK = "Checklist tutup shift langkah demi langkah, supaya kas fisik dan catatan transaksi selalu cocok — dan kalau tidak cocok, cepat ketahuan di shift mana.";
const PUBLISHED = "2026-08-21";
const URL = `${SITE_URL}/blog/billing-dan-operasional/cara-tutup-shift-kasir-rental-ps`;

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
        readingTime="6 menit baca"
        relatedPillars={[
          { label: "Aplikasi rental PS untuk operasional harian →", href: "/aplikasi-rental-ps" },
          { label: "Billing rental PS presisi detik →", href: "/billing-rental-ps" },
        ]}
        relatedArticles={[
          { label: "5 Kesalahan Kasir Rental PS yang Bikin Kas Bocor", href: "/blog/billing-dan-operasional/kesalahan-kasir-rental-ps" },
          { label: "Kapan Waktunya Rental PS Anda Butuh Sistem Multi-Cabang?", href: "/blog/billing-dan-operasional/kapan-butuh-sistem-multi-cabang" },
        ]}
      >
        <p>
          Tutup shift yang rapi bukan soal menghitung uang di laci lebih teliti — itu soal punya urutan langkah yang sama persis setiap kali, supaya kalau ada selisih, Anda tahu di langkah mana kemungkinan besar sumbernya, bukan menebak-nebak dari nol.
        </p>

        <h2>Langkah 1: Tutup Semua Sesi Aktif Lebih Dulu</h2>
        <p>
          Sebelum menghitung kas, pastikan tidak ada sesi sewa yang masih berjalan di sistem tapi sebenarnya unit sudah kosong. Sesi yang "menggantung" seperti ini akan membuat laporan pendapatan shift tidak lengkap — transaksinya baru tercatat di shift berikutnya, padahal terjadi di shift ini.
        </p>

        <h2>Langkah 2: Cetak atau Buka Rekap Transaksi Shift</h2>
        <p>
          Ambil rekap total transaksi selama shift berjalan: total pendapatan sewa, jumlah transaksi, dan rincian metode pembayaran (tunai, QRIS, transfer). Rekap ini jadi angka pembanding — bukan hasil hitungan manual, tapi apa yang seharusnya ada berdasarkan sistem.
        </p>

        <h2>Langkah 3: Hitung Kas Fisik di Laci</h2>
        <p>
          Hitung uang tunai fisik, pisahkan dari modal awal shift (kas awal yang memang sudah ada sebelum shift dimulai). Sisanya seharusnya sama dengan total transaksi tunai di rekap sistem pada Langkah 2.
        </p>

        <h2>Langkah 4: Cocokkan Tunai dengan Non-Tunai Secara Terpisah</h2>
        <p>
          Jangan gabungkan pengecekan tunai dan non-tunai jadi satu angka besar. Cocokkan masing-masing metode pembayaran secara terpisah — total QRIS di sistem vs mutasi masuk, total transfer vs rekening tujuan. Kalau digabung jadi satu angka, selisih di satu metode bisa "tertutupi" kelebihan di metode lain tanpa disadari.
        </p>

        <h2>Langkah 5: Catat Selisih Apa Adanya, Jangan Disesuaikan</h2>
        <p>
          Kalau ada selisih — sekecil apa pun — catat angkanya apa adanya di form serah terima shift, jangan ditutup-tutupi dengan menambah atau mengurangi manual supaya "pas". Selisih yang dicatat jujur bisa dilacak polanya dari waktu ke waktu; selisih yang disembunyikan akan terus berulang tanpa pernah diketahui akar masalahnya.
        </p>

        <h2>Langkah 6: Serah Terima ke Shift Berikutnya dengan Tanda Tangan</h2>
        <p>
          Tutup dengan serah terima kas awal ke kasir shift berikutnya, dicatat dan ditandatangani kedua pihak (fisik atau digital). Titik serah terima yang jelas ini yang membuat setiap selisih di masa depan bisa langsung dipersempit ke shift tertentu, bukan tersebar tidak jelas ke seluruh hari.
        </p>

        <h2>Kenapa Checklist Ini Perlu Ditegakkan Konsisten, Bukan Sekali Dibuat</h2>
        <p>
          Checklist tutup shift yang bagus di atas kertas tidak banyak membantu kalau prakteknya berbeda tiap orang. Sistem kasir yang mewajibkan setiap langkah ini — menutup sesi aktif, memisahkan rekap per metode pembayaran, mencatat serah terima — sebelum shift bisa ditutup, membuat prosesnya konsisten tanpa tergantung disiplin masing-masing staf.
        </p>
      </BlogArticle>
    </>
  );
}
