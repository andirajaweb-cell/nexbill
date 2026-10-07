/**
 * Tipe data Pusat Bantuan (/dashboard/help).
 *
 * Isi bantuan ditulis per bahasa di src/lib/help/content/<lang>/ — SETIAP bahasa memakai `id`
 * kategori yang sama persis dengan versi Indonesia (sumber utama). Halaman bantuan menampilkan
 * versi bahasa aktif per kategori dan jatuh ke versi Indonesia kalau terjemahan kategori itu belum
 * ada. Test konsistensi: src/lib/help/content/consistency.test.ts.
 */

export interface HelpSubsection {
  title: string;
  /** Letak menu, mis. "Pengaturan → TV Screensaver". Tampil sebagai catatan kuning. */
  navHint?: string;
  intro?: string;
  steps?: string[];
  notes?: string[];
  /** Panduan bergambar yang ditampilkan di bawah langkah (komponen tetap, bukan teks yang bisa diedit). */
  visual?: "android-relay";
}

export const HELP_GROUP_IDS = ["mulai", "peran", "operasional", "penjualan", "inventori", "keuangan", "sistem", "bantuan"] as const;
export type HelpGroupId = (typeof HELP_GROUP_IDS)[number];

export interface HelpCategory {
  /** Kunci tetap — dipakai deep-link (?category=), editan Superuser, dan pencocokan antar-bahasa. */
  id: string;
  group: HelpGroupId;
  label: string;
  navHint?: string;
  summary: string;
  /** Siapa yang bisa memakai fitur ini, dalam bahasa sehari-hari. */
  roles?: string;
  steps?: string[];
  notes?: string[];
  subsections?: HelpSubsection[];
}

export interface HelpBook {
  /** Label tiap grup di sidebar bantuan. */
  groups: Record<HelpGroupId, string>;
  categories: HelpCategory[];
}

export type HelpLang = "id" | "en" | "ms" | "th" | "fil" | "vi";
