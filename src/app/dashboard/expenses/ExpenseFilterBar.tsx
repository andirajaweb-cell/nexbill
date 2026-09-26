"use client";
import { Search, X } from "lucide-react";
import { EMPTY_EXPENSE_FILTER, isFilterActive, type ExpenseListFilter, type ExpensePeriodMode, type ExpenseSearchColumn } from "@/lib/expenses/list-filter";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";

/**
 * Baris filter tabel Daftar Expense: status (server), kolom + kata kunci, dan periode
 * (tanggal / rentang / bulan / tahun). Aturan pencocokannya ada di lib/expenses/list-filter.ts.
 */

const inputCls = "rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm";

const COLUMNS: { value: ExpenseSearchColumn; key: string; fallback: string; placeholder: string }[] = [
  { value: "all", key: "expenses.filter.col.all", fallback: "Semua kolom", placeholder: "Cari no., deskripsi, akun, penerima..." },
  { value: "number", key: "expenses.filter.col.number", fallback: "No. Expense", placeholder: "mis. EXP-2026" },
  { value: "description", key: "expenses.filter.col.description", fallback: "Deskripsi / Kategori", placeholder: "mis. listrik, galon" },
  { value: "account", key: "expenses.filter.col.account", fallback: "Akun Beban", placeholder: "mis. Gaji, Listrik" },
  { value: "payee", key: "expenses.filter.col.payee", fallback: "Penerima / Supplier", placeholder: "nama penerima atau supplier" },
  { value: "costCenter", key: "expenses.filter.col.costCenter", fallback: "Divisi (Cost Center)", placeholder: "mis. Dapur" },
  { value: "staff", key: "expenses.filter.col.staff", fallback: "Diinput Oleh", placeholder: "nama staf" },
  { value: "amount", key: "expenses.filter.col.amount", fallback: "Nominal", placeholder: "mis. 50000" },
];

const PERIOD_MODES: { value: ExpensePeriodMode; key: string; fallback: string }[] = [
  { value: "all", key: "expenses.filter.period.all", fallback: "Semua tanggal" },
  { value: "date", key: "expenses.filter.period.date", fallback: "Per tanggal" },
  { value: "range", key: "expenses.filter.period.range", fallback: "Rentang tanggal" },
  { value: "month", key: "expenses.filter.period.month", fallback: "Per bulan" },
  { value: "year", key: "expenses.filter.period.year", fallback: "Per tahun" },
];

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export function ExpenseFilterBar({
  filter,
  onChange,
  status,
  onStatusChange,
  statusOptions,
  years,
  todayYmd,
}: {
  filter: ExpenseListFilter;
  onChange: (f: ExpenseListFilter) => void;
  status: string;
  onStatusChange: (s: string) => void;
  statusOptions: { value: string; label: string }[];
  years: number[];
  todayYmd: string;
}) {
  const { t } = useDashboardLang();
  const col = COLUMNS.find((c) => c.value === filter.column) ?? COLUMNS[0];
  const p = filter.period;
  const setPeriod = (patch: Partial<ExpenseListFilter["period"]>) => onChange({ ...filter, period: { ...p, ...patch } });
  const thisYear = Number(todayYmd.slice(0, 4));
  const thisMonth = Number(todayYmd.slice(5, 7));

  const changeMode = (mode: ExpensePeriodMode) => {
    // Sensible defaults so a mode is useful the moment it's picked.
    if (mode === "date") onChange({ ...filter, period: { mode, date: p.date ?? todayYmd } });
    else if (mode === "range") onChange({ ...filter, period: { mode, from: p.from ?? `${todayYmd.slice(0, 8)}01`, to: p.to ?? todayYmd } });
    else if (mode === "month") onChange({ ...filter, period: { mode, month: p.month ?? thisMonth, year: p.year ?? thisYear } });
    else if (mode === "year") onChange({ ...filter, period: { mode, year: p.year ?? thisYear } });
    else onChange({ ...filter, period: { mode: "all" } });
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="space-y-1">
        <div className="text-[11px] text-neutral-500">{t("expenses.filter.status", "Status")}</div>
        <select className={inputCls} value={status} onChange={(e) => onStatusChange(e.target.value)}>
          <option value="">{t("expenses.allStatus", "Semua Status")}</option>
          {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>

      <label className="space-y-1">
        <div className="text-[11px] text-neutral-500">{t("expenses.filter.searchIn", "Cari di kolom")}</div>
        <select className={inputCls} value={filter.column} onChange={(e) => onChange({ ...filter, column: e.target.value as ExpenseSearchColumn })}>
          {COLUMNS.map((c) => <option key={c.value} value={c.value}>{t(c.key, c.fallback)}</option>)}
        </select>
      </label>

      <label className="space-y-1 flex-1 min-w-[200px]">
        <div className="text-[11px] text-neutral-500">{t("expenses.filter.keyword", "Kata kunci")}</div>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            className={`${inputCls} w-full pl-8 pr-8`}
            inputMode={filter.column === "amount" ? "numeric" : undefined}
            placeholder={t(`${col.key}.placeholder`, col.placeholder)}
            value={filter.query}
            onChange={(e) => onChange({ ...filter, query: e.target.value })}
          />
          {filter.query && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300" onClick={() => onChange({ ...filter, query: "" })} aria-label="Hapus kata kunci">
              <X size={14} />
            </button>
          )}
        </div>
      </label>

      <label className="space-y-1">
        <div className="text-[11px] text-neutral-500">{t("expenses.filter.period", "Periode")}</div>
        <select className={inputCls} value={p.mode} onChange={(e) => changeMode(e.target.value as ExpensePeriodMode)}>
          {PERIOD_MODES.map((m) => <option key={m.value} value={m.value}>{t(m.key, m.fallback)}</option>)}
        </select>
      </label>

      {p.mode === "date" && (
        <label className="space-y-1">
          <div className="text-[11px] text-neutral-500">{t("expenses.filter.date", "Tanggal")}</div>
          <input type="date" className={inputCls} value={p.date ?? ""} onChange={(e) => setPeriod({ date: e.target.value })} />
        </label>
      )}
      {p.mode === "range" && (
        <>
          <label className="space-y-1">
            <div className="text-[11px] text-neutral-500">{t("expenses.filter.from", "Dari")}</div>
            <input type="date" className={inputCls} value={p.from ?? ""} max={p.to || undefined} onChange={(e) => setPeriod({ from: e.target.value })} />
          </label>
          <label className="space-y-1">
            <div className="text-[11px] text-neutral-500">{t("expenses.filter.to", "Sampai")}</div>
            <input type="date" className={inputCls} value={p.to ?? ""} min={p.from || undefined} onChange={(e) => setPeriod({ to: e.target.value })} />
          </label>
        </>
      )}
      {p.mode === "month" && (
        <label className="space-y-1">
          <div className="text-[11px] text-neutral-500">{t("expenses.filter.month", "Bulan")}</div>
          <select className={inputCls} value={p.month ?? 0} onChange={(e) => setPeriod({ month: Number(e.target.value) || undefined })}>
            <option value={0}>{t("expenses.filter.allMonths", "Semua bulan")}</option>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{t(`expenses.filter.monthName.${i + 1}`, m)}</option>)}
          </select>
        </label>
      )}
      {(p.mode === "month" || p.mode === "year") && (
        <label className="space-y-1">
          <div className="text-[11px] text-neutral-500">{t("expenses.filter.year", "Tahun")}</div>
          <select className={inputCls} value={p.year ?? thisYear} onChange={(e) => setPeriod({ year: Number(e.target.value) })}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
      )}

      {(isFilterActive(filter) || status) && (
        <button
          className="px-2 py-2 text-xs text-neutral-400 hover:text-neutral-200 underline"
          onClick={() => {
            onChange(EMPTY_EXPENSE_FILTER);
            onStatusChange("");
          }}
        >
          {t("expenses.filter.reset", "Reset filter")}
        </button>
      )}
    </div>
  );
}
