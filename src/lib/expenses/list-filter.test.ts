import { describe, it, expect } from "vitest";
import { expenseYears, filterExpenses, EMPTY_EXPENSE_FILTER, type ExpenseLike, type ExpenseListFilter, type ExpenseLookups } from "./list-filter";

const lookups: ExpenseLookups = {
  accountName: (id) => ({ acc1: "Listrik", acc2: "Gaji" } as Record<string, string>)[id ?? ""] ?? "-",
  supplierName: (id) => ({ sup1: "PLN Pascabayar" } as Record<string, string>)[id ?? ""] ?? "-",
  costCenterName: (id) => ({ cc1: "Dapur" } as Record<string, string>)[id ?? ""] ?? "-",
  staffName: (id) => ({ st1: "Budi" } as Record<string, string>)[id ?? ""] ?? "-",
};

const rows: (ExpenseLike & { id: string })[] = [
  // 1 Mei 2026 01.00 WIB = 30 Apr 18.00 UTC — must count as 1 Mei.
  { id: "a", expenseNumber: "EXP-001", expenseDate: "2026-04-30T18:00:00.000Z", description: "Tagihan listrik bulan Mei", accountId: "acc1", supplierId: "sup1", amount: 450_000, taxAmount: 0, staffUserId: "st1" },
  { id: "b", expenseNumber: "EXP-002", expenseDate: "2026-05-15T05:00:00.000Z", description: "Gaji kasir", accountId: "acc2", payeeName: "Andi", amount: 2_000_000, costCenterId: "cc1" },
  { id: "c", expenseNumber: "EXP-003", expenseDate: "2025-12-31T10:00:00.000Z", category: "Air galon", accountId: "acc1", amount: 20_000, taxAmount: 2_200 },
];

const run = (f: Partial<ExpenseListFilter>) => filterExpenses(rows, { ...EMPTY_EXPENSE_FILTER, ...f }, lookups).map((r) => r.id);

describe("filterExpenses — period", () => {
  it("uses the outlet (WIB) calendar date", () => {
    expect(run({ period: { mode: "date", date: "2026-05-01" } })).toEqual(["a"]);
    expect(run({ period: { mode: "date", date: "2026-04-30" } })).toEqual([]);
  });
  it("filters by month + year, year, and inclusive range", () => {
    expect(run({ period: { mode: "month", month: 5, year: 2026 } })).toEqual(["a", "b"]);
    expect(run({ period: { mode: "month", month: 4, year: 2026 } })).toEqual([]);
    expect(run({ period: { mode: "year", year: 2025 } })).toEqual(["c"]);
    expect(run({ period: { mode: "range", from: "2026-05-01", to: "2026-05-15" } })).toEqual(["a", "b"]);
    expect(run({ period: { mode: "range", to: "2025-12-31" } })).toEqual(["c"]);
  });
});

describe("filterExpenses — search by column", () => {
  it("matches every keyword, case-insensitive, in any order", () => {
    expect(run({ query: "mei LISTRIK" })).toEqual(["a"]);
    expect(run({ query: "listrik juni" })).toEqual([]);
  });
  it("restricts the search to the chosen column", () => {
    expect(run({ column: "account", query: "listrik" })).toEqual(["a", "c"]);
    expect(run({ column: "description", query: "listrik" })).toEqual(["a"]);
    expect(run({ column: "payee", query: "pln" })).toEqual(["a"]);
    expect(run({ column: "payee", query: "andi" })).toEqual(["b"]);
    expect(run({ column: "costCenter", query: "dapur" })).toEqual(["b"]);
    expect(run({ column: "staff", query: "budi" })).toEqual(["a"]);
    expect(run({ column: "number", query: "exp-003" })).toEqual(["c"]);
  });
  it("matches amounts including tax, however the number is typed", () => {
    expect(run({ column: "amount", query: "22.200" })).toEqual(["c"]);
    expect(run({ column: "amount", query: "Rp 2.000.000" })).toEqual(["b"]);
    expect(run({ query: "450000" })).toEqual(["a"]);
  });
  it("combines search with period", () => {
    expect(run({ column: "account", query: "listrik", period: { mode: "year", year: 2026 } })).toEqual(["a"]);
  });
});

describe("expenseYears", () => {
  it("lists years present in the data plus the current year, newest first", () => {
    expect(expenseYears(rows, new Date("2027-01-10T00:00:00Z"))).toEqual([2027, 2026, 2025]);
  });
});
