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
      if (value) registry[lc][key] = value;
    });
  }
}

export function translate(lang: LangCode, key: string, fallback?: string): string {
  return registry[lang]?.[key] ?? registry.id[key] ?? fallback ?? key;
}
