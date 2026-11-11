import { describe, expect, it } from "vitest";
import { ACCOUNTING_TABS, accountingGroupOf, accountingTabFromSlug, accountingTabSlug, assetComposition, deltaPct, previousPeriod, visibleAccountingGroups } from "./nav";

describe("navigasi Accounting", () => {
  it("setiap tab punya slug unik yang bisa dibaca balik", () => {
    const slugs = ACCOUNTING_TABS.map(accountingTabSlug);
    expect(new Set(slugs).size).toBe(ACCOUNTING_TABS.length);
    for (const t of ACCOUNTING_TABS) expect(accountingTabFromSlug(accountingTabSlug(t))).toBe(t);
    expect(accountingTabFromSlug("tidak-ada")).toBeNull();
    expect(accountingTabFromSlug(null)).toBeNull();
  });
  it("kelompok", () => {
    expect(accountingGroupOf("Neraca")).toBe("statements");
    expect(accountingGroupOf("Tutup Periode")).toBe("control");
    const g = visibleAccountingGroups((t) => t !== "Migrasi Data" && t !== "Account Mapping");
    expect(g.find((x) => x.id === "setup")).toBeUndefined();
    expect(g.find((x) => x.id === "statements")?.tabs).toHaveLength(4);
  });
  it("periode pembanding & delta", () => {
    const p = previousPeriod("2026-11-01T00:00:00.000Z", "2026-11-30T23:59:59.999Z")!;
    expect(p.to).toBe("2026-10-31T23:59:59.999Z");
    expect(p.from.slice(0, 10)).toBe("2026-10-02");
    expect(previousPeriod("", "x")).toBeNull();
    expect(deltaPct(110, 100)).toBe(10);
    expect(deltaPct(-50, -100)).toBe(50);
    expect(deltaPct(5, 0)).toBeNull();
  });
  it("komposisi aset tanpa menghitung header dua kali", () => {
    const c = assetComposition([
      { code: "1000", balance: 999, isPostingAllowed: false },
      { code: "1112", balance: 100, isPostingAllowed: true },
      { code: "1121", balance: -20, isPostingAllowed: true },
      { code: "1151", balance: 30, isPostingAllowed: true },
      { code: "1161", balance: 40, isPostingAllowed: true },
      { code: "1244", balance: 50, isPostingAllowed: true },
      { code: "1310", balance: 5, isPostingAllowed: true },
    ]);
    expect(c).toEqual({ cash: 80, receivables: 30, inventory: 40, fixed: 50, other: 5, total: 205 });
  });
});
