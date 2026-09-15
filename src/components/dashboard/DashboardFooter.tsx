"use client";

import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-shell";

/** Slim copyright footer shown at the bottom of every /dashboard/** page — extracted out of
 * dashboard/layout.tsx (a server component) into its own client component so it can call
 * useDashboardLang() without forcing the whole layout to be a client component. */
export function DashboardFooter() {
  const { t } = useDashboardLang();
  return (
    <footer className="px-6 py-3 text-center text-xs text-neutral-600 border-t border-neutral-900">
      &copy; {new Date().getFullYear()} &mdash; {t("shell.footerMadeBy", "Dibuat oleh")}{" "}
      <a href="https://www.digitrajasa.web.id" target="_blank" rel="noreferrer" className="text-cyan-500 hover:text-cyan-400 underline underline-offset-2">
        Digitrajasa
      </a>
    </footer>
  );
}
