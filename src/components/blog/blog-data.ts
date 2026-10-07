import { SITE_URL } from "@/lib/site-config";

/**
 * Daftar blog NEXBILL dalam dua bahasa — Indonesia (/blog) dan Inggris (/en/blog). Satu sumber untuk
 * judul, ringkasan, URL, dan pasangan hreflang setiap halaman, supaya daftar artikel di halaman indeks,
 * klaster, penulis, artikel terkait, dan sitemap tidak bisa saling menyimpang. Isi artikel sendiri ada
 * di file route masing-masing (src/app/blog/... dan src/app/en/blog/...). Blog sengaja hanya dua
 * bahasa: pasar utama Indonesia + Inggris untuk pengunjung internasional.
 */

export type BlogLang = "id" | "en";
export const BLOG_LANGS: BlogLang[] = ["id", "en"];
export const HREFLANG: Record<BlogLang, string> = { id: "id-ID", en: "en-US" };

type Pair = Record<BlogLang, string>;

export const BLOG_ROOT: Pair = { id: "/blog", en: "/en/blog" };
export const AUTHOR_ROOT: Pair = { id: "/authors", en: "/en/authors" };

export interface BlogCluster {
  key: string;
  slug: Pair;
  label: Pair;
  /** Judul H1 halaman klaster. */
  heading: Pair;
  desc: Pair;
  intro: Pair;
  metaTitle: Pair;
  metaDescription: Pair;
}

export const BLOG_CLUSTERS: BlogCluster[] = [
  {
    key: "billing",
    slug: { id: "billing-dan-operasional", en: "billing-and-operations" },
    label: { id: "Billing & Operasional", en: "Billing & Operations" },
    heading: { id: "Billing & Operasional Rental PS", en: "PS Rental Billing & Operations" },
    desc: {
      id: "Cara hitung tarif sewa, BEP, dan operasional kasir rental PS sehari-hari.",
      en: "How to set rental rates, find your break-even point, and run day-to-day cashier operations at a PS rental.",
    },
    intro: {
      id: "Enam panduan praktis seputar tarif, BEP, dan operasional kasir harian rental PlayStation — ditulis oleh pemilik outlet, bukan sekadar teori.",
      en: "Six practical guides on pricing, break-even and daily cashier operations at a PlayStation rental — written by an outlet owner, not just theory.",
    },
    metaTitle: { id: "Billing & Operasional Rental PS — Blog NEXBILL", en: "PS Rental Billing & Operations — NEXBILL Blog" },
    metaDescription: {
      id: "Panduan cara hitung tarif sewa PS, BEP, tutup shift kasir, dan operasional harian rental PlayStation — kumpulan artikel billing & operasional NEXBILL.",
      en: "Guides to pricing PS rentals, break-even analysis, closing cashier shifts and the daily operations of a PlayStation rental — NEXBILL's billing & operations articles.",
    },
  },
];

export interface BlogArticleMeta {
  key: string;
  cluster: string;
  slug: Pair;
  title: Pair;
  /** Judul pendek untuk tautan "artikel terkait". */
  shortTitle: Pair;
  /** Dek di halaman artikel (dan meta description). */
  dek: Pair;
  /** Ringkasan satu kalimat di daftar klaster. */
  summary: Pair;
  readingTime: Pair;
  publishedAt: string;
}

export const BLOG_ARTICLES: BlogArticleMeta[] = [
  {
    key: "pricing",
    cluster: "billing",
    slug: { id: "cara-hitung-tarif-sewa-ps", en: "how-to-price-ps-rentals" },
    title: { id: "Cara Menghitung Tarif Sewa PS yang Tepat (Per Jam, Paket, dan Member)", en: "How to Price PS Rentals Properly (Hourly, Packages and Members)" },
    shortTitle: { id: "Cara Menghitung Tarif Sewa PS yang Tepat", en: "How to Price PS Rentals Properly" },
    dek: {
      id: "Tarif yang asal comot dari outlet sebelah bisa bikin Anda rugi tanpa sadar. Ini dua metode yang lebih aman untuk menentukan harga sewa PS Anda sendiri.",
      en: "Copying the rate from the outlet next door can quietly lose you money. Here are two safer methods for setting your own PS rental prices.",
    },
    summary: {
      id: "Metode cost-plus dan break-even untuk menentukan tarif sewa PS yang tidak rugi tapi tetap kompetitif.",
      en: "Cost-plus and break-even methods for PS rental rates that don't lose money but stay competitive.",
    },
    readingTime: { id: "7 menit baca", en: "7 min read" },
    publishedAt: "2026-08-03",
  },
  {
    key: "breakEven",
    cluster: "billing",
    slug: { id: "bep-rental-ps", en: "ps-rental-break-even-point" },
    title: { id: "BEP (Break Even Point) Rental PS: Cara Hitung dan Simulasinya", en: "PS Rental Break-Even Point: How to Calculate It, with a Worked Example" },
    shortTitle: { id: "BEP (Break Even Point) Rental PS: Cara Hitung dan Simulasinya", en: "PS Rental Break-Even Point: How to Calculate It" },
    dek: {
      id: "Sebelum tanya \"kapan balik modal\", jawab dulu pertanyaan yang lebih mendasar: berapa jam sewa per bulan yang dibutuhkan supaya outlet Anda tidak rugi?",
      en: "Before asking \"when will I get my money back\", answer a more basic question: how many rental hours a month does your outlet need just to stop losing money?",
    },
    summary: {
      id: "Rumus BEP dijelaskan dengan contoh simulasi angka, supaya Anda tahu kapan modal outlet balik.",
      en: "The break-even formula explained with a worked example, so you know when your outlet pays for itself.",
    },
    readingTime: { id: "8 menit baca", en: "8 min read" },
    publishedAt: "2026-08-10",
  },
  {
    key: "cashierMistakes",
    cluster: "billing",
    slug: { id: "kesalahan-kasir-rental-ps", en: "ps-rental-cashier-mistakes" },
    title: { id: "5 Kesalahan Kasir Rental PS yang Bikin Kas Bocor", en: "5 PS Rental Cashier Mistakes That Leak Cash" },
    shortTitle: { id: "5 Kesalahan Kasir Rental PS yang Bikin Kas Bocor", en: "5 PS Rental Cashier Mistakes That Leak Cash" },
    dek: {
      id: "Kebocoran kas rental PS jarang karena dicuri — biasanya karena lima kesalahan operasional sepele ini yang berulang setiap hari.",
      en: "Cash leaks at a PS rental are rarely theft — they usually come from these five small operational mistakes repeated every day.",
    },
    summary: {
      id: "Kebocoran kas rental PS jarang karena dicuri — biasanya karena lima kesalahan operasional ini.",
      en: "Cash leaks at a PS rental are rarely theft — usually they come from these five operational mistakes.",
    },
    readingTime: { id: "6 menit baca", en: "6 min read" },
    publishedAt: "2026-08-17",
  },
  {
    key: "closeShift",
    cluster: "billing",
    slug: { id: "cara-tutup-shift-kasir-rental-ps", en: "how-to-close-a-ps-rental-cashier-shift" },
    title: { id: "Cara Tutup Shift Kasir Rental PS yang Rapi dan Anti Selisih", en: "How to Close a PS Rental Cashier Shift Cleanly, with No Discrepancies" },
    shortTitle: { id: "Cara Tutup Shift Kasir Rental PS yang Rapi dan Anti Selisih", en: "How to Close a Cashier Shift with No Discrepancies" },
    dek: {
      id: "Checklist tutup shift langkah demi langkah, supaya kas fisik dan catatan transaksi selalu cocok — dan kalau tidak cocok, cepat ketahuan di shift mana.",
      en: "A step-by-step shift-closing checklist, so physical cash and transaction records always match — and when they don't, you quickly know which shift it was.",
    },
    summary: {
      id: "Checklist tutup shift langkah demi langkah supaya kas fisik dan catatan transaksi selalu cocok.",
      en: "A step-by-step shift-closing checklist so physical cash and transaction records always match.",
    },
    readingTime: { id: "6 menit baca", en: "6 min read" },
    publishedAt: "2026-08-21",
  },
  {
    key: "ps4VsPs5",
    cluster: "billing",
    slug: { id: "harga-sewa-ps4-vs-ps5", en: "ps4-vs-ps5-rental-pricing" },
    title: { id: "Sewa PS4 vs PS5: Menentukan Harga yang Adil untuk Keduanya", en: "PS4 vs PS5 Rentals: Setting a Fair Price for Both" },
    shortTitle: { id: "Sewa PS4 vs PS5: Menentukan Harga yang Adil untuk Keduanya", en: "PS4 vs PS5 Rentals: Setting a Fair Price for Both" },
    dek: {
      id: "Kalau PS4 dan PS5 dipatok tarif sama rata, salah satu unit hampir pasti akan pincang okupansinya. Ini cara menentukan selisih harga yang wajar.",
      en: "If PS4 and PS5 are priced the same, one of them will almost certainly end up under-used. Here's how to set a sensible price gap.",
    },
    summary: {
      id: "Strategi harga diferensiasi antar generasi konsol supaya keduanya tetap laku disewa.",
      en: "A pricing strategy across console generations so both keep getting rented.",
    },
    readingTime: { id: "6 menit baca", en: "6 min read" },
    publishedAt: "2026-08-24",
  },
  {
    key: "multiBranch",
    cluster: "billing",
    slug: { id: "kapan-butuh-sistem-multi-cabang", en: "when-you-need-a-multi-branch-system" },
    title: { id: "Kapan Waktunya Rental PS Anda Butuh Sistem Multi-Cabang?", en: "When Does Your PS Rental Need a Multi-Branch System?" },
    shortTitle: { id: "Kapan Waktunya Rental PS Anda Butuh Sistem Multi-Cabang?", en: "When Does Your PS Rental Need a Multi-Branch System?" },
    dek: {
      id: "Buka cabang kedua terasa seperti pencapaian — tapi kalau sistemnya masih dikelola cara outlet tunggal, itu justru titik paling rawan bisnis mulai berantakan.",
      en: "Opening a second branch feels like an achievement — but if it's still run like a single outlet, that's exactly when a business starts to unravel.",
    },
    summary: {
      id: "Tanda-tanda outlet Anda sudah siap ekspansi, dan apa yang berubah secara operasional saat buka cabang kedua.",
      en: "Signs your outlet is ready to expand, and what changes operationally when you open a second branch.",
    },
    readingTime: { id: "7 menit baca", en: "7 min read" },
    publishedAt: "2026-08-28",
  },
];

/** Halaman pilar (produk) per bahasa — tujuan tautan "Terkait dengan NEXBILL". */
export const PILLARS: Record<string, { href: Pair; label: Pair }> = {
  billing: { href: { id: "/billing-rental-ps", en: "/en/playstation-rental-billing-software" }, label: { id: "Billing rental PS presisi detik →", en: "Per-second PS rental billing →" } },
  app: { href: { id: "/aplikasi-rental-ps", en: "/en/playstation-rental-app" }, label: { id: "Aplikasi rental PS untuk operasional harian →", en: "A PS rental app for daily operations →" } },
  software: { href: { id: "/software-rental-ps", en: "/en/playstation-rental-management-software" }, label: { id: "Software rental PS all-in-one →", en: "All-in-one PS rental software →" } },
  system: { href: { id: "/sistem-rental-ps", en: "/en/ps-rental-system" }, label: { id: "Sistem rental PS untuk multi-cabang →", en: "A PS rental system for multi-branch outlets →" } },
};

export const clusterByKey = (key: string) => {
  const c = BLOG_CLUSTERS.find((x) => x.key === key);
  if (!c) throw new Error(`Unknown blog cluster: ${key}`);
  return c;
};
export const articleByKey = (key: string) => {
  const a = BLOG_ARTICLES.find((x) => x.key === key);
  if (!a) throw new Error(`Unknown blog article: ${key}`);
  return a;
};

export const clusterPath = (key: string, lang: BlogLang) => `${BLOG_ROOT[lang]}/${clusterByKey(key).slug[lang]}`;
export const articlePath = (key: string, lang: BlogLang) => {
  const a = articleByKey(key);
  return `${clusterPath(a.cluster, lang)}/${a.slug[lang]}`;
};
export const authorPath = (slug: string, lang: BlogLang) => `${AUTHOR_ROOT[lang]}/${slug}`;

/** `alternates` untuk metadata Next.js: canonical bahasa ini + hreflang kedua bahasa. */
export function blogAlternates(paths: Pair, lang: BlogLang) {
  return {
    canonical: `${SITE_URL}${paths[lang]}`,
    languages: { [HREFLANG.id]: `${SITE_URL}${paths.id}`, [HREFLANG.en]: `${SITE_URL}${paths.en}`, "x-default": `${SITE_URL}${paths.id}` },
  };
}

export const pairOf = (fn: (lang: BlogLang) => string): Pair => ({ id: fn("id"), en: fn("en") });

/** Semua path blog kedua bahasa — dipakai sitemap. */
export function allBlogPaths(): string[] {
  const out: string[] = [];
  for (const lang of BLOG_LANGS) {
    out.push(BLOG_ROOT[lang]);
    for (const c of BLOG_CLUSTERS) out.push(clusterPath(c.key, lang));
    for (const a of BLOG_ARTICLES) out.push(articlePath(a.key, lang));
  }
  return out;
}

/** Teks bingkai blog (navigasi, judul bagian) per bahasa. */
export const BLOG_UI: Record<BlogLang, {
  home: string; blog: string; relatedPillars: string; relatedArticles: string; articlesBy: string; articleCount: string;
  indexTitle: string; indexIntro: string; indexMetaTitle: string; indexMetaDescription: string; otherLanguage: string;
}> = {
  id: {
    home: "Beranda",
    blog: "Blog",
    relatedPillars: "Terkait dengan NEXBILL",
    relatedArticles: "Artikel Terkait Lainnya",
    articlesBy: "Artikel dari {name}",
    articleCount: "{n} artikel →",
    indexTitle: "Blog NEXBILL",
    indexIntro: "Panduan praktis mengelola bisnis rental PlayStation, ditulis dari pengalaman langsung mengoperasikan outlet — bukan konten generik.",
    indexMetaTitle: "Blog NEXBILL — Bisnis, Billing & Operasional Rental PlayStation",
    indexMetaDescription: "Panduan praktis mengelola bisnis rental PlayStation — dari cara hitung tarif sewa, BEP, sampai operasional kasir harian, ditulis dari pengalaman langsung.",
    otherLanguage: "Read in English",
  },
  en: {
    home: "Home",
    blog: "Blog",
    relatedPillars: "Related on NEXBILL",
    relatedArticles: "More Related Articles",
    articlesBy: "Articles by {name}",
    articleCount: "{n} articles →",
    indexTitle: "NEXBILL Blog",
    indexIntro: "Practical guides to running a PlayStation rental business, written from first-hand experience operating an outlet — not generic content.",
    indexMetaTitle: "NEXBILL Blog — PlayStation Rental Business, Billing & Operations",
    indexMetaDescription: "Practical guides to running a PlayStation rental business — from setting rental rates and break-even analysis to daily cashier operations, written from first-hand experience.",
    otherLanguage: "Baca dalam Bahasa Indonesia",
  },
};
