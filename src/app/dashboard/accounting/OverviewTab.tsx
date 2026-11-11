"use client";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, Landmark, PiggyBank, Scale, ShieldCheck, TrendingUp, Wallet, XCircle } from "lucide-react";
import { PeriodBar, describePeriod, resolvePeriodPreset, type PeriodPreset } from "@/components/reports/PeriodPicker";
import { fetchJsonObject } from "@/lib/api/fetch-json";
import { useCurrency } from "@/lib/currency/client";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { coaAccountName } from "@/lib/accounting/coa-data";
import { assetComposition, deltaPct, previousPeriod, type AccountingTab } from "@/lib/accounting/nav";
import "@/lib/i18n/dict-accounting-nav";
import "@/lib/i18n/dict-coa";

interface TreeRow {
  accountId: string;
  code: string;
  name: string;
  balance: number;
  depth?: number;
  isPostingAllowed?: boolean | null;
}
interface PlData {
  netRevenue: number;
  totalCogs: number;
  grossProfit: number;
  operatingProfit: number;
  otherIncome: number;
  otherExpense: number;
  incomeTax: number;
  netProfit: number;
  sections: { operatingExpense: { total: number; tree: TreeRow[] } };
}
interface BsData {
  assets: TreeRow[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquityWithRetainedEarnings: number;
  balances: boolean;
  closedThroughPeriod: string | null;
}
interface CfData {
  totalIn: number;
  totalOut: number;
  netCashFlow: number;
  byDay: { date: string; in: number; out: number; net: number }[];
}
interface AuditData {
  checks: { code: string; title: string; status: "ok" | "warning" | "error"; summary: string }[];
}

const panel = "rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_20px_40px_-24px_rgba(0,0,0,0.8)]";

function Delta({ value, goodWhenUp = true }: { value: number | null; goodWhenUp?: boolean }) {
  if (value === null) return <span className="text-[11px] text-neutral-600">—</span>;
  const up = value >= 0;
  const good = up === goodWhenUp;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${good ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>
      <Icon size={12} />
      {up ? "+" : ""}
      {value}%
    </span>
  );
}

function Kpi({ icon, label, value, sub, delta, goodWhenUp, negative }: { icon: React.ReactNode; label: string; value: string; sub?: string; delta?: number | null; goodWhenUp?: boolean; negative?: boolean }) {
  return (
    <div className={`${panel} p-4`}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-400">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/5 text-cyan-300">{icon}</span>
          {label}
        </span>
        {delta !== undefined && <Delta value={delta} goodWhenUp={goodWhenUp} />}
      </div>
      <div className={`mt-3 text-2xl font-semibold tabular-nums tracking-tight ${negative ? "text-rose-300" : "text-neutral-50"}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-neutral-500">{sub}</div>}
    </div>
  );
}

/** Batang arus kas harian — SVG murni, tanpa pustaka grafik. */
function CashBars({ days, labelIn, labelOut }: { days: CfData["byDay"]; labelIn: string; labelOut: string }) {
  const max = Math.max(1, ...days.map((d) => Math.max(d.in, d.out)));
  const w = 100 / Math.max(1, days.length);
  return (
    <div>
      <svg viewBox="0 0 100 44" preserveAspectRatio="none" className="h-36 w-full" role="img" aria-label={`${labelIn} / ${labelOut}`}>
        <line x1="0" y1="22" x2="100" y2="22" stroke="currentColor" strokeWidth="0.15" className="text-neutral-700" />
        {days.map((d, i) => {
          const hi = (d.in / max) * 20;
          const ho = (d.out / max) * 20;
          return (
            <g key={d.date}>
              <title>{`${d.date} · ${labelIn} ${Math.round(d.in).toLocaleString("id-ID")} · ${labelOut} ${Math.round(d.out).toLocaleString("id-ID")}`}</title>
              <rect x={i * w + w * 0.15} y={22 - hi} width={w * 0.7} height={hi} rx="0.4" className="fill-emerald-400/80" />
              <rect x={i * w + w * 0.15} y={22} width={w * 0.7} height={ho} rx="0.4" className="fill-rose-400/70" />
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex items-center justify-between text-[10px] text-neutral-600">
        <span>{days[0]?.date.slice(5)}</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1"><i className="inline-block h-2 w-2 rounded-sm bg-emerald-400/80" />{labelIn}</span>
          <span className="flex items-center gap-1"><i className="inline-block h-2 w-2 rounded-sm bg-rose-400/70" />{labelOut}</span>
        </span>
        <span>{days[days.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

/**
 * Ringkasan Eksekutif Accounting: KPI periode + pembanding, jembatan laba, posisi keuangan,
 * arus kas harian, beban terbesar, dan kesehatan pembukuan — semuanya dari API laporan yang sama
 * dengan sub-halamannya, jadi angka di sini selalu cocok dengan Laba Rugi/Neraca/Arus Kas.
 */
export function OverviewTab({ onOpen }: { onOpen: (tab: AccountingTab) => void }) {
  const { t, lang } = useDashboardLang();
  const { formatMoney: money } = useCurrency();
  const [preset, setPreset] = useState<PeriodPreset>("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const { from, to } = resolvePeriodPreset(preset, customFrom, customTo);
  const [pl, setPl] = useState<PlData | null>(null);
  const [prev, setPrev] = useState<PlData | null>(null);
  const [bs, setBs] = useState<BsData | null>(null);
  const [cf, setCf] = useState<CfData | null>(null);
  const [audit, setAudit] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!from || !to) return;
    let alive = true;
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const asOf = to < endOfToday.toISOString() ? to : endOfToday.toISOString();
    const q = (o: Record<string, string>) => new URLSearchParams(o).toString();
    const before = previousPeriod(from, to);
    Promise.all([
      fetchJsonObject<PlData>(`/api/accounting/profit-loss?${q({ from, to })}`),
      before ? fetchJsonObject<PlData>(`/api/accounting/profit-loss?${q(before)}`) : Promise.resolve(null),
      fetchJsonObject<BsData>(`/api/accounting/balance-sheet?${q({ asOf })}`),
      fetchJsonObject<CfData>(`/api/accounting/cash-flow?${q({ from, to })}`),
    ]).then(([a, b, c, d]) => {
      if (!alive) return;
      setPl(a?.sections ? a : null);
      setPrev(b?.sections ? b : null);
      setBs(c?.assets ? c : null);
      setCf(d?.byDay ? d : null);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [from, to]);

  useEffect(() => {
    let alive = true;
    fetch("/api/accounting/audit")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.checks) setAudit(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const comp = useMemo(() => (bs ? assetComposition(bs.assets) : null), [bs]);
  const topExpenses = useMemo(() => {
    if (!pl) return [];
    return pl.sections.operatingExpense.tree
      .filter((r) => r.isPostingAllowed !== false && r.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5);
  }, [pl]);
  const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 1000) / 10}%` : "—");

  if (loading && !pl) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${panel} h-28 animate-pulse`} />
        ))}
      </div>
    );
  }
  if (!pl || !bs) return <div className={`${panel} p-6 text-sm text-neutral-400`}>{t("accNav.ov.empty", "Belum ada data pembukuan untuk periode ini.")}</div>;

  const bridge: { label: string; value: number; kind: "total" | "minus" | "plus"; tab: AccountingTab }[] = [
    { label: t("accNav.ov.revenue", "Pendapatan usaha"), value: pl.netRevenue, kind: "total", tab: "Laba Rugi" },
    { label: t("accNav.ov.cogs", "HPP"), value: pl.totalCogs, kind: "minus", tab: "Laba Rugi" },
    { label: t("accNav.ov.grossProfit", "Laba kotor"), value: pl.grossProfit, kind: "total", tab: "Laba Rugi" },
    { label: t("accNav.ov.opex", "Beban operasional"), value: pl.sections.operatingExpense.total, kind: "minus", tab: "Laba Rugi" },
    { label: t("accNav.ov.operatingProfit", "Laba usaha"), value: pl.operatingProfit, kind: "total", tab: "Laba Rugi" },
    { label: t("accNav.ov.otherNet", "Lain-lain & pajak (bersih)"), value: pl.otherIncome - pl.otherExpense - pl.incomeTax, kind: "plus", tab: "Laba Rugi" },
    { label: t("accNav.ov.netProfit", "Laba bersih"), value: pl.netProfit, kind: "total", tab: "Laba Rugi" },
  ];
  const bridgeMax = Math.max(1, ...bridge.map((b) => Math.abs(b.value)));
  const errors = audit?.checks.filter((c) => c.status === "error") ?? [];
  const warnings = audit?.checks.filter((c) => c.status === "warning") ?? [];
  const segments = comp
    ? [
        { key: "cash", label: t("accNav.ov.cashBank", "Kas & bank"), value: comp.cash, cls: "bg-cyan-400" },
        { key: "recv", label: t("accNav.ov.receivables", "Piutang"), value: comp.receivables, cls: "bg-violet-400" },
        { key: "inv", label: t("accNav.ov.inventory", "Persediaan"), value: comp.inventory, cls: "bg-amber-400" },
        { key: "fixed", label: t("accNav.ov.fixedAssets", "Aset tetap"), value: comp.fixed, cls: "bg-emerald-400" },
        { key: "other", label: t("accNav.ov.otherAssets", "Lainnya"), value: comp.other, cls: "bg-neutral-500" },
      ]
    : [];
  const positive = segments.reduce((s, x) => s + Math.max(0, x.value), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodBar preset={preset} setPreset={setPreset} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo} />
        <span className="text-xs text-neutral-500">
          {describePeriod(preset, from, to, lang)} · {t("accNav.ov.vsPrev", "dibanding periode sebelumnya yang sama panjang")}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={<TrendingUp size={15} />} label={t("accNav.ov.revenue", "Pendapatan usaha")} value={money(pl.netRevenue)} delta={deltaPct(pl.netRevenue, prev?.netRevenue)} />
        <Kpi icon={<Scale size={15} />} label={t("accNav.ov.grossProfit", "Laba kotor")} value={money(pl.grossProfit)} sub={`${t("accNav.ov.margin", "Margin")} ${pct(pl.grossProfit, pl.netRevenue)}`} delta={deltaPct(pl.grossProfit, prev?.grossProfit)} negative={pl.grossProfit < 0} />
        <Kpi icon={<PiggyBank size={15} />} label={t("accNav.ov.netProfit", "Laba bersih")} value={money(pl.netProfit)} sub={`${t("accNav.ov.margin", "Margin")} ${pct(pl.netProfit, pl.netRevenue)}`} delta={deltaPct(pl.netProfit, prev?.netProfit)} negative={pl.netProfit < 0} />
        <Kpi icon={<Wallet size={15} />} label={t("accNav.ov.cashBank", "Kas & bank")} value={money(comp?.cash ?? 0)} sub={cf ? `${t("accNav.ov.netCash", "Arus kas bersih")} ${money(cf.netCashFlow)}` : undefined} negative={(comp?.cash ?? 0) < 0} />
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <section className={`${panel} p-5 xl:col-span-3`}>
          <header className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-100">{t("accNav.ov.bridgeTitle", "Dari pendapatan ke laba bersih")}</h2>
            <button className="flex items-center gap-1 text-xs text-cyan-300 hover:underline" onClick={() => onOpen("Laba Rugi")}>
              {t("accNav.ov.openPl", "Buka Laba Rugi")} <ArrowRight size={12} />
            </button>
          </header>
          <div className="space-y-2">
            {bridge.map((b) => {
              const width = `${Math.max(2, (Math.abs(b.value) / bridgeMax) * 100)}%`;
              const neg = b.kind === "minus" || b.value < 0;
              return (
                <div key={b.label} className="grid grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-3 text-sm">
                  <span className={b.kind === "total" ? "font-medium text-neutral-100" : "pl-3 text-neutral-400"}>
                    {b.kind === "minus" ? "− " : b.kind === "plus" ? "± " : ""}
                    {b.label}
                  </span>
                  <span className="h-2.5 rounded-full bg-white/5">
                    <span className={`block h-full rounded-full ${b.kind === "total" ? (b.value < 0 ? "bg-rose-400" : "bg-gradient-to-r from-cyan-400 to-emerald-400") : neg ? "bg-rose-400/60" : "bg-emerald-400/60"}`} style={{ width }} />
                  </span>
                  <span className={`tabular-nums ${b.kind === "total" ? "font-semibold" : ""} ${b.value < 0 ? "text-rose-300" : "text-neutral-100"}`}>{money(b.value)}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className={`${panel} p-5 xl:col-span-2`}>
          <header className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-100">{t("accNav.ov.positionTitle", "Posisi keuangan")}</h2>
            <button className="flex items-center gap-1 text-xs text-cyan-300 hover:underline" onClick={() => onOpen("Neraca")}>
              {t("accNav.ov.openBs", "Buka Neraca")} <ArrowRight size={12} />
            </button>
          </header>
          <dl className="grid grid-cols-3 gap-3 text-center">
            {[
              { l: t("accNav.ov.assets", "Aset"), v: bs.totalAssets },
              { l: t("accNav.ov.liabilities", "Liabilitas"), v: bs.totalLiabilities },
              { l: t("accNav.ov.equity", "Ekuitas"), v: bs.totalEquityWithRetainedEarnings },
            ].map((x) => (
              <div key={x.l} className="rounded-xl bg-white/[0.03] p-3">
                <dt className="text-[10px] uppercase tracking-[0.08em] text-neutral-500">{x.l}</dt>
                <dd className={`mt-1 text-sm font-semibold tabular-nums ${x.v < 0 ? "text-rose-300" : "text-neutral-50"}`}>{money(x.v)}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-white/5">
            {segments.map((s) => (s.value > 0 && positive > 0 ? <span key={s.key} className={s.cls} style={{ width: `${(s.value / positive) * 100}%` }} title={`${s.label}: ${money(s.value)}`} /> : null))}
          </div>
          <ul className="mt-3 space-y-1.5 text-xs">
            {segments.map((s) => (
              <li key={s.key} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-neutral-400"><i className={`inline-block h-2 w-2 rounded-sm ${s.cls}`} />{s.label}</span>
                <span className={`tabular-nums ${s.value < 0 ? "text-rose-300" : "text-neutral-200"}`}>{money(s.value)}</span>
              </li>
            ))}
          </ul>
          <p className={`mt-3 flex items-center gap-1.5 text-xs ${bs.balances ? "text-emerald-300" : "text-rose-300"}`}>
            {bs.balances ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            {bs.balances ? t("accNav.ov.balanced", "Neraca seimbang") : t("accNav.ov.unbalanced", "Neraca tidak seimbang — buka Audit")}
          </p>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className={`${panel} p-5`}>
          <header className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-100">{t("accNav.ov.cashTitle", "Arus kas harian")}</h2>
            <button className="flex items-center gap-1 text-xs text-cyan-300 hover:underline" onClick={() => onOpen("Arus Kas")}>
              {t("accNav.ov.openCf", "Buka Arus Kas")} <ArrowRight size={12} />
            </button>
          </header>
          {cf && cf.byDay.length > 0 ? (
            <>
              <CashBars days={cf.byDay} labelIn={t("accNav.ov.cashIn", "Masuk")} labelOut={t("accNav.ov.cashOut", "Keluar")} />
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-emerald-500/5 p-2"><div className="text-neutral-500">{t("accNav.ov.cashIn", "Masuk")}</div><div className="font-semibold tabular-nums text-emerald-300">{money(cf.totalIn)}</div></div>
                <div className="rounded-lg bg-rose-500/5 p-2"><div className="text-neutral-500">{t("accNav.ov.cashOut", "Keluar")}</div><div className="font-semibold tabular-nums text-rose-300">{money(cf.totalOut)}</div></div>
              </div>
            </>
          ) : (
            <p className="text-xs text-neutral-500">{t("accNav.ov.noCash", "Belum ada mutasi kas pada periode ini.")}</p>
          )}
        </section>

        <section className={`${panel} p-5`}>
          <header className="mb-3 flex items-center gap-2">
            <Landmark size={15} className="text-cyan-300" />
            <h2 className="text-sm font-semibold text-neutral-100">{t("accNav.ov.topExpenses", "Beban operasional terbesar")}</h2>
          </header>
          {topExpenses.length === 0 ? (
            <p className="text-xs text-neutral-500">{t("accNav.ov.noExpenses", "Belum ada beban operasional pada periode ini.")}</p>
          ) : (
            <ul className="space-y-2.5">
              {topExpenses.map((e) => (
                <li key={e.accountId} className="text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-neutral-300"><span className="mr-1.5 font-mono text-[10px] text-neutral-600">{e.code}</span>{coaAccountName(t, e)}</span>
                    <span className="tabular-nums text-neutral-100">{money(e.balance)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-white/5"><div className="h-full rounded-full bg-violet-400/70" style={{ width: `${(e.balance / topExpenses[0].balance) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${panel} p-5`}>
          <header className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-100"><ShieldCheck size={15} className="text-cyan-300" />{t("accNav.ov.healthTitle", "Kesehatan pembukuan")}</h2>
            <button className="flex items-center gap-1 text-xs text-cyan-300 hover:underline" onClick={() => onOpen("Audit")}>
              {t("accNav.ov.openAudit", "Buka Audit")} <ArrowRight size={12} />
            </button>
          </header>
          {!audit ? (
            <p className="text-xs text-neutral-500">{t("accNav.ov.auditRunning", "Memeriksa pembukuan...")}</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-rose-500/5 p-2"><div className="text-lg font-semibold tabular-nums text-rose-300">{errors.length}</div><div className="text-neutral-500">{t("accNav.ov.errors", "Harus diperbaiki")}</div></div>
                <div className="rounded-lg bg-amber-500/5 p-2"><div className="text-lg font-semibold tabular-nums text-amber-300">{warnings.length}</div><div className="text-neutral-500">{t("accNav.ov.warnings", "Perlu dicek")}</div></div>
                <div className="rounded-lg bg-emerald-500/5 p-2"><div className="text-lg font-semibold tabular-nums text-emerald-300">{audit.checks.length - errors.length - warnings.length}</div><div className="text-neutral-500">{t("accNav.ov.passed", "Lolos")}</div></div>
              </div>
              <ul className="mt-3 space-y-1.5 text-xs">
                {[...errors, ...warnings].slice(0, 4).map((c) => (
                  <li key={c.code} className="flex items-start gap-1.5">
                    {c.status === "error" ? <XCircle size={13} className="mt-0.5 shrink-0 text-rose-400" /> : <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-400" />}
                    <span className="text-neutral-300">{c.title} <span className="text-neutral-500">— {c.summary}</span></span>
                  </li>
                ))}
                {errors.length + warnings.length === 0 && <li className="flex items-center gap-1.5 text-emerald-300"><CheckCircle2 size={13} />{t("accNav.ov.allGood", "Semua pemeriksaan lolos.")}</li>}
              </ul>
            </>
          )}
          <p className="mt-3 text-[11px] text-neutral-500">
            {bs.closedThroughPeriod
              ? t("accNav.ov.closedThrough", "Buku ditutup s/d {period}.").replace("{period}", bs.closedThroughPeriod)
              : t("accNav.ov.notClosed", "Belum ada periode yang ditutup.")}{" "}
            <button className="text-cyan-300 hover:underline" onClick={() => onOpen("Tutup Periode")}>{t("accNav.ov.openClose", "Tutup Periode")}</button>
          </p>
        </section>
      </div>
    </div>
  );
}
