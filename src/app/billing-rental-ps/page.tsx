import type { Metadata } from "next";
import { SITE_URL } from "@/app/layout";
import { PillarPage, pillarFaqJsonLd } from "@/components/pillar/PillarPage";

// SEO pillar page #1 of 4 (docs/SEO-ARCHITECTURE.md §2-3) — primary keyword "billing rental PS".
// Content angle: transaction/billing accuracy. All facts (features, pain points, price, quote)
// are pulled from what's already live in landing-i18n.tsx / page.tsx — nothing fabricated.
export const metadata: Metadata = {
  title: "Billing Rental PS Presisi Detik — NEXBILL",
  description:
    "Sistem billing rental PS yang menghitung tagihan otomatis sampai ke detik — tarif per jam, paket hemat, dan harga member tanpa hitung manual. Coba gratis 30 hari.",
  alternates: {
    canonical: `${SITE_URL}/billing-rental-ps`,
    languages: {
      "id-ID": `${SITE_URL}/billing-rental-ps`,
      "en-US": `${SITE_URL}/en/playstation-rental-billing-software`,
    },
  },
};

const FAQ = [
  {
    q: "Bagaimana NEXBILL menghitung tagihan sewa PS?",
    a: "Begitu kasir tap start, sistem menghitung durasi sewa otomatis sampai ke detik dan langsung mengonversinya ke tagihan sesuai tarif yang berlaku — tarif per jam, paket hemat, maupun harga member — tanpa stopwatch atau kalkulator manual.",
  },
  {
    q: "Apakah billing bisa beda untuk tarif reguler, paket hemat, dan harga member?",
    a: "Bisa. Ketiga jenis tarif itu disetel di awal per unit atau per paket, dan sistem otomatis memilih perhitungan yang sesuai saat sesi berjalan — jadi tidak ada lagi tarif yang tertukar karena dihitung manual.",
  },
  {
    q: "Bagaimana kalau ada selisih kas saat tutup shift?",
    a: "Saat tutup shift, kasir menghitung uang fisik per pecahan dan sistem otomatis mencocokkannya dengan total transaksi yang tercatat sepanjang shift — kalau ada selisih, langsung terlihat di laporan, bukan ditemukan berhari-hari kemudian.",
  },
  {
    q: "Metode pembayaran apa saja yang bisa diterima?",
    a: "Tunai, QRIS, e-wallet, hingga kartu debit/kredit — semua masuk dalam satu tagihan yang sama untuk transaksi sewa, makanan/minuman, maupun aksesoris, tanpa perlu memisah nota manual.",
  },
];

export default function BillingRentalPsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pillarFaqJsonLd(FAQ)) }} />
      <PillarPage
        lang="id"
        breadcrumbHome="Beranda"
        breadcrumbCurrent="Billing Rental PS"
        kicker="Billing Rental PS"
        h1="Billing Rental PS yang Presisi Sampai ke Detik"
        lede="NEXBILL menghitung tagihan sewa PlayStation otomatis dari detik pertama sampai sesi berakhir — tarif per jam, paket hemat, dan harga member tidak lagi dihitung manual, jadi kas rental PS Anda tidak lagi bocor diam-diam tiap shift."
        ctaLabel="Coba Gratis 30 Hari"
        ctaSecondaryLabel="Lihat Harga"
        painSection={{
          kicker: "Kenapa Billing Manual Bikin Rugi",
          title: "Kebocoran kas paling sering terjadi di sini",
          sub: "Bukan karena dicuri — tapi karena dihitung manual, berulang, tiap hari.",
        }}
        painPoints={[
          { word: "KAS BOCOR", title: "Kebocoran kas yang gak kelihatan", desc: "Selisih hitung durasi antar shift — dikali puluhan transaksi sehari, bisa jadi kebocoran jutaan rupiah sebulan tanpa disadari siapa pun." },
          { word: "TARIF SALAH", title: "Salah Hitung Tarif Sewa", desc: "Tarif per jam, paket hemat, dan harga member gampang ketuker kalau dihitung manual — pelanggan komplain atau outlet rugi karena kurang tagih." },
          { word: "DEPOSIT BOCOR", title: "Deposit Pelanggan Tidak Terkontrol", desc: "Deposit dicatat di kertas atau diingat-ingat kasir — gampang lupa dikembalikan, atau malah kepakai buat nutup kas yang bolong." },
          { word: "PROFIT SAMAR", title: "Pemilik Tidak Tahu Untung Sebenarnya", desc: "Omzet ramai bukan berarti untung — tanpa laporan biaya vs pemasukan yang rapi, pemilik baru sadar rugi pas sudah telat." },
        ]}
        featureSection={{
          kicker: "Sistem Billing",
          title: "Empat fitur yang langsung menutup celah billing",
          sub: "Dari timer presisi detik sampai laporan shift yang otomatis cocok.",
        }}
        features={[
          { title: "Timer Sewa Presisi Detik", desc: "Tap start, sistem hitung durasi & tagihan otomatis sampai ke detik — akurat untuk tarif per jam, paket hemat, maupun harga member, tanpa stopwatch atau kalkulator manual." },
          { title: "Kasir & POS Multi Pembayaran", desc: "Transaksi sewa, makanan/minuman, dan aksesoris jadi satu tagihan. Terima tunai, QRIS, e-wallet, hingga kartu — tanpa hitung manual pisah-pisah nota." },
          { title: "Manajemen Shift & Laporan Keuangan", desc: "Tutup shift dengan hitung uang per pecahan yang otomatis dicocokkan sistem. Laba rugi dan arus kas tersusun rapi tanpa rekap manual di Excel." },
          { title: "Member & CRM Pelanggan", desc: "Sistem keanggotaan dengan saldo/poin, riwayat kunjungan, dan skor kepercayaan pelanggan (bank data fraud) — kenali pelanggan bermasalah sebelum outlet Anda dirugikan." },
        ]}
        quote="Sejak pakai NEXBILL, tutup shift cuma 5 menit — dulu bisa satu jam."
        quoteAuthor="— Outlet Gaming Corner, Jakarta"
        pricing={{
          title: "Satu harga, semua fitur billing",
          sub: "Tanpa biaya tersembunyi — satu-satunya biaya di luar langganan adalah pembelian unit Smart Plug (opsional) untuk kontrol otomatis TV/konsol.",
          priceOld: "Rp399.000",
          priceNow: "Rp249.000",
          period: "/bulan",
          feats: [
            "Semua fitur — kasir, booking, laporan keuangan & Akuntansi",
            "Kontrol TV otomatis (android system & smart plug)",
            "Termasuk hingga Unlimited konsol, User, & Outlet",
            "Update fitur baru gratis selamanya",
          ],
          cta: "Mulai Berlangganan",
        }}
        faqTitle="Pertanyaan seputar billing rental PS"
        faq={FAQ}
        relatedTitle="Jelajahi NEXBILL dari sudut lain"
        related={[
          { label: "Lihat NEXBILL sebagai aplikasi rental PS →", href: "/aplikasi-rental-ps" },
          { label: "Software rental PS lengkap dengan kontrol unit →", href: "/software-rental-ps" },
          { label: "Sistem rental PS end-to-end untuk multi-cabang →", href: "/sistem-rental-ps" },
        ]}
      />
    </>
  );
}
