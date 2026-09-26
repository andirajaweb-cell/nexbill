import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { accounts, journalEntries, journalLines } from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { excludeCancelledPairs } from "@/lib/accounting/reports";

/**
 * READ-ONLY. Memecah perputaran satu akun COA menurut ASAL transaksinya.
 *
 * KENAPA ADA. Neraca Saldo menampilkan tiga angka per akun: Debit, Kredit, Saldo. Dari ketiganya,
 * hanya Saldo yang bisa langsung dimengerti. Kolom Debit dan Kredit adalah perputaran — total
 * seluruh pergerakan selama periode — dan pada akun kas, angkanya selalu jauh lebih besar daripada
 * penjualan, karena kas juga dilewati uang yang bukan pendapatan sama sekali: setoran PPOB yang
 * langsung diteruskan ke provider, uang muka pelanggan, pelunasan piutang, pemindahan antar-laci.
 *
 * Pemilik outlet XTREAM menanyakannya dengan tepat: Kas Kasir mencatat debit Rp13,2 juta sementara
 * halaman Transaksi hanya menunjukkan Rp5,8 juta penjualan. Pertanyaan itu tidak bisa dijawab oleh
 * Neraca Saldo sendiri, dan menjawabnya dengan "itu perputaran, bukan saldo" saja tidak cukup —
 * pemilik berhak melihat ANGKANYA, bukan diminta percaya.
 *
 * Endpoint ini menjawabnya: setiap rupiah yang masuk dan keluar akun tersebut, dikelompokkan
 * menurut jenis sumber jurnalnya (penjualan, PPOB, deposit, pelunasan piutang, biaya, dan
 * seterusnya), lengkap dengan lawan transaksi terbesarnya.
 *
 * Pemakaian:
 *   /api/diagnostics/account-ledger?kode=1112
 *   /api/diagnostics/account-ledger?kode=1112&dari=2026-09-01&sampai=2026-09-30
 *
 * Tanpa dari/sampai, seluruh riwayat dihitung.
 */

/** Nama yang bisa dibaca orang untuk journalEntries.sourceType. */
const SOURCE_LABEL: Record<string, string> = {
  rental: "Penjualan rental",
  pos: "Penjualan kasir (F&B/produk)",
  purchase_invoice: "Faktur pembelian supplier",
  purchase_payment: "Pembayaran ke supplier",
  purchase_return: "Retur pembelian",
  inventory_adjustment: "Penyesuaian persediaan (opname/stok awal/rusak)",
  expense: "Pengeluaran/biaya",
  refund: "Refund",
  asset_purchase: "Pembelian aset",
  asset_purchase_payment: "Pembayaran utang pembelian aset",
  asset_disposal: "Pelepasan aset",
  depreciation: "Penyusutan aset",
  receivable_payment: "Pelunasan piutang pelanggan",
  manual: "Jurnal manual",
  opening_balance: "Saldo awal",
  ppob: "PPOB (pulsa/token/tagihan)",
  other_income: "Pendapatan lain-lain",
  home_rental: "Home rental",
  membership_fee: "Iuran keanggotaan",
  cash_deposit: "Setoran/tarikan kas",
  cash_transfer: "Pemindahan antar akun kas",
};

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (session.role !== "owner" && session.role !== "superuser") {
      return NextResponse.json({ error: "Hanya Owner/Superuser yang bisa menjalankan diagnosa ini." }, { status: 403 });
    }

    const kode = req.nextUrl.searchParams.get("kode")?.trim();
    if (!kode) return NextResponse.json({ error: 'Parameter "kode" wajib diisi, contoh: ?kode=1112' }, { status: 400 });

    const [akun] = await db
      .select({ id: accounts.id, code: accounts.code, name: accounts.name, type: accounts.type, normalBalance: accounts.normalBalance })
      .from(accounts)
      .where(and(eq(accounts.outletId, session.outletId), eq(accounts.code, kode)))
      .limit(1);
    if (!akun) return NextResponse.json({ error: `Akun dengan kode ${kode} tidak ditemukan di outlet ini.` }, { status: 404 });

    const dari = req.nextUrl.searchParams.get("dari");
    const sampai = req.nextUrl.searchParams.get("sampai");

    // Batas periode dihitung dalam WIB lalu diubah ke UTC — entryDate disimpan sebagai instant UTC,
    // jadi satu hari kalender WIB bermula pukul 17.00 UTC hari sebelumnya.
    const wibStart = (ymd: string) => {
      const [y, m, d] = ymd.split("-").map(Number);
      return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - 7 * 3600_000).toISOString();
    };
    const wibEnd = (ymd: string) => {
      const [y, m, d] = ymd.split("-").map(Number);
      return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - 7 * 3600_000).toISOString();
    };

    // Cancelled pairs (voided entry + its reversal, both in range) left out — same rule as the
    // Neraca Saldo and Arus Kas, so this breakdown ties to them instead of showing phantom turnover.
    const conds = [
      eq(journalEntries.outletId, session.outletId),
      eq(journalLines.accountId, akun.id),
      excludeCancelledPairs(session.outletId, dari ? wibStart(dari) : undefined, sampai ? wibEnd(sampai) : undefined),
    ];
    if (dari) conds.push(gte(journalEntries.entryDate, wibStart(dari)));
    if (sampai) conds.push(lte(journalEntries.entryDate, wibEnd(sampai)));

    const lines = await db
      .select({
        entryId: journalEntries.id,
        entryDate: journalEntries.entryDate,
        sourceType: journalEntries.sourceType,
        description: journalEntries.description,
        debit: journalLines.debit,
        credit: journalLines.credit,
      })
      .from(journalLines)
      .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .where(and(...conds));

    const perSumber = new Map<string, { masuk: number; keluar: number; jumlahEntri: number }>();
    let totalDebit = 0;
    let totalKredit = 0;
    for (const l of lines) {
      totalDebit += l.debit;
      totalKredit += l.credit;
      const key = l.sourceType;
      const cur = perSumber.get(key) ?? { masuk: 0, keluar: 0, jumlahEntri: 0 };
      cur.masuk += l.debit;
      cur.keluar += l.credit;
      cur.jumlahEntri++;
      perSumber.set(key, cur);
    }

    const rincian = Array.from(perSumber.entries())
      .map(([sourceType, v]) => ({
        sumber: SOURCE_LABEL[sourceType] ?? sourceType,
        sourceType,
        jumlahEntri: v.jumlahEntri,
        debit: Math.round(v.masuk),
        kredit: Math.round(v.keluar),
        bersih: Math.round(v.masuk - v.keluar),
      }))
      .sort((a, b) => b.debit + b.kredit - (a.debit + a.kredit));

    // Saldo dihitung sesuai sifat akun, sama persis dengan computeTrialBalance — supaya angkanya
    // bisa dibandingkan langsung dengan kolom Saldo di layar Neraca Saldo.
    const saldo = akun.normalBalance === "debit" ? totalDebit - totalKredit : totalKredit - totalDebit;

    // Entri terbesar, untuk menelusuri kalau ada satu transaksi yang mendominasi.
    const terbesar = [...lines]
      .sort((a, b) => Math.max(b.debit, b.credit) - Math.max(a.debit, a.credit))
      .slice(0, 15)
      .map((l) => ({
        entryId: l.entryId,
        tanggal: l.entryDate,
        sumber: SOURCE_LABEL[l.sourceType] ?? l.sourceType,
        keterangan: l.description,
        debit: l.debit,
        kredit: l.credit,
      }));

    return NextResponse.json({
      akun: { kode: akun.code, nama: akun.name, tipe: akun.type, arahNormal: akun.normalBalance },
      periode: dari || sampai ? { dari: dari ?? "(awal)", sampai: sampai ?? "(sekarang)" } : "seluruh riwayat",
      ringkasan: {
        totalDebit: Math.round(totalDebit),
        totalKredit: Math.round(totalKredit),
        saldo: Math.round(saldo),
        jumlahBarisJurnal: lines.length,
      },
      panduan:
        "'debit' dan 'kredit' adalah PERPUTARAN, bukan saldo. Pada akun kas, angkanya wajar jauh lebih besar daripada penjualan karena kas juga dilewati uang yang bukan pendapatan: setoran PPOB yang diteruskan ke provider, uang muka pelanggan, pelunasan piutang, dan pemindahan antar-laci. Yang menjawab 'berapa uang saya sekarang' adalah 'saldo'. Lihat 'rincian' untuk tahu tiap rupiah perputaran itu datang dari mana.",
      rincian,
      entriTerbesar: terbesar,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
