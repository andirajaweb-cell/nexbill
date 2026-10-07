import type { LangCode } from "@/lib/i18n/registry";
import { ACCOUNTING_GUIDE_BOOK_ID, type AccountingGuideBook } from "./guides";
import { ACCOUNTING_GUIDE_BOOK_EN } from "./guides.en";
import { ACCOUNTING_GUIDE_BOOK_MS } from "./guides.ms";
import { ACCOUNTING_GUIDE_BOOK_TH } from "./guides.th";
import { ACCOUNTING_GUIDE_BOOK_FIL } from "./guides.fil";
import { ACCOUNTING_GUIDE_BOOK_VI } from "./guides.vi";

/** Panduan Accounting per bahasa dashboard. Struktur tiap bahasa diperiksa oleh guides.test.ts. */
export const ACCOUNTING_GUIDE_BOOKS: Record<LangCode, AccountingGuideBook> = {
  id: ACCOUNTING_GUIDE_BOOK_ID,
  en: ACCOUNTING_GUIDE_BOOK_EN,
  ms: ACCOUNTING_GUIDE_BOOK_MS,
  th: ACCOUNTING_GUIDE_BOOK_TH,
  fil: ACCOUNTING_GUIDE_BOOK_FIL,
  vi: ACCOUNTING_GUIDE_BOOK_VI,
};

export function getAccountingGuideBook(lang: LangCode): AccountingGuideBook {
  return ACCOUNTING_GUIDE_BOOKS[lang] ?? ACCOUNTING_GUIDE_BOOK_ID;
}
