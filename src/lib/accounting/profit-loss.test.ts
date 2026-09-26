import { describe, it, expect } from "vitest";
import { classifyProfitLoss } from "./reports";

/*
 * Laba Rugi bertingkat harus menempatkan setiap golongan COA di bagian yang benar. Dulu Laba Kotor =
 * SEMUA pendapatan − HPP, sehingga komisi vendor/bunga bank (47xx, 7xxx) ikut menaikkan Laba Kotor.
 */
const r = (code: string, balance: number) => ({ code, balance, isPostingAllowed: true });

describe("classifyProfitLoss", () => {
  const revenue = [r("4120", 10_000_000), r("4210", 3_000_000), r("4910", -500_000), r("4710", 400_000), r("7100", 100_000)];
  const expense = [r("5110", 1_200_000), r("5310", 50_000), r("6110", 4_000_000), r("6810", 700_000), r("8100", 150_000), r("8500", 62_500)];
  const pl = classifyProfitLoss(revenue, expense);

  it("keeps other income out of operating revenue and gross profit", () => {
    expect(pl.operatingRevenue).toBe(12_500_000);
    expect(pl.otherIncome).toBe(500_000);
    expect(pl.grossProfit).toBe(12_500_000 - 1_250_000);
  });
  it("steps down to net profit through operating, other, and tax sections", () => {
    expect(pl.operatingExpense).toBe(4_700_000);
    expect(pl.operatingProfit).toBe(11_250_000 - 4_700_000);
    expect(pl.otherExpense).toBe(150_000);
    expect(pl.profitBeforeTax).toBe(6_550_000 + 500_000 - 150_000);
    expect(pl.incomeTax).toBe(62_500);
  });
  it("net profit always equals total revenue − total expense", () => {
    const totalRevenue = revenue.reduce((s, x) => s + x.balance, 0);
    const totalExpense = expense.reduce((s, x) => s + x.balance, 0);
    expect(pl.netProfit).toBe(totalRevenue - totalExpense);
  });
  it("puts expense codes outside 5/6/8 under operating expense instead of dropping them", () => {
    const x = classifyProfitLoss([r("4120", 100)], [r("9990", 30)]);
    expect(x.operatingExpense).toBe(30);
    expect(x.netProfit).toBe(70);
  });
});
