"use client";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { translate, type LangCode } from "@/lib/i18n/registry";
import "@/lib/i18n/dict-shell";

/**
 * Shared period-preset picker used across every financial report tab
 * (Neraca Saldo, Laba Rugi, Neraca, Arus Kas) and the report export API —
 * same pattern originally built for Transaction Center's PeriodBar, extracted
 * here so "per hari, per tanggal, per minggu, per bulan, per tahun" period
 * selection is consistent and reusable everywhere instead of copy-pasted.
 */

export type PeriodPreset = "today" | "yesterday" | "this_week" | "last_week" | "this_month" | "last_month" | "this_year" | "last_year" | "custom";

export const PERIOD_PRESETS: { key: PeriodPreset; label: string; labelKey: string }[] = [
  { key: "today", label: "Hari Ini", labelKey: "period.today" },
  { key: "yesterday", label: "Kemarin", labelKey: "period.yesterday" },
  { key: "this_week", label: "Minggu Ini", labelKey: "period.thisWeek" },
  { key: "last_week", label: "Minggu Lalu", labelKey: "period.lastWeek" },
  { key: "this_month", label: "Bulan Ini", labelKey: "period.thisMonth" },
  { key: "last_month", label: "Bulan Lalu", labelKey: "period.lastMonth" },
  { key: "this_year", label: "Tahun Ini", labelKey: "period.thisYear" },
  { key: "last_year", label: "Tahun Lalu", labelKey: "period.lastYear" },
  { key: "custom", label: "Custom / Tanggal Tertentu", labelKey: "period.custom" },
];

function toLocalIso(d: Date) {
  return d.toISOString();
}
function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
function startOfWeek(d: Date) { const x = startOfDay(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); return x; } // Monday start
function endOfWeek(d: Date) { const x = startOfWeek(d); x.setDate(x.getDate() + 6); return endOfDay(x); }

/** Resolves a quick-select preset to a [from,to] ISO range in the browser's own local timezone. For "custom" with only customFrom filled (no customTo), resolves to that single day — covers "tanggal tertentu" (one specific date). */
export function resolvePeriodPreset(preset: PeriodPreset, customFrom: string, customTo: string): { from: string; to: string } {
  const now = new Date();
  switch (preset) {
    case "today": return { from: toLocalIso(startOfDay(now)), to: toLocalIso(endOfDay(now)) };
    case "yesterday": { const y = new Date(now); y.setDate(y.getDate() - 1); return { from: toLocalIso(startOfDay(y)), to: toLocalIso(endOfDay(y)) }; }
    case "this_week": return { from: toLocalIso(startOfWeek(now)), to: toLocalIso(endOfWeek(now)) };
    case "last_week": { const w = new Date(now); w.setDate(w.getDate() - 7); return { from: toLocalIso(startOfWeek(w)), to: toLocalIso(endOfWeek(w)) }; }
    case "this_month": { const s = new Date(now.getFullYear(), now.getMonth(), 1); const e = new Date(now.getFullYear(), now.getMonth() + 1, 0); return { from: toLocalIso(startOfDay(s)), to: toLocalIso(endOfDay(e)) }; }
    case "last_month": { const s = new Date(now.getFullYear(), now.getMonth() - 1, 1); const e = new Date(now.getFullYear(), now.getMonth(), 0); return { from: toLocalIso(startOfDay(s)), to: toLocalIso(endOfDay(e)) }; }
    case "this_year": { const s = new Date(now.getFullYear(), 0, 1); const e = new Date(now.getFullYear(), 11, 31); return { from: toLocalIso(startOfDay(s)), to: toLocalIso(endOfDay(e)) }; }
    case "last_year": { const s = new Date(now.getFullYear() - 1, 0, 1); const e = new Date(now.getFullYear() - 1, 11, 31); return { from: toLocalIso(startOfDay(s)), to: toLocalIso(endOfDay(e)) }; }
    case "custom": {
      const from = customFrom ? toLocalIso(startOfDay(new Date(customFrom))) : "";
      const to = customTo ? toLocalIso(endOfDay(new Date(customTo))) : (customFrom ? toLocalIso(endOfDay(new Date(customFrom))) : "");
      return { from, to };
    }
  }
}

/** Human-readable label for a resolved period, used in report letterheads ("Periode: 1 - 31 Agustus 2026"). */
const DATE_LOCALE: Record<LangCode, string> = { id: "id-ID", en: "en-US", ms: "ms-MY", th: "th-TH", fil: "fil-PH", vi: "vi-VN" };

export function describePeriod(preset: PeriodPreset, from: string, to: string, lang: LangCode = "id"): string {
  if (!from) return translate(lang, "period.allTime", "Sepanjang Waktu");
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(DATE_LOCALE[lang] ?? "id-ID", { day: "numeric", month: "long", year: "numeric" });
  const p = PERIOD_PRESETS.find((x) => x.key === preset);
  const presetLabel = p ? translate(lang, p.labelKey, p.label) : undefined;
  if (preset !== "custom" && presetLabel) return `${presetLabel} (${fmt(from)} — ${fmt(to)})`;
  if (from && to && from.slice(0, 10) === to.slice(0, 10)) return fmt(from);
  return `${fmt(from)} — ${fmt(to)}`;
}

export function PeriodBar({ preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo }: {
  preset: PeriodPreset; setPreset: (p: PeriodPreset) => void;
  customFrom: string; setCustomFrom: (v: string) => void;
  customTo: string; setCustomTo: (v: string) => void;
}) {
  const { t } = useDashboardLang();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PERIOD_PRESETS.map((p) => (
        <button
          key={p.key}
          onClick={() => setPreset(p.key)}
          className={`rounded-full border px-3 py-1 text-xs transition ${preset === p.key ? "border-emerald-500 bg-emerald-500/15 text-emerald-400" : "border-neutral-700 text-neutral-400 hover:text-neutral-200"}`}
        >
          {t(p.labelKey, p.label)}
        </button>
      ))}
      {preset === "custom" && (
        <div className="flex items-center gap-1">
          <input type="date" className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
          <span className="text-neutral-500 text-xs">— {t("period.singleDateHint", "(kosongkan untuk tanggal tunggal)")}</span>
          <input type="date" className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
        </div>
      )}
    </div>
  );
}
