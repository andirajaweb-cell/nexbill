import type { Metadata } from "next";
import { SITE_URL } from "@/app/layout";
import { PillarPage, pillarFaqJsonLd } from "@/components/pillar/PillarPage";

// SEO pillar page #3 of 4 — primary keyword "software rental PS". Content angle: comprehensive,
// integrated software stack (9 modules) — for owners evaluating this as a "system" purchase, not
// just a POS.
export const metadata: Metadata = {
  title: "Software Rental PS All-in-One — NEXBILL",
  description:
    "Software rental PS dengan 9 modul terintegrasi: kontrol TV/konsol otomatis, booking online, member, sampai laporan laba rugi. Bukan sekadar software kasir.",
  alternates: {
    canonical: `${SITE_URL}/software-rental-ps`,
    languages: {
      "id-ID": `${SITE_URL}/software-rental-ps`,
      "en-US": `${SITE_URL}/en/playstation-rental-management-software`,
    },
  },
};

const FAQ = [
  {
    q: "Apa yang membedakan NEXBILL dari aplikasi kasir biasa?",
    a: "Kasir cuma satu dari sembilan modul — NEXBILL juga mengurus kontrol TV/konsol otomatis, booking online, manajemen member, hak akses staf, sampai laporan keuangan, semuanya saling terhubung dalam satu software.",
  },
  {
    q: "Apakah software ini bisa mengontrol TV dan konsol secara otomatis?",
    a: "Bisa, dengan tambahan smart plug (opsional) — TV dan konsol menyala otomatis saat sesi dimulai dan mati saat waktu habis, tanpa kasir harus jalan ke tiap unit.",
  },
  {
    q: "Software ini kompatibel dengan TV jenis apa saja?",
    a: "Kompatibel dengan TV analog, Smart OS, maupun Android OS. Kontrol otomatis nyala/mati butuh smart plug tambahan untuk TV non-Android; untuk TV Android OS sudah bisa dikontrol langsung lewat software tanpa perangkat tambahan.",
  },
  {
    q: "Apakah software ini bisa berkembang seiring outlet bertambah cabang?",
    a: "Bisa — dari satu outlet satu unit sampai multi-cabang puluhan konsol, softwarenya sama, cuma skalanya yang berubah, dikelola dari satu akun owner.",
  },
];

export default function SoftwareRentalPsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pillarFaqJsonLd(FAQ)) }} />
      <PillarPage
        lang="id"
        breadcrumbHome="Beranda"
        breadcrumbCurrent="Software Rental PS"
        kicker="Software Rental PS"
        h1="Software Rental PS All-in-One — Bukan Sekadar Kasir"
        lede="NEXBILL bukan aplikasi kasir tempelan — sembilan modul terintegrasi menutup seluruh alur bisnis rental PlayStation, dari kontrol TV/konsol otomatis, booking online, sampai laporan laba rugi, dalam satu software yang tumbuh bareng outlet Anda."
        ctaLabel="Coba Gratis 30 Hari"
        ctaSecondaryLabel="Lihat Harga"
        painSection={{
          kicker: "Kenapa Software Terpisah-pisah Gagal",
          title: "Rental PS butuh lebih dari sekadar software kasir",
          sub: "Kalau kontrol unit, booking, dan laporan keuangan masing-masing pakai aplikasi berbeda, datanya tidak pernah nyambung.",
        }}
        painPoints={[
          { word: "TV MANUAL", title: "Matiin/Nyalain TV Masih Manual", desc: "Kasir harus jalan ke setiap unit untuk nyalain/matiin TV dan PS secara manual setiap sesi — buang waktu dan rawan lewat batas waktu." },
          { word: "UNIT NGANGGUR", title: "Unit Nganggur Tanpa Disadari", desc: "Konsol yang jarang disewa tetap kena biaya listrik & perawatan tanpa menghasilkan — tanpa data pemakaian per unit, sulit tahu mana yang perlu dipromosikan atau dijual." },
          { word: "KAS BOCOR", title: "Kebocoran kas yang gak kelihatan", desc: "Selisih hitung durasi antar shift — dikali puluhan transaksi sehari, bisa jadi kebocoran jutaan rupiah sebulan tanpa disadari siapa pun." },
          { word: "UNIT KACAU", title: "Manajemen Unit PS/TV Berantakan", desc: "Tiap unit (PS4, PS5) punya kondisi berbeda. Tanpa pencatatan per unit, pelanggan gampang komplain karena salah dikasih unit." },
        ]}
        featureSection={{
          kicker: "Satu Software, Sembilan Modul",
          title: "Cakupan software yang menutup seluruh operasional",
          sub: "Dari lantai kasir sampai laporan keuangan owner — tanpa software tambahan.",
        }}
        features={[
          { title: "Kontrol TV & Konsol Otomatis", desc: "TV dan konsol otomatis menyala saat sesi dimulai dan mati saat waktu habis — terintegrasi dengan smart plug, tanpa kasir harus jalan ke tiap unit." },
          { title: "Manajemen Unit PS4, PS5 & PS6", desc: "Setiap unit dicatat terpisah lengkap dengan kondisi, tipe TV, dan riwayat pemakaian. Pelanggan booking online tahu persis unit generasi mana yang kosong dan spesifikasinya." },
          { title: "Multi-Outlet & Multi-Cabang", desc: "Kelola banyak cabang dari satu akun owner. Pantau omzet, staf, dan performa tiap outlet secara terpisah maupun gabungan, real-time langsung dari HP." },
          { title: "Kasir & POS Multi Pembayaran", desc: "Transaksi sewa, makanan/minuman, dan aksesoris jadi satu tagihan. Terima tunai, QRIS, e-wallet, hingga kartu — tanpa hitung manual pisah-pisah nota." },
        ]}
        quote="Sejak pakai NEXBILL, tutup shift cuma 5 menit — dulu bisa satu jam."
        quoteAuthor="— Outlet Gaming Corner, Jakarta"
        pricing={{
          title: "Satu harga, satu software, sembilan modul",
          sub: "Tanpa biaya tersembunyi — satu-satunya biaya di luar langganan adalah pembelian unit Smart Plug (opsional) untuk kontrol otomatis TV/konsol.",
          priceOld: "Rp399.000",
          priceNow: "Rp249.000",
          period: "/bulan",
          feats: [
            "Kontrol TV otomatis (android system & smart plug)",
            "Fitur Bank Data penilaian customer (fraud)",
            "Semua fitur — kasir, booking, laporan keuangan & Akuntansi",
            "Update fitur baru gratis selamanya",
          ],
          cta: "Mulai Berlangganan",
        }}
        faqTitle="Pertanyaan seputar software rental PS"
        faq={FAQ}
        relatedTitle="Jelajahi NEXBILL dari sudut lain"
        related={[
          { label: "Sisi kasir & billing presisi detiknya →", href: "/billing-rental-ps" },
          { label: "Versi paling sederhana sebagai aplikasi →", href: "/aplikasi-rental-ps" },
          { label: "Bagaimana sistem ini bekerja untuk multi-cabang →", href: "/sistem-rental-ps" },
        ]}
      />
    </>
  );
}
