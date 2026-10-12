import { describe, it, expect } from "vitest";
import { expenseLineTotal, expenseUnitPrice, parseExpenseQty } from "./line-total";

describe("nominal expense = harga per satuan × jumlah", () => {
  it("90.000 × 4 = 360.000 (kasus yang dilaporkan)", () => {
    expect(expenseLineTotal("90000", "4")).toBe(360000);
  });
  it("jumlah kosong dianggap 1", () => {
    expect(expenseLineTotal(125000, "")).toBe(125000);
  });
  it("jumlah tidak sah ditolak", () => {
    expect(parseExpenseQty("0")).toBeNull();
    expect(parseExpenseQty("-2")).toBeNull();
    expect(parseExpenseQty("1.5")).toBeNull();
    expect(parseExpenseQty("abc")).toBeNull();
    expect(parseExpenseQty("3")).toBe(3);
  });
  it("harga satuan dari baris tersimpan", () => {
    expect(expenseUnitPrice(360000, 4)).toBe(90000);
    expect(expenseUnitPrice(100000, 3)).toBe(33333.33);
    expect(expenseUnitPrice(5000, null)).toBe(5000);
  });
});
