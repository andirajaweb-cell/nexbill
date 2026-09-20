import { db } from "@/db/client";
import { accounts, cashBankAccounts, journalEntries, journalLines } from "@/db/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { outletDateYmd } from "@/lib/time/outlet-time";

export interface CashFlowResult {
  from?: string;
  to?: string;
  totalIn: number;
  totalOut: number;
  netCashFlow: number;
  inByCategory: { category: string; amount: number }[];
  outByCategory: { category: string; amount: number }[];
  byDay: { date: string; in: number; out: number; net: number }[];
  /** Akun Kas/Bank yang dipakai sebagai dasar perhitungan — ditampilkan supaya angka di laporan ini selalu bisa ditelusuri ke baris yang sama di Neraca Saldo. */
  cashAccounts: { code: string; name: string }[];
}

/**
 * Arus kas metode langsung, DIHITUNG DARI BUKU BESAR — bukan dari tabel `payments`.
 *
 * KENAPA DITULIS ULANG (2026-09-20).
 *
 * Versi sebelumnya menjumlahkan `payments` berstatus success dan menyaringnya dengan
 * `payments.paidAt`. Itu memakai dasar tanggal yang BERBEDA dari seluruh laporan keuangan lain:
 * Neraca Saldo dan Laba Rugi menyaring `journalEntries.entryDate`, yang di-stamp dari
 * `orders.businessDate` (lihat postSalesJournal di postings.ts). Untuk bisnis rental yang sesinya
 * sering lewat tengah malam, kedua tanggal itu rutin berbeda: sesi yang mulai 19/9 malam lalu
 * dibayar setelah pukul 00.00 tercatat kasnya di 19/9 oleh buku besar, tapi di 20/9 oleh laporan
 * lama ini. Pada data outlet XTREAM tanggal 20/9/2026 selisihnya Rp104.000 vs Rp43.000 — laporan
 * arus kas yang tidak bisa dicocokkan dengan akun Kas-nya sendiri tidak bisa dipakai untuk apa pun.
 *
 * Sekarang sumbernya adalah mutasi akun Kas/Bank di jurnal, jadi rekonsiliasinya bukan sesuatu yang
 * perlu dijaga — melainkan konsekuensi matematis: netCashFlow SELALU sama dengan perubahan saldo
 * akun Kas/Bank pada Neraca Saldo untuk periode yang sama, karena keduanya menjumlahkan baris
 * jurnal yang sama persis dengan penyaring tanggal yang sama persis.
 *
 * Efek samping yang juga ikut benar dengan sendirinya:
 *  - Pembayaran yang jurnalnya gagal diposting tidak lagi muncul sebagai kas masuk yang tidak ada
 *    jejaknya di buku besar.
 *  - Void/refund otomatis ternetralkan lewat jurnal pembalik, tanpa perlu logika khusus.
 *  - Pemindahan kas antar-laci (sourceType "cash_transfer") bernilai nol bersih dan tidak lagi
 *    berpotensi terhitung sebagai kas masuk — dulu tidak tertangani sama sekali.
 *  - Setoran kas, pembelian aset, dan setiap sumber jurnal lain ikut terhitung otomatis. Versi lama
 *    hanya tahu tiga sumber (payments, expenses, purchasePayments) sehingga membutakan sisanya.
 *
 * Sama seperti computeTrialBalance, entri berstatus "void" SENGAJA ikut dijumlahkan: voidJournal()
 * tidak pernah menghapus entri asli, melainkan memposting entri pembalik terpisah lalu menandai
 * yang asli sebagai "void". Kalau yang berstatus "void" dibuang, entri aslinya hilang dari total
 * sementara pembaliknya tetap terhitung — hasilnya justru timpang. Keduanya harus dijumlahkan agar
 * saling meniadakan dengan bersih.
 */
/** Satu baris jurnal sebagaimana dibutuhkan agregator di bawah — sengaja tidak memakai tipe Drizzle supaya bisa diuji tanpa database. */
export interface CashFlowLine {
  entryId: string;
  entryDate: string;
  description: string;
  accountId: string;
  debit: number;
  credit: number;
}

export interface CashFlowAggregate {
  totalIn: number;
  totalOut: number;
  netCashFlow: number;
  inByCategory: { category: string; amount: number }[];
  outByCategory: { category: string; amount: number }[];
  byDay: { date: string; in: number; out: number; net: number }[];
}

/**
 * Inti perhitungan arus kas, MURNI — tanpa database, tanpa tanggal sekarang, tanpa I/O.
 *
 * Dipisahkan dari computeCashFlow persis dengan alasan yang sama seperti proportionalSlices di
 * lib/pos/split-merge.ts dulu: jaminan terpenting fungsi ini (netCashFlow selalu sama dengan
 * pergerakan saldo akun Kas/Bank di Neraca Saldo) adalah sebuah identitas aritmetika, dan identitas
 * seperti itu hanya benar-benar terbukti kalau bisa diuji langsung atas ratusan kombinasi baris
 * jurnal. Menguji lewat database berarti menguji koneksi, bukan menguji aturannya.
 */
export function aggregateCashFlow(
  lines: CashFlowLine[],
  cashAccountIds: Set<string>,
  accountLabel: (accountId: string) => string
): CashFlowAggregate {
  interface EntryBucket { entryDate: string; description: string; cashDelta: number; counterparts: { accountId: string; weight: number }[] }
  const entries = new Map<string, EntryBucket>();
  for (const l of lines) {
    const bucket = entries.get(l.entryId) ?? { entryDate: l.entryDate, description: l.description, cashDelta: 0, counterparts: [] };
    const delta = l.debit - l.credit;
    if (cashAccountIds.has(l.accountId)) {
      bucket.cashDelta += delta;
    } else if (delta !== 0) {
      bucket.counterparts.push({ accountId: l.accountId, weight: Math.abs(delta) });
    }
    entries.set(l.entryId, bucket);
  }

  const inByCategoryMap = new Map<string, number>();
  const outByCategoryMap = new Map<string, number>();
  const dayMap = new Map<string, { in: number; out: number }>();
  let totalIn = 0;
  let totalOut = 0;

  for (const entry of entries.values()) {
    // Nol bersih = entri ini tidak memindahkan kas keluar/masuk outlet. Kasus paling umum:
    // pemindahan saldo antar-laci kas, yang mendebit satu akun kas dan mengkredit akun kas lain.
    // Itu bukan arus kas dan memang harus hilang di sini.
    if (entry.cashDelta === 0) continue;

    const isCashIn = entry.cashDelta > 0;
    const amount = Math.abs(entry.cashDelta);
    if (isCashIn) totalIn += amount;
    else totalOut += amount;

    // Tanggal harian memakai kalender WIB, BUKAN `entryDate.slice(0, 10)`. Potongan naif itu
    // membandingkan tanggal UTC: pembayaran pukul 03.00 WIB tersimpan sebagai 20.00 UTC hari
    // sebelumnya, sehingga muncul sebagai baris tanggal kemarin di laporan yang periodenya hanya
    // hari ini — persis yang terjadi pada laporan 20/9/2026 (baris "19/9" senilai Rp2.500 di dalam
    // periode 20/9—20/9). outletDateYmd() memang dibuat untuk kelas bug ini; lihat doc comment-nya.
    const dayKey = outletDateYmd(new Date(entry.entryDate));
    const day = dayMap.get(dayKey) ?? { in: 0, out: 0 };
    if (isCashIn) day.in += amount;
    else day.out += amount;
    dayMap.set(dayKey, day);

    const target = isCashIn ? inByCategoryMap : outByCategoryMap;

    const totalWeight = entry.counterparts.reduce((s, c) => s + c.weight, 0);
    if (totalWeight === 0) {
      // Tidak ada lawan transaksi non-kas yang bisa dijadikan nama kategori (entri manual yang
      // hanya menyentuh akun kas). Dikelompokkan lewat deskripsi entrinya daripada dibuang diam-
      // diam — angka yang tidak punya rumah tetap harus terlihat.
      const label = entry.description || "Lainnya";
      target.set(label, (target.get(label) ?? 0) + amount);
      continue;
    }

    // Dialokasikan proporsional ke tiap lawan transaksi, dengan sisa pembulatan diserap oleh yang
    // terakhir — konvensi yang sama dipakai di seluruh kode ini (recomputeBillTotals,
    // computeTransactionList). Tanpa penyerapan sisa, jumlah seluruh kategori bisa meleset
    // beberapa rupiah dari totalIn/totalOut, dan laporan yang kategorinya tidak menjumlah ke
    // totalnya sendiri akan langsung dicurigai pemiliknya — dengan alasan yang tepat.
    let allocated = 0;
    entry.counterparts.forEach((c, i) => {
      const isLast = i === entry.counterparts.length - 1;
      const share = isLast ? amount - allocated : Math.round((amount * c.weight) / totalWeight);
      allocated += share;
      if (share === 0) return;
      const label = accountLabel(c.accountId);
      target.set(label, (target.get(label) ?? 0) + share);
    });
  }

  const byDay = Array.from(dayMap.entries())
    .map(([date, v]) => ({ date, in: v.in, out: v.out, net: v.in - v.out }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const sortedCategories = (m: Map<string, number>) =>
    Array.from(m.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

  return {
    totalIn,
    totalOut,
    netCashFlow: totalIn - totalOut,
    inByCategory: sortedCategories(inByCategoryMap),
    outByCategory: sortedCategories(outByCategoryMap),
    byDay,
  };
}

export async function computeCashFlow(outletId: string, from?: string, to?: string): Promise<CashFlowResult> {
  /*
   * Himpunan akun Kas/Bank diambil dari dua sumber yang digabung, bukan satu.
   *
   * `cashBankAccounts` adalah sumber resmi (dibuat otomatis saat sebuah akun GL pertama kali
   * dipakai menerima pembayaran — lihat account-mapping.ts). Tapi tabel itu baru terisi saat ada
   * transaksi yang memakainya, sehingga akun Kas bawaan yang sudah menerima jurnal dari jalur lain
   * (saldo awal, setoran manual, impor historis) bisa saja belum punya barisnya. Kalau hanya
   * mengandalkan tabel itu, laporan bisa diam-diam melewatkan satu laci kas utuh dan tampil terlalu
   * kecil tanpa ada tanda apa pun bahwa ada yang hilang.
   *
   * Karena itu ditambah rentang kode COA bawaan aplikasi ini: 111x Kas dan 112x Bank (lihat
   * coa-data.ts). Akun induk yang tidak boleh diposting (1110, 1120) ikut tersaring sendiri karena
   * tidak akan pernah punya baris jurnal.
   */
  const [cashBankRows, codeRangeRows] = await Promise.all([
    db.select({ accountId: cashBankAccounts.accountId }).from(cashBankAccounts).where(eq(cashBankAccounts.outletId, outletId)),
    db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.outletId, outletId), eq(accounts.type, "asset"), sql`(${accounts.code} LIKE '111%' OR ${accounts.code} LIKE '112%')`)),
  ]);

  const cashAccountIds = Array.from(new Set([...cashBankRows.map((r) => r.accountId), ...codeRangeRows.map((r) => r.id)]));
  const cashAccountIdSet = new Set(cashAccountIds);

  const emptyResult: CashFlowResult = {
    from, to, totalIn: 0, totalOut: 0, netCashFlow: 0,
    inByCategory: [], outByCategory: [], byDay: [], cashAccounts: [],
  };
  if (cashAccountIds.length === 0) return emptyResult;

  // Semua akun outlet ini, untuk menamai lawan transaksi tanpa query tambahan per baris.
  const allAccounts = await db.select({ id: accounts.id, code: accounts.code, name: accounts.name }).from(accounts).where(eq(accounts.outletId, outletId));
  const accountById = new Map(allAccounts.map((a) => [a.id, a]));

  /*
   * Penyaring tanggal SENGAJA identik dengan computeTrialBalance: kolom yang sama (entryDate),
   * operator yang sama (gte/lte inklusif), nilai from/to yang sama dari PeriodPicker. Setiap
   * perbedaan sekecil apa pun di sini akan langsung muncul sebagai selisih yang tidak bisa
   * dijelaskan antara Arus Kas dan Neraca Saldo — persis bug yang membuat fungsi ini ditulis ulang.
   */
  const entryConditions = [eq(journalEntries.outletId, outletId)];
  if (from) entryConditions.push(gte(journalEntries.entryDate, from));
  if (to) entryConditions.push(lte(journalEntries.entryDate, to));

  const lines = await db
    .select({
      entryId: journalEntries.id,
      entryDate: journalEntries.entryDate,
      description: journalEntries.description,
      accountId: journalLines.accountId,
      debit: journalLines.debit,
      credit: journalLines.credit,
    })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
    .where(and(...entryConditions));

  const cashAccountsMeta = cashAccountIds
    .map((id) => accountById.get(id))
    .filter((a): a is NonNullable<typeof a> => !!a)
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((a) => ({ code: a.code, name: a.name }));

  if (lines.length === 0) return { ...emptyResult, cashAccounts: cashAccountsMeta };

  const aggregate = aggregateCashFlow(lines, cashAccountIdSet, (accountId) => {
    const acc = accountById.get(accountId);
    return acc ? `${acc.name} (${acc.code})` : "Lainnya";
  });

  return { from, to, ...aggregate, cashAccounts: cashAccountsMeta };
}
