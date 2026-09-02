import type { Metadata } from "next";
import { SITE_URL } from "@/app/layout";
import { PillarPage, pillarFaqJsonLd } from "@/components/pillar/PillarPage";

// SEO pillar page #2 of 4 — primary keyword "aplikasi rental PS". Content angle: simplicity /
// one app for everything, aimed at owners who think "aplikasi" first, not "sistem" or "billing".
export const metadata: Metadata = {
  title: "Aplikasi Rental PS All-in-One — NEXBILL",
  description:
    "Aplikasi rental PS untuk kelola kasir, unit PS4/PS5, booking online, dan multi-cabang dari HP. Satu aplikasi, tanpa Excel atau catatan kertas. Coba gratis 30 hari.",
  alternates: {
    canonical: `${SITE_URL}/aplikasi-rental-ps`,
    languages: {
      "id-ID": `${SITE_URL}/aplikasi-rental-ps`,
      "en-US": `${SITE_URL}/en/playstation-rental-app`,
    },
  },
};

const FAQ = [
  {
    q: "Aplikasi ini perlu diinstall atau bisa langsung dipakai dari browser?",
    a: "Bisa diakses langsung dari HP, tablet, atau komputer kasir tanpa instalasi rumit — kasir tinggal login dengan akun stafnya masing-masing.",
  },
  {
    q: "Apakah aplikasi ini sulit dipelajari staf baru?",
    a: "Proses setup awal biasanya hanya 30–60 menit lewat remote, dan alur hariannya sederhana: kasir tap start/stop di tiap unit, sisanya dihitung dan dicatat otomatis oleh sistem.",
  },
  {
    q: "Bisa terima booking online tanpa aplikasi terpisah?",
    a: "Bisa. Pelanggan cek slot kosong dan booking sendiri lewat halaman outlet Anda, lengkap dengan konfirmasi dan pengingat WhatsApp otomatis — semua dari aplikasi yang sama dengan kasir.",
  },
  {
    q: "Bisa pantau beberapa cabang dari satu aplikasi?",
    a: "Bisa. Pemilik memantau omzet, staf, dan performa tiap outlet secara terpisah maupun gabungan, real-time langsung dari HP, tanpa perlu buka aplikasi berbeda per cabang.",
  },
];

export default function AplikasiRentalPsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pillarFaqJsonLd(FAQ)) }} />
      <PillarPage
        lang="id"
        breadcrumbHome="Beranda"
        breadcrumbCurrent="Aplikasi Rental PS"
        kicker="Aplikasi Rental PS"
        h1="Aplikasi Rental PS untuk Kelola Semua dari HP"
        lede="Satu aplikasi menggantikan catatan kertas, grup WhatsApp, dan Excel terpisah — kasir tap start/stop di HP atau tablet, TV dan konsol menyala otomatis, pelanggan booking sendiri online, dan pemilik pantau semua cabang real-time dari genggaman."
        ctaLabel="Coba Gratis 30 Hari"
        ctaSecondaryLabel="Lihat Harga"
        painSection={{
          kicker: "Masalah yang Diselesaikan Satu Aplikasi",
          title: "Operasional yang berantakan karena tercecer di banyak tempat",
          sub: "Catatan unit di kertas, jadwal di grup WhatsApp, stok aksesoris cuma di ingatan kasir — satu aplikasi menyatukan semuanya.",
        }}
        painPoints={[
          { word: "UNIT KACAU", title: "Manajemen Unit PS/TV Berantakan", desc: "Tiap unit (PS4, PS5) punya kondisi berbeda. Tanpa pencatatan per unit, pelanggan gampang komplain karena salah dikasih unit." },
          { word: "TV MANUAL", title: "Matiin/Nyalain TV Masih Manual", desc: "Kasir harus jalan ke setiap unit untuk nyalain/matiin TV dan PS secara manual setiap sesi — buang waktu dan rawan lewat batas waktu." },
          { word: "BARANG RUSAK", title: "Stik & Aksesori Hilang atau Rusak", desc: "Stik, memory card, sampai kabel gampang raib atau rusak tanpa ketahuan siapa penyewa terakhir — outlet nombok beli baru tanpa ada yang bisa dimintai tanggung jawab." },
          { word: "UNIT NGANGGUR", title: "Unit Nganggur Tanpa Disadari", desc: "Konsol yang jarang disewa tetap kena biaya listrik & perawatan tanpa menghasilkan — tanpa data pemakaian per unit, sulit tahu mana yang perlu dipromosikan atau dijual." },
        ]}
        featureSection={{
          kicker: "Semua di Satu Aplikasi",
          title: "Empat hal yang biasanya butuh banyak aplikasi terpisah",
          sub: "Sekarang cukup satu — bisa diakses dari HP, tablet, atau komputer kasir.",
        }}
        features={[
          { title: "Manajemen Unit PS4, PS5 & PS6", desc: "Setiap unit dicatat terpisah lengkap dengan kondisi, tipe TV, dan riwayat pemakaian. Pelanggan booking online tahu persis unit generasi mana yang kosong dan spesifikasinya." },
          { title: "Kontrol TV & Konsol Otomatis", desc: "TV dan konsol otomatis menyala saat sesi dimulai dan mati saat waktu habis — terintegrasi dengan smart plug, tanpa kasir harus jalan ke tiap unit." },
          { title: "Booking Online 24 Jam", desc: "Pelanggan cek slot kosong dan booking sendiri lewat halaman outlet Anda kapan saja, lengkap dengan konfirmasi & pengingat WhatsApp otomatis." },
          { title: "Hak Akses Staf & Jejak Audit", desc: "Setiap staf login dengan akun dan hak aksesnya sendiri — semua transaksi tercatat by user, jadi jelas siapa yang bertanggung jawab kalau ada selisih." },
        ]}
        quote="Sejak pakai NEXBILL, tutup shift cuma 5 menit — dulu bisa satu jam."
        quoteAuthor="— Outlet Gaming Corner, Jakarta"
        pricing={{
          title: "Satu harga, satu aplikasi, semua fitur",
          sub: "Tanpa biaya tersembunyi — satu-satunya biaya di luar langganan adalah pembelian unit Smart Plug (opsional) untuk kontrol otomatis TV/konsol.",
          priceOld: "Rp399.000",
          priceNow: "Rp249.000",
          period: "/bulan",
          feats: [
            "Termasuk hingga Unlimited konsol, User, & Outlet",
            "Semua fitur — kasir, booking, laporan keuangan & Akuntansi",
            "Setup awal via remote — gratis, tanpa biaya jasa",
            "Support prioritas via WhatsApp",
          ],
          cta: "Mulai Berlangganan",
        }}
        faqTitle="Pertanyaan seputar aplikasi rental PS"
        faq={FAQ}
        relatedTitle="Jelajahi NEXBILL dari sudut lain"
        related={[
          { label: "Pelajari sisi billing & tagihan otomatisnya →", href: "/billing-rental-ps" },
          { label: "Lihat software rental PS versi lengkap →", href: "/software-rental-ps" },
          { label: "Cara sistem ini menyatukan operasional multi-cabang →", href: "/sistem-rental-ps" },
        ]}
      />
    </>
  );
}
