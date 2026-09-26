import { outletDateYmd } from "@/lib/time/outlet-time";

/**
 * Filter & pencarian tabel Daftar Expense (dashboard/expenses). Murni — tanpa React/DB — supaya
 * aturannya bisa diuji langsung.
 *
 * Tanggal selalu dibandingkan dalam kalender outlet (WIB), bukan potongan string UTC: expense
 * pukul 01.00 WIB tersimpan sebagai 18.00 UTC hari sebelumnya, dan filter "tanggal 1" harus tetap
 * menemukannya di tanggal 1.
 */

export type ExpenseSearchColumn = "all" | "number" | "description" | "account" | "payee" | "costCenter" | "staff" | "amount";
export type ExpensePeriodMode = "all" | "date" | "range" | "month" | "year";

export interface ExpensePeriod {
  mode: ExpensePeriodMode;
  /** YYYY-MM-DD — mode "date" */
  date?: string;
  /** YYYY-MM-DD — mode "range" (keduanya inklusif, boleh salah satu kosong) */
  from?: string;
  to?: string;
  /** 1–12 — mode "month" */
  month?: number;
  /** YYYY — mode "month" dan "year" */
  year?: number;
}

export interface ExpenseListFilter {
  column: ExpenseSearchColumn;
  query: string;
  period: ExpensePeriod;
}

export interface ExpenseLike {
  expenseNumber?: string | null;
  expenseDate: string;
  description?: string | null;
  category?: string | null;
  payeeName?: string | null;
  supplierId?: string | null;
  accountId?: string | null;
  costCenterId?: string | null;
  staffUserId?: string | null;
  amount: number;
  taxAmount?: number | null;
}

export interface ExpenseLookups {
  accountName: (id: string | null | undefined) => string;
  supplierName: (id: string | null | undefined) => string;
  costCenterName: (id: string | null | undefined) => string;
  staffName: (id: string | null | undefined) => string;
}

export const EMPTY_EXPENSE_FILTER: ExpenseListFilter = { column: "all", query: "", period: { mode: "all" } };

export function expenseYmd(e: Pick<ExpenseLike, "expenseDate">): string {
  const d = new Date(e.expenseDate);
  return Number.isNaN(d.getTime()) ? "" : outletDateYmd(d);
}

export function expenseTotal(e: Pick<ExpenseLike, "amount" | "taxAmount">): number {
  return (e.amount ?? 0) + (e.taxAmount ?? 0);
}

export function matchesPeriod(ymd: string, p: ExpensePeriod): boolean {
  if (!ymd) return p.mode === "all";
  switch (p.mode) {
    case "all":
      return true;
    case "date":
      return !p.date || ymd === p.date;
    case "range":
      return (!p.from || ymd >= p.from) && (!p.to || ymd <= p.to);
    case "month":
      if (!p.year) return true;
      return ymd.startsWith(p.month ? `${p.year}-${String(p.month).padStart(2, "0")}-` : `${p.year}-`);
    case "year":
      return !p.year || ymd.startsWith(`${p.year}-`);
  }
}

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

function columnTexts(e: ExpenseLike, column: ExpenseSearchColumn, l: ExpenseLookups): string[] {
  const payee = [e.payeeName ?? "", l.supplierName(e.supplierId)];
  switch (column) {
    case "number":
      return [e.expenseNumber ?? ""];
    case "description":
      return [e.description ?? "", e.category ?? ""];
    case "account":
      return [l.accountName(e.accountId)];
    case "payee":
      return payee;
    case "costCenter":
      return [l.costCenterName(e.costCenterId)];
    case "staff":
      return [l.staffName(e.staffUserId)];
    case "amount":
      return [];
    case "all":
      return [e.expenseNumber ?? "", e.description ?? "", e.category ?? "", l.accountName(e.accountId), ...payee, l.costCenterName(e.costCenterId), l.staffName(e.staffUserId)];
  }
}

/** Nominal cocok bila digit kata kunci ada di total (nominal + pajak): "50.000", "50000", dan "Rp 50.000" sama; "50" juga cocok ke 50.000 dan 150.000. */
function matchesAmount(e: ExpenseLike, query: string): boolean {
  const digits = query.replace(/\D/g, "");
  if (!digits) return false;
  return String(Math.round(expenseTotal(e))).includes(digits);
}

/** Setiap kata kunci (dipisah spasi) harus ditemukan — "listrik mei" menemukan "Tagihan listrik bulan Mei". */
export function matchesQuery(e: ExpenseLike, column: ExpenseSearchColumn, query: string, l: ExpenseLookups): boolean {
  const q = query.trim();
  if (!q) return true;
  if (column === "amount") return matchesAmount(e, q);
  const haystack = norm(columnTexts(e, column, l).filter((s) => s && s !== "-").join(" \u0001 "));
  const tokens = norm(q).split(/\s+/).filter(Boolean);
  const textHit = tokens.every((tok) => haystack.includes(tok));
  // In "Semua kolom", a purely numeric query also matches the amount.
  if (!textHit && column === "all" && /^[\d.,\s]+$/.test(q)) return matchesAmount(e, q);
  return textHit;
}

export function filterExpenses<T extends ExpenseLike>(rows: T[], f: ExpenseListFilter, l: ExpenseLookups): T[] {
  return rows.filter((e) => matchesPeriod(expenseYmd(e), f.period) && matchesQuery(e, f.column, f.query, l));
}

/** Tahun-tahun yang punya expense (terbaru dulu), selalu termasuk tahun berjalan. */
export function expenseYears(rows: ExpenseLike[], today: Date = new Date()): number[] {
  const years = new Set<number>([Number(outletDateYmd(today).slice(0, 4))]);
  for (const e of rows) {
    const y = Number(expenseYmd(e).slice(0, 4));
    if (y) years.add(y);
  }
  return [...years].sort((a, b) => b - a);
}

export function isFilterActive(f: ExpenseListFilter): boolean {
  return f.query.trim() !== "" || f.period.mode !== "all";
}
