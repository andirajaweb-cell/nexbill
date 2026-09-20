import { describe, it, expect } from "vitest";
import { aggregateCashFlow, type CashFlowLine } from "./cashflow";

/*
 * Uji untuk penulisan ulang Arus Kas (2026-09-20).
 *
 * Versi lama menjumlahkan tabel `payments` dan menyaringnya dengan `paidAt`, sementara Neraca Saldo
 * menjumlahkan baris jurnal dan menyaringnya dengan `entryDate`. Pada data outlet XTREAM tanggal
 * 20/9/2026 keduanya berselisih Rp104.000 vs Rp43.000, dan tabel hariannya bahkan memuat baris
 * tanggal 19/9 di dalam laporan yang periodenya 20/9—20/9.
 *
 * Yang diuji di sini bukan "apakah angkanya sama dengan contoh", melainkan dua sifat yang harus
 * berlaku untuk SEMUA masukan:
 *   1. netCashFlow selalu sama dengan total mutasi (debit − kredit) akun Kas/Bank. Itulah yang
 *      membuat laporan ini otomatis cocok dengan Neraca Saldo, karena Neraca Saldo menjumlahkan
 *      baris yang sama persis.
 *   2. Rincian kategori selalu menjumlah tepat ke totalnya, tanpa selisih pembulatan.
 */

const KAS = "acc-kas";
const KAS_KECIL = "acc-kas-kecil";
const CASH_SET = new Set([KAS, KAS_KECIL]);
const label = (id: string) => `Akun ${id}`;

function line(partial: Partial<CashFlowLine> & { entryId: string; accountId: string }): CashFlowLine {
  return {
    entryDate: "2026-09-20T05:00:00.000Z",
    description: "Entri uji",
    debit: 0,
    credit: 0,
    ...partial,
  };
}

describe("aggregateCashFlow — identitas rekonsiliasi", () => {
  it("netCashFlow sama dengan mutasi bersih akun kas (inilah yang menjamin cocok dengan Neraca Saldo)", () => {
    const lines: CashFlowLine[] = [
      // Penjualan tunai: Dr Kas 25.000 / Cr Pendapatan 25.000
      line({ entryId: "e1", accountId: KAS, debit: 25_000 }),
      line({ entryId: "e1", accountId: "acc-pendapatan", credit: 25_000 }),
      // Pelunasan piutang: Dr Kas 18.000 / Cr Piutang 18.000
      line({ entryId: "e2", accountId: KAS, debit: 18_000 }),
      line({ entryId: "e2", accountId: "acc-piutang", credit: 18_000 }),
      // Bayar beban: Dr Beban 5.000 / Cr Kas 5.000
      line({ entryId: "e3", accountId: "acc-beban", debit: 5_000 }),
      line({ entryId: "e3", accountId: KAS, credit: 5_000 }),
    ];

    const result = aggregateCashFlow(lines, CASH_SET, label);

    // Persis cara computeTrialBalance menghitung saldo akun kas untuk periode yang sama.
    const mutasiKas = lines
      .filter((l) => CASH_SET.has(l.accountId))
      .reduce((s, l) => s + l.debit - l.credit, 0);

    expect(result.netCashFlow).toBe(mutasiKas);
    expect(result.netCashFlow).toBe(38_000);
    expect(result.totalIn).toBe(43_000); // angka Kas Kasir pada Neraca Saldo 20/9/2026
    expect(result.totalOut).toBe(5_000);
  });

  it("identitas itu bertahan untuk kombinasi acak baris jurnal", () => {
    let seed = 1337;
    const rand = (n: number) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };

    for (let run = 0; run < 300; run++) {
      const lines: CashFlowLine[] = [];
      const entryCount = 1 + rand(6);
      for (let e = 0; e < entryCount; e++) {
        const amount = 1_000 + rand(90_000);
        const masuk = rand(2) === 0;
        const kasAccount = rand(2) === 0 ? KAS : KAS_KECIL;
        const counterpartCount = 1 + rand(3);
        // Lawan transaksi dipecah agar jalur alokasi proporsional ikut teruji.
        let sisa = amount;
        for (let c = 0; c < counterpartCount; c++) {
          const isLast = c === counterpartCount - 1;
          const bagian = isLast ? sisa : Math.max(1, Math.floor(sisa / (counterpartCount - c)));
          sisa -= bagian;
          lines.push(line({
            entryId: `r${run}-e${e}`,
            accountId: `acc-lawan-${c}`,
            debit: masuk ? 0 : bagian,
            credit: masuk ? bagian : 0,
          }));
        }
        lines.push(line({
          entryId: `r${run}-e${e}`,
          accountId: kasAccount,
          debit: masuk ? amount : 0,
          credit: masuk ? 0 : amount,
        }));
      }

      const result = aggregateCashFlow(lines, CASH_SET, label);
      const mutasiKas = lines.filter((l) => CASH_SET.has(l.accountId)).reduce((s, l) => s + l.debit - l.credit, 0);

      expect(result.netCashFlow).toBe(mutasiKas);

      // Sifat kedua: kategori harus menjumlah tepat ke totalnya, tanpa sisa pembulatan.
      expect(result.inByCategory.reduce((s, c) => s + c.amount, 0)).toBe(result.totalIn);
      expect(result.outByCategory.reduce((s, c) => s + c.amount, 0)).toBe(result.totalOut);

      // Sifat ketiga: tabel harian harus menjumlah ke total yang sama.
      expect(result.byDay.reduce((s, d) => s + d.in, 0)).toBe(result.totalIn);
      expect(result.byDay.reduce((s, d) => s + d.out, 0)).toBe(result.totalOut);
    }
  });
});

describe("aggregateCashFlow — tanggal memakai kalender WIB", () => {
  it("transaksi dini hari WIB tidak lagi jatuh ke baris tanggal kemarin", () => {
    // 19 Sep 2026 20.46 UTC = 20 Sep 2026 03.46 WIB. Versi lama (iso.slice(0, 10)) melabelinya
    // "2026-09-19" — persis baris 19/9 yang muncul di laporan berperiode 20/9—20/9.
    const lines: CashFlowLine[] = [
      line({ entryId: "e1", entryDate: "2026-09-19T20:46:00.000Z", accountId: KAS, debit: 2_500 }),
      line({ entryId: "e1", entryDate: "2026-09-19T20:46:00.000Z", accountId: "acc-pendapatan", credit: 2_500 }),
    ];

    const result = aggregateCashFlow(lines, CASH_SET, label);

    expect(result.byDay).toHaveLength(1);
    expect(result.byDay[0].date).toBe("2026-09-20");
    expect(result.byDay[0].in).toBe(2_500);
  });

  it("transaksi malam WIB tetap di tanggalnya sendiri", () => {
    // 20 Sep 2026 16.00 UTC = 20 Sep 2026 23.00 WIB — masih hari yang sama di outlet.
    const lines: CashFlowLine[] = [
      line({ entryId: "e1", entryDate: "2026-09-20T16:00:00.000Z", accountId: KAS, debit: 7_000 }),
      line({ entryId: "e1", entryDate: "2026-09-20T16:00:00.000Z", accountId: "acc-pendapatan", credit: 7_000 }),
    ];

    expect(aggregateCashFlow(lines, CASH_SET, label).byDay[0].date).toBe("2026-09-20");
  });
});

describe("aggregateCashFlow — kasus yang dulu salah hitung", () => {
  it("pemindahan kas antar-laci bernilai nol, bukan kas masuk", () => {
    // Dr Kas Kecil / Cr Kas — uang berpindah laci, tidak masuk atau keluar dari outlet.
    const lines: CashFlowLine[] = [
      line({ entryId: "e1", accountId: KAS_KECIL, debit: 500_000 }),
      line({ entryId: "e1", accountId: KAS, credit: 500_000 }),
    ];

    const result = aggregateCashFlow(lines, CASH_SET, label);

    expect(result.totalIn).toBe(0);
    expect(result.totalOut).toBe(0);
    expect(result.byDay).toHaveLength(0);
  });

  it("jurnal pembalik meniadakan jurnal aslinya sampai nol", () => {
    // voidJournal() tidak menghapus entri asli, melainkan memposting pembalik. Keduanya ikut
    // dijumlahkan — sama seperti computeTrialBalance — sehingga saling meniadakan dengan bersih.
    const lines: CashFlowLine[] = [
      line({ entryId: "asli", accountId: KAS, debit: 30_000 }),
      line({ entryId: "asli", accountId: "acc-pendapatan", credit: 30_000 }),
      line({ entryId: "pembalik", accountId: "acc-pendapatan", debit: 30_000 }),
      line({ entryId: "pembalik", accountId: KAS, credit: 30_000 }),
    ];

    const result = aggregateCashFlow(lines, CASH_SET, label);

    expect(result.netCashFlow).toBe(0);
    expect(result.totalIn).toBe(30_000);
    expect(result.totalOut).toBe(30_000);
  });

  it("entri manual tanpa lawan transaksi non-kas tetap muncul, tidak hilang diam-diam", () => {
    const lines: CashFlowLine[] = [
      line({ entryId: "e1", accountId: KAS, debit: 10_000, description: "Penyesuaian kas" }),
    ];

    const result = aggregateCashFlow(lines, CASH_SET, label);

    expect(result.totalIn).toBe(10_000);
    expect(result.inByCategory).toEqual([{ category: "Penyesuaian kas", amount: 10_000 }]);
  });

  it("jurnal tanpa akun kas sama sekali diabaikan", () => {
    // Pengakuan piutang: Dr Piutang / Cr Pendapatan — pendapatan diakui, tapi belum ada kas.
    const lines: CashFlowLine[] = [
      line({ entryId: "e1", accountId: "acc-piutang", debit: 50_000 }),
      line({ entryId: "e1", accountId: "acc-pendapatan", credit: 50_000 }),
    ];

    const result = aggregateCashFlow(lines, CASH_SET, label);

    expect(result.totalIn).toBe(0);
    expect(result.totalOut).toBe(0);
  });
});
