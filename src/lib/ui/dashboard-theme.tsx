"use client";

/**
 * Dark/Light toggle for /dashboard ONLY. The rest of the app (marketing site, /platform-admin)
 * keeps the fixed "GameMaster" dark neon look — this provider/class is never mounted there.
 *
 * How it avoids a flash of the wrong theme on load: the class is applied to <html> (not a local
 * wrapper div) so it also reaches things that render as siblings of {children} in the ROOT layout
 * (DialogHost, PsCursorSystem — see src/app/layout.tsx) even though they're outside this
 * provider's own React subtree. DashboardLayout renders a tiny synchronous inline <script> (see
 * dashboard/layout.tsx) that reads localStorage and adds "theme-light" to <html> BEFORE this
 * component hydrates, so the correct look is already painted by the time React takes over — this
 * component's initial state just needs to read the same localStorage key so its own re-render
 * agrees with what the script already put on the page (no visible flash, no class fighting).
 *
 * Cleans the class off <html> on unmount (leaving /dashboard) so a later visit to the marketing
 * site or /platform-admin in the same tab never inherits a light theme meant only for the
 * dashboard shell.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type DashboardTheme = "dark" | "light";

const STORAGE_KEY = "nexbill_dashboard_theme";
const HTML_CLASS = "theme-light";

function readStoredTheme(): DashboardTheme {
  if (typeof window === "undefined") return "dark";
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

const DashboardThemeContext = createContext<{ theme: DashboardTheme; toggleTheme: () => void } | null>(null);

export function DashboardThemeProvider({ children }: { children: ReactNode }) {
  // Lazy initializer runs during the component's first render — on the server that's
  // `typeof window === "undefined"` so it safely falls back to "dark"; on the client (including
  // during hydration) it reads the SAME localStorage key the anti-flash inline script already
  // used to set the class on <html>, so this state starts out already agreeing with the DOM
  // instead of briefly reverting to "dark" and then correcting a moment later (which is what a
  // separate "sync from storage" effect would cause — the class-applying effect below would run
  // once with the stale default first, flash to dark, then run again once state catches up).
  const [theme, setTheme] = useState<DashboardTheme>(() => readStoredTheme());

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") root.classList.add(HTML_CLASS);
    else root.classList.remove(HTML_CLASS);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage unavailable (private mode, etc.) — theme just won't persist across reloads.
    }
    // Leaving /dashboard entirely (layout unmounts) — always restore the default dark look so the
    // marketing site / platform-admin never accidentally inherit "theme-light".
    return () => root.classList.remove(HTML_CLASS);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return <DashboardThemeContext.Provider value={{ theme, toggleTheme }}>{children}</DashboardThemeContext.Provider>;
}

export function useDashboardTheme() {
  const ctx = useContext(DashboardThemeContext);
  if (!ctx) throw new Error("useDashboardTheme must be used within DashboardThemeProvider");
  return ctx;
}

/** Inline, blocking, dependency-free — deliberately NOT a module import at runtime (see the
 * <script dangerouslySetInnerHTML> usage in dashboard/layout.tsx). Kept here as the single source
 * of truth for the snippet's source text so the storage key above can't drift out of sync with it. */
export const ANTI_FLASH_SCRIPT = `try{if(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})==="light"){document.documentElement.classList.add(${JSON.stringify(HTML_CLASS)});}}catch(e){}`;
