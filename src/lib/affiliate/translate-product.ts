import Anthropic from "@anthropic-ai/sdk";
import type { LangCode } from "@/lib/i18n/registry";
// Tipe dan pemilih bahasa tinggal di file MURNI terpisah supaya halaman "use client" bisa
// memakainya tanpa ikut menarik SDK Anthropic di bawah ini ke bundel browser.
import type { ProductTranslatableFields, ProductTranslations } from "./product-lang";
export type { ProductTranslatableFields, ProductTranslations } from "./product-lang";
export { pickProductLang } from "./product-lang";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/** Bahasa tujuan — Indonesia tidak termasuk karena kolom aslinya di tabel SUDAH berbahasa Indonesia. */
const TARGET_LANGS: { code: Exclude<LangCode, "id">; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ms", label: "Bahasa Malaysia" },
  { code: "th", label: "Thai (ไทย)" },
  { code: "fil", label: "Filipino" },
  { code: "vi", label: "Vietnamese (Tiếng Việt)" },
];


/**
 * Menerjemahkan judul, deskripsi, dan kategori satu produk ke lima bahasa dalam SATU panggilan.
 *
 * KENAPA SATU PANGGILAN, BUKAN LIMA. translateReply() yang sudah ada (lib/ai/translate.ts) bekerja
 * per bahasa, dan memanggilnya lima kali berarti lima kali biaya dan lima kali latensi untuk teks
 * yang sama. Lebih dari itu, tiap panggilan tidak tahu hasil panggilan lain, sehingga istilah yang
 * sama bisa diterjemahkan berbeda-beda antar bahasa. Satu panggilan yang mengembalikan JSON
 * menyelesaikan ketiganya sekaligus.
 *
 * KENAPA KEGAGALANNYA TIDAK BOLEH MENGGAGALKAN PENYIMPANAN. Fungsi ini memanggil layanan luar yang
 * bisa lambat, kehabisan kuota, atau mati. Kalau kegagalannya ikut membatalkan penyimpanan produk,
 * tim kurasi kehilangan pekerjaannya hanya karena penerjemah sedang bermasalah — padahal produknya
 * sendiri sudah lengkap dan siap tampil dalam Bahasa Indonesia. Karena itu fungsi ini
 * mengembalikan `null` saat gagal, tidak pernah melempar, dan pemanggilnya menyimpan apa adanya.
 *
 * ISTILAH YANG TIDAK BOLEH DITERJEMAHKAN dijaga lewat system prompt: nama merek dan model produk
 * (ZBT, WE2008-C, PlayStation), satuan teknis (500Mbps, 2.4GHz), dan singkatan jaringan (WiFi, LTE,
 * SIM). Menerjemahkan "500Mbps" atau "PlayStation" akan membuat produknya justru lebih sulit
 * dikenali, bukan lebih mudah.
 */
export async function translateProductFields(input: ProductTranslatableFields): Promise<ProductTranslations | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!input.title?.trim()) return null;

  const payload = {
    title: input.title,
    description: input.description ?? "",
    category: input.category ?? "",
  };

  const langList = TARGET_LANGS.map((l) => `"${l.code}" (${l.label})`).join(", ");

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2048,
      system: [
        "Kamu penerjemah katalog produk untuk NEXBILL, SaaS POS/rental PlayStation di Asia Tenggara.",
        `Terjemahkan objek JSON berikut dari Bahasa Indonesia ke ${TARGET_LANGS.length} bahasa: ${langList}.`,
        "",
        "ATURAN:",
        "- JANGAN terjemahkan nama merek dan model produk (contoh: ZBT, WE2008-C, PlayStation, Shopee).",
        "- JANGAN terjemahkan satuan/spesifikasi teknis (contoh: 500Mbps, 2.4GHz, 4G, LTE, Sim Card).",
        "- Pertahankan panjang dan nada aslinya: ini teks pemasaran singkat untuk pemilik rental PS, bukan dokumen formal.",
        "- Kalau sebuah kolom kosong di input, kembalikan string kosong juga untuk kolom itu.",
        "",
        "Balas HANYA dengan JSON valid, tanpa penjelasan, tanpa blok kode markdown, persis berbentuk:",
        `{${TARGET_LANGS.map((l) => `"${l.code}":{"title":"...","description":"...","category":"..."}`).join(",")}}`,
      ].join("\n"),
      messages: [{ role: "user", content: JSON.stringify(payload) }],
    });

    const textBlock = response.content.find((c): c is Anthropic.TextBlock => c.type === "text");
    const raw = textBlock?.text?.trim();
    if (!raw) return null;

    // Model kadang membungkus hasilnya dalam blok kode meski sudah diminta tidak — dibersihkan
    // daripada menggagalkan seluruh terjemahan karena tiga karakter pagar.
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(cleaned);

    const result: ProductTranslations = {};
    for (const { code } of TARGET_LANGS) {
      const entry = parsed?.[code];
      if (!entry || typeof entry.title !== "string" || !entry.title.trim()) continue;
      result[code] = {
        title: entry.title.trim(),
        description: typeof entry.description === "string" ? entry.description.trim() || null : null,
        category: typeof entry.category === "string" ? entry.category.trim() || null : null,
      };
    }

    // Semua bahasa gagal diurai = tidak ada gunanya menyimpan objek kosong.
    return Object.keys(result).length > 0 ? result : null;
  } catch (err) {
    // Sengaja hanya dicatat, tidak dilempar — lihat doc comment di atas.
    console.error("Gagal menerjemahkan produk afiliasi:", err);
    return null;
  }
}
