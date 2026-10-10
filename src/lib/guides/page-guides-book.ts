import type { LangCode } from "@/lib/i18n/registry";
import { PAGE_GUIDES_ID, type PageGuideBook } from "./page-guides";
import { PAGE_GUIDES_EN } from "./page-guides.en";
import { PAGE_GUIDES_MS } from "./page-guides.ms";
import { PAGE_GUIDES_TH } from "./page-guides.th";
import { PAGE_GUIDES_FIL } from "./page-guides.fil";
import { PAGE_GUIDES_VI } from "./page-guides.vi";

/** Panduan menu harian per bahasa dashboard. Struktur tiap bahasa diperiksa oleh page-guides.test.ts. */
export const PAGE_GUIDE_BOOKS: Record<LangCode, PageGuideBook> = {
  id: PAGE_GUIDES_ID,
  en: PAGE_GUIDES_EN,
  ms: PAGE_GUIDES_MS,
  th: PAGE_GUIDES_TH,
  fil: PAGE_GUIDES_FIL,
  vi: PAGE_GUIDES_VI,
};

export function getPageGuideBook(lang: LangCode): PageGuideBook {
  return PAGE_GUIDE_BOOKS[lang] ?? PAGE_GUIDES_ID;
}
