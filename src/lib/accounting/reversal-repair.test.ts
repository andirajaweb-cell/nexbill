import { describe, it, expect } from "vitest";
import { pairReversals, impactByDay, isReversal, type ReversalRepairEntry } from "./reversal-repair";

/*
 * Uji untuk perbaikan jurnal pembalik yang salah tanggal (2026-09-20).
 *
 * Yang dijaga di sini bukan "apakah angkanya cocok dengan satu contoh", melainkan batas keamanannya:
 * fungsi ini akan dipakai untuk MENGUBAH tanggal jurnal yang sudah terposting, jadi yang paling
 * penting justru apa yang TIDAK boleh disentuhnya. Pasangan yang ambigu harus ditolak, bukan
 * ditebak — menebak berarti memindahkan angka ke tanggal yang salah untuk kedua kalinya, dan
 * kesalahan kedua jauh lebih sulit ditelusuri daripada yang pertama.
 */

function entry(p: Partial<ReversalRepairEntry> & { entryId: string }): ReversalRepairEntry {
  return {
    entryDate: "2026-09-20T04:00:00.000Z",
    description: "Penjualan order abcd1234",
    sourceId: "order-1",
    status: "posted",
    revenue: 0,
    ...p,
  };
}

describe("isReversal", () => {
  it("mengenali jurnal pembalik dari awalan yang selalu ditulis voidJournal", () => {
    expect(isReversal("[VOID] Penjualan order abcd1234 — Refund")).toBe(true);
    expect(isReversal("Penjualan order abcd1234")).toBe(false);
  });
});

describe("pairReversals — kasus yang harus diperbaiki", () => {
  it("memasangkan pembalik dengan entri aslinya dan menandainya perlu diperbaiki", () => {
    // Penjualan 15/9, dibatalkan 20/9 — pembaliknya ikut tertulis 20/9 oleh bug lama.
    const entries = [
      entry({ entryId: "asli", entryDate: "2026-09-15T10:00:00.000Z", description: "Penjualan order abcd1234", status: "void", revenue: 23_000 }),
      entry({ entryId: "rev", entryDate: "2026-09-20T04:00:00.000Z", description: "[VOID] Penjualan order abcd1234 — Sinkronisasi ulang jurnal", revenue: -23_000 }),
    ];

    const { repairable, ambiguous, alreadyCorrect } = pairReversals(entries);

    expect(ambiguous).toHaveLength(0);
    expect(alreadyCorrect).toBe(0);
    expect(repairable).toHaveLength(1);
    expect(repairable[0].reversalEntryId).toBe("rev");
    expect(repairable[0].originalDate).toBe("2026-09-15T10:00:00.000Z");
    expect(repairable[0].revenueDampak).toBe(-23_000);
  });

  it("menghitung berapa nilai yang salah jatuh ke tiap hari", () => {
    const entries = [
      entry({ entryId: "a", entryDate: "2026-09-15T10:00:00.000Z", description: "Order A", status: "void", sourceId: "o-a" }),
      entry({ entryId: "ra", entryDate: "2026-09-20T04:00:00.000Z", description: "[VOID] Order A — x", sourceId: "o-a", revenue: -23_000 }),
      entry({ entryId: "b", entryDate: "2026-09-16T10:00:00.000Z", description: "Order B", status: "void", sourceId: "o-b" }),
      entry({ entryId: "rb", entryDate: "2026-09-20T05:00:00.000Z", description: "[VOID] Order B — x", sourceId: "o-b", revenue: -16_000 }),
    ];

    const dampak = impactByDay(pairReversals(entries).repairable);

    expect(dampak).toEqual([{ hari: "2026-09-20", jumlahEntri: 2, revenueSalahJatuhKeHariIni: -39_000 }]);
  });
});

describe("pairReversals — kasus yang TIDAK boleh disentuh", () => {
  it("menolak memasangkan kalau ada lebih dari satu kandidat entri asli", () => {
    // Dua entri void berdeskripsi sama pada order yang sama (sisa race double-posting lama):
    // tidak mungkin tahu pembalik ini membalik yang mana.
    const entries = [
      entry({ entryId: "asli-1", entryDate: "2026-09-15T10:00:00.000Z", description: "Penjualan order abcd1234", status: "void" }),
      entry({ entryId: "asli-2", entryDate: "2026-09-16T10:00:00.000Z", description: "Penjualan order abcd1234", status: "void" }),
      entry({ entryId: "rev", entryDate: "2026-09-20T04:00:00.000Z", description: "[VOID] Penjualan order abcd1234 — x" }),
    ];

    const { repairable, ambiguous } = pairReversals(entries);

    expect(repairable).toHaveLength(0);
    expect(ambiguous).toHaveLength(1);
    expect(ambiguous[0].jumlahKandidat).toBe(2);
  });

  it("menolak memasangkan kalau entri aslinya tidak ditemukan sama sekali", () => {
    const entries = [entry({ entryId: "rev", description: "[VOID] Entri yang aslinya sudah hilang — x" })];

    const { repairable, ambiguous } = pairReversals(entries);

    expect(repairable).toHaveLength(0);
    expect(ambiguous[0].jumlahKandidat).toBe(0);
  });

  it("tidak menyentuh pembalik yang tanggalnya sudah benar", () => {
    // Dibatalkan pada hari yang sama — sudah benar, tidak perlu dipindah.
    const entries = [
      entry({ entryId: "asli", entryDate: "2026-09-20T02:00:00.000Z", description: "Penjualan order abcd1234", status: "void" }),
      entry({ entryId: "rev", entryDate: "2026-09-20T04:00:00.000Z", description: "[VOID] Penjualan order abcd1234 — x" }),
    ];

    const { repairable, alreadyCorrect } = pairReversals(entries);

    expect(repairable).toHaveLength(0);
    expect(alreadyCorrect).toBe(1);
  });

  it("menilai 'hari yang sama' pakai kalender WIB, bukan UTC", () => {
    // 19/9 20.00 UTC = 20/9 03.00 WIB, dan 19/9 22.00 UTC = 20/9 05.00 WIB — hari yang sama di
    // outlet meski tanggal UTC-nya berbeda dari tanggal WIB-nya.
    const entries = [
      entry({ entryId: "asli", entryDate: "2026-09-19T20:00:00.000Z", description: "Penjualan order abcd1234", status: "void" }),
      entry({ entryId: "rev", entryDate: "2026-09-19T22:00:00.000Z", description: "[VOID] Penjualan order abcd1234 — x" }),
    ];

    expect(pairReversals(entries).alreadyCorrect).toBe(1);
  });

  it("tidak pernah menganggap entri transaksi biasa sebagai pembalik", () => {
    const entries = [
      entry({ entryId: "asli", entryDate: "2026-09-15T10:00:00.000Z", description: "Penjualan order abcd1234", status: "void" }),
      entry({ entryId: "lain", entryDate: "2026-09-20T04:00:00.000Z", description: "Penjualan order abcd1234" }),
    ];

    const { repairable, ambiguous, totalReversals } = pairReversals(entries);

    expect(totalReversals).toBe(0);
    expect(repairable).toHaveLength(0);
    expect(ambiguous).toHaveLength(0);
  });

  it("tidak memasangkan pembalik dengan entri di order lain meski deskripsinya mirip", () => {
    const entries = [
      entry({ entryId: "asli-lain", entryDate: "2026-09-15T10:00:00.000Z", description: "Penjualan order abcd1234", status: "void", sourceId: "order-LAIN" }),
      entry({ entryId: "rev", entryDate: "2026-09-20T04:00:00.000Z", description: "[VOID] Penjualan order abcd1234 — x", sourceId: "order-1" }),
    ];

    const { repairable, ambiguous } = pairReversals(entries);

    expect(repairable).toHaveLength(0);
    expect(ambiguous[0].jumlahKandidat).toBe(0);
  });
});
