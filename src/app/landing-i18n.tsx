"use client";

// Client-side language switcher for the NEXBILL marketing site (homepage + /about). Deliberately
// NOT tied to routing (no /en, /ms, /th, /vi, /fil sub-paths) — picking a language just swaps the
// text shown at the current URL via React context + localStorage, per explicit choice over the
// route-per-language alternative (simpler to ship, no SEO benefit, which is an accepted trade-off
// here). Prices are intentionally left as literal "Rp249.000" strings in every language — this
// toggle only translates copy, it does NOT do currency conversion (that's the separate
// lib/market-risk system used for actual outlet billing, out of scope here).
//
// Translation quality note: EN is straightforward. MS/TH/VI/FIL were translated to be accurate
// and natural, but were not reviewed by native speakers — worth a spot-check pass before treating
// this as final, especially for idiom-heavy lines (the intro headline, hero note, FAQ answers).
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "id" | "en" | "ms" | "th" | "vi" | "fil";

export const LANGUAGES: { code: Lang; label: string; short: string }[] = [
  { code: "id", label: "Bahasa Indonesia", short: "ID" },
  { code: "en", label: "English", short: "EN" },
  { code: "ms", label: "Bahasa Malaysia", short: "MY" },
  { code: "th", label: "ภาษาไทย", short: "TH" },
  { code: "vi", label: "Tiếng Việt", short: "VN" },
  { code: "fil", label: "Filipino", short: "PH" },
];

// Icons/emoji are language-agnostic — kept as flat arrays indexed by position instead of repeating
// them inside every language's copy of PAIN_POINTS/FEATURES.
// Extended from 3 -> 8 icons when 5 more pain points were added (rate errors, idle units, lost
// gear, deposit leaks, hidden profit) — order must stay in lockstep with each language's
// `solusi.points` array in LANDING_COPY below, since page.tsx indexes into this array positionally
// (PAIN_ICONS[i]), not by matching on the word/title text.
export const PAIN_ICONS = ["💸", "📺", "🕹️", "🧮", "💤", "🎮", "🔓", "🕵️"];
export const FEATURE_ICONS = ["⏱️", "🖥️", "🔌", "🧾", "📅", "💰", "👤", "🏬", "🔐"];

interface PainPoint { word: string; title: string; desc: string }
interface Feature { title: string; desc: string }
interface Faq { q: string; a: string }
interface Stat { num: string; label: string }

export interface LandingCopy {
  nav: { home: string; solusi: string; fitur: string; harga: string; faq: string; about: string; daftar: string; login: string; masuk: string; daftarAkun: string };
  hero: { eyebrow: string; lede: string; cta: string };
  intro: {
    headlinePre: string; headlineHighlight: string; sub: string;
    ctaPrimary: string; ctaGhost: string; note: string;
    trustSuffix: string; mediaBadge: string; stats: Stat[];
    floatingUnits: { label: string; value: string };
    floatingBooking: { label: string; value: string };
    floatingRevenue: { label: string; value: string };
  };
  showcase: {
    kicker: string; title: string; sub: string;
    dashboardLabel: string; unitLabel: string; unitHint: string;
    quote: string; quoteAuthor: string;
    bookingLabel: string; screenshotHint: string;
    statLabel: string; kasirLabel: string; videoHint: string; laporanLabel: string;
  };
  solusi: { kicker: string; title: string; sub: string; points: PainPoint[] };
  fitur: { kicker: string; title: string; sub: string; items: Feature[] };
  harga: {
    kicker: string; title: string; sub: string;
    badge: string; plan: string; period: string; save: string;
    feats: string[]; cta: string;
    payLabel: string; payBadges: string[];
    addonTag: string; addonTitle: string; addonPriceSuffix: string; addonDesc: string;
    compatNeedLabel: string; compatNeedText: string; compatSkipLabel: string; compatSkipText: string;
  };
  faq: { kicker: string; headline: string; sub: string; items: Faq[] };
  footer: { alamatLabel: string; teleponLabel: string; emailLabel: string; copyright: string; refundLabel: string; termsLabel: string };
  cookieBanner: { message: string; accept: string; decline: string; policyLinkLabel: string };
  about: {
    heroTitle: string; heroLede: string; stats: Stat[];
    values: { num: string; title: string; desc: string }[];
    ctaTitle: string; ctaButton: string;
  };
  // Internal links to the SEO pillar pages under the homepage's "Pelajari NEXBILL Lebih Dalam"
  // section (see page.tsx). href is per-language since EN routes to the /en/* pillar pages while
  // MS/TH/VI/FIL (no translated pillar pages yet) route to the ID originals — see the comment on
  // each language's pillarLinks entry below.
  pillarLinks: { heading: string; items: { label: string; href: string }[] };
}

export const LANDING_COPY: Record<Lang, LandingCopy> = {
  id: {
    nav: { home: "Beranda", solusi: "Solusi", fitur: "Fitur", harga: "Harga", faq: "FAQ", about: "Tentang", daftar: "Daftar", login: "Login", masuk: "Masuk", daftarAkun: "Daftar Akun" },
    hero: {
      eyebrow: "⚡ All-in-One Rental Billing System untuk PlayStation",
      lede: "Satu sistem untuk kelola sewa PS Anda dari ujung ke ujung — kasir, kontrol unit otomatis, booking online, sampai laporan keuangan real-time.",
      cta: "Mulai Gratis",
    },
    intro: {
      headlinePre: "Rental PS makin ramai. ",
      headlineHighlight: "Jangan biarkan uang & unit lepas kendali.",
      sub: "NEXBILL adalah pusat kontrol bisnis rental PlayStation Anda. Kelola billing, unit, booking online, member, deposit, hingga laporan laba secara otomatis dalam satu dashboard.",
      ctaPrimary: "Coba NEXBILL Gratis 30 Hari →",
      ctaGhost: "Lihat Cara Kerjanya",
      note: "Tanpa kartu kredit • Setup dibantu • Bisa berhenti kapan saja",
      trustSuffix: "— dipercaya 500+ outlet rental PS di Asia Tenggara",
      mediaBadge: "Dashboard Real-Time",
      floatingUnits: { label: "UNIT AKTIF", value: "12" },
      floatingBooking: { label: "BOOKING", value: "19:00" },
      floatingRevenue: { label: "OMZET HARI INI", value: "Rp2.450.000" },
      stats: [
        { num: "Support", label: "Kompatibel untuk TV Analog, TV Smart OS & TV Android OS" },
        { num: "Real-Time", label: "Pantau omzet & unit jalan dari HP" },
        { num: "0% Bocor", label: "Sistem hitung otomatis per detik" },
        { num: "24 Jam", label: "Sistem booking online mandiri" },
      ],
    },
    showcase: {
      kicker: "Lihat Langsung", title: "Semua fitur, satu tampilan",
      sub: "Geser untuk lihat cuplikan dashboard, video demo unit, dan cerita dari outlet yang sudah pakai NEXBILL.",
      dashboardLabel: "Dashboard Real-Time",
      unitLabel: "Kontrol Unit Otomatis", unitHint: "Drag untuk geser →",
      quote: "Sejak pakai NEXBILL, tutup shift cuma 5 menit — dulu bisa satu jam.", quoteAuthor: "— Outlet Gaming Corner, Jakarta",
      bookingLabel: "Booking Online 24 Jam", screenshotHint: "Ganti dengan screenshot",
      statLabel: "Outlet rental PS di Asia Tenggara",
      kasirLabel: "Video Demo Kasir", videoHint: "Ganti dengan video",
      laporanLabel: "Laporan Keuangan Otomatis",
    },
    solusi: {
      kicker: "Kenapa Butuh Sistem Ini", title: "Masalah yang sering dialami pemilik rental PS",
      sub: "Bukan karena sepi pelanggan — kebanyakan kebocoran rental PS terjadi diam-diam di pencatatan shift harian.",
      points: [
        { word: "KAS BOCOR", title: "Kebocoran kas yang gak kelihatan", desc: "Selisih hitung durasi antar shift — dikali puluhan transaksi sehari, bisa jadi kebocoran jutaan rupiah sebulan tanpa disadari siapa pun." },
        { word: "UNIT KACAU", title: "Manajemen Unit PS/TV Berantakan", desc: "Tiap unit (PS4, PS5) punya kondisi berbeda. Tanpa pencatatan per unit, pelanggan gampang komplain karena salah dikasih unit." },
        { word: "TV MANUAL", title: "Matiin/Nyalain TV Masih Manual", desc: "Kasir harus jalan ke setiap unit untuk nyalain/matiin TV dan PS secara manual setiap sesi — buang waktu dan rawan lewat batas waktu." },
        { word: "TARIF SALAH", title: "Salah Hitung Tarif Sewa", desc: "Tarif per jam, paket hemat, dan harga member gampang ketuker kalau dihitung manual — pelanggan komplain atau outlet rugi karena kurang tagih." },
        { word: "UNIT NGANGGUR", title: "Unit Nganggur Tanpa Disadari", desc: "Konsol yang jarang disewa tetap kena biaya listrik & perawatan tanpa menghasilkan — tanpa data pemakaian per unit, sulit tahu mana yang perlu dipromosikan atau dijual." },
        { word: "BARANG RUSAK", title: "Stik & Aksesori Hilang atau Rusak", desc: "Stik, memory card, sampai kabel gampang raib atau rusak tanpa ketahuan siapa penyewa terakhir — outlet nombok beli baru tanpa ada yang bisa dimintai tanggung jawab." },
        { word: "DEPOSIT BOCOR", title: "Deposit Pelanggan Tidak Terkontrol", desc: "Deposit dicatat di kertas atau diingat-ingat kasir — gampang lupa dikembalikan, atau malah kepakai buat nutup kas yang bolong." },
        { word: "PROFIT SAMAR", title: "Pemilik Tidak Tahu Untung Sebenarnya", desc: "Omzet ramai bukan berarti untung — tanpa laporan biaya vs pemasukan yang rapi, pemilik baru sadar rugi pas sudah telat." },
      ],
    },
    fitur: {
      kicker: "Fitur Lengkap", title: "Semua yang dibutuhkan rental PS, dalam satu sistem",
      sub: "Bukan cuma kasir. Sembilan modul ini menutupi seluruh alur operasional outlet — dari sesi pertama pelanggan duduk sampai laporan laba rugi akhir bulan.",
      items: [
        { title: "Timer Sewa Presisi Detik", desc: "Tap start, sistem hitung durasi & tagihan otomatis sampai ke detik — akurat untuk tarif per jam, paket hemat, maupun harga member, tanpa stopwatch atau kalkulator manual." },
        { title: "Manajemen Unit PS4, PS5 & PS6", desc: "Setiap unit dicatat terpisah lengkap dengan kondisi, tipe TV, dan riwayat pemakaian. Pelanggan booking online tahu persis unit generasi mana yang kosong dan spesifikasinya." },
        { title: "Kontrol TV & Konsol Otomatis", desc: "TV dan konsol otomatis menyala saat sesi dimulai dan mati saat waktu habis — terintegrasi dengan smart plug, tanpa kasir harus jalan ke tiap unit." },
        { title: "Kasir & POS Multi Pembayaran", desc: "Transaksi sewa, makanan/minuman, dan aksesoris jadi satu tagihan. Terima tunai, QRIS, e-wallet, hingga kartu — tanpa hitung manual pisah-pisah nota." },
        { title: "Booking Online 24 Jam", desc: "Pelanggan cek slot kosong dan booking sendiri lewat halaman outlet Anda kapan saja, lengkap dengan konfirmasi & pengingat WhatsApp otomatis." },
        { title: "Manajemen Shift & Laporan Keuangan", desc: "Tutup shift dengan hitung uang per pecahan yang otomatis dicocokkan sistem. Laba rugi dan arus kas tersusun rapi tanpa rekap manual di Excel." },
        { title: "Member & CRM Pelanggan", desc: "Sistem keanggotaan dengan saldo/poin, riwayat kunjungan, dan skor kepercayaan pelanggan (bank data fraud) — kenali pelanggan bermasalah sebelum outlet Anda dirugikan." },
        { title: "Multi-Outlet & Multi-Cabang", desc: "Kelola banyak cabang dari satu akun owner. Pantau omzet, staf, dan performa tiap outlet secara terpisah maupun gabungan, real-time langsung dari HP." },
        { title: "Hak Akses Staf & Jejak Audit", desc: "Setiap staf login dengan akun dan hak aksesnya sendiri — semua transaksi tercatat by user, jadi jelas siapa yang bertanggung jawab kalau ada selisih." },
      ],
    },
    harga: {
      kicker: "Harga", title: "Satu harga, semua fitur",
      sub: "Tanpa biaya tersembunyi — satu-satunya biaya di luar langganan adalah pembelian unit Smart Plug (terintegrasi Tuya) untuk kontrol otomatis TV/konsol. Coba gratis 30 hari sebelum berlangganan.",
      badge: "⚡ Paling Populer", plan: "Paket Lengkap / Outlet", period: "/bulan", save: "Hemat {amount} setiap bulan",
      feats: [
        "Termasuk hingga Unlimited konsol, User, & Outlet",
        "Semua fitur — kasir, booking, laporan keuangan & Akuntansi",
        "Fitur Bank Data penilaian customer (fraud)",
        "Kontrol TV otomatis (android system & smart plug)",
        "Setup awal via remote — gratis, tanpa biaya jasa",
        "Update fitur baru gratis selamanya",
        "Support prioritas via WhatsApp",
      ],
      cta: "Mulai Berlangganan",
      payLabel: "Dibayar aman lewat iPaymu — semua metode diterima",
      payBadges: ["QRIS", "Transfer Bank / VA", "E-Wallet", "Kartu Kredit & Debit", "Gerai Retail"],
      addonTag: "Opsional", addonTitle: "Smart Plug (Integrasi Tuya)", addonPriceSuffix: "/unit, sekali beli",
      addonDesc: "Satu-satunya biaya di luar langganan — untuk kontrol otomatis nyala/mati TV & konsol",
      compatNeedLabel: "Perlu Smart Plug:", compatNeedText: "TV analog/tabung, TV digital biasa, & smart TV non-Android (Viva OS, Hisense OS, webOS, dll)",
      compatSkipLabel: "Tidak perlu:", compatSkipText: "TV dengan sistem Android TV — sudah bisa dikontrol langsung lewat software NEXBILL",
    },
    faq: {
      kicker: "FAQ", headline: "Pertanyaan yang wajar ditanyakan sebelum pakai NEXBILL.",
      sub: "Bukan FAQ template. Ini pertanyaan yang paling sering muncul dari pemilik outlet rental PS saat mempertimbangkan sistem baru.",
      items: [
        { q: "Apa sebenarnya NEXBILL itu?", a: "NEXBILL adalah sistem billing rental all-in-one khusus outlet PlayStation — mencakup kasir & timer sewa presisi detik, kontrol otomatis TV/konsol, booking online, manajemen member, sampai laporan keuangan, semuanya dalam satu dashboard tanpa perlu menggabung-gabungkan aplikasi terpisah." },
        { q: "Kenapa harus pindah dari pencatatan manual/Excel ke NEXBILL?", a: "Karena kebocoran kas rental PS biasanya bukan dari kehilangan uang tunai, tapi dari selisih hitung durasi manual yang berulang tiap shift — dikali puluhan transaksi sehari, itu bisa jadi kebocoran jutaan rupiah sebulan tanpa disadari siapa pun. NEXBILL menghitung otomatis sampai ke detik dan mencatat setiap transaksi by user, sehingga celah itu praktis tertutup." },
        { q: "NEXBILL cocok untuk outlet seperti apa?", a: "Cocok untuk outlet satu cabang maupun yang sudah punya banyak cabang, baik yang masih menyewakan PS4 klasik, sudah upgrade ke PS5 dengan TV 4K, maupun bersiap menyambut era PS6. Juga cocok untuk warnet atau gaming center yang menjadikan sewa konsol sebagai salah satu layanannya." },
        { q: "Berapa lama proses setup dan kapan bisa langsung dipakai?", a: "Proses setup awal biasanya hanya 30–60 menit lewat remote (TeamViewer/AnyDesk/WhatsApp), termasuk input data unit dan harga sewa tiap konsol. Begitu selesai, sistem langsung bisa dipakai hari itu juga — tidak perlu masa pelatihan berhari-hari." },
        { q: "Apakah NEXBILL bisa dipakai di semua jenis TV dan perangkat?", a: "Bisa. NEXBILL kompatibel dengan TV analog, TV Smart OS, maupun TV Android OS. Kontrol otomatis nyala/mati memang perlu smart plug tambahan (opsional), tapi fitur kasir, booking, dan laporan tetap berjalan penuh tanpa perangkat tambahan apa pun — bisa diakses dari HP, tablet, atau komputer kasir." },
        { q: "Bagaimana cara mulai berlangganan dan bagaimana alur pemakaiannya sehari-hari?", a: "Daftar lewat halaman ini, coba gratis 30 hari, lalu tim kami bantu setup data outlet Anda dari jarak jauh. Sehari-hari, kasir cukup tap start/stop di tiap unit — sistem otomatis menghitung tagihan, mengontrol TV, dan mencatat semuanya ke laporan; tutup shift pun tinggal hitung uang fisik dan sistem yang mencocokkan." },
        { q: "Apakah butuh koneksi internet terus-menerus?", a: "Untuk transaksi kasir harian, disarankan koneksi internet yang stabil. Tim kami akan menginformasikan kebutuhan teknis persisnya sesuai paket dan jumlah unit yang Anda pilih." },
        { q: "Apakah ada kontrak jangka panjang atau biaya tersembunyi?", a: "Tidak ada kontrak jangka panjang dan tidak ada biaya tersembunyi. Satu harga sudah mencakup semua fitur utama, dan Anda bisa berhenti berlangganan kapan saja." },
      ],
    },
    footer: { alamatLabel: "Alamat:", teleponLabel: "Telepon:", emailLabel: "Email:", copyright: "© 2026 NEXBILL Billing System. Semua hak dilindungi.", refundLabel: "Kebijakan Refund", termsLabel: "Syarat & Ketentuan" },
    cookieBanner: {
      message: "Kami menggunakan cookie untuk meningkatkan pengalaman Anda di situs ini dan menganalisis traffic. Dengan melanjutkan, Anda menyetujui penggunaan cookie sesuai Kebijakan Cookie kami.",
      accept: "Terima",
      decline: "Tolak",
      policyLinkLabel: "Kebijakan Cookie",
    },
    about: {
      heroTitle: "Kami bangun tulang punggung bisnis rental PlayStation.",
      heroLede: "NEXBILL lahir dari pengalaman langsung mengelola outlet rental PS — bukan software generik yang dipaksakan ke industri ini, tapi sistem yang dirancang dari lantai kasir sampai laporan laba rugi, supaya pemilik outlet bisa fokus melayani pelanggan, bukan pusing hitung manual di buku kas.",
      stats: [
        { num: "500+", label: "Outlet rental PS di Asia Tenggara" },
        { num: "0% Bocor", label: "Sistem hitung otomatis per detik" },
        { num: "24 Jam", label: "Sistem booking online mandiri" },
        { num: "Support", label: "Prioritas via WhatsApp, kapan saja" },
      ],
      values: [
        { num: "01", title: "Dibangun dari lapangan", desc: "Bukan software generik yang ditempel-tempelkan — setiap fitur lahir dari alur kerja nyata kasir rental PS, dari buka shift sampai tutup kas." },
        { num: "02", title: "Transparan sampai ke detik", desc: "Timer sewa dihitung presisi per detik, laporan keuangan tersusun otomatis — tidak ada selisih yang bisa bersembunyi di baliknya." },
        { num: "03", title: "Tumbuh bareng outlet Anda", desc: "Dari satu outlet satu unit sampai multi-cabang puluhan konsol, sistemnya sama — cuma skalanya yang berubah." },
      ],
      ctaTitle: "Siap kelola rental PS Anda dengan lebih rapi?", ctaButton: "Mulai Gratis 30 Hari",
    },
    pillarLinks: {
      heading: "Pelajari NEXBILL Lebih Dalam",
      items: [
        { label: "Cara kerja billing rental PS presisi detik", href: "/billing-rental-ps" },
        { label: "Aplikasi rental PS untuk operasional harian", href: "/aplikasi-rental-ps" },
        { label: "Cakupan lengkap software rental PS", href: "/software-rental-ps" },
        { label: "Sistem rental PS untuk multi-cabang", href: "/sistem-rental-ps" },
      ],
    },
  },

  en: {
    nav: { home: "Home", solusi: "Solutions", fitur: "Features", harga: "Pricing", faq: "FAQ", about: "About", daftar: "Sign Up", login: "Login", masuk: "Log In", daftarAkun: "Create Account" },
    hero: {
      eyebrow: "⚡ All-in-One Rental Billing System for PlayStation",
      lede: "One system to manage your PS rental end-to-end — POS, automatic unit control, online booking, down to real-time financial reports.",
      cta: "Start Free",
    },
    intro: {
      headlinePre: "Your PS rental business is busier than ever, but ",
      headlineHighlight: "where does the cash actually go?",
      sub: "NEXBILL is an all-in-one rental billing system for PS4, PS5, and PS6 — combining POS, automatic unit control, online booking, customer membership, and P&L reporting in one smart dashboard.",
      ctaPrimary: "Try Free for 30 Days →",
      ctaGhost: "See All Features",
      note: "No long-term contract · Setup handled by our team · Cancel anytime",
      trustSuffix: "— trusted by 500+ PS rental outlets across Southeast Asia",
      mediaBadge: "Real-Time Dashboard",
      floatingUnits: { label: "ACTIVE UNITS", value: "12" },
      floatingBooking: { label: "BOOKING", value: "7:00 PM" },
      floatingRevenue: { label: "TODAY'S REVENUE", value: "Rp2.450.000" },
      stats: [
        { num: "Support", label: "Works with Analog, Smart OS & Android TV" },
        { num: "Real-Time", label: "Track revenue & units running from your phone" },
        { num: "0% Leakage", label: "Automatic per-second billing" },
        { num: "24/7", label: "Self-service online booking" },
      ],
    },
    showcase: {
      kicker: "See It Live", title: "Every feature, one view",
      sub: "Swipe through dashboard previews, unit control demos, and stories from outlets already running on NEXBILL.",
      dashboardLabel: "Real-Time Dashboard",
      unitLabel: "Automatic Unit Control", unitHint: "Drag to scroll →",
      quote: "Since switching to NEXBILL, closing a shift takes 5 minutes — it used to take an hour.", quoteAuthor: "— Gaming Corner Outlet, Jakarta",
      bookingLabel: "24/7 Online Booking", screenshotHint: "Screenshot coming soon",
      statLabel: "PS rental outlets across Southeast Asia",
      kasirLabel: "POS Demo Video", videoHint: "Video coming soon",
      laporanLabel: "Automated Financial Reports",
    },
    solusi: {
      kicker: "Why You Need This System", title: "Problems most PS rental owners run into",
      sub: "It's rarely about a lack of customers — most PS rental leakage happens quietly in the daily shift log.",
      points: [
        { word: "CASH LEAKS", title: "Invisible cash leakage", desc: "Small duration-counting discrepancies between shifts — multiplied by dozens of transactions a day, that can add up to millions in losses a month without anyone noticing." },
        { word: "UNIT CHAOS", title: "Messy PS/TV unit management", desc: "Every unit (PS4, PS5) is in different condition. Without per-unit tracking, customers easily complain about being handed the wrong unit." },
        { word: "MANUAL TV", title: "Still turning TVs on/off by hand", desc: "Staff have to walk to every unit to manually switch the TV and console on or off each session — wasting time and risking sessions running past their limit." },
        { word: "RATE ERRORS", title: "Miscalculated rental rates", desc: "Hourly rates, saver packages, and member pricing easily get mixed up when calculated by hand — customers complain, or the outlet loses money from undercharging." },
        { word: "IDLE UNITS", title: "Idle units nobody notices", desc: "A console that rarely gets rented still costs power and upkeep while earning nothing — without per-unit usage data, it's hard to know which one to promote or sell." },
        { word: "LOST GEAR", title: "Controllers & gear lost or broken", desc: "Controllers, memory cards, even cables go missing or get damaged with no record of who rented last — the outlet eats the replacement cost with no one to hold accountable." },
        { word: "DEPOSIT LEAKS", title: "Customer deposits go untracked", desc: "Deposits noted on paper or just remembered by staff — easy to forget to return, or worse, quietly used to cover a cash shortfall." },
        { word: "HIDDEN PROFIT", title: "Owners don't know real profit", desc: "Busy doesn't mean profitable — without a clean report of costs versus revenue, owners often don't realize they're losing money until it's too late." },
      ],
    },
    fitur: {
      kicker: "Full Feature Set", title: "Everything a PS rental needs, in one system",
      sub: "It's not just a POS. These nine modules cover the entire outlet workflow — from the moment a customer sits down to the month-end P&L report.",
      items: [
        { title: "Per-Second Precision Rental Timer", desc: "Tap start, and the system automatically calculates duration and billing down to the second — accurate for hourly rates, saver packages, or member pricing, with no stopwatch or manual calculator needed." },
        { title: "PS4, PS5 & PS6 Unit Management", desc: "Every unit is tracked separately with its condition, TV type, and usage history. Online booking customers know exactly which generation of unit is free and its specs." },
        { title: "Automatic TV & Console Control", desc: "TVs and consoles turn on automatically when a session starts and off when time runs out — integrated with smart plugs, so staff never have to walk to each unit." },
        { title: "POS with Multiple Payment Methods", desc: "Rental, food & drink, and accessory transactions become one bill. Accept cash, QRIS, e-wallets, and cards — no more manually splitting up receipts." },
        { title: "24/7 Online Booking", desc: "Customers check open slots and book themselves through your outlet's page anytime, complete with automatic WhatsApp confirmations and reminders." },
        { title: "Shift Management & Financial Reports", desc: "Close a shift by counting cash by denomination, automatically reconciled by the system. Profit & loss and cash flow stay tidy with no manual Excel recaps." },
        { title: "Membership & Customer CRM", desc: "A membership system with balance/points, visit history, and a customer trust score (fraud database) — spot problem customers before they cost your outlet." },
        { title: "Multi-Outlet & Multi-Branch", desc: "Manage many branches from one owner account. Track revenue, staff, and performance per outlet or combined, in real time, straight from your phone." },
        { title: "Staff Access Rights & Audit Trail", desc: "Every staff member logs in with their own account and permissions — every transaction is recorded by user, so it's clear who's responsible if something doesn't add up." },
      ],
    },
    harga: {
      kicker: "Pricing", title: "One price, every feature",
      sub: "No hidden fees — the only cost beyond your subscription is buying a Smart Plug unit (Tuya-integrated) for automatic TV/console control. Try it free for 30 days before subscribing.",
      badge: "⚡ Most Popular", plan: "Complete Plan / Outlet", period: "/month", save: "Save {amount} every month",
      feats: [
        "Unlimited consoles, users, & outlets included",
        "Every feature — POS, booking, financial reports & accounting",
        "Customer trust-score database (fraud) feature",
        "Automatic TV control (Android system & smart plug)",
        "Initial remote setup — free, no service fee",
        "Free new feature updates forever",
        "Priority support via WhatsApp",
      ],
      cta: "Start Subscription",
      payLabel: "Paid securely via iPaymu — every payment method accepted",
      payBadges: ["QRIS", "Bank Transfer / VA", "E-Wallet", "Credit & Debit Card", "Retail Outlets"],
      addonTag: "Optional", addonTitle: "Smart Plug (Tuya Integration)", addonPriceSuffix: "/unit, one-time purchase",
      addonDesc: "The only cost beyond your subscription — for automatic TV & console on/off control",
      compatNeedLabel: "Smart Plug needed:", compatNeedText: "Analog/CRT TVs, standard digital TVs, & non-Android smart TVs (Viva OS, Hisense OS, webOS, etc.)",
      compatSkipLabel: "Not needed:", compatSkipText: "TVs running Android TV — already controllable directly through NEXBILL's software",
    },
    faq: {
      kicker: "FAQ", headline: "Fair questions to ask before using NEXBILL.",
      sub: "Not a generic FAQ template. These are the questions PS rental owners actually ask most when considering a new system.",
      items: [
        { q: "What exactly is NEXBILL?", a: "NEXBILL is an all-in-one rental billing system built specifically for PlayStation outlets — covering POS with per-second precision timers, automatic TV/console control, online booking, membership management, and financial reports, all in one dashboard without stitching together separate apps." },
        { q: "Why switch from manual/Excel tracking to NEXBILL?", a: "Because PS rental cash leakage usually isn't from missing cash, but from small manual duration-counting discrepancies repeated every shift — multiplied by dozens of transactions a day, that can add up to millions in losses a month without anyone noticing. NEXBILL calculates automatically down to the second and logs every transaction by user, closing that gap almost entirely." },
        { q: "What kind of outlet is NEXBILL a good fit for?", a: "It fits single-branch outlets as well as those already running multiple branches, whether still renting out classic PS4s, already upgraded to PS5 with 4K TVs, or getting ready for the PS6 era. It also suits internet cafés or gaming centers that offer console rental as one of their services." },
        { q: "How long does setup take, and when can I start using it?", a: "Initial setup usually takes just 30–60 minutes remotely (TeamViewer/AnyDesk/WhatsApp), including entering unit data and rental rates for each console. Once done, the system is ready to use that same day — no multi-day training period needed." },
        { q: "Can NEXBILL be used with every type of TV and device?", a: "Yes. NEXBILL works with analog TVs, Smart OS TVs, and Android TV. Automatic on/off control does need an additional smart plug (optional), but POS, booking, and reporting features run fully without any extra hardware — accessible from a phone, tablet, or POS computer." },
        { q: "How do I start subscribing, and what does day-to-day use look like?", a: "Sign up on this page, try it free for 30 days, and our team helps set up your outlet's data remotely. Day to day, staff just tap start/stop on each unit — the system automatically calculates the bill, controls the TV, and logs everything to reports; closing a shift is just counting physical cash while the system reconciles it." },
        { q: "Do I need a constant internet connection?", a: "For daily POS transactions, a stable internet connection is recommended. Our team will let you know the exact technical requirements based on the plan and number of units you choose." },
        { q: "Is there a long-term contract or any hidden fees?", a: "No long-term contract and no hidden fees. One price already covers every core feature, and you can cancel your subscription anytime." },
      ],
    },
    footer: { alamatLabel: "Address:", teleponLabel: "Phone:", emailLabel: "Email:", copyright: "© 2026 NEXBILL Billing System. All rights reserved.", refundLabel: "Refund Policy", termsLabel: "Terms & Conditions" },
    cookieBanner: {
      message: "We use cookies to improve your experience on this site and analyze traffic. By continuing, you agree to our use of cookies per our Cookie Policy.",
      accept: "Accept",
      decline: "Decline",
      policyLinkLabel: "Cookie Policy",
    },
    about: {
      heroTitle: "We build the backbone of the PlayStation rental business.",
      heroLede: "NEXBILL was born from hands-on experience running a PS rental outlet — not generic software forced onto this industry, but a system designed from the register floor up to the P&L report, so outlet owners can focus on serving customers instead of manual bookkeeping.",
      stats: [
        { num: "500+", label: "PS rental outlets across Southeast Asia" },
        { num: "0% Leakage", label: "Automatic per-second billing" },
        { num: "24/7", label: "Self-service online booking" },
        { num: "Support", label: "Priority via WhatsApp, anytime" },
      ],
      values: [
        { num: "01", title: "Built from the ground up", desc: "Not generic software bolted on — every feature comes from the real day-to-day workflow of a PS rental cashier, from opening a shift to closing the till." },
        { num: "02", title: "Transparent down to the second", desc: "Rental timers run with per-second precision, financial reports compile automatically — no discrepancy has anywhere to hide." },
        { num: "03", title: "Grows alongside your outlet", desc: "From one outlet with one unit to multiple branches with dozens of consoles, it's the same system — only the scale changes." },
      ],
      ctaTitle: "Ready to run your PS rental more smoothly?", ctaButton: "Start Free for 30 Days",
    },
    pillarLinks: {
      heading: "Learn More About NEXBILL",
      items: [
        { label: "How second-precise PS rental billing works", href: "/en/playstation-rental-billing-software" },
        { label: "A PS rental app for daily operations", href: "/en/playstation-rental-app" },
        { label: "The full scope of PS rental software", href: "/en/playstation-rental-management-software" },
        { label: "A PS rental system for multiple branches", href: "/en/ps-rental-system" },
      ],
    },
  },

  ms: {
    nav: { home: "Laman Utama", solusi: "Solusi", fitur: "Ciri-ciri", harga: "Harga", faq: "Soalan Lazim", about: "Tentang", daftar: "Daftar", login: "Log Masuk", masuk: "Log Masuk", daftarAkun: "Daftar Akaun" },
    hero: {
      eyebrow: "⚡ Sistem Billing Sewa All-in-One untuk PlayStation",
      lede: "Satu sistem untuk uruskan sewaan PS anda dari hujung ke hujung — kaunter jualan, kawalan unit automatik, tempahan atas talian, sehingga laporan kewangan masa nyata.",
      cta: "Mula Percuma",
    },
    intro: {
      headlinePre: "Perniagaan sewa PS anda makin meriah, tapi ",
      headlineHighlight: "ke mana perginya duit tunai itu?",
      sub: "NEXBILL ialah sistem billing sewaan all-in-one untuk PS4, PS5, hingga PS6 — menggabungkan kaunter jualan, kawalan unit automatik, tempahan atas talian, keahlian pelanggan, sehingga laporan untung rugi dalam satu papan pemuka pintar.",
      ctaPrimary: "Cuba Percuma 30 Hari →",
      ctaGhost: "Lihat Semua Ciri",
      note: "Tiada kontrak jangka panjang · Persediaan dibantu pasukan kami · Boleh berhenti bila-bila masa",
      trustSuffix: "— dipercayai oleh 500+ outlet sewa PS di Asia Tenggara",
      mediaBadge: "Papan Pemuka Masa Nyata",
      floatingUnits: { label: "UNIT AKTIF", value: "12" },
      floatingBooking: { label: "TEMPAHAN", value: "7:00 PTG" },
      floatingRevenue: { label: "HASIL HARI INI", value: "Rp2.450.000" },
      stats: [
        { num: "Sokongan", label: "Serasi dengan TV Analog, Smart OS & Android TV" },
        { num: "Masa Nyata", label: "Pantau hasil jualan & unit yang berjalan dari telefon" },
        { num: "0% Bocor", label: "Sistem kira automatik sesaat" },
        { num: "24 Jam", label: "Sistem tempahan atas talian sendiri" },
      ],
    },
    showcase: {
      kicker: "Lihat Sendiri", title: "Semua ciri, satu paparan",
      sub: "Leret untuk lihat pratonton papan pemuka, video demo unit, dan cerita daripada outlet yang sudah guna NEXBILL.",
      dashboardLabel: "Papan Pemuka Masa Nyata",
      unitLabel: "Kawalan Unit Automatik", unitHint: "Seret untuk skrol →",
      quote: "Sejak guna NEXBILL, tutup syif cuma ambil masa 5 minit — dulu boleh sampai sejam.", quoteAuthor: "— Outlet Gaming Corner, Jakarta",
      bookingLabel: "Tempahan Atas Talian 24 Jam", screenshotHint: "Tangkapan skrin akan datang",
      statLabel: "Outlet sewa PS di Asia Tenggara",
      kasirLabel: "Video Demo Kaunter Jualan", videoHint: "Video akan datang",
      laporanLabel: "Laporan Kewangan Automatik",
    },
    solusi: {
      kicker: "Kenapa Perlukan Sistem Ini", title: "Masalah yang selalu dihadapi pemilik outlet sewa PS",
      sub: "Bukan kerana kurang pelanggan — kebanyakan kebocoran sewa PS berlaku senyap-senyap dalam catatan syif harian.",
      points: [
        { word: "DUIT BOCOR", title: "Kebocoran duit yang tidak kelihatan", desc: "Beza kiraan tempoh antara syif — didarab dengan puluhan transaksi sehari, boleh jadi kebocoran berjuta rupiah sebulan tanpa disedari sesiapa." },
        { word: "UNIT KUCAR-KACIR", title: "Pengurusan Unit PS/TV Bercelaru", desc: "Setiap unit (PS4, PS5) ada keadaan berbeza. Tanpa catatan per unit, pelanggan mudah komplen kerana diberi unit yang salah." },
        { word: "TV MANUAL", title: "Hidup/Matikan TV Masih Manual", desc: "Kaunter jualan perlu berjalan ke setiap unit untuk hidup/matikan TV dan PS secara manual setiap sesi — membazir masa dan berisiko terlebih tempoh." },
        { word: "KADAR SILAP", title: "Silap Kira Kadar Sewa", desc: "Kadar sejam, pakej jimat, dan harga ahli mudah tertukar bila dikira secara manual — pelanggan komplen atau outlet rugi kerana kurang caj." },
        { word: "UNIT MENGANGGUR", title: "Unit Menganggur Tanpa Disedari", desc: "Konsol yang jarang disewa tetap kena kos elektrik & penyelenggaraan tanpa menjana pendapatan — tanpa data penggunaan per unit, sukar tahu mana yang perlu dipromosi atau dijual." },
        { word: "BARANG ROSAK", title: "Stik & Aksesori Hilang atau Rosak", desc: "Stik, kad memori, hingga kabel mudah hilang atau rosak tanpa rekod siapa penyewa terakhir — outlet menanggung kos ganti tanpa sesiapa boleh dipertanggungjawabkan." },
        { word: "DEPOSIT BOCOR", title: "Deposit Pelanggan Tidak Terkawal", desc: "Deposit dicatat atas kertas atau hanya diingati kakitangan — mudah terlupa nak pulangkan, atau lebih teruk, digunakan senyap-senyap untuk tampung tunai yang kurang." },
        { word: "UNTUNG KABUR", title: "Pemilik Tak Tahu Untung Sebenar", desc: "Sibuk tak semestinya untung — tanpa laporan kos berbanding pendapatan yang kemas, pemilik selalunya sedar rugi bila sudah terlambat." },
      ],
    },
    fitur: {
      kicker: "Ciri Lengkap", title: "Semua yang diperlukan outlet sewa PS, dalam satu sistem",
      sub: "Bukan sekadar kaunter jualan. Sembilan modul ini merangkumi seluruh aliran operasi outlet — dari saat pertama pelanggan duduk sehingga laporan untung rugi akhir bulan.",
      items: [
        { title: "Pemasa Sewa Ketepatan Saat", desc: "Tekan mula, sistem kira tempoh & bil automatik sehingga ke saat — tepat untuk kadar sejam, pakej jimat, mahupun harga ahli, tanpa jam randik atau kalkulator manual." },
        { title: "Pengurusan Unit PS4, PS5 & PS6", desc: "Setiap unit dicatat berasingan lengkap dengan keadaan, jenis TV, dan sejarah penggunaan. Pelanggan tempahan atas talian tahu tepat unit generasi mana yang kosong dan spesifikasinya." },
        { title: "Kawalan TV & Konsol Automatik", desc: "TV dan konsol hidup automatik apabila sesi bermula dan mati apabila masa tamat — bersepadu dengan smart plug, tanpa kaunter jualan perlu berjalan ke setiap unit." },
        { title: "Kaunter Jualan & POS Pelbagai Pembayaran", desc: "Transaksi sewaan, makanan/minuman, dan aksesori jadi satu bil. Terima tunai, QRIS, e-wallet, hingga kad — tanpa kira manual berasingan setiap resit." },
        { title: "Tempahan Atas Talian 24 Jam", desc: "Pelanggan semak slot kosong dan tempah sendiri melalui laman outlet anda bila-bila masa, lengkap dengan pengesahan & peringatan WhatsApp automatik." },
        { title: "Pengurusan Syif & Laporan Kewangan", desc: "Tutup syif dengan kira duit mengikut nilai mata wang yang disepadankan automatik oleh sistem. Untung rugi dan aliran tunai tersusun kemas tanpa rekap manual di Excel." },
        { title: "Keahlian & CRM Pelanggan", desc: "Sistem keahlian dengan baki/mata ganjaran, sejarah lawatan, dan skor kepercayaan pelanggan (pangkalan data fraud) — kenal pasti pelanggan bermasalah sebelum outlet anda rugi." },
        { title: "Multi-Outlet & Multi-Cawangan", desc: "Uruskan banyak cawangan dari satu akaun pemilik. Pantau hasil jualan, staf, dan prestasi setiap outlet secara berasingan mahupun gabungan, masa nyata terus dari telefon." },
        { title: "Hak Akses Staf & Rekod Audit", desc: "Setiap staf log masuk dengan akaun dan hak akses sendiri — semua transaksi direkod mengikut pengguna, jadi jelas siapa bertanggungjawab jika ada percanggahan." },
      ],
    },
    harga: {
      kicker: "Harga", title: "Satu harga, semua ciri",
      sub: "Tiada bayaran tersembunyi — satu-satunya kos di luar langganan ialah pembelian unit Smart Plug (bersepadu Tuya) untuk kawalan automatik TV/konsol. Cuba percuma 30 hari sebelum melanggan.",
      badge: "⚡ Paling Popular", plan: "Pakej Lengkap / Outlet", period: "/bulan", save: "Jimat {amount} setiap bulan",
      feats: [
        "Termasuk konsol, pengguna, & outlet tanpa had",
        "Semua ciri — kaunter jualan, tempahan, laporan kewangan & perakaunan",
        "Ciri pangkalan data kepercayaan pelanggan (fraud)",
        "Kawalan TV automatik (sistem android & smart plug)",
        "Persediaan awal jarak jauh — percuma, tiada bayaran perkhidmatan",
        "Kemas kini ciri baharu percuma selama-lamanya",
        "Sokongan keutamaan melalui WhatsApp",
      ],
      cta: "Mula Melanggan",
      payLabel: "Dibayar dengan selamat melalui iPaymu — semua kaedah diterima",
      payBadges: ["QRIS", "Pindahan Bank / VA", "E-Wallet", "Kad Kredit & Debit", "Kedai Runcit"],
      addonTag: "Pilihan", addonTitle: "Smart Plug (Bersepadu Tuya)", addonPriceSuffix: "/unit, bayaran sekali",
      addonDesc: "Satu-satunya kos di luar langganan — untuk kawalan automatik hidup/mati TV & konsol",
      compatNeedLabel: "Perlukan Smart Plug:", compatNeedText: "TV analog/tiub, TV digital biasa, & smart TV bukan-Android (Viva OS, Hisense OS, webOS, dll.)",
      compatSkipLabel: "Tidak perlu:", compatSkipText: "TV dengan sistem Android TV — sudah boleh dikawal terus melalui perisian NEXBILL",
    },
    faq: {
      kicker: "Soalan Lazim", headline: "Soalan wajar ditanya sebelum guna NEXBILL.",
      sub: "Bukan templat FAQ generik. Ini soalan yang paling kerap ditanya pemilik outlet sewa PS semasa mempertimbangkan sistem baharu.",
      items: [
        { q: "Apa sebenarnya NEXBILL?", a: "NEXBILL ialah sistem billing sewaan all-in-one khusus untuk outlet PlayStation — merangkumi kaunter jualan & pemasa sewa ketepatan saat, kawalan automatik TV/konsol, tempahan atas talian, pengurusan keahlian, sehingga laporan kewangan, semuanya dalam satu papan pemuka tanpa perlu gabungkan pelbagai aplikasi berasingan." },
        { q: "Kenapa perlu beralih daripada catatan manual/Excel kepada NEXBILL?", a: "Kerana kebocoran duit sewa PS biasanya bukan daripada kehilangan wang tunai, tetapi daripada beza kiraan tempoh manual yang berulang setiap syif — didarab dengan puluhan transaksi sehari, itu boleh jadi kebocoran berjuta rupiah sebulan tanpa disedari sesiapa. NEXBILL mengira automatik sehingga ke saat dan merekod setiap transaksi mengikut pengguna, jadi celah itu praktikalnya tertutup." },
        { q: "NEXBILL sesuai untuk outlet jenis apa?", a: "Sesuai untuk outlet satu cawangan mahupun yang sudah ada banyak cawangan, sama ada masih menyewakan PS4 klasik, sudah naik taraf ke PS5 dengan TV 4K, mahupun bersedia menyambut era PS6. Turut sesuai untuk kafe siber atau gaming center yang menjadikan sewa konsol sebagai salah satu perkhidmatan." },
        { q: "Berapa lama proses persediaan dan bila boleh terus digunakan?", a: "Proses persediaan awal biasanya cuma 30–60 minit melalui jarak jauh (TeamViewer/AnyDesk/WhatsApp), termasuk input data unit dan harga sewa setiap konsol. Sebaik siap, sistem terus boleh digunakan pada hari itu juga — tiada tempoh latihan berhari-hari." },
        { q: "Adakah NEXBILL boleh digunakan pada semua jenis TV dan peranti?", a: "Boleh. NEXBILL serasi dengan TV analog, TV Smart OS, mahupun Android TV. Kawalan automatik hidup/mati memang perlukan smart plug tambahan (pilihan), tetapi ciri kaunter jualan, tempahan, dan laporan tetap berfungsi penuh tanpa sebarang peranti tambahan — boleh diakses dari telefon, tablet, atau komputer kaunter." },
        { q: "Bagaimana cara mula melanggan dan bagaimana aliran penggunaan hariannya?", a: "Daftar melalui laman ini, cuba percuma 30 hari, kemudian pasukan kami bantu sediakan data outlet anda dari jarak jauh. Setiap hari, staf cuma perlu tekan mula/henti pada setiap unit — sistem automatik kira bil, kawal TV, dan rekod semuanya ke laporan; tutup syif pun tinggal kira wang tunai fizikal dan sistem yang menyepadankan." },
        { q: "Perlukah sambungan internet berterusan?", a: "Untuk transaksi kaunter jualan harian, sambungan internet yang stabil disyorkan. Pasukan kami akan maklumkan keperluan teknikal tepat mengikut pakej dan bilangan unit yang anda pilih." },
        { q: "Adakah kontrak jangka panjang atau bayaran tersembunyi?", a: "Tiada kontrak jangka panjang dan tiada bayaran tersembunyi. Satu harga sudah merangkumi semua ciri utama, dan anda boleh berhenti melanggan bila-bila masa." },
      ],
    },
    footer: { alamatLabel: "Alamat:", teleponLabel: "Telefon:", emailLabel: "E-mel:", copyright: "© 2026 NEXBILL Billing System. Hak cipta terpelihara.", refundLabel: "Dasar Bayaran Balik", termsLabel: "Terma & Syarat" },
    cookieBanner: {
      message: "Kami menggunakan kuki untuk meningkatkan pengalaman anda di laman ini dan menganalisis trafik. Dengan meneruskan, anda bersetuju dengan penggunaan kuki mengikut Dasar Kuki kami.",
      accept: "Terima",
      decline: "Tolak",
      policyLinkLabel: "Dasar Kuki",
    },
    about: {
      heroTitle: "Kami membina tulang belakang perniagaan sewa PlayStation.",
      heroLede: "NEXBILL lahir daripada pengalaman langsung menguruskan outlet sewa PS — bukan perisian generik yang dipaksakan ke industri ini, tetapi sistem yang direka dari lantai kaunter jualan sehingga laporan untung rugi, supaya pemilik outlet boleh fokus melayan pelanggan, bukan pening kira manual dalam buku tunai.",
      stats: [
        { num: "500+", label: "Outlet sewa PS di Asia Tenggara" },
        { num: "0% Bocor", label: "Sistem kira automatik sesaat" },
        { num: "24 Jam", label: "Sistem tempahan atas talian sendiri" },
        { num: "Sokongan", label: "Keutamaan melalui WhatsApp, bila-bila masa" },
      ],
      values: [
        { num: "01", title: "Dibina dari lapangan", desc: "Bukan perisian generik yang ditampal — setiap ciri lahir daripada aliran kerja sebenar kaunter jualan sewa PS, dari buka syif sehingga tutup tunai." },
        { num: "02", title: "Telus sehingga ke saat", desc: "Pemasa sewa dikira dengan tepat sesaat, laporan kewangan tersusun automatik — tiada percanggahan yang boleh bersembunyi di sebaliknya." },
        { num: "03", title: "Berkembang bersama outlet anda", desc: "Dari satu outlet satu unit sehingga multi-cawangan puluhan konsol, sistemnya sama — cuma skalanya yang berubah." },
      ],
      ctaTitle: "Bersedia uruskan sewa PS anda dengan lebih kemas?", ctaButton: "Mula Percuma 30 Hari",
    },
    // MS/TH/VI/FIL pillar articles don't exist as separate translated pages yet (only ID and EN
    // do — see src/app/en/*) — these link to the ID originals for now, with just the link LABEL
    // translated, rather than 404ing or silently falling back to English.
    pillarLinks: {
      heading: "Ketahui Lebih Lanjut Tentang NEXBILL",
      items: [
        { label: "Cara kerja billing sewa PS tepat ke saat", href: "/billing-rental-ps" },
        { label: "Aplikasi sewa PS untuk operasi harian", href: "/aplikasi-rental-ps" },
        { label: "Skop lengkap perisian sewa PS", href: "/software-rental-ps" },
        { label: "Sistem sewa PS untuk pelbagai cawangan", href: "/sistem-rental-ps" },
      ],
    },
  },

  th: {
    nav: { home: "หน้าแรก", solusi: "โซลูชัน", fitur: "ฟีเจอร์", harga: "ราคา", faq: "คำถามที่พบบ่อย", about: "เกี่ยวกับเรา", daftar: "สมัครสมาชิก", login: "เข้าสู่ระบบ", masuk: "เข้าสู่ระบบ", daftarAkun: "สร้างบัญชี" },
    hero: {
      eyebrow: "⚡ ระบบคิดเงินร้านเช่า PlayStation แบบครบวงจร",
      lede: "ระบบเดียวจัดการร้านเช่า PS ของคุณครบทุกขั้นตอน — แคชเชียร์ ควบคุมเครื่องอัตโนมัติ จองออนไลน์ ไปจนถึงรายงานการเงินแบบเรียลไทม์",
      cta: "เริ่มใช้งานฟรี",
    },
    intro: {
      headlinePre: "ร้านเช่า PS ของคุณคึกคักขึ้นเรื่อยๆ แต่ ",
      headlineHighlight: "เงินสดหายไปไหนกันแน่?",
      sub: "NEXBILL คือระบบคิดเงินร้านเช่าแบบครบวงจรสำหรับ PS4, PS5 ไปจนถึง PS6 — รวมแคชเชียร์ ควบคุมเครื่องอัตโนมัติ จองออนไลน์ ระบบสมาชิก ไปจนถึงรายงานกำไรขาดทุนไว้ในแดชบอร์ดอัจฉริยะเดียว",
      ctaPrimary: "ทดลองใช้ฟรี 30 วัน →",
      ctaGhost: "ดูฟีเจอร์ทั้งหมด",
      note: "ไม่มีสัญญาผูกมัดระยะยาว · ทีมงานช่วยติดตั้งให้ · ยกเลิกได้ทุกเมื่อ",
      trustSuffix: "— ได้รับความไว้วางใจจากร้านเช่า PS กว่า 500 แห่งทั่วเอเชียตะวันออกเฉียงใต้",
      mediaBadge: "แดชบอร์ดเรียลไทม์",
      floatingUnits: { label: "เครื่องที่ใช้งานอยู่", value: "12" },
      floatingBooking: { label: "การจอง", value: "19:00 น." },
      floatingRevenue: { label: "รายได้วันนี้", value: "Rp2.450.000" },
      stats: [
        { num: "รองรับ", label: "ใช้ได้กับทีวีอนาล็อก, Smart OS และ Android TV" },
        { num: "เรียลไทม์", label: "ดูยอดขายและสถานะเครื่องผ่านมือถือ" },
        { num: "0% รั่วไหล", label: "ระบบคำนวณอัตโนมัติทุกวินาที" },
        { num: "24 ชม.", label: "ระบบจองออนไลน์ด้วยตัวเอง" },
      ],
    },
    showcase: {
      kicker: "ดูของจริง", title: "ทุกฟีเจอร์ในหน้าจอเดียว",
      sub: "เลื่อนดูตัวอย่างแดชบอร์ด วิดีโอสาธิตการควบคุมเครื่อง และเรื่องราวจากร้านที่ใช้ NEXBILL อยู่แล้ว",
      dashboardLabel: "แดชบอร์ดเรียลไทม์",
      unitLabel: "ควบคุมเครื่องอัตโนมัติ", unitHint: "ลากเพื่อเลื่อน →",
      quote: "ตั้งแต่ใช้ NEXBILL ปิดกะใช้เวลาแค่ 5 นาที — เมื่อก่อนใช้เวลาเป็นชั่วโมง", quoteAuthor: "— ร้าน Gaming Corner, จาการ์ตา",
      bookingLabel: "จองออนไลน์ 24 ชั่วโมง", screenshotHint: "ภาพหน้าจอเร็วๆ นี้",
      statLabel: "ร้านเช่า PS ทั่วเอเชียตะวันออกเฉียงใต้",
      kasirLabel: "วิดีโอสาธิตแคชเชียร์", videoHint: "วิดีโอเร็วๆ นี้",
      laporanLabel: "รายงานการเงินอัตโนมัติ",
    },
    solusi: {
      kicker: "ทำไมต้องใช้ระบบนี้", title: "ปัญหาที่เจ้าของร้านเช่า PS มักเจอ",
      sub: "ไม่ใช่เพราะลูกค้าน้อย — การรั่วไหลของร้านเช่า PS ส่วนใหญ่เกิดขึ้นเงียบๆ ในบันทึกกะประจำวัน",
      points: [
        { word: "เงินรั่ว", title: "เงินสดรั่วไหลแบบมองไม่เห็น", desc: "ความคลาดเคลื่อนในการคิดเวลาระหว่างกะ — คูณด้วยธุรกรรมหลายสิบครั้งต่อวัน อาจกลายเป็นเงินรั่วหลักล้านรูเปียห์ต่อเดือนโดยไม่มีใครรู้ตัว" },
        { word: "เครื่องวุ่นวาย", title: "จัดการเครื่อง PS/ทีวีสับสน", desc: "แต่ละเครื่อง (PS4, PS5) มีสภาพต่างกัน หากไม่มีการบันทึกแยกรายเครื่อง ลูกค้าจะร้องเรียนง่ายเพราะได้รับเครื่องผิด" },
        { word: "ทีวีแบบแมนวล", title: "เปิด/ปิดทีวียังต้องทำเอง", desc: "พนักงานต้องเดินไปที่แต่ละเครื่องเพื่อเปิด/ปิดทีวีและ PS ด้วยมือทุกรอบ — เสียเวลาและเสี่ยงเกินเวลาที่กำหนด" },
        { word: "คิดราคาผิด", title: "คำนวณอัตราค่าเช่าผิดพลาด", desc: "อัตรารายชั่วโมง แพ็กเกจประหยัด และราคาสมาชิกสับสนง่ายเมื่อคำนวณด้วยมือ — ลูกค้าร้องเรียน หรือร้านขาดทุนเพราะเก็บเงินน้อยไป" },
        { word: "เครื่องว่างงาน", title: "เครื่องว่างงานโดยไม่รู้ตัว", desc: "เครื่องที่แทบไม่มีคนเช่ายังคงมีค่าไฟและค่าบำรุงรักษาโดยไม่สร้างรายได้ — หากไม่มีข้อมูลการใช้งานรายเครื่อง ก็ยากที่จะรู้ว่าเครื่องไหนควรโปรโมทหรือขายทิ้ง" },
        { word: "อุปกรณ์เสียหาย", title: "จอย/อุปกรณ์หายหรือเสียหาย", desc: "จอย เมมโมรี่การ์ด ไปจนถึงสายไฟหายหรือเสียหายโดยไม่รู้ว่าใครเช่าคนล่าสุด — ร้านต้องควักเงินซื้อใหม่โดยไม่มีใครรับผิดชอบ" },
        { word: "เงินมัดจำรั่ว", title: "เงินมัดจำลูกค้าไม่มีการควบคุม", desc: "เงินมัดจำจดบนกระดาษหรือจำเอาโดยพนักงาน — ลืมคืนง่าย หรือแย่กว่านั้นถูกนำไปใช้เงียบๆ เพื่อปิดยอดเงินสดที่ขาด" },
        { word: "กำไรไม่ชัด", title: "เจ้าของไม่รู้กำไรที่แท้จริง", desc: "ร้านคึกคักไม่ได้แปลว่ากำไร — หากไม่มีรายงานต้นทุนเทียบรายได้ที่ชัดเจน เจ้าของมักรู้ตัวว่าขาดทุนตอนที่สายไปแล้ว" },
      ],
    },
    fitur: {
      kicker: "ฟีเจอร์ครบครัน", title: "ทุกสิ่งที่ร้านเช่า PS ต้องการ ในระบบเดียว",
      sub: "ไม่ใช่แค่แคชเชียร์ เก้าโมดูลนี้ครอบคลุมการทำงานทั้งหมดของร้าน — ตั้งแต่ลูกค้านั่งลงครั้งแรกไปจนถึงรายงานกำไรขาดทุนสิ้นเดือน",
      items: [
        { title: "นาฬิกาจับเวลาเช่าละเอียดถึงวินาที", desc: "แตะเริ่ม ระบบคำนวณระยะเวลาและค่าบริการอัตโนมัติถึงวินาที — แม่นยำทั้งอัตรารายชั่วโมง แพ็กเกจประหยัด หรือราคาสมาชิก โดยไม่ต้องใช้นาฬิกาจับเวลาหรือเครื่องคิดเลข" },
        { title: "จัดการเครื่อง PS4, PS5 และ PS6", desc: "แต่ละเครื่องถูกบันทึกแยกกันพร้อมสภาพ ประเภททีวี และประวัติการใช้งาน ลูกค้าที่จองออนไลน์รู้ชัดเจนว่าเครื่องรุ่นไหนว่างและสเปกเป็นอย่างไร" },
        { title: "ควบคุมทีวีและเครื่องเล่นอัตโนมัติ", desc: "ทีวีและเครื่องเล่นเปิดอัตโนมัติเมื่อเริ่มรอบและปิดเมื่อหมดเวลา — เชื่อมต่อกับสมาร์ทปลั๊ก พนักงานไม่ต้องเดินไปที่แต่ละเครื่อง" },
        { title: "แคชเชียร์และ POS รับชำระหลายช่องทาง", desc: "รวมรายการค่าเช่า อาหาร/เครื่องดื่ม และอุปกรณ์เสริมเป็นบิลเดียว รับเงินสด QRIS อีวอลเล็ต ไปจนถึงบัตร โดยไม่ต้องคิดแยกใบเสร็จเอง" },
        { title: "จองออนไลน์ 24 ชั่วโมง", desc: "ลูกค้าเช็กช่วงเวลาว่างและจองเองผ่านหน้าร้านของคุณได้ทุกเมื่อ พร้อมยืนยันและแจ้งเตือนผ่าน WhatsApp อัตโนมัติ" },
        { title: "จัดการกะและรายงานการเงิน", desc: "ปิดกะด้วยการนับเงินแยกตามมูลค่าที่ระบบจับคู่ให้อัตโนมัติ กำไรขาดทุนและกระแสเงินสดเป็นระเบียบโดยไม่ต้องสรุปมือใน Excel" },
        { title: "ระบบสมาชิกและ CRM ลูกค้า", desc: "ระบบสมาชิกพร้อมยอดคงเหลือ/แต้ม ประวัติการมาใช้บริการ และคะแนนความน่าเชื่อถือของลูกค้า (ฐานข้อมูลทุจริต) — สังเกตลูกค้ามีปัญหาก่อนร้านคุณเสียหาย" },
        { title: "หลายร้านและหลายสาขา", desc: "จัดการหลายสาขาจากบัญชีเจ้าของเดียว ดูยอดขาย พนักงาน และผลงานของแต่ละร้านแยกหรือรวมกันแบบเรียลไทม์จากมือถือ" },
        { title: "สิทธิ์การเข้าถึงพนักงานและบันทึกตรวจสอบ", desc: "พนักงานแต่ละคนล็อกอินด้วยบัญชีและสิทธิ์ของตัวเอง — ทุกธุรกรรมถูกบันทึกตามผู้ใช้ ชัดเจนว่าใครรับผิดชอบหากมีความคลาดเคลื่อน" },
      ],
    },
    harga: {
      kicker: "ราคา", title: "ราคาเดียว ฟีเจอร์ครบ",
      sub: "ไม่มีค่าใช้จ่ายแอบแฝง — ค่าใช้จ่ายเดียวนอกเหนือจากค่าสมัครสมาชิกคือการซื้อสมาร์ทปลั๊ก (เชื่อมต่อ Tuya) สำหรับควบคุมทีวี/เครื่องเล่นอัตโนมัติ ทดลองใช้ฟรี 30 วันก่อนสมัครสมาชิก",
      badge: "⚡ ยอดนิยมที่สุด", plan: "แพ็กเกจครบวงจร / ร้าน", period: "/เดือน", save: "ประหยัด {amount} ทุกเดือน",
      feats: [
        "รวมเครื่อง ผู้ใช้ และร้านแบบไม่จำกัด",
        "ทุกฟีเจอร์ — แคชเชียร์ การจอง รายงานการเงิน และบัญชี",
        "ฟีเจอร์ฐานข้อมูลความน่าเชื่อถือลูกค้า (ทุจริต)",
        "ควบคุมทีวีอัตโนมัติ (ระบบ android และสมาร์ทปลั๊ก)",
        "ติดตั้งเริ่มต้นทางไกล — ฟรี ไม่มีค่าบริการ",
        "อัปเดตฟีเจอร์ใหม่ฟรีตลอดไป",
        "ซัพพอร์ตพิเศษผ่าน WhatsApp",
      ],
      cta: "เริ่มสมัครสมาชิก",
      payLabel: "ชำระเงินปลอดภัยผ่าน iPaymu — รับทุกช่องทางการชำระเงิน",
      payBadges: ["QRIS", "โอนผ่านธนาคาร / VA", "อีวอลเล็ต", "บัตรเครดิต/เดบิต", "เคาน์เตอร์ร้านสะดวกซื้อ"],
      addonTag: "ทางเลือกเสริม", addonTitle: "สมาร์ทปลั๊ก (เชื่อมต่อ Tuya)", addonPriceSuffix: "/ชิ้น ซื้อครั้งเดียว",
      addonDesc: "ค่าใช้จ่ายเดียวนอกเหนือจากค่าสมัครสมาชิก — สำหรับควบคุมเปิด/ปิดทีวีและเครื่องเล่นอัตโนมัติ",
      compatNeedLabel: "ต้องใช้สมาร์ทปลั๊ก:", compatNeedText: "ทีวีอนาล็อก/จอตู้ ทีวีดิจิทัลทั่วไป และสมาร์ททีวีที่ไม่ใช่ Android (Viva OS, Hisense OS, webOS ฯลฯ)",
      compatSkipLabel: "ไม่จำเป็น:", compatSkipText: "ทีวีระบบ Android TV — ควบคุมได้โดยตรงผ่านซอฟต์แวร์ NEXBILL อยู่แล้ว",
    },
    faq: {
      kicker: "คำถามที่พบบ่อย", headline: "คำถามที่ควรถามก่อนใช้ NEXBILL",
      sub: "ไม่ใช่ FAQ ทั่วไป นี่คือคำถามที่เจ้าของร้านเช่า PS ถามบ่อยที่สุดเมื่อพิจารณาระบบใหม่",
      items: [
        { q: "NEXBILL คืออะไรกันแน่?", a: "NEXBILL คือระบบคิดเงินร้านเช่าแบบครบวงจรสำหรับร้าน PlayStation โดยเฉพาะ — ครอบคลุมแคชเชียร์และนาฬิกาจับเวลาละเอียดถึงวินาที ควบคุมทีวี/เครื่องเล่นอัตโนมัติ จองออนไลน์ จัดการสมาชิก ไปจนถึงรายงานการเงิน ทั้งหมดในแดชบอร์ดเดียวโดยไม่ต้องรวมแอปหลายตัวเอง" },
        { q: "ทำไมต้องเปลี่ยนจากการจดมือ/Excel มาใช้ NEXBILL?", a: "เพราะเงินรั่วของร้านเช่า PS มักไม่ได้มาจากเงินสดหาย แต่มาจากความคลาดเคลื่อนในการคิดเวลาด้วยมือที่เกิดซ้ำทุกกะ — คูณด้วยธุรกรรมหลายสิบครั้งต่อวัน อาจกลายเป็นเงินรั่วหลักล้านต่อเดือนโดยไม่มีใครรู้ตัว NEXBILL คำนวณอัตโนมัติถึงวินาทีและบันทึกทุกธุรกรรมตามผู้ใช้ ทำให้ช่องโหว่นั้นแทบปิดสนิท" },
        { q: "NEXBILL เหมาะกับร้านแบบไหน?", a: "เหมาะทั้งร้านสาขาเดียวและร้านที่มีหลายสาขาแล้ว ไม่ว่าจะยังให้เช่า PS4 รุ่นคลาสสิก อัปเกรดเป็น PS5 กับทีวี 4K แล้ว หรือเตรียมพร้อมสำหรับยุค PS6 นอกจากนี้ยังเหมาะกับร้านอินเทอร์เน็ตหรือศูนย์เกมที่ให้บริการเช่าเครื่องเล่นเป็นหนึ่งในบริการ" },
        { q: "ติดตั้งใช้เวลานานแค่ไหน แล้วเริ่มใช้ได้เมื่อไหร่?", a: "การติดตั้งเริ่มต้นมักใช้เวลาแค่ 30–60 นาทีผ่านระบบทางไกล (TeamViewer/AnyDesk/WhatsApp) รวมถึงการกรอกข้อมูลเครื่องและราคาเช่าของแต่ละเครื่อง เสร็จแล้วใช้งานได้ทันทีในวันนั้นเลย ไม่ต้องผ่านการฝึกอบรมหลายวัน" },
        { q: "NEXBILL ใช้ได้กับทีวีและอุปกรณ์ทุกประเภทหรือไม่?", a: "ได้ NEXBILL รองรับทีวีอนาล็อก ทีวี Smart OS และ Android TV การควบคุมเปิด/ปิดอัตโนมัติต้องใช้สมาร์ทปลั๊กเพิ่มเติม (ทางเลือกเสริม) แต่ฟีเจอร์แคชเชียร์ การจอง และรายงานยังทำงานได้เต็มรูปแบบโดยไม่ต้องใช้อุปกรณ์เสริมใดๆ — เข้าถึงได้จากมือถือ แท็บเล็ต หรือคอมพิวเตอร์แคชเชียร์" },
        { q: "เริ่มสมัครสมาชิกยังไง และใช้งานประจำวันเป็นอย่างไร?", a: "สมัครผ่านหน้านี้ ทดลองใช้ฟรี 30 วัน จากนั้นทีมงานช่วยตั้งค่าข้อมูลร้านของคุณจากระยะไกล ในแต่ละวัน พนักงานแค่แตะเริ่ม/หยุดที่แต่ละเครื่อง — ระบบคำนวณค่าบริการ ควบคุมทีวี และบันทึกทุกอย่างลงรายงานอัตโนมัติ ปิดกะก็แค่นับเงินสดจริงแล้วให้ระบบจับคู่ให้" },
        { q: "จำเป็นต้องมีอินเทอร์เน็ตตลอดเวลาหรือไม่?", a: "สำหรับธุรกรรมแคชเชียร์ประจำวัน แนะนำให้มีอินเทอร์เน็ตที่เสถียร ทีมงานของเราจะแจ้งความต้องการทางเทคนิคที่แน่ชัดตามแพ็กเกจและจำนวนเครื่องที่คุณเลือก" },
        { q: "มีสัญญาผูกมัดระยะยาวหรือค่าใช้จ่ายแอบแฝงหรือไม่?", a: "ไม่มีสัญญาผูกมัดระยะยาวและไม่มีค่าใช้จ่ายแอบแฝง ราคาเดียวครอบคลุมฟีเจอร์หลักทั้งหมด และคุณสามารถยกเลิกการสมัครสมาชิกได้ทุกเมื่อ" },
      ],
    },
    footer: { alamatLabel: "ที่อยู่:", teleponLabel: "โทรศัพท์:", emailLabel: "อีเมล:", copyright: "© 2026 NEXBILL Billing System สงวนลิขสิทธิ์", refundLabel: "นโยบายการคืนเงิน", termsLabel: "ข้อกำหนดและเงื่อนไข" },
    cookieBanner: {
      message: "เราใช้คุกกี้เพื่อปรับปรุงประสบการณ์ของคุณบนเว็บไซต์นี้และวิเคราะห์การเข้าชม การใช้งานต่อถือว่าคุณยอมรับการใช้คุกกี้ตามนโยบายคุกกี้ของเรา",
      accept: "ยอมรับ",
      decline: "ปฏิเสธ",
      policyLinkLabel: "นโยบายคุกกี้",
    },
    about: {
      heroTitle: "เราสร้างกระดูกสันหลังของธุรกิจร้านเช่า PlayStation",
      heroLede: "NEXBILL เกิดจากประสบการณ์ตรงในการบริหารร้านเช่า PS — ไม่ใช่ซอฟต์แวร์ทั่วไปที่ยัดเยียดให้กับอุตสาหกรรมนี้ แต่เป็นระบบที่ออกแบบตั้งแต่หน้าแคชเชียร์ไปจนถึงรายงานกำไรขาดทุน เพื่อให้เจ้าของร้านโฟกัสกับการบริการลูกค้า แทนที่จะปวดหัวกับการคำนวณมือในสมุดบัญชี",
      stats: [
        { num: "500+", label: "ร้านเช่า PS ทั่วเอเชียตะวันออกเฉียงใต้" },
        { num: "0% รั่วไหล", label: "ระบบคำนวณอัตโนมัติทุกวินาที" },
        { num: "24 ชม.", label: "ระบบจองออนไลน์ด้วยตัวเอง" },
        { num: "ซัพพอร์ต", label: "ให้ความสำคัญผ่าน WhatsApp ได้ทุกเมื่อ" },
      ],
      values: [
        { num: "01", title: "สร้างขึ้นจากหน้างานจริง", desc: "ไม่ใช่ซอฟต์แวร์ทั่วไปที่แปะเข้าไป — ทุกฟีเจอร์เกิดจากขั้นตอนการทำงานจริงของแคชเชียร์ร้านเช่า PS ตั้งแต่เปิดกะจนถึงปิดเงินสด" },
        { num: "02", title: "โปร่งใสถึงระดับวินาที", desc: "นาฬิกาจับเวลาเช่าคำนวณละเอียดถึงวินาที รายงานการเงินรวบรวมอัตโนมัติ — ไม่มีความคลาดเคลื่อนใดซ่อนอยู่ได้" },
        { num: "03", title: "เติบโตไปพร้อมกับร้านของคุณ", desc: "ตั้งแต่ร้านเดียวเครื่องเดียวไปจนถึงหลายสาขาหลายสิบเครื่อง ระบบเดียวกัน เปลี่ยนแค่ขนาด" },
      ],
      ctaTitle: "พร้อมบริหารร้านเช่า PS ให้เป็นระเบียบมากขึ้นหรือยัง?", ctaButton: "เริ่มฟรี 30 วัน",
    },
    // MS/TH/VI/FIL pillar articles don't exist as separate translated pages yet (only ID and EN
    // do — see src/app/en/*) — these link to the ID originals for now, with just the link LABEL
    // translated, rather than 404ing or silently falling back to English.
    pillarLinks: {
      heading: "เรียนรู้เพิ่มเติมเกี่ยวกับ NEXBILL",
      items: [
        { label: "วิธีการทำงานของระบบคิดค่าเช่า PS แบบละเอียดถึงวินาที", href: "/billing-rental-ps" },
        { label: "แอปเช่า PS สำหรับการดำเนินงานประจำวัน", href: "/aplikasi-rental-ps" },
        { label: "ขอบเขตครบถ้วนของซอฟต์แวร์เช่า PS", href: "/software-rental-ps" },
        { label: "ระบบเช่า PS สำหรับหลายสาขา", href: "/sistem-rental-ps" },
      ],
    },
  },

  vi: {
    nav: { home: "Trang chủ", solusi: "Giải pháp", fitur: "Tính năng", harga: "Bảng giá", faq: "Hỏi đáp", about: "Giới thiệu", daftar: "Đăng ký", login: "Đăng nhập", masuk: "Đăng nhập", daftarAkun: "Tạo tài khoản" },
    hero: {
      eyebrow: "⚡ Hệ thống tính tiền cho thuê PlayStation trọn gói",
      lede: "Một hệ thống duy nhất quản lý toàn bộ hoạt động cho thuê PS của bạn — thu ngân, điều khiển thiết bị tự động, đặt chỗ trực tuyến, đến báo cáo tài chính theo thời gian thực.",
      cta: "Dùng thử miễn phí",
    },
    intro: {
      headlinePre: "Cửa hàng cho thuê PS của bạn ngày càng đông khách, nhưng ",
      headlineHighlight: "tiền mặt lại chạy đi đâu?",
      sub: "NEXBILL là hệ thống tính tiền cho thuê trọn gói dành cho PS4, PS5 đến PS6 — hợp nhất thu ngân, điều khiển thiết bị tự động, đặt chỗ trực tuyến, hội viên khách hàng, đến báo cáo lãi lỗ trong một bảng điều khiển thông minh duy nhất.",
      ctaPrimary: "Dùng thử miễn phí 30 ngày →",
      ctaGhost: "Xem tất cả tính năng",
      note: "Không hợp đồng dài hạn · Đội ngũ hỗ trợ cài đặt · Hủy bất cứ lúc nào",
      trustSuffix: "— được hơn 500 cửa hàng cho thuê PS ở Đông Nam Á tin dùng",
      mediaBadge: "Bảng điều khiển thời gian thực",
      floatingUnits: { label: "THIẾT BỊ ĐANG HOẠT ĐỘNG", value: "12" },
      floatingBooking: { label: "ĐẶT CHỖ", value: "19:00" },
      floatingRevenue: { label: "DOANH THU HÔM NAY", value: "Rp2.450.000" },
      stats: [
        { num: "Hỗ trợ", label: "Tương thích TV analog, Smart OS & Android TV" },
        { num: "Thời gian thực", label: "Theo dõi doanh thu & thiết bị đang chạy từ điện thoại" },
        { num: "0% Thất thoát", label: "Hệ thống tính tiền tự động theo từng giây" },
        { num: "24/7", label: "Hệ thống đặt chỗ trực tuyến tự phục vụ" },
      ],
    },
    showcase: {
      kicker: "Xem trực tiếp", title: "Mọi tính năng, một màn hình",
      sub: "Vuốt để xem trước bảng điều khiển, video demo điều khiển thiết bị, và câu chuyện từ các cửa hàng đã dùng NEXBILL.",
      dashboardLabel: "Bảng điều khiển thời gian thực",
      unitLabel: "Điều khiển thiết bị tự động", unitHint: "Kéo để cuộn →",
      quote: "Từ khi dùng NEXBILL, đóng ca chỉ mất 5 phút — trước đây mất cả tiếng đồng hồ.", quoteAuthor: "— Cửa hàng Gaming Corner, Jakarta",
      bookingLabel: "Đặt chỗ trực tuyến 24/7", screenshotHint: "Ảnh chụp màn hình sắp ra mắt",
      statLabel: "Cửa hàng cho thuê PS ở Đông Nam Á",
      kasirLabel: "Video demo thu ngân", videoHint: "Video sắp ra mắt",
      laporanLabel: "Báo cáo tài chính tự động",
    },
    solusi: {
      kicker: "Vì sao cần hệ thống này", title: "Những vấn đề chủ cửa hàng cho thuê PS thường gặp",
      sub: "Không phải vì thiếu khách — phần lớn thất thoát ở cửa hàng cho thuê PS xảy ra âm thầm trong ghi chép ca làm việc hằng ngày.",
      points: [
        { word: "THẤT THOÁT", title: "Thất thoát tiền mặt vô hình", desc: "Chênh lệch tính thời gian giữa các ca — nhân với hàng chục giao dịch mỗi ngày, có thể trở thành khoản thất thoát hàng triệu mỗi tháng mà không ai nhận ra." },
        { word: "THIẾT BỊ LỘN XỘN", title: "Quản lý thiết bị PS/TV rối ren", desc: "Mỗi thiết bị (PS4, PS5) có tình trạng khác nhau. Không ghi chép theo từng thiết bị, khách hàng dễ phàn nàn vì bị giao nhầm thiết bị." },
        { word: "TV THỦ CÔNG", title: "Bật/tắt TV vẫn phải làm thủ công", desc: "Nhân viên phải đi đến từng thiết bị để bật/tắt TV và PS thủ công mỗi phiên — tốn thời gian và dễ chạy quá thời hạn." },
        { word: "SAI GIÁ", title: "Tính Sai Giá Thuê", desc: "Giá theo giờ, gói tiết kiệm, và giá hội viên dễ bị nhầm lẫn khi tính thủ công — khách hàng phàn nàn, hoặc cửa hàng lỗ vì tính thiếu tiền." },
        { word: "THIẾT BỊ RẢNH", title: "Thiết Bị Rảnh Mà Không Ai Biết", desc: "Máy console ít được thuê vẫn tốn tiền điện và bảo trì mà không sinh ra doanh thu — không có dữ liệu sử dụng theo từng thiết bị, khó biết cái nào cần quảng bá hay bán đi." },
        { word: "ĐỒ THẤT LẠC", title: "Tay Cầm & Phụ Kiện Mất Hoặc Hỏng", desc: "Tay cầm, thẻ nhớ, cho đến dây cáp dễ bị mất hoặc hỏng mà không ghi lại ai thuê cuối cùng — cửa hàng phải tự bỏ tiền mua lại mà không ai chịu trách nhiệm." },
        { word: "CỌC THẤT THOÁT", title: "Tiền Cọc Khách Hàng Không Kiểm Soát", desc: "Tiền cọc ghi trên giấy hoặc chỉ nhớ miệng — dễ quên trả lại, hoặc tệ hơn là bị dùng âm thầm để bù vào khoản tiền mặt thiếu hụt." },
        { word: "LỢI NHUẬN MỜ", title: "Chủ Quán Không Biết Lợi Nhuận Thật", desc: "Đông khách không có nghĩa là có lãi — nếu không có báo cáo chi phí so với doanh thu rõ ràng, chủ quán thường chỉ nhận ra đang lỗ khi đã quá muộn." },
      ],
    },
    fitur: {
      kicker: "Tính năng đầy đủ", title: "Mọi thứ cửa hàng cho thuê PS cần, trong một hệ thống",
      sub: "Không chỉ là thu ngân. Chín module này bao quát toàn bộ quy trình vận hành cửa hàng — từ lúc khách hàng ngồi xuống đến báo cáo lãi lỗ cuối tháng.",
      items: [
        { title: "Đồng hồ tính giờ thuê chính xác đến giây", desc: "Chạm bắt đầu, hệ thống tự động tính thời lượng & hóa đơn chính xác đến từng giây — đúng cho giá theo giờ, gói tiết kiệm, hay giá hội viên, không cần đồng hồ bấm giờ hay máy tính thủ công." },
        { title: "Quản lý thiết bị PS4, PS5 & PS6", desc: "Mỗi thiết bị được ghi nhận riêng biệt kèm tình trạng, loại TV, và lịch sử sử dụng. Khách đặt chỗ trực tuyến biết chính xác thiết bị thế hệ nào đang trống và thông số của nó." },
        { title: "Điều khiển TV & máy chơi game tự động", desc: "TV và máy chơi game tự động bật khi phiên bắt đầu và tắt khi hết giờ — tích hợp với ổ cắm thông minh, nhân viên không cần đi đến từng thiết bị." },
        { title: "Thu ngân & POS đa phương thức thanh toán", desc: "Giao dịch thuê, đồ ăn/thức uống, và phụ kiện gộp thành một hóa đơn. Nhận tiền mặt, QRIS, ví điện tử, đến thẻ — không cần tính tay từng hóa đơn riêng." },
        { title: "Đặt chỗ trực tuyến 24/7", desc: "Khách hàng kiểm tra chỗ trống và tự đặt qua trang cửa hàng của bạn bất cứ lúc nào, kèm xác nhận & nhắc nhở WhatsApp tự động." },
        { title: "Quản lý ca làm & báo cáo tài chính", desc: "Đóng ca bằng cách đếm tiền theo mệnh giá được hệ thống tự động đối chiếu. Lãi lỗ và dòng tiền được sắp xếp gọn gàng, không cần tổng hợp thủ công trên Excel." },
        { title: "Hội viên & CRM khách hàng", desc: "Hệ thống hội viên với số dư/điểm thưởng, lịch sử ghé thăm, và điểm tin cậy khách hàng (cơ sở dữ liệu gian lận) — nhận diện khách hàng có vấn đề trước khi cửa hàng bạn chịu thiệt." },
        { title: "Đa cửa hàng & đa chi nhánh", desc: "Quản lý nhiều chi nhánh từ một tài khoản chủ sở hữu. Theo dõi doanh thu, nhân viên, và hiệu suất từng cửa hàng riêng lẻ hoặc gộp chung, theo thời gian thực ngay trên điện thoại." },
        { title: "Phân quyền nhân viên & nhật ký kiểm toán", desc: "Mỗi nhân viên đăng nhập bằng tài khoản và quyền hạn riêng — mọi giao dịch được ghi nhận theo người dùng, rõ ràng ai chịu trách nhiệm nếu có chênh lệch." },
      ],
    },
    harga: {
      kicker: "Bảng giá", title: "Một mức giá, đầy đủ tính năng",
      sub: "Không phí ẩn — chi phí duy nhất ngoài gói đăng ký là mua thiết bị Smart Plug (tích hợp Tuya) để điều khiển TV/máy chơi game tự động. Dùng thử miễn phí 30 ngày trước khi đăng ký.",
      badge: "⚡ Phổ biến nhất", plan: "Gói trọn gói / Cửa hàng", period: "/tháng", save: "Tiết kiệm {amount} mỗi tháng",
      feats: [
        "Bao gồm không giới hạn máy, người dùng, & cửa hàng",
        "Mọi tính năng — thu ngân, đặt chỗ, báo cáo tài chính & kế toán",
        "Tính năng cơ sở dữ liệu đánh giá độ tin cậy khách hàng (gian lận)",
        "Điều khiển TV tự động (hệ điều hành android & ổ cắm thông minh)",
        "Cài đặt ban đầu từ xa — miễn phí, không phí dịch vụ",
        "Cập nhật tính năng mới miễn phí trọn đời",
        "Hỗ trợ ưu tiên qua WhatsApp",
      ],
      cta: "Bắt đầu đăng ký",
      payLabel: "Thanh toán an toàn qua iPaymu — chấp nhận mọi phương thức",
      payBadges: ["QRIS", "Chuyển khoản ngân hàng / VA", "Ví điện tử", "Thẻ tín dụng & ghi nợ", "Cửa hàng bán lẻ"],
      addonTag: "Tùy chọn", addonTitle: "Smart Plug (Tích hợp Tuya)", addonPriceSuffix: "/thiết bị, mua một lần",
      addonDesc: "Chi phí duy nhất ngoài gói đăng ký — dùng để điều khiển bật/tắt TV & máy chơi game tự động",
      compatNeedLabel: "Cần Smart Plug:", compatNeedText: "TV analog/CRT, TV kỹ thuật số thông thường, & smart TV không phải Android (Viva OS, Hisense OS, webOS, v.v.)",
      compatSkipLabel: "Không cần:", compatSkipText: "TV chạy hệ điều hành Android TV — đã có thể điều khiển trực tiếp qua phần mềm NEXBILL",
    },
    faq: {
      kicker: "Hỏi đáp", headline: "Những câu hỏi nên đặt ra trước khi dùng NEXBILL.",
      sub: "Không phải mẫu FAQ chung chung. Đây là những câu hỏi chủ cửa hàng cho thuê PS thường hỏi nhất khi cân nhắc một hệ thống mới.",
      items: [
        { q: "NEXBILL thực chất là gì?", a: "NEXBILL là hệ thống tính tiền cho thuê trọn gói dành riêng cho cửa hàng PlayStation — bao gồm thu ngân & đồng hồ tính giờ thuê chính xác đến giây, điều khiển TV/máy chơi game tự động, đặt chỗ trực tuyến, quản lý hội viên, đến báo cáo tài chính, tất cả trong một bảng điều khiển mà không cần ghép nhiều ứng dụng riêng lẻ." },
        { q: "Vì sao nên chuyển từ ghi chép thủ công/Excel sang NEXBILL?", a: "Vì thất thoát tiền mặt ở cửa hàng cho thuê PS thường không phải do mất tiền mặt, mà do chênh lệch tính thời gian thủ công lặp lại mỗi ca — nhân với hàng chục giao dịch mỗi ngày, có thể trở thành khoản thất thoát hàng triệu mỗi tháng mà không ai nhận ra. NEXBILL tính tự động đến từng giây và ghi nhận mọi giao dịch theo người dùng, nên lỗ hổng đó gần như được bịt kín." },
        { q: "NEXBILL phù hợp với cửa hàng như thế nào?", a: "Phù hợp cho cả cửa hàng một chi nhánh lẫn đã có nhiều chi nhánh, dù vẫn cho thuê PS4 đời cũ, đã nâng cấp lên PS5 với TV 4K, hay đang chuẩn bị cho thời kỳ PS6. Cũng phù hợp với tiệm net hoặc trung tâm game có dịch vụ cho thuê máy chơi game." },
        { q: "Quá trình cài đặt mất bao lâu và khi nào có thể dùng ngay?", a: "Quá trình cài đặt ban đầu thường chỉ mất 30–60 phút qua kết nối từ xa (TeamViewer/AnyDesk/WhatsApp), bao gồm nhập dữ liệu thiết bị và giá thuê từng máy. Xong là dùng được ngay trong ngày — không cần đào tạo nhiều ngày." },
        { q: "NEXBILL có dùng được với mọi loại TV và thiết bị không?", a: "Có. NEXBILL tương thích với TV analog, TV Smart OS, và Android TV. Điều khiển bật/tắt tự động cần thêm Smart Plug (tùy chọn), nhưng tính năng thu ngân, đặt chỗ, và báo cáo vẫn hoạt động đầy đủ mà không cần thêm thiết bị nào — truy cập được từ điện thoại, máy tính bảng, hoặc máy tính thu ngân." },
        { q: "Làm sao để bắt đầu đăng ký, và quy trình sử dụng hằng ngày ra sao?", a: "Đăng ký qua trang này, dùng thử miễn phí 30 ngày, sau đó đội ngũ của chúng tôi giúp cài đặt dữ liệu cửa hàng của bạn từ xa. Hằng ngày, nhân viên chỉ cần chạm bắt đầu/dừng trên từng thiết bị — hệ thống tự động tính hóa đơn, điều khiển TV, và ghi nhận mọi thứ vào báo cáo; đóng ca chỉ cần đếm tiền mặt thực tế và hệ thống sẽ đối chiếu." },
        { q: "Có cần kết nối internet liên tục không?", a: "Đối với giao dịch thu ngân hằng ngày, nên có kết nối internet ổn định. Đội ngũ của chúng tôi sẽ thông báo yêu cầu kỹ thuật cụ thể theo gói và số lượng thiết bị bạn chọn." },
        { q: "Có hợp đồng dài hạn hay phí ẩn nào không?", a: "Không có hợp đồng dài hạn và không có phí ẩn. Một mức giá đã bao gồm mọi tính năng cốt lõi, và bạn có thể hủy đăng ký bất cứ lúc nào." },
      ],
    },
    footer: { alamatLabel: "Địa chỉ:", teleponLabel: "Điện thoại:", emailLabel: "Email:", copyright: "© 2026 NEXBILL Billing System. Bảo lưu mọi quyền.", refundLabel: "Chính sách hoàn tiền", termsLabel: "Điều khoản & Điều kiện" },
    cookieBanner: {
      message: "Chúng tôi sử dụng cookie để cải thiện trải nghiệm của bạn trên trang web này và phân tích lưu lượng truy cập. Tiếp tục sử dụng nghĩa là bạn đồng ý với việc sử dụng cookie theo Chính sách Cookie của chúng tôi.",
      accept: "Chấp nhận",
      decline: "Từ chối",
      policyLinkLabel: "Chính sách Cookie",
    },
    about: {
      heroTitle: "Chúng tôi xây dựng nền tảng cho ngành cho thuê PlayStation.",
      heroLede: "NEXBILL ra đời từ kinh nghiệm trực tiếp vận hành cửa hàng cho thuê PS — không phải phần mềm chung chung áp đặt lên ngành này, mà là hệ thống được thiết kế từ quầy thu ngân đến báo cáo lãi lỗ, để chủ cửa hàng có thể tập trung phục vụ khách hàng thay vì đau đầu tính toán thủ công trong sổ sách.",
      stats: [
        { num: "500+", label: "Cửa hàng cho thuê PS ở Đông Nam Á" },
        { num: "0% Thất thoát", label: "Hệ thống tính tiền tự động theo từng giây" },
        { num: "24/7", label: "Hệ thống đặt chỗ trực tuyến tự phục vụ" },
        { num: "Hỗ trợ", label: "Ưu tiên qua WhatsApp, bất cứ lúc nào" },
      ],
      values: [
        { num: "01", title: "Xây dựng từ thực tế vận hành", desc: "Không phải phần mềm chung chung lắp ghép — mỗi tính năng đều xuất phát từ quy trình làm việc thực tế của thu ngân cửa hàng cho thuê PS, từ mở ca đến đóng quỹ." },
        { num: "02", title: "Minh bạch đến từng giây", desc: "Đồng hồ tính giờ thuê chạy chính xác đến từng giây, báo cáo tài chính tự động tổng hợp — không có chênh lệch nào có thể ẩn giấu." },
        { num: "03", title: "Phát triển cùng cửa hàng của bạn", desc: "Từ một cửa hàng một máy đến đa chi nhánh hàng chục máy, hệ thống vẫn vậy — chỉ quy mô thay đổi." },
      ],
      ctaTitle: "Sẵn sàng quản lý cửa hàng cho thuê PS gọn gàng hơn?", ctaButton: "Dùng thử miễn phí 30 ngày",
    },
    // MS/TH/VI/FIL pillar articles don't exist as separate translated pages yet (only ID and EN
    // do — see src/app/en/*) — these link to the ID originals for now, with just the link LABEL
    // translated, rather than 404ing or silently falling back to English.
    pillarLinks: {
      heading: "Tìm hiểu thêm về NEXBILL",
      items: [
        { label: "Cách tính phí thuê PS chính xác đến từng giây", href: "/billing-rental-ps" },
        { label: "Ứng dụng cho thuê PS cho vận hành hàng ngày", href: "/aplikasi-rental-ps" },
        { label: "Phạm vi đầy đủ của phần mềm cho thuê PS", href: "/software-rental-ps" },
        { label: "Hệ thống cho thuê PS cho nhiều chi nhánh", href: "/sistem-rental-ps" },
      ],
    },
  },

  fil: {
    nav: { home: "Home", solusi: "Solusyon", fitur: "Mga Feature", harga: "Presyo", faq: "FAQ", about: "Tungkol Sa Amin", daftar: "Mag-sign Up", login: "Mag-login", masuk: "Mag-login", daftarAkun: "Gumawa ng Account" },
    hero: {
      eyebrow: "⚡ All-in-One Rental Billing System para sa PlayStation",
      lede: "Isang sistema para pamahalaan ang PS rental mo mula simula hanggang katapusan — cashier, automatic na kontrol ng unit, online booking, hanggang real-time na financial reports.",
      cta: "Sumubok Nang Libre",
    },
    intro: {
      headlinePre: "Lumalago na ang PS rental business mo, pero ",
      headlineHighlight: "saan ba talaga napupunta ang pera?",
      sub: "Ang NEXBILL ay isang all-in-one rental billing system para sa PS4, PS5, hanggang PS6 — pinagsasama ang cashier, automatic na kontrol ng unit, online booking, membership ng customer, hanggang profit-and-loss report sa isang matalinong dashboard.",
      ctaPrimary: "Subukan Nang Libre sa 30 Araw →",
      ctaGhost: "Tingnan Lahat ng Feature",
      note: "Walang long-term contract · Tutulungan kami sa setup · Puwedeng mag-cancel anumang oras",
      trustSuffix: "— pinagkakatiwalaan ng 500+ PS rental outlet sa buong Timog-Silangang Asya",
      mediaBadge: "Real-Time Dashboard",
      floatingUnits: { label: "ACTIVE NA UNIT", value: "12" },
      floatingBooking: { label: "BOOKING", value: "7:00 PM" },
      floatingRevenue: { label: "KITA NGAYONG ARAW", value: "Rp2.450.000" },
      stats: [
        { num: "Support", label: "Compatible sa Analog TV, Smart OS & Android TV" },
        { num: "Real-Time", label: "Subaybayan ang kita & unit gamit ang phone" },
        { num: "0% Tulo", label: "Automatic na pagbibilang bawat segundo" },
        { num: "24 Oras", label: "Self-service na online booking system" },
      ],
    },
    showcase: {
      kicker: "Tingnan Mismo", title: "Lahat ng feature, isang view",
      sub: "I-swipe para makita ang preview ng dashboard, demo video ng unit control, at mga kwento mula sa mga outlet na gumagamit na ng NEXBILL.",
      dashboardLabel: "Real-Time Dashboard",
      unitLabel: "Automatic na Unit Control", unitHint: "I-drag para mag-scroll →",
      quote: "Simula nang gamitin ang NEXBILL, 5 minuto na lang ang pag-close ng shift — dati isang oras.", quoteAuthor: "— Gaming Corner Outlet, Jakarta",
      bookingLabel: "24 Oras na Online Booking", screenshotHint: "Screenshot, malapit na",
      statLabel: "PS rental outlet sa buong Timog-Silangang Asya",
      kasirLabel: "Demo Video ng Cashier", videoHint: "Video, malapit na",
      laporanLabel: "Automated na Financial Reports",
    },
    solusi: {
      kicker: "Bakit Kailangan Ang Sistemang Ito", title: "Mga problemang madalas kinakaharap ng may-ari ng PS rental",
      sub: "Hindi ito dahil sa kakulangan ng customer — karamihan sa tagas ng pera sa PS rental ay tahimik na nangyayari sa daily shift record.",
      points: [
        { word: "TUMUTULONG PERA", title: "Hindi nakikitang pagtagas ng pera", desc: "Pagkakaiba sa pagbibilang ng oras sa bawat shift — i-multiply sa dose-dosenang transaksyon araw-araw, puwedeng maging milyun-milyong piso na natatapon bawat buwan nang hindi napapansin ninuman." },
        { word: "GULONG UNIT", title: "Magulong pamamahala ng PS/TV unit", desc: "Iba-iba ang kondisyon ng bawat unit (PS4, PS5). Kung walang per-unit na record, madaling magreklamo ang customer dahil mali ang naibigay na unit." },
        { word: "MANUAL NA TV", title: "Manu-mano pa rin ang pag-on/off ng TV", desc: "Kailangang lumakad ng staff papunta sa bawat unit para i-on/off ang TV at PS nang manu-mano bawat session — nakakasayang ng oras at malaki ang tsansang lumampas sa oras." },
        { word: "MALING RATE", title: "Maling Kwenta sa Rate ng Renta", desc: "Ang bawat-oras na rate, saver package, at presyo ng miyembro ay madaling magulo kapag kinuwenta nang manu-mano — nagrereklamo ang customer, o nalulugi ang outlet dahil kulang ang singil." },
        { word: "TAMAD NA UNIT", title: "May Unit na Tamad Pero Hindi Napapansin", desc: "Ang console na bihirang paupahan ay tumatakbo pa rin ang gastos sa kuryente at maintenance kahit walang kinikita — kung walang datos ng paggamit kada unit, mahirap malaman kung alin ang dapat i-promote o ibenta." },
        { word: "SIRANG GAMIT", title: "Stick at Accessories Nawawala o Sira", desc: "Ang stick, memory card, hanggang cable ay madaling mawala o masira nang walang record kung sino ang huling nag-renta — ang outlet ang nagbabayad ng kapalit nang walang mananagot." },
        { word: "DEPOSITO KULANG", title: "Deposito ng Customer Walang Kontrol", desc: "Nakasulat lang sa papel o tinatandaan ng staff ang deposito — madaling makalimutang ibalik, o mas malala, ginagamit nang tahimik para takpan ang kulang sa cash." },
        { word: "KITA HINDI KLARO", title: "Hindi Alam ng May-ari ang Totoong Kita", desc: "Ang busy na outlet ay hindi laging kumikita — kung walang malinaw na ulat ng gastos kumpara sa kita, kadalasan nalalaman lang ng may-ari na nalulugi na siya nang huli na." },
      ],
    },
    fitur: {
      kicker: "Kumpletong Feature", title: "Lahat ng kailangan ng PS rental, sa isang sistema",
      sub: "Hindi lang cashier. Ang siyam na module na ito ang sumasaklaw sa buong daloy ng operasyon ng outlet — mula sa unang pagupo ng customer hanggang sa profit-and-loss report sa katapusan ng buwan.",
      items: [
        { title: "Rental Timer na Tumpak Hanggang Segundo", desc: "I-tap ang start, awtomatikong bibilangin ng sistema ang tagal at bayarin hanggang sa segundo — tumpak para sa per-hour rate, savings package, o presyo ng miyembro, walang kailangang stopwatch o manual na kalkulator." },
        { title: "Pamamahala ng PS4, PS5 & PS6 Unit", desc: "Bawat unit ay naitatala nang hiwalay kasama ang kondisyon, uri ng TV, at history ng paggamit. Alam mismo ng customer na nag-book online kung aling generation ng unit ang bakante at ano ang specs nito." },
        { title: "Automatic na Kontrol ng TV & Konsol", desc: "Awtomatikong nagbubukas ang TV at konsol kapag nagsimula ang session at nagsasara kapag naubos ang oras — naka-integrate sa smart plug, hindi na kailangang lumakad ang staff papunta sa bawat unit." },
        { title: "Cashier at POS na Maraming Paraan ng Bayad", desc: "Nagiging isang bill ang transaksyon ng rental, pagkain/inumin, at accessories. Tumatanggap ng cash, QRIS, e-wallet, hanggang card — hindi na kailangang bilangin nang hiwalay bawat resibo." },
        { title: "24 Oras na Online Booking", desc: "Tinitingnan at nagbo-book mismo ng customer ang bukas na slot sa page ng outlet mo anumang oras, kumpleto sa automatic na WhatsApp confirmation at reminder." },
        { title: "Pamamahala ng Shift & Financial Reports", desc: "I-close ang shift sa pamamagitan ng pagbilang ng pera per denomination na awtomatikong itutugma ng sistema. Maayos ang profit-and-loss at cash flow nang walang manual na recap sa Excel." },
        { title: "Membership at Customer CRM", desc: "Sistema ng membership na may balance/points, history ng bisita, at trust score ng customer (fraud database) — makilala agad ang problemadong customer bago pa masaktan ang outlet mo." },
        { title: "Multi-Outlet & Multi-Branch", desc: "Pamahalaan ang maraming branch mula sa isang owner account. Subaybayan ang kita, staff, at performance ng bawat outlet nang hiwalay o pinagsama, real-time mula sa phone." },
        { title: "Access Rights ng Staff & Audit Trail", desc: "Bawat staff ay naglo-log in gamit ang sariling account at access rights — lahat ng transaksyon ay naitatala ayon sa user, kaya malinaw kung sino ang may pananagutan kung may hindi tumutugma." },
      ],
    },
    harga: {
      kicker: "Presyo", title: "Isang presyo, lahat ng feature",
      sub: "Walang nakatagong bayad — ang tanging gastos sa labas ng subscription ay ang pagbili ng Smart Plug unit (naka-integrate ang Tuya) para sa automatic na kontrol ng TV/konsol. Subukan nang libre sa 30 araw bago mag-subscribe.",
      badge: "⚡ Pinaka-Popular", plan: "Kumpletong Plano / Outlet", period: "/buwan", save: "Makatipid ng {amount} bawat buwan",
      feats: [
        "Kasama ang unlimited na konsol, user, & outlet",
        "Lahat ng feature — cashier, booking, financial reports & accounting",
        "Feature na customer trust-score database (fraud)",
        "Automatic na kontrol ng TV (android system & smart plug)",
        "Paunang setup sa remote — libre, walang service fee",
        "Libreng update ng bagong feature magpakailanman",
        "Priority support sa WhatsApp",
      ],
      cta: "Magsimulang Mag-subscribe",
      payLabel: "Secure na bayad sa pamamagitan ng iPaymu — tinatanggap lahat ng paraan ng pagbabayad",
      payBadges: ["QRIS", "Bank Transfer / VA", "E-Wallet", "Credit & Debit Card", "Retail Outlet"],
      addonTag: "Opsyonal", addonTitle: "Smart Plug (Tuya Integration)", addonPriceSuffix: "/unit, isang beses na bili",
      addonDesc: "Ang tanging gastos sa labas ng subscription — para sa automatic na on/off na kontrol ng TV & konsol",
      compatNeedLabel: "Kailangan ang Smart Plug:", compatNeedText: "Analog/tube TV, karaniwang digital TV, & non-Android na smart TV (Viva OS, Hisense OS, webOS, atbp.)",
      compatSkipLabel: "Hindi kailangan:", compatSkipText: "TV na may Android TV system — direkta nang makokontrol sa pamamagitan ng software ng NEXBILL",
    },
    faq: {
      kicker: "FAQ", headline: "Mga tanong na makatwirang itanong bago gamitin ang NEXBILL.",
      sub: "Hindi ito generic na FAQ template. Ito ang mga tanong na pinaka-madalas itanong ng may-ari ng PS rental outlet kapag isinasaalang-alang ang bagong sistema.",
      items: [
        { q: "Ano ba talaga ang NEXBILL?", a: "Ang NEXBILL ay all-in-one rental billing system na ginawa mismo para sa PlayStation outlet — kasama ang cashier at rental timer na tumpak hanggang segundo, automatic na kontrol ng TV/konsol, online booking, pamamahala ng membership, hanggang financial reports, lahat sa isang dashboard nang hindi na kailangang pagsamahin ang magkakahiwalay na app." },
        { q: "Bakit dapat lumipat mula sa manual/Excel na record-keeping papunta sa NEXBILL?", a: "Dahil ang pagtagas ng pera sa PS rental ay karaniwang hindi dahil sa nawawalang cash, kundi mula sa maliit na pagkakaiba sa manual na pagbibilang ng oras na paulit-ulit bawat shift — i-multiply sa dose-dosenang transaksyon araw-araw, puwede itong maging milyun-milyong piso na natatapon bawat buwan nang hindi napapansin ninuman. Awtomatikong binibilang ng NEXBILL hanggang sa segundo at itinatala ang bawat transaksyon ayon sa user, kaya halos nasasarhan na ang butas na iyon." },
        { q: "Anong klaseng outlet ang bagay sa NEXBILL?", a: "Bagay ito sa outlet na iisang branch pati na rin sa mga may maraming branch na, ubos man ang paupahang PS4 na klasiko, na-upgrade na sa PS5 na may 4K TV, o naghahanda para sa panahon ng PS6. Bagay din ito sa internet café o gaming center na nag-aalok ng console rental bilang isa sa mga serbisyo nito." },
        { q: "Gaano katagal ang proseso ng setup at kailan puwedeng gamitin agad?", a: "Karaniwang 30–60 minuto lang ang paunang setup sa pamamagitan ng remote (TeamViewer/AnyDesk/WhatsApp), kasama ang pag-input ng data ng unit at presyo ng rental ng bawat konsol. Pagkatapos, magagamit na ang sistema sa araw ding iyon — walang kailangang training na ilang araw." },
        { q: "Puwede bang gamitin ang NEXBILL sa lahat ng uri ng TV at device?", a: "Oo. Compatible ang NEXBILL sa analog TV, Smart OS TV, at Android TV. Kailangan talaga ng dagdag na smart plug (opsyonal) para sa automatic na on/off na kontrol, pero buong gumagana pa rin ang cashier, booking, at reporting features nang walang anumang karagdagang device — puwedeng i-access mula sa phone, tablet, o computer ng cashier." },
        { q: "Paano magsisimulang mag-subscribe, at ano ang daily na daloy ng paggamit?", a: "Mag-sign up sa page na ito, subukan nang libre sa 30 araw, at tutulungan ka ng team namin na i-setup ang data ng outlet mo mula sa malayo. Sa araw-araw, i-tap lang ng staff ang start/stop sa bawat unit — awtomatikong binibilang ng sistema ang bayarin, kinokontrol ang TV, at itinatala lahat sa reports; ang pag-close ng shift ay pagbibilang na lang ng physical na pera habang itinutugma ito ng sistema." },
        { q: "Kailangan ba ng patuloy na koneksyon sa internet?", a: "Para sa daily na transaksyon ng cashier, inirerekomenda ang matatag na koneksyon sa internet. Ipapaalam sa iyo ng team namin ang eksaktong technical requirement base sa plano at bilang ng unit na piniling mo." },
        { q: "May long-term contract ba o anumang nakatagong bayad?", a: "Walang long-term contract at walang nakatagong bayad. Saklaw na ng isang presyo ang lahat ng pangunahing feature, at puwede kang mag-cancel ng subscription anumang oras." },
      ],
    },
    footer: { alamatLabel: "Address:", teleponLabel: "Telepono:", emailLabel: "Email:", copyright: "© 2026 NEXBILL Billing System. Nakalaan ang lahat ng karapatan.", refundLabel: "Patakaran sa Refund", termsLabel: "Mga Tuntunin at Kundisyon" },
    cookieBanner: {
      message: "Gumagamit kami ng cookies para mapahusay ang karanasan mo sa site na ito at suriin ang traffic. Sa pagpapatuloy, sumasang-ayon ka sa paggamit namin ng cookies ayon sa aming Patakaran sa Cookie.",
      accept: "Tanggapin",
      decline: "Tanggihan",
      policyLinkLabel: "Patakaran sa Cookie",
    },
    about: {
      heroTitle: "Binubuo namin ang gulugod ng negosyong PlayStation rental.",
      heroLede: "Ipinanganak ang NEXBILL mula sa aktwal na karanasan sa pagpapatakbo ng PS rental outlet — hindi generic na software na ipinilit sa industriyang ito, kundi isang sistema na dinisenyo mula sa cashier floor hanggang sa profit-and-loss report, para makapag-focus ang may-ari ng outlet sa pagsisilbi sa customer, hindi sa manual na pagkukuwenta sa cash book.",
      stats: [
        { num: "500+", label: "PS rental outlet sa buong Timog-Silangang Asya" },
        { num: "0% Tulo", label: "Automatic na pagbibilang bawat segundo" },
        { num: "24 Oras", label: "Self-service na online booking system" },
        { num: "Support", label: "Priority sa WhatsApp, anumang oras" },
      ],
      values: [
        { num: "01", title: "Binuo mula sa aktwal na larangan", desc: "Hindi generic na software na idinikit lang — bawat feature ay nagmula sa totoong daily workflow ng cashier ng PS rental, mula sa pagbukas ng shift hanggang sa pagsara ng cash." },
        { num: "02", title: "Transparent hanggang segundo", desc: "Tumpak na binibilang ang rental timer bawat segundo, awtomatikong nabubuo ang financial reports — walang pagkakaibang puwedeng magtago." },
        { num: "03", title: "Lumalago kasabay ng outlet mo", desc: "Mula sa isang outlet na iisang unit hanggang sa multi-branch na may dose-dosenang konsol, iisa ang sistema — laki lang ng scale ang nagbabago." },
      ],
      ctaTitle: "Handa ka na bang pamahalaan ang PS rental mo nang mas maayos?", ctaButton: "Sumubok Nang Libre sa 30 Araw",
    },
    // MS/TH/VI/FIL pillar articles don't exist as separate translated pages yet (only ID and EN
    // do — see src/app/en/*) — these link to the ID originals for now, with just the link LABEL
    // translated, rather than 404ing or silently falling back to English.
    pillarLinks: {
      heading: "Alamin Pa Nang Higit Tungkol sa NEXBILL",
      items: [
        { label: "Paano gumagana ang billing ng PS rental na tumpak hanggang segundo", href: "/billing-rental-ps" },
        { label: "App para sa PS rental para sa pang-araw-araw na operasyon", href: "/aplikasi-rental-ps" },
        { label: "Kumpletong saklaw ng software para sa PS rental", href: "/software-rental-ps" },
        { label: "Sistema ng PS rental para sa maraming sangay", href: "/sistem-rental-ps" },
      ],
    },
  },
};

// --- Context / provider / hook ---

const STORAGE_KEY = "nexbill_landing_lang";

const LanguageContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: LandingCopy } | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Always starts at "id" — including on the client's very first render, NOT just during SSR.
  // The previous version read localStorage inside the useState initializer itself, which runs
  // once per mount on BOTH the server (where it always fell through to "id", since window is
  // undefined there) AND the client's first render (where window DOES exist, so a visitor who'd
  // previously picked "en" got lang="en" immediately). React hydration compares the server's HTML
  // against exactly that first client render — "id" vs "en" text differing right there is exactly
  // what threw "Hydration failed because the server rendered text didn't match the client" (nav
  // links being the first thing that diverged). Reading localStorage in a useEffect instead means
  // it only ever runs AFTER hydration has already reconciled successfully — both sides start
  // "id", matching a real language switch in afterward (one extra render, but a correct, silent
  // one, not a mismatch).
  const [lang, setLangState] = useState<Lang>("id");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (saved && saved in LANDING_COPY) setLangState(saved);
    } catch {
      // localStorage unavailable (e.g. privacy mode) — silently keep the "id" default.
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore write failures — language just won't persist across reloads this time.
    }
  };

  const value = useMemo(() => ({ lang, setLang, t: LANDING_COPY[lang] }), [lang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage() must be used inside <LanguageProvider>");
  return ctx;
}
