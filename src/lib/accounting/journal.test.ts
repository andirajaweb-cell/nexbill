import { describe, it, expect } from "vitest";
import { computeJournalBalance } from "./journal";

/**
 * Task #63 — the single most important invariant in the whole accounting engine: "setiap Journal
 * Entry wajib balance dengan total debit = total credit." computeJournalBalance is the exact
 * function postJournal uses to enforce this (see journal.ts) — testing it directly here means
 * these assertions can never silently drift out of sync with what actually gets enforced in
 * production, the way testing a hand-copied reimplementation could.
 */
describe("computeJournalBalance", () => {
  it("balances when total debit equals total credit exactly", () => {
    const result = computeJournalBalance([
      { debit: 100000, credit: 0 },
      { debit: 0, credit: 100000 },
    ]);
    expect(result.balanced).toBe(true);
    expect(result.totalDebit).toBe(100000);
    expect(result.totalCredit).toBe(100000);
  });

  it("balances across many lines split between multiple debits and credits", () => {
    // Mirrors a real split-payment sales journal: two cash lines (cash + QRIS) plus a fee and a
    // discount on the debit side, three revenue lines on the credit side — see postSalesJournal.
    const result = computeJournalBalance([
      { debit: 30000, credit: 0 }, // cash
      { debit: 20000, credit: 0 }, // qris (net of fee)
      { debit: 500, credit: 0 }, // payment gateway fee
      { debit: 5000, credit: 0 }, // discount (contra-revenue)
      { debit: 0, credit: 15000 }, // rental revenue
      { debit: 0, credit: 25000 }, // fnb revenue
      { debit: 0, credit: 15500 }, // product revenue
    ]);
    expect(result.balanced).toBe(true);
  });

  it("rejects a journal where debit and credit genuinely diverge", () => {
    const result = computeJournalBalance([
      { debit: 100000, credit: 0 },
      { debit: 0, credit: 90000 },
    ]);
    expect(result.balanced).toBe(false);
    expect(result.totalDebit).toBe(100000);
    expect(result.totalCredit).toBe(90000);
  });

  it("tolerates up to 1 rupiah of floating-point rounding noise", () => {
    const result = computeJournalBalance([
      { debit: 33333.33, credit: 0 },
      { debit: 33333.34, credit: 0 },
      { debit: 33333.33, credit: 0 },
      { debit: 0, credit: 100000 },
    ]);
    expect(result.balanced).toBe(true);
  });

  it("rejects an imbalance just past the 1 rupiah tolerance", () => {
    const result = computeJournalBalance([
      { debit: 100002, credit: 0 },
      { debit: 0, credit: 100000 },
    ]);
    expect(result.balanced).toBe(false);
  });

  it("treats missing debit/credit as zero rather than throwing", () => {
    const result = computeJournalBalance([{ debit: 5000 }, { credit: 5000 }]);
    expect(result.balanced).toBe(true);
  });

  it("an empty line set balances trivially at zero (postJournal callers are expected to guard against posting nothing meaningful, not this function)", () => {
    const result = computeJournalBalance([]);
    expect(result.balanced).toBe(true);
    expect(result.totalDebit).toBe(0);
    expect(result.totalCredit).toBe(0);
  });
});
