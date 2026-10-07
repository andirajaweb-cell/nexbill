/**
 * Pure data layer for the dashboard i18n system — deliberately NOT "use client". It holds no
 * React state and touches no browser APIs, so it's safe to import from Server Components too
 * (e.g. src/app/dashboard/layout.tsx importing dict-shell.ts for its registration side effect).
 * Only the React context/provider/hook (dashboard-lang.tsx) needs the "use client" boundary —
 * keeping the registry itself framework-agnostic avoids the "calling a client function from
 * the server" crash that happens when a client-only module is imported purely for a top-level
 * side effect from server code.
 */

export type LangCode = "id" | "en" | "ms" | "th" | "fil" | "vi";

export const LANG_OPTIONS: { code: LangCode; label: string; flag: string }[] = [
  { code: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ms", label: "Bahasa Malaysia", flag: "🇲🇾" },
  { code: "th", label: "ไทย", flag: "🇹🇭" },
  { code: "fil", label: "Filipino", flag: "🇵🇭" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
];

export const LANG_STORAGE_KEY = "nexbill_dashboard_lang";

/** BCP 47 locale per dashboard language — for toLocaleDateString/Intl so dates follow the UI language. */
export const DATE_LOCALE: Record<LangCode, string> = { id: "id-ID", en: "en-US", ms: "ms-MY", th: "th-TH", fil: "fil-PH", vi: "vi-VN" };

type Dict = Record<string, string>;
type DictSet = Record<LangCode, Dict>;

const registry: DictSet = { id: {}, en: {}, ms: {}, th: {}, fil: {}, vi: {} };

/** Author dictionaries as { key: { id: "...", en: "...", ... } } — easier to review per string
 * than per language. This transposes into the internal per-language registry. */
export function registerDict(entries: Record<string, Partial<Record<LangCode, string>>>) {
  for (const key of Object.keys(entries)) {
    const perLang = entries[key];
    (Object.keys(perLang) as LangCode[]).forEach((lc) => {
      const value = perLang[lc];
      // "" is a real translation (e.g. Thai drops a sentence-final "."), so only skip undefined.
      if (value !== undefined) registry[lc][key] = value;
    });
  }
}

export function translate(lang: LangCode, key: string, fallback?: string): string {
  return registry[lang]?.[key] ?? registry.id[key] ?? fallback ?? key;
}

/** True when `key` has its own string in `lang` (no fallback to Indonesian). Used by the i18n coverage test. */
export function hasTranslation(lang: LangCode, key: string): boolean {
  return registry[lang]?.[key] !== undefined;
}

/** Every registered key with its Indonesian source text — read by the i18n audit tests. */
export function registeredIndonesian(): Readonly<Record<string, string>> {
  return registry.id;
}
