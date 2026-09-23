import type { LangCode } from "@/lib/i18n/registry";

/**
 * Pemilihan bahasa untuk produk afiliasi — MURNI, tanpa SATU PUN impor server.
 *
 * Dipisahkan dari translate-product.ts dengan alasan yang sama persis seperti pemisahan
 * lib/rental/charge.ts dari pricing.ts, dan lib/accounting/coa-data.ts dari coa.ts: file sebelah
 * membuat klien Anthropic di tingkat modul, jadi mengimpornya dari halaman "use client" akan
 * menyeret seluruh SDK Anthropic masuk ke bundel browser — untuk sebuah fungsi yang isinya cuma
 * JSON.parse dan beberapa cadangan nilai.
 *
 * JANGAN tambahkan impor apa pun ke file ini selain tipe.
 */

export interface ProductTranslatableFields {
  title: string;
  description?: string | null;
  category?: string | null;
}

export type ProductTranslations = Partial<Record<Exclude<LangCode, "id">, ProductTranslatableFields>>;

/**
 * Mengambil versi berbahasa `lang` dari sebuah produk, dengan cadangan ke teks Indonesia aslinya.
 *
 * Cadangannya berlapis dan sengaja tidak pernah menghasilkan teks kosong: bahasa yang diminta →
 * Bahasa Indonesia. Produk yang belum pernah diterjemahkan, atau yang penerjemahannya gagal, tetap
 * tampil utuh — hanya dalam Bahasa Indonesia. Itu yang membuat kegagalan penerjemah tidak pernah
 * berubah menjadi kartu produk kosong di layar merchant.
 */
export function pickProductLang(
  product: { title: string; description?: string | null; category?: string | null; translationsJson?: string | null },
  lang: LangCode
): ProductTranslatableFields {
  const fallback = { title: product.title, description: product.description ?? null, category: product.category ?? null };
  if (lang === "id" || !product.translationsJson) return fallback;

  try {
    const parsed = JSON.parse(product.translationsJson) as ProductTranslations;
    const entry = parsed?.[lang as Exclude<LangCode, "id">];
    if (!entry?.title) return fallback;
    return {
      title: entry.title,
      // Deskripsi dan kategori jatuh ke Indonesia satu per satu, bukan sekaligus — terjemahan yang
      // judulnya berhasil tapi deskripsinya kosong tetap lebih berguna daripada dibuang seluruhnya.
      description: entry.description ?? fallback.description,
      category: entry.category ?? fallback.category,
    };
  } catch {
    // JSON rusak diperlakukan sama seperti terjemahan yang belum ada.
    return fallback;
  }
}
