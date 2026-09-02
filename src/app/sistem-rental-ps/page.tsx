import type { Metadata } from "next";
import { SITE_URL } from "@/app/layout";
import { PillarPage, pillarFaqJsonLd } from "@/components/pillar/PillarPage";

// SEO pillar page #4 of 4 — primary keyword "sistem rental PS". Content angle: operational
// control / accountability — staff access rights, audit trail, multi-branch oversight.
export const metadata: Metadata = {
  title: "Sistem Rental PS Multi-Cabang — NEXBILL",
  description:
    "Sistem rental PS dengan hak akses staf, jejak audit, dan laporan keuangan per cabang — kendali penuh untuk pemilik outlet PlayStation single maupun multi-cabang.",
  alternates: {
    canonical: `${SITE_URL}/sistem-rental-ps`,
    languages: {
      "id-ID": `${SITE_URL}/sistem-rental-ps`,
      "en-US": `${SITE_URL}/en/ps-rental-system`,
    },
  },
};

const FAQ = [
  {
    q: "Bagaimana sistem ini mencegah staf menyalahgunakan akses?",
    a: "Setiap staf login dengan akun dan hak aksesnya sendiri, dan setiap transaksi tercatat by user — kalau ada selisih atau kejanggalan, jelas siapa yang bertanggung jawab, tanpa perlu menuduh berdasarkan asumsi.",
  },
  {
    q: "Bagaimana sistem melacak aksesoris seperti stik atau memory card?",
    a: "Setiap unit dan aksesorisnya tercatat dalam sistem, terhubung ke transaksi penyewaan terakhir — kalau ada yang hilang atau rusak, riwayat penyewa terakhir langsung terlihat.",
  },
  {
    q: "Apakah pemilik bisa tahu untung sebenarnya, bukan cuma omzet?",
    a: "Bisa. Laporan laba rugi dan arus kas tersusun otomatis dari biaya dan pemasukan riil, jadi pemilik tahu untung sebenarnya, bukan cuma ramai transaksi tapi ternyata minus.",
  },
  {
    q: "Bisa dipakai untuk mengelola deposit pelanggan?",
    a: "Bisa — deposit tercatat dalam sistem, bukan di kertas atau ingatan kasir, sehingga jelas kapan harus dikembalikan dan tidak bisa dipakai diam-diam menutup kas yang bolong.",
  },
];

export default function SistemRentalPsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pillarFaqJsonLd(FAQ)) }} />
      <PillarPage
        lang="id"
        breadcrumbHome="Beranda"
        breadcrumbCurrent="Sistem Rental PS"
        kicker="Sistem Rental PS"
        h1="Sistem Rental PS yang Bisa Diaudit dan Bertanggung Jawab"
        lede="NEXBILL memberi pemilik kendali penuh atas operasional rental PS — setiap staf punya akun dan hak akses sendiri, setiap transaksi tercatat by user, dan setiap cabang bisa dipantau terpisah maupun gabungan, sehingga jelas siapa bertanggung jawab kalau ada selisih."
        ctaLabel="Coba Gratis 30 Hari"
        ctaSecondaryLabel="Lihat Harga"
        painSection={{
          kicker: "Kenapa Butuh Sistem, Bukan Cuma Alat",
          title: "Tanpa sistem, tanggung jawab jadi kabur",
          sub: "Kalau semua staf pakai akses yang sama dan pencatatan cuma di buku, sulit tahu di mana sebenarnya masalah muncul.",
        }}
        painPoints={[
          { word: "BARANG RUSAK", title: "Stik & Aksesori Hilang atau Rusak", desc: "Stik, memory card, sampai kabel gampang raib atau rusak tanpa ketahuan siapa penyewa terakhir — outlet nombok beli baru tanpa ada yang bisa dimintai tanggung jawab." },
          { word: "TARIF SALAH", title: "Salah Hitung Tarif Sewa", desc: "Tarif per jam, paket hemat, dan harga member gampang ketuker kalau dihitung manual — pelanggan komplain atau outlet rugi karena kurang tagih." },
          { word: "PROFIT SAMAR", title: "Pemilik Tidak Tahu Untung Sebenarnya", desc: "Omzet ramai bukan berarti untung — tanpa laporan biaya vs pemasukan yang rapi, pemilik baru sadar rugi pas sudah telat." },
          { word: "DEPOSIT BOCOR", title: "Deposit Pelanggan Tidak Terkontrol", desc: "Deposit dicatat di kertas atau diingat-ingat kasir — gampang lupa dikembalikan, atau malah kepakai buat nutup kas yang bolong." },
        ]}
        featureSection={{
          kicker: "Kendali Penuh Pemilik",
          title: "Empat lapis kontrol yang bikin sistem ini bisa dipercaya",
          sub: "Dari hak akses staf sampai laporan keuangan multi-cabang, semua bisa diaudit.",
        }}
        features={[
          { title: "Hak Akses Staf & Jejak Audit", desc: "Setiap staf login dengan akun dan hak aksesnya sendiri — semua transaksi tercatat by user, jadi jelas siapa yang bertanggung jawab kalau ada selisih." },
          { title: "Multi-Outlet & Multi-Cabang", desc: "Kelola banyak cabang dari satu akun owner. Pantau omzet, staf, dan performa tiap outlet secara terpisah maupun gabungan, real-time langsung dari HP." },
          { title: "Manajemen Shift & Laporan Keuangan", desc: "Tutup shift dengan hitung uang per pecahan yang otomatis dicocokkan sistem. Laba rugi dan arus kas tersusun rapi tanpa rekap manual di Excel." },
          { title: "Member & CRM Pelanggan", desc: "Sistem keanggotaan dengan saldo/poin, riwayat kunjungan, dan skor kepercayaan pelanggan (bank data fraud) — kenali pelanggan bermasalah sebelum outlet Anda dirugikan." },
        ]}
        quote="Sejak pakai NEXBILL, tutup shift cuma 5 menit — dulu bisa satu jam."
        quoteAuthor="— Outlet Gaming Corner, Jakarta"
        pricing={{
          title: "Satu harga, kendali penuh multi-cabang",
          sub: "Tanpa biaya tersembunyi — satu-satunya biaya di luar langganan adalah pembelian unit Smart Plug (opsional) untuk kontrol otomatis TV/konsol.",
          priceOld: "Rp399.000",
          priceNow: "Rp249.000",
          period: "/bulan",
          feats: [
            "Fitur Bank Data penilaian customer (fraud)",
            "Termasuk hingga Unlimited konsol, User, & Outlet",
            "Support prioritas via WhatsApp",
            "Semua fitur — kasir, booking, laporan keuangan & Akuntansi",
          ],
          cta: "Mulai Berlangganan",
        }}
        faqTitle="Pertanyaan seputar sistem rental PS"
        faq={FAQ}
        relatedTitle="Jelajahi NEXBILL dari sudut lain"
        related={[
          { label: "Detail perhitungan billing per detiknya →", href: "/billing-rental-ps" },
          { label: "Versi ringkas sebagai aplikasi harian →", href: "/aplikasi-rental-ps" },
          { label: "Cakupan penuh sembilan modul software →", href: "/software-rental-ps" },
        ]}
      />
    </>
  );
}
