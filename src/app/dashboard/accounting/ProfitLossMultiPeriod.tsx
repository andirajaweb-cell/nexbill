"use client";
import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { Download, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fetchJsonObject } from "@/lib/api/fetch-json";
import { DATE_LOCALE, useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { coaAccountName } from "@/lib/accounting/coa-data";
import { PERIOD_PRESETS, resolvePeriodPreset, describePeriod, type PeriodPreset } from "@/components/reports/PeriodPicker";
import { defaultSeriesRange, PL_MAX_COLUMNS, type PlGranularity } from "@/lib/accounting/period-series";
import { outletDateYmd } from "@/lib/time/outlet-time";
import "@/lib/i18n/dict-accounting-pl-multi";

/**
 * Laba Rugi multi-periode (2026-11-21) — format yang SAMA dengan Laba Rugi satu periode
 * (ProfitLossSteps): Pendapatan usaha → HPP → Laba Kotor → Beban operasional → Laba Usaha →
 * Pendapatan/Beban lain-lain → Laba Sebelum Pajak → PPh → Laba Bersih, tetapi per kolom:
 * harian, mingguan, bulanan, kuartalan, tahunan (dengan kolom Total), atau 2–4 periode bebas.
 */

interface PlRow { accountId: string; code: string; name: string; balance: number; depth?: number; isPostingAllowed?: boolean | null }
interface PlSection { total: number; tree: PlRow[] }
type SectionKey = "operatingRevenue" | "cogs" | "operatingExpense" | "otherIncome" | "otherExpense" | "incomeTax";
export interface PlData {
  netRevenue?: number;
  grossProfit: number;
  operatingProfit?: number;
  profitBeforeTax?: number;
  netProfit: number;
  sections?: Record<SectionKey, PlSection>;
}
export interface PlColumn {
  key: string;
  label: string;
  /** ISO range — untuk rincian transaksi (drill-down). */
  from?: string;
  to?: string;
  partial?: boolean;
  /** Kolom Total / Perubahan — ditebalkan, tidak bisa diklik. */
  kind?: "total" | "change";
  pl: PlData;
}

export type DrillTarget = { accountId: string; code: string; name: string; balance: number; from?: string; to?: string; periodLabel: string };

const GRANULARITIES: PlGranularity[] = ["day", "week", "month", "quarter", "year"];
type Mode = PlGranularity | "manual";

const MANUAL_PRESETS: PeriodPreset[] = ["today", "yesterday", "this_week", "last_week", "this_month", "last_month", "this_year", "last_year", "custom"];
type ManualEntry = { preset: PeriodPreset; customFrom: string; customTo: string };

function ymdDate(ymd: string) {
  return new Date(`${ymd}T12:00:00+07:00`);
}

export function ProfitLossMultiPeriod({ outletId, rupiah, onDrill }: { outletId: string; rupiah: (n: number) => string; onDrill: (d: DrillTarget) => void }) {
  const { t, lang } = useDashboardLang();
  const locale = DATE_LOCALE[lang];
  const today = outletDateYmd(new Date());
  const [mode, setMode] = useState<Mode>("month");
  const [range, setRange] = useState(() => defaultSeriesRange("month", today));
  const [columns, setColumns] = useState<PlColumn[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState<ManualEntry[]>([
    { preset: "this_month", customFrom: "", customTo: "" },
    { preset: "last_month", customFrom: "", customTo: "" },
  ]);

  const modeLabel = (m: Mode) =>
    ({
      day: t("plMulti.mode.day", "Harian"),
      week: t("plMulti.mode.week", "Mingguan"),
      month: t("plMulti.mode.month", "Bulanan"),
      quarter: t("plMulti.mode.quarter", "Kuartalan"),
      year: t("plMulti.mode.year", "Tahunan"),
      manual: t("plMulti.mode.manual", "Bandingkan bebas"),
    })[m];

  const columnLabel = (g: PlGranularity, b: { key: string; fromYmd: string; toYmd: string; partial: boolean }) => {
    const star = b.partial ? "*" : "";
    const f = ymdDate(b.fromYmd);
    const e = ymdDate(b.toYmd);
    switch (g) {
      case "day":
        return f.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
      case "week":
        return `${f.toLocaleDateString(locale, { day: "numeric", month: "short" })} – ${e.toLocaleDateString(locale, { day: "numeric", month: "short" })}${star}`;
      case "month":
        return `${f.toLocaleDateString(locale, { month: "short", year: "numeric" })}${star}`;
      case "quarter":
        return `${b.key.replace(/^(\d{4})-Q(\d)$/, "Q$2 $1")}${star}`;
      case "year":
        return `${b.key}${star}`;
    }
  };

  const chooseMode = (m: Mode) => {
    setMode(m);
    setColumns(null);
    setError(null);
    if (m !== "manual") setRange(defaultSeriesRange(m, today));
  };

  // Rincian per periode: dimuat otomatis tiap jenis/rentang berubah.
  useEffect(() => {
    if (mode === "manual") return;
    let alive = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({ granularity: mode, from: range.fromYmd, to: range.toYmd });
        const res = await fetch(`/api/accounting/profit-loss/series?${qs}`);
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok) {
          setColumns(null);
          setError(data.error ?? t("plMulti.loadFailed", "Laba Rugi multi-periode gagal dimuat."));
          return;
        }
        const cols: PlColumn[] = (data.columns as { key: string; fromYmd: string; toYmd: string; partial: boolean; pl: PlData }[]).map((c) => {
          const iso = { from: new Date(`${c.fromYmd}T00:00:00.000+07:00`).toISOString(), to: new Date(`${c.toYmd}T23:59:59.999+07:00`).toISOString() };
          return { key: c.key, label: columnLabel(mode, c), partial: c.partial, pl: c.pl, ...iso };
        });
        cols.push({
          key: "__total",
          label: t("plMulti.total", "Total"),
          kind: "total",
          from: new Date(`${data.from}T00:00:00.000+07:00`).toISOString(),
          to: new Date(`${data.to}T23:59:59.999+07:00`).toISOString(),
          pl: data.total,
        });
        setColumns(cols);
      } finally {
        if (alive) setLoading(false);
      }
    };
    const timer = setTimeout(run, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, range.fromYmd, range.toYmd, outletId, lang]);

  const runManual = async () => {
    setLoading(true);
    setError(null);
    try {
      const cols: PlColumn[] = await Promise.all(
        manual.map(async (p, i): Promise<PlColumn> => {
          const { from, to } = resolvePeriodPreset(p.preset, p.customFrom, p.customTo);
          const qs = new URLSearchParams({ outletId, ...(from ? { from } : {}), ...(to ? { to } : {}) });
          const pl = await fetchJsonObject<PlData>(`/api/accounting/profit-loss?${qs}`);
          return { key: `p${i}`, label: describePeriod(p.preset, from, to, lang), from, to, pl: pl as PlData };
        })
      );
      // Dua periode: kolom Perubahan (periode 1 − periode 2) dalam format yang sama.
      if (cols.length === 2 && cols[0].pl && cols[1].pl) cols.push({ key: "__change", label: t("plMulti.change", "Perubahan"), kind: "change", pl: diffPl(cols[0].pl, cols[1].pl) });
      setColumns(cols);
    } finally {
      setLoading(false);
    }
  };

  const maxCols = mode === "manual" ? null : PL_MAX_COLUMNS[mode];

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex gap-1 overflow-x-auto rounded-full border border-white/10 bg-white/[0.02] p-1 w-fit max-w-full">
          {[...GRANULARITIES, "manual" as const].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => chooseMode(m)}
              aria-pressed={mode === m}
              className={clsx("whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition", mode === m ? "bg-cyan-400/15 text-cyan-200 shadow-[0_0_0_1px_rgba(34,211,238,0.35)]" : "text-neutral-400 hover:text-neutral-100")}
            >
              {modeLabel(m)}
            </button>
          ))}
        </div>

        {mode !== "manual" ? (
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-neutral-500">
              {t("plMulti.from", "Dari")}
              <input type="date" max={range.toYmd} className="mt-1 block rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs text-neutral-100" value={range.fromYmd} onChange={(e) => e.target.value && setRange((r) => ({ ...r, fromYmd: e.target.value }))} />
            </label>
            <label className="text-xs text-neutral-500">
              {t("plMulti.to", "Sampai")}
              <input type="date" min={range.fromYmd} className="mt-1 block rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs text-neutral-100" value={range.toYmd} onChange={(e) => e.target.value && setRange((r) => ({ ...r, toYmd: e.target.value }))} />
            </label>
            <span className="pb-2 text-[11px] text-neutral-500">{t("plMulti.maxColumns", "Maksimal {n} kolom").replace("{n}", String(maxCols))}</span>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[11px] text-neutral-500">{t("plMulti.manualHint", "Pilih 2–4 periode bebas untuk dibandingkan berdampingan. Dua periode menampilkan kolom Perubahan.")}</p>
            {manual.map((p, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-2">
                <span className="w-16 text-xs text-neutral-500">{t("accounting.pl.periodLabel", "Periode {n}").replace("{n}", String(i + 1))}</span>
                <select
                  className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs"
                  value={p.preset}
                  onChange={(e) => setManual(manual.map((x, idx) => (idx === i ? { ...x, preset: e.target.value as PeriodPreset } : x)))}
                >
                  {MANUAL_PRESETS.map((k) => {
                    const meta = PERIOD_PRESETS.find((x) => x.key === k)!;
                    return <option key={k} value={k}>{t(meta.labelKey, meta.label)}</option>;
                  })}
                </select>
                {p.preset === "custom" && (
                  <>
                    <input type="date" className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs" value={p.customFrom} onChange={(e) => setManual(manual.map((x, idx) => (idx === i ? { ...x, customFrom: e.target.value } : x)))} />
                    <input type="date" className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs" value={p.customTo} onChange={(e) => setManual(manual.map((x, idx) => (idx === i ? { ...x, customTo: e.target.value } : x)))} />
                  </>
                )}
                {manual.length > 2 && (
                  <button className="text-xs text-red-400" onClick={() => setManual(manual.filter((_, idx) => idx !== i))}>
                    {t("accounting.common.delete", "Hapus")}
                  </button>
                )}
              </div>
            ))}
            <div className="flex gap-2">
              {manual.length < 4 && (
                <Button variant="secondary" className="text-xs" onClick={() => setManual([...manual, { preset: "this_year", customFrom: "", customTo: "" }])}>
                  {t("accounting.pl.addPeriodButton", "+ Tambah Periode")}
                </Button>
              )}
              <Button className="text-xs" onClick={runManual} disabled={loading}>
                {t("accounting.pl.compareButton", "Bandingkan")}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {error && <Card className="border-rose-500/30 text-sm text-rose-300">{error}</Card>}
      {loading && (
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <Loader2 size={14} className="animate-spin" /> {t("plMulti.loading", "Menghitung Laba Rugi per periode...")}
        </div>
      )}
      {columns && !loading && (
        <ProfitLossMatrix
          columns={columns}
          rupiah={rupiah}
          title={`${t("accounting.tab.profitLoss", "Laba Rugi")} — ${modeLabel(mode)}`}
          onDrill={onDrill}
          footnote={
            mode === "manual"
              ? undefined
              : [columns.some((c) => c.partial) ? t("plMulti.partialNote", "* Kolom bertanda bintang tidak penuh satu periode (dipotong tanggal awal/akhir rentang).") : "", t("plMulti.sumNote", "Jumlah semua kolom sama dengan kolom Total — Laba Rugi satu periode untuk rentang yang sama.")]
                  .filter(Boolean)
                  .join(" ")
          }
        />
      )}
    </div>
  );
}

/** Selisih dua Laba Rugi dalam bentuk PlData (untuk kolom Perubahan). */
function diffPl(a: PlData, b: PlData): PlData {
  const keys: SectionKey[] = ["operatingRevenue", "cogs", "operatingExpense", "otherIncome", "otherExpense", "incomeTax"];
  const sections = {} as Record<SectionKey, PlSection>;
  for (const k of keys) {
    const sa = a.sections?.[k];
    const sb = b.sections?.[k];
    const byId = new Map<string, PlRow>();
    for (const r of sa?.tree ?? []) byId.set(r.accountId, { ...r });
    for (const r of sb?.tree ?? []) {
      const cur = byId.get(r.accountId);
      if (cur) cur.balance -= r.balance;
      else byId.set(r.accountId, { ...r, balance: -r.balance });
    }
    sections[k] = { total: (sa?.total ?? 0) - (sb?.total ?? 0), tree: [...byId.values()] };
  }
  return {
    netRevenue: (a.netRevenue ?? 0) - (b.netRevenue ?? 0),
    grossProfit: a.grossProfit - b.grossProfit,
    operatingProfit: (a.operatingProfit ?? 0) - (b.operatingProfit ?? 0),
    profitBeforeTax: (a.profitBeforeTax ?? 0) - (b.profitBeforeTax ?? 0),
    netProfit: a.netProfit - b.netProfit,
    sections,
  };
}

type MatrixLine =
  | { kind: "section"; key: SectionKey; title: string; sign: "+" | "−"; codes: string }
  | { kind: "account"; section: SectionKey; row: PlRow }
  | { kind: "subtotal"; label: string; pick: (pl: PlData) => number; strong?: boolean }
  | { kind: "margin"; label: string };

/** Tabel Laba Rugi bertingkat dengan satu kolom per periode — dipakai rincian periode & bandingkan bebas. */
export function ProfitLossMatrix({ columns, rupiah, title, footnote, onDrill }: { columns: PlColumn[]; rupiah: (n: number) => string; title: string; footnote?: string; onDrill: (d: DrillTarget) => void }) {
  const { t } = useDashboardLang();
  const [showAccounts, setShowAccounts] = useState(true);

  const lines = useMemo<MatrixLine[]>(() => {
    const sec = (key: SectionKey, title: string, sign: "+" | "−", codes: string): MatrixLine[] => {
      const out: MatrixLine[] = [{ kind: "section", key, title, sign, codes }];
      if (!showAccounts) return out;
      // Gabungan akun dari semua kolom (akun yang hanya bergerak di satu bulan tetap tampil), urut kode COA.
      const rows = new Map<string, PlRow>();
      for (const c of columns) for (const r of c.pl.sections?.[key]?.tree ?? []) if (!rows.has(r.accountId)) rows.set(r.accountId, r);
      for (const r of [...rows.values()].sort((a, b) => a.code.localeCompare(b.code))) out.push({ kind: "account", section: key, row: r });
      return out;
    };
    return [
      ...sec("operatingRevenue", t("accounting.pl.sec.operatingRevenue", "Pendapatan usaha"), "+", "4xxx"),
      ...sec("cogs", t("accounting.pl.sec.cogs", "Harga pokok penjualan (HPP)"), "−", "5xxx"),
      { kind: "subtotal", label: t("accounting.pl.grossProfit", "Laba Kotor"), pick: (pl) => pl.grossProfit },
      ...sec("operatingExpense", t("accounting.pl.sec.operatingExpense", "Beban operasional"), "−", "6xxx"),
      { kind: "subtotal", label: t("accounting.pl.operatingProfit", "Laba Usaha"), pick: (pl) => pl.operatingProfit ?? 0 },
      ...sec("otherIncome", t("accounting.pl.sec.otherIncome", "Pendapatan lain-lain"), "+", "47xx · 7xxx"),
      ...sec("otherExpense", t("accounting.pl.sec.otherExpense", "Beban lain-lain"), "−", "8xxx"),
      { kind: "subtotal", label: t("accounting.pl.profitBeforeTax", "Laba Sebelum Pajak"), pick: (pl) => pl.profitBeforeTax ?? 0 },
      ...sec("incomeTax", t("accounting.pl.sec.incomeTax", "Beban pajak penghasilan"), "−", "8500"),
      { kind: "subtotal", label: t("accounting.pl.netProfit", "Laba Bersih"), pick: (pl) => pl.netProfit, strong: true },
      { kind: "margin", label: t("plMulti.netMargin", "Margin laba bersih") },
    ];
  }, [columns, showAccounts, t]);

  const balanceOf = (c: PlColumn, section: SectionKey, accountId: string) => c.pl.sections?.[section]?.tree.find((r) => r.accountId === accountId)?.balance ?? 0;
  const marginOf = (c: PlColumn) => {
    if (c.kind === "change") return null;
    const rev = c.pl.sections?.operatingRevenue.total ?? c.pl.netRevenue ?? 0;
    return Math.abs(rev) < 0.5 ? null : (c.pl.netProfit / rev) * 100;
  };

  const exportCsv = () => {
    const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const out: string[] = [[q(title), ...columns.map((c) => q(c.label))].join(";")];
    for (const l of lines) {
      if (l.kind === "section") out.push([q(`${l.sign} ${l.title}`), ...columns.map((c) => String(Math.round(c.pl.sections?.[l.key]?.total ?? 0)))].join(";"));
      else if (l.kind === "account") out.push([q(`   ${l.row.code} ${coaAccountName(t, l.row)}`), ...columns.map((c) => String(Math.round(balanceOf(c, l.section, l.row.accountId))))].join(";"));
      else if (l.kind === "subtotal") out.push([q(`= ${l.label}`), ...columns.map((c) => String(Math.round(l.pick(c.pl))))].join(";"));
      else out.push([q(l.label), ...columns.map((c) => { const m = marginOf(c); return m === null ? "" : `${m.toFixed(1).replace(".", ",")}%`; })].join(";"));
    }
    const blob = new Blob(["﻿" + out.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laba-rugi-multi-periode.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cellCls = (c: PlColumn) => clsx("px-3 py-1.5 text-right tabular-nums whitespace-nowrap", c.kind === "total" && "bg-white/[0.03] font-semibold", c.kind === "change" && "bg-white/[0.03]");
  const money = (v: number, c: PlColumn) => (c.kind === "change" && v > 0 ? `+${rupiah(v)}` : rupiah(v));

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <div className="text-sm font-medium text-neutral-200">{title}</div>
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-neutral-400">
            <input type="checkbox" checked={showAccounts} onChange={(e) => setShowAccounts(e.target.checked)} />
            {t("plMulti.showAccounts", "Tampilkan rincian akun")}
          </label>
          <Button variant="secondary" className="text-xs" onClick={exportCsv}>
            <span className="inline-flex items-center gap-1.5"><Download size={13} /> {t("plMulti.downloadCsv", "Unduh CSV (Excel)")}</span>
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-neutral-500">
              <th className="sticky left-0 z-10 min-w-[220px] bg-[#0f1426] px-3 py-2 text-left font-medium">{t("accounting.pl.table.account", "Akun")}</th>
              {columns.map((c) => (
                <th key={c.key} className={clsx("px-3 py-2 text-right font-medium normal-case whitespace-nowrap", (c.kind === "total" || c.kind === "change") && "bg-white/[0.03] text-neutral-300")}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => {
              if (l.kind === "section") {
                return (
                  <tr key={`s-${l.key}`} className="border-t border-white/10">
                    <td className="sticky left-0 z-10 bg-[#0f1426] px-3 pt-3 pb-1.5 text-xs font-semibold text-neutral-300">
                      <span className="mr-1 text-neutral-500">{l.sign}</span>
                      {l.title} <span className="font-mono text-[10px] font-normal text-neutral-600">{l.codes}</span>
                    </td>
                    {columns.map((c) => (
                      <td key={c.key} className={clsx(cellCls(c), "pt-3 font-medium text-neutral-200")}>{money(c.pl.sections?.[l.key]?.total ?? 0, c)}</td>
                    ))}
                  </tr>
                );
              }
              if (l.kind === "account") {
                const r = l.row;
                return (
                  <tr key={`a-${l.section}-${r.accountId}`} className="hover:bg-white/[0.02]">
                    <td className={clsx("sticky left-0 z-10 bg-[#0f1426] py-1 pr-3 text-xs", !r.isPostingAllowed ? "font-semibold text-neutral-300" : "text-neutral-400")} style={{ paddingLeft: 20 + (r.depth ?? 0) * 14 }}>
                      <span className="mr-1.5 font-mono text-[10px] text-neutral-600">{r.code}</span>
                      {coaAccountName(t, r)}
                    </td>
                    {columns.map((c) => {
                      const v = balanceOf(c, l.section, r.accountId);
                      const clickable = c.kind !== "change" && Math.abs(v) >= 0.5;
                      return (
                        <td key={c.key} className={clsx(cellCls(c), "py-1 text-xs", Math.abs(v) < 0.5 && "text-neutral-700")}>
                          {clickable ? (
                            <button
                              type="button"
                              className="hover:text-cyan-300 hover:underline"
                              onClick={() => onDrill({ accountId: r.accountId, code: r.code, name: coaAccountName(t, r), balance: v, from: c.from, to: c.to, periodLabel: c.label })}
                            >
                              {money(v, c)}
                            </button>
                          ) : (
                            money(v, c)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              }
              if (l.kind === "subtotal") {
                return (
                  <tr key={`t-${i}`} className={clsx(l.strong ? "bg-emerald-500/10" : "bg-white/[0.04]")}>
                    <td className={clsx("sticky left-0 z-10 px-3 py-2 text-sm", l.strong ? "bg-[#0f2a26] font-bold" : "bg-[#151b30] font-semibold")}>= {l.label}</td>
                    {columns.map((c) => {
                      const v = l.pick(c.pl);
                      return (
                        <td key={c.key} className={clsx("px-3 py-2 text-right tabular-nums whitespace-nowrap", l.strong ? "font-bold" : "font-semibold", v < 0 ? "text-red-400" : l.strong ? "text-emerald-400" : "")}>
                          {money(v, c)}
                        </td>
                      );
                    })}
                  </tr>
                );
              }
              return (
                <tr key="margin" className="border-t border-white/5">
                  <td className="sticky left-0 z-10 bg-[#0f1426] px-3 py-1.5 text-xs text-neutral-500">{l.label}</td>
                  {columns.map((c) => {
                    const m = marginOf(c);
                    return (
                      <td key={c.key} className={clsx(cellCls(c), "text-xs", m === null ? "text-neutral-700" : m < 0 ? "text-red-400" : "text-neutral-400")}>
                        {m === null ? "—" : `${m.toFixed(1)}%`}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {footnote && <p className="border-t border-white/10 px-4 py-2 text-[11px] text-neutral-500">{footnote}</p>}
      <p className="px-4 pb-3 text-[11px] text-neutral-600">{t("accounting.pl.drillDownHint", "Klik baris mana pun untuk melihat transaksi/jurnal yang menyusun angka itu (audit trail).")}</p>
    </Card>
  );
}

