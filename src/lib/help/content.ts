/**
 * Pintu masuk lama Pusat Bantuan — isi sebenarnya sekarang ada di src/lib/help/content/<lang>/
 * (lihat src/lib/help/types.ts). File ini hanya meneruskan versi Bahasa Indonesia untuk kode yang
 * sudah memakainya (validasi id di /api/help-content, merge editan di lib/help/overrides.ts).
 */
import { HELP_BOOK_ID } from "./content/id";
import { HELP_GROUP_IDS } from "./types";

export type { HelpCategory, HelpSubsection, HelpGroupId, HelpBook } from "./types";

export const HELP_CATEGORIES = HELP_BOOK_ID.categories;
export const HELP_GROUPS_ORDER = HELP_GROUP_IDS;
