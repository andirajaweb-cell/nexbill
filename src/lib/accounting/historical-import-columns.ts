/**
 * Judul kolom template Impor Data Historis — satu sumber untuk file Excel yang diunduh
 * (historical-import.ts) DAN daftar kolom yang ditampilkan di layar Migrasi Data, supaya yang
 * terlihat di layar selalu persis sama dengan judul kolom di file. Modul murni (tanpa db/Node API)
 * agar bisa diimpor dari komponen client.
 *
 * Template tersedia dalam Bahasa Indonesia dan Inggris. Dashboard berbahasa Indonesia mendapat
 * template Indonesia; bahasa lain (en/ms/th/fil/vi) mendapat template Inggris. Importer menerima
 * judul kolom kedua bahasa, jadi file lama tetap bisa dipakai apa pun bahasa dashboard-nya.
 */

export type HistoricalCategory = "penjualan" | "pembelian" | "pendapatan_lain" | "pengeluaran";
export type TemplateLang = "id" | "en";
export type ColKey = "tanggal" | "kategori" | "kodeAkun" | "deskripsi" | "nominal" | "diskon" | "hpp" | "kodeHpp" | "metode" | "pihak" | "referensi";

export interface TemplateColumn {
  key: ColKey;
  header: Record<TemplateLang, string>;
}

/** Bahasa template untuk bahasa dashboard: Indonesia → "id", selain itu → "en". */
export function templateLangFor(lang: string | null | undefined): TemplateLang {
  return lang === "id" ? "id" : "en";
}

const col = (key: ColKey, id: string, en: string): TemplateColumn => ({ key, header: { id, en } });

export const TEMPLATE_COLUMNS: Record<HistoricalCategory, TemplateColumn[]> = {
  penjualan: [
    col("tanggal", "Tanggal*", "Date*"),
    col("kategori", "Kategori Pendapatan", "Revenue Category"),
    col("kodeAkun", "Kode Akun Pendapatan", "Revenue Account Code"),
    col("deskripsi", "Deskripsi", "Description"),
    col("nominal", "Penjualan Kotor*", "Gross Sales*"),
    col("diskon", "Diskon", "Discount"),
    col("hpp", "HPP", "COGS"),
    col("kodeHpp", "Kode Akun HPP", "COGS Account Code"),
    col("metode", "Metode Pembayaran*", "Payment Method*"),
    col("pihak", "Pelanggan", "Customer"),
    col("referensi", "Referensi", "Reference"),
  ],
  pembelian: [
    col("tanggal", "Tanggal*", "Date*"),
    col("kategori", "Jenis", "Purchase Type"),
    col("kodeAkun", "Kode Akun Tujuan", "Target Account Code"),
    col("deskripsi", "Deskripsi", "Description"),
    col("nominal", "Nominal*", "Amount*"),
    col("metode", "Metode Pembayaran*", "Payment Method*"),
    col("pihak", "Supplier", "Supplier"),
    col("referensi", "Referensi", "Reference"),
  ],
  pendapatan_lain: [
    col("tanggal", "Tanggal*", "Date*"),
    col("kategori", "Kategori", "Category"),
    col("kodeAkun", "Kode Akun Pendapatan", "Revenue Account Code"),
    col("deskripsi", "Deskripsi", "Description"),
    col("pihak", "Diterima Dari", "Received From"),
    col("nominal", "Nominal*", "Amount*"),
    col("metode", "Metode Pembayaran*", "Payment Method*"),
  ],
  pengeluaran: [
    col("tanggal", "Tanggal*", "Date*"),
    col("kategori", "Kategori Beban", "Expense Category"),
    col("kodeAkun", "Kode Akun Beban", "Expense Account Code"),
    col("deskripsi", "Deskripsi", "Description"),
    col("pihak", "Dibayar Kepada", "Paid To"),
    col("nominal", "Nominal*", "Amount*"),
    col("metode", "Metode Pembayaran*", "Payment Method*"),
  ],
};

/** Judul kolom baris 1 template, persis seperti di file Excel. */
export function templateHeaders(category: HistoricalCategory, lang: TemplateLang): string[] {
  return TEMPLATE_COLUMNS[category].map((c) => c.header[lang]);
}

/** Judul satu kolom dalam bahasa template (dipakai di pesan error). */
export function templateHeader(category: HistoricalCategory, key: ColKey, lang: TemplateLang): string {
  return TEMPLATE_COLUMNS[category].find((c) => c.key === key)?.header[lang] ?? key;
}

/** Nama sheet di file template, per bahasa. */
export const DATA_SHEET_NAME: Record<HistoricalCategory, Record<TemplateLang, string>> = {
  penjualan: { id: "Penjualan", en: "Sales" },
  pembelian: { id: "Pembelian", en: "Purchases" },
  pendapatan_lain: { id: "Pendapatan Lain-lain", en: "Other Income" },
  pengeluaran: { id: "Pengeluaran", en: "Expenses" },
};

export const AUX_SHEET_NAME = {
  guide: { id: "Petunjuk", en: "Instructions" },
  example: { id: "Contoh", en: "Example" },
  options: { id: "Pilihan", en: "Options" },
  accounts: { id: "Daftar Akun", en: "Account List" },
} as const satisfies Record<string, Record<TemplateLang, string>>;
