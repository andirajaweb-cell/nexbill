import { describe, it, expect } from "vitest";
import { computeJournalBalance, resolveReversalEntryDate } from "./journal";
import { aggregateCashFlow, type CashFlowLine } from "./cashflow";

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

/*
 * Uji untuk perbaikan tanggal jurnal pembalik (2026-09-20).
 *
 * Sebelumnya voidJournal() tidak pernah meneruskan entryDate ke postJournal, sehingga setiap
 * pembalik bertanggal hari ini. Membatalkan penjualan hari kemarin karenanya menghasilkan dua
 * laporan yang dua-duanya keliru: Laba Rugi hari asal tetap menampilkan pendapatan penuh seolah
 * pembatalan tidak pernah terjadi, sementara Laba Rugi hari ini menampilkan PENDAPATAN NEGATIF —
 * baris "Rental PS 3 Rp-2.500" pada laporan 20/9/2026 yang secara akuntansi tidak bermakna.
 */

describe("resolveReversalEntryDate", () => {
  it("memakai tanggal jurnal asli saat periodenya masih terbuka", () => {
    const result = resolveReversalEntryDate("2026-09-19T20:46:00.000Z", false, "2026-09-20T06:00:00.000Z");

    expect(result.entryDate).toBe("2026-09-19T20:46:00.000Z");
    expect(result.lockedNote).toBe("");
  });

  it("mundur ke tanggal hari ini hanya kalau periode asal sudah ditutup", () => {
    const result = resolveReversalEntryDate("2026-08-15T10:00:00.000Z", true, "2026-09-20T06:00:00.000Z");

    expect(result.entryDate).toBe("2026-09-20T06:00:00.000Z");
    // Keterangannya harus menyebut periode asal, supaya pendapatan negatif di periode berjalan
    // bisa langsung ditelusuri alih-alih tampak seperti kesalahan sistem.
    expect(result.lockedNote).toContain("Agustus 2026");
    expect(result.lockedNote).toContain("sudah ditutup");
  });
});

describe("pembalikan lintas hari tidak lagi menghasilkan angka negatif", () => {
  const KAS = "acc-kas";
  const PENDAPATAN = "acc-pendapatan-ps3";
  const CASH_SET = new Set([KAS]);
  const label = (id: string) => (id === PENDAPATAN ? "Rental PS 3 (4105)" : id);

  /** Meniru cara computeTrialBalance/computeProfitLoss menjumlahkan satu akun untuk satu periode. */
  const saldoAkun = (lines: CashFlowLine[], accountId: string, from: string, to: string) =>
    lines
      .filter((l) => l.accountId === accountId && l.entryDate >= from && l.entryDate <= to)
      .reduce((s, l) => s + l.credit - l.debit, 0);

  // Penjualan tanggal 19/9 pukul 22.00 WIB (= 15.00 UTC): Dr Kas / Cr Pendapatan 2.500.
  const asli: CashFlowLine[] = [
    { entryId: "asli", entryDate: "2026-09-19T15:00:00.000Z", description: "Rental TV 2", accountId: KAS, debit: 2_500, credit: 0 },
    { entryId: "asli", entryDate: "2026-09-19T15:00:00.000Z", description: "Rental TV 2", accountId: PENDAPATAN, debit: 0, credit: 2_500 },
  ];

  const hariIniDari = "2026-09-19T17:00:00.000Z"; // 20/9 00.00 WIB
  const hariIniSampai = "2026-09-20T16:59:59.999Z"; // 20/9 23.59 WIB

  it("PERILAKU LAMA: pembalik bertanggal hari ini membuat pendapatan hari ini negatif", () => {
    const tanggalPembalikLama = "2026-09-20T04:00:00.000Z"; // hari pembatalan, bukan hari penjualan
    const pembalik: CashFlowLine[] = [
      { entryId: "void", entryDate: tanggalPembalikLama, description: "[VOID] Rental TV 2", accountId: PENDAPATAN, debit: 2_500, credit: 0 },
      { entryId: "void", entryDate: tanggalPembalikLama, description: "[VOID] Rental TV 2", accountId: KAS, debit: 0, credit: 2_500 },
    ];
    const semua = [...asli, ...pembalik];

    // Persis gejala yang dilaporkan pemilik.
    expect(saldoAkun(semua, PENDAPATAN, hariIniDari, hariIniSampai)).toBe(-2_500);
  });

  it("PERILAKU BARU: pembalik ikut tanggal asli, jadi tidak ada periode yang menampilkan angka negatif", () => {
    const { entryDate } = resolveReversalEntryDate(asli[0].entryDate, false);
    const pembalik: CashFlowLine[] = [
      { entryId: "void", entryDate, description: "[VOID] Rental TV 2", accountId: PENDAPATAN, debit: 2_500, credit: 0 },
      { entryId: "void", entryDate, description: "[VOID] Rental TV 2", accountId: KAS, debit: 0, credit: 2_500 },
    ];
    const semua = [...asli, ...pembalik];

    // Hari ini: transaksi itu memang tidak pernah terjadi di sini, jadi nol — bukan minus.
    expect(saldoAkun(semua, PENDAPATAN, hariIniDari, hariIniSampai)).toBe(0);

    // Hari asalnya: penjualan dan pembalikannya saling meniadakan dengan bersih.
    const kemarinDari = "2026-09-18T17:00:00.000Z";
    const kemarinSampai = "2026-09-19T16:59:59.999Z";
    expect(saldoAkun(semua, PENDAPATAN, kemarinDari, kemarinSampai)).toBe(0);

    // Arus kas ikut netral di hari asalnya, tanpa perlu logika khusus untuk pembatalan.
    const arusKas = aggregateCashFlow(semua, CASH_SET, label);
    expect(arusKas.netCashFlow).toBe(0);
    expect(arusKas.totalIn).toBe(2_500);
    expect(arusKas.totalOut).toBe(2_500);
  });
});

describe("absorbRoundingResidual", () => {
  it("moves a sub-rupiah residual onto the largest short-side line so the journal balances exactly", async () => {
    const { absorbRoundingResidual, computeJournalBalance } = await import("./journal");
    const lines = [
      { debit: 1000.4, credit: 0 },
      { debit: 0, credit: 600 },
      { debit: 0, credit: 400 },
    ];
    const fixed = absorbRoundingResidual(lines);
    const { totalDebit, totalCredit } = computeJournalBalance(fixed);
    expect(totalDebit).toBe(totalCredit);
    expect(fixed[1].credit).toBe(600.4); // largest credit line absorbed it
    expect(fixed[2].credit).toBe(400);
  });

  it("leaves an already-balanced journal untouched", async () => {
    const { absorbRoundingResidual } = await import("./journal");
    const lines = [{ debit: 500, credit: 0 }, { debit: 0, credit: 500 }];
    expect(absorbRoundingResidual(lines)).toBe(lines);
  });
});
