import type { LangCode } from "@/lib/i18n/registry";

const LANGS: LangCode[] = ["id", "en", "ms", "th", "fil", "vi"];

/** ?lang= dari klien → LangCode yang valid (default "id"). */
export function parseLang(v: string | null | undefined): LangCode {
  return LANGS.includes(v as LangCode) ? (v as LangCode) : "id";
}
