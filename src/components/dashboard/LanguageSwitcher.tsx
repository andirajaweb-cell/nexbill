"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, Languages } from "lucide-react";
import { LANG_OPTIONS, useDashboardLang } from "@/lib/i18n/dashboard-lang";

/** Compact flag+code language switcher for the dashboard TopBar — cyan/gm-themed to match the
 * rest of the control-center chrome. Selection persists via DashboardLangProvider (localStorage). */
export function LanguageSwitcher() {
  const { lang, setLang } = useDashboardLang();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const active = LANG_OPTIONS.find((o) => o.code === lang) ?? LANG_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-neutral-300 hover:border-cyan-400/30 hover:text-cyan-300 transition"
        title="Language"
      >
        <Languages size={12} />
        <span>{active.flag}</span>
        <ChevronDown size={12} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-52 rounded-xl border border-white/10 bg-[#0a0f1e] shadow-[0_8px_30px_rgba(0,0,0,0.5)] z-50 overflow-hidden">
          {LANG_OPTIONS.map((o) => (
            <button
              key={o.code}
              onClick={() => {
                setLang(o.code);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 border-b border-white/5 last:border-b-0 text-left hover:bg-white/5 transition"
            >
              <span className="flex items-center gap-2 text-xs text-neutral-200">
                <span>{o.flag}</span>
                <span>{o.label}</span>
              </span>
              {o.code === lang && <Check size={13} className="shrink-0 text-cyan-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
