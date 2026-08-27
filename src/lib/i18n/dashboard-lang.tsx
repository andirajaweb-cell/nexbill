"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { LANG_OPTIONS, LANG_STORAGE_KEY, translate, type LangCode } from "./registry";
// Side-effect import: registers the shell dictionary (nav/sidebar/topbar/dashboard overview)
// into the registry. Imported here (not from the server layout) so it runs in BOTH the
// server-side render pass of this "use client" module and the browser bundle after hydration —
// a plain import in the Server Component layout only populated the server's module instance,
// leaving the browser's registry empty and every t() call falling back to the raw key.
import "./dict-shell";

/**
 * Dashboard-wide language system. Distinct from the /login page's local COPY dictionary —
 * this one is a shared registry (see registry.ts) so any dashboard page/component can register
 * its own strings (registerDict) and read them via useDashboardLang().t(key). Keeps translation
 * ownership next to the feature that needs it instead of one giant file. This file only wraps
 * that plain data layer in React context — kept separate so dictionaries can be registered from
 * Server Components (like the dashboard layout) without tripping a client/server boundary error.
 */

export type { LangCode };
export { LANG_OPTIONS };

interface Ctx {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  /** Looks up `key` in the active language, falls back to Indonesian, then to `fallback`/`key`. */
  t: (key: string, fallback?: string) => string;
}

const LangContext = createContext<Ctx | null>(null);

export function DashboardLangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("id");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(LANG_STORAGE_KEY) : null;
    if (saved && LANG_OPTIONS.some((o) => o.code === saved)) setLangState(saved as LangCode);
  }, []);

  const setLang = (l: LangCode) => {
    setLangState(l);
    if (typeof window !== "undefined") window.localStorage.setItem(LANG_STORAGE_KEY, l);
  };

  const t = (key: string, fallback?: string) => translate(lang, key, fallback);

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useDashboardLang(): Ctx {
  const ctx = useContext(LangContext);
  if (!ctx) {
    // Pages rendered outside the dashboard shell (or before hydration) get a safe no-op
    // fallback instead of a hard crash — always resolves to the Indonesian source strings.
    return { lang: "id", setLang: () => {}, t: (key, fallback) => translate("id", key, fallback) };
  }
  return ctx;
}
