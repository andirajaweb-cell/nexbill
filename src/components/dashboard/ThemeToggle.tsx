"use client";

import { Moon, Sun } from "lucide-react";
import { useDashboardTheme } from "@/lib/ui/dashboard-theme";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";

/** Dark/Light switch shown in the dashboard TopBar — see dashboard-theme.tsx for how the "theme-light" class actually gets applied/persisted. */
export function ThemeToggle() {
  const { theme, toggleTheme } = useDashboardTheme();
  const { t } = useDashboardLang();
  const isLight = theme === "light";

  return (
    <button
      onClick={toggleTheme}
      title={isLight ? t("topbar.themeToggleToDark", "Ganti ke mode gelap") : t("topbar.themeToggleToLight", "Ganti ke mode terang")}
      aria-label={isLight ? t("topbar.themeToggleToDark", "Ganti ke mode gelap") : t("topbar.themeToggleToLight", "Ganti ke mode terang")}
      className="relative rounded-lg p-1.5 text-neutral-400 hover:text-cyan-300 hover:bg-white/5 transition"
    >
      {isLight ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
