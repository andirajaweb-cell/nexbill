/**
 * Pemuat buku bantuan per bahasa. Bahasa Indonesia diimpor langsung (dipakai juga di server untuk
 * validasi id kategori & editan Superuser); bahasa lain dimuat terpisah (dynamic import) supaya
 * browser hanya mengunduh bahasa yang sedang dipakai.
 */
import type { HelpBook, HelpCategory, HelpLang } from "../types";
import { HELP_BOOK_ID } from "./id";

export { HELP_BOOK_ID };

export async function loadHelpBook(lang: HelpLang): Promise<HelpBook> {
  switch (lang) {
    case "en":
      return (await import("./en")).HELP_BOOK_EN;
    case "ms":
      return (await import("./ms")).HELP_BOOK_MS;
    case "th":
      return (await import("./th")).HELP_BOOK_TH;
    case "fil":
      return (await import("./fil")).HELP_BOOK_FIL;
    case "vi":
      return (await import("./vi")).HELP_BOOK_VI;
    default:
      return HELP_BOOK_ID;
  }
}

/**
 * Gabungkan buku bahasa aktif ke urutan & daftar kategori versi Indonesia: kategori yang belum
 * diterjemahkan tetap tampil (dalam Bahasa Indonesia), kategori yang tidak ada di versi Indonesia
 * diabaikan. Label grup juga jatuh ke Indonesia bila kosong.
 */
export function mergeWithSource(book: HelpBook): HelpBook {
  if (book === HELP_BOOK_ID) return book;
  const byId = new Map(book.categories.map((c) => [c.id, c]));
  const categories: HelpCategory[] = HELP_BOOK_ID.categories.map((src) => {
    const tr = byId.get(src.id);
    return tr ? { ...tr, id: src.id, group: src.group } : src;
  });
  const groups = { ...HELP_BOOK_ID.groups };
  for (const k of Object.keys(groups) as (keyof typeof groups)[]) if (book.groups[k]) groups[k] = book.groups[k];
  return { groups, categories };
}
