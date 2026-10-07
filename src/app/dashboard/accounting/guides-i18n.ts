import type { LangCode } from "@/lib/i18n/registry";
import { GUIDES_ID, type AccountingGuideSet } from "./guides";
import { GUIDES_EN } from "./guides-en";
import { GUIDES_MS } from "./guides-ms";
import { GUIDES_TH } from "./guides-th";
import { GUIDES_FIL } from "./guides-fil";
import { GUIDES_VI } from "./guides-vi";

/** Panduan Accounting per bahasa dasbor (6 bahasa). Bahasa tak dikenal → Bahasa Indonesia. */
export const ACCOUNTING_GUIDES: Record<LangCode, AccountingGuideSet> = {
  id: GUIDES_ID,
  en: GUIDES_EN,
  ms: GUIDES_MS,
  th: GUIDES_TH,
  fil: GUIDES_FIL,
  vi: GUIDES_VI,
};

export function getAccountingGuides(lang: LangCode): AccountingGuideSet {
  return ACCOUNTING_GUIDES[lang] ?? GUIDES_ID;
}
