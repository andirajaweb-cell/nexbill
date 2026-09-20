import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { accounts, journalEntries, journalLines } from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { outletDateYmd } from "@/lib/time/outlet-time";

/**
 * READ-ONLY. Membongkar isi buku besar untuk SATU hari kalender WIB, apa adanya.
 *
 * KENAPA ADA. Laba Rugi menampilkan angka per akun, bukan per entri. Ketika satu hari melaporkan
 * pendapatan negatif — Control Center outlet XTREAM tanggal 20/9/2026 menampilkan Laba Kotor
 * Rp-249.935 dari pendapatan riil Rp26.000 — laporan itu tidak bisa menjawab entri MANA yang
 * menyeretnya ke bawah. Tanpa jawaban itu yang tersisa hanya menebak, dan menebak di atas
 * pembukuan orang lain adalah cara tercepat membuat kerusakan kedua.
 *
 * Endpoint ini menjawabnya langsung: setiap entri jurnal yang jatuh pada tanggal tersebut, dampak
 * revenue-nya masing-masing, diurutkan dari yang paling negatif.
 *
 * Pemakaian:
 *   /api/diagnostics/day-journal?hari=2026-09-20
 *
 * CARA MEMBACA:
 *  - `ringkasan.totalRevenue` harus sama dengan Total Pendapatan di Laba Rugi untuk hari itu.
 *  - `ringkasan.dariPembalik` adalah bagian yang berasal dari jurnal pembalik ([VOID]). Kalau angka
 *    ini besar dan negatif, hari itu sedang menanggung pembatalan transaksi hari lain.
 *  - `ringkasan.dariTransaksiBiasa` adalah pendapatan riil hari itu. Inilah yang seharusnya
 *    mendekati angka penjualan yang Anda lihat di Halaman Transaksi.
 *  - `entri` memuat semuanya, terurut dari dampak paling negatif — baris teratas adalah penyebab
 *    terbesarnya.
 *
 * Tidak mengubah apa pun.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (session.role !== "owner" && session.role !== "superuser") {
      return NextResponse.json({ error: "Hanya Owner/Superuser yang bisa menjalankan diagnosa ini." }, { status: 403 });
    }

    const hari = req.nextUrl.searchParams.get("hari")?.trim();
    if (!hari || !/^\d{4}-\d{2}-\d{2}$/.test(hari)) {
      return NextResponse.json({ error: 'Parameter "hari" wajib diisi dengan format YYYY-MM-DD, contoh: ?hari=2026-09-20' }, { status: 400 });
    }

    /*
     * Batas hari dihitung dalam WIB lalu diubah ke UTC, bukan sekadar `hari + "T00:00"` — entryDate
     * disimpan sebagai instant UTC, jadi satu hari kalender WIB (UTC+7) bermula pukul 17.00 UTC
     * hari sebelumnya. Memakai batas UTC polos akan menggeser jendelanya tujuh jam dan memungut
     * transaksi dari hari yang salah, persis kelas bug yang sudah diperbaiki di tempat lain hari
     * ini (lihat outletDateYmd di lib/time/outlet-time.ts).
     */
    const [y, m, d] = hari.split("-").map(Number);
    const mulai = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - 7 * 60 * 60 * 1000).toISOString();
    const selesai = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - 7 * 60 * 60 * 1000).toISOString();

    const rows = await db
      .select({
        entryId: journalEntries.id,
        entryDate: journalEntries.entryDate,
        reference: journalEntries.reference,
        description: journalEntries.description,
        sourceType: journalEntries.sourceType,
        sourceId: journalEntries.sourceId,
        status: journalEntries.status,
        accountCode: accounts.code,
        accountName: accounts.name,
        accountType: accounts.type,
        debit: journalLines.debit,
        credit: journalLines.credit,
      })
      .from(journalLines)
      .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
      .where(and(eq(journalEntries.outletId, session.outletId), gte(journalEntries.entryDate, mulai), lte(journalEntries.entryDate, selesai)));

    interface EntryView {
      entryId: string;
      entryDate: string;
      hariWib: string;
      reference: string | null;
      description: string;
      sourceType: string;
      sourceId: string | null;
      status: string;
      isPembalik: boolean;
      revenue: number;
      akunRevenue: { akun: string; dampak: number }[];
    }

    const map = new Map<string, EntryView>();
    for (const r of rows) {
      const e = map.get(r.entryId) ?? {
        entryId: r.entryId,
        entryDate: r.entryDate,
        hariWib: outletDateYmd(new Date(r.entryDate)),
        reference: r.reference,
        description: r.description,
        sourceType: r.sourceType,
        sourceId: r.sourceId,
        status: r.status,
        isPembalik: r.description.startsWith("[VOID]"),
        revenue: 0,
        akunRevenue: [],
      };
      if (r.accountType === "revenue") {
        const dampak = r.credit - r.debit;
        e.revenue += dampak;
        if (dampak !== 0) e.akunRevenue.push({ akun: `${r.accountName} (${r.accountCode})`, dampak });
      }
      map.set(r.entryId, e);
    }

    const entri = Array.from(map.values()).sort((a, b) => a.revenue - b.revenue);

    const totalRevenue = entri.reduce((s, e) => s + e.revenue, 0);
    const dariPembalik = entri.filter((e) => e.isPembalik).reduce((s, e) => s + e.revenue, 0);
    const dariTransaksiBiasa = entri.filter((e) => !e.isPembalik).reduce((s, e) => s + e.revenue, 0);

    // Dikelompokkan per sumber supaya terlihat apakah penyebabnya terkonsentrasi di satu jenis
    // transaksi (rental, pos, pelunasan piutang) atau menyebar.
    const perSumber = new Map<string, { jumlahEntri: number; revenue: number }>();
    for (const e of entri) {
      const key = e.isPembalik ? `${e.sourceType} (pembalik)` : e.sourceType;
      const cur = perSumber.get(key) ?? { jumlahEntri: 0, revenue: 0 };
      cur.jumlahEntri++;
      cur.revenue += e.revenue;
      perSumber.set(key, cur);
    }

    const limit = Number(req.nextUrl.searchParams.get("limit") ?? 60);

    return NextResponse.json({
      hari,
      jendelaWaktuUtc: { mulai, selesai },
      ringkasan: {
        jumlahEntri: entri.length,
        totalRevenue: Math.round(totalRevenue),
        dariTransaksiBiasa: Math.round(dariTransaksiBiasa),
        dariPembalik: Math.round(dariPembalik),
        jumlahPembalik: entri.filter((e) => e.isPembalik).length,
      },
      perSumber: Array.from(perSumber.entries())
        .map(([sumber, v]) => ({ sumber, jumlahEntri: v.jumlahEntri, revenue: Math.round(v.revenue) }))
        .sort((a, b) => a.revenue - b.revenue),
      panduan:
        "Bandingkan 'totalRevenue' dengan Total Pendapatan di Laba Rugi untuk hari yang sama — seharusnya sama persis. Kalau 'dariPembalik' besar dan negatif, hari ini sedang menanggung pembatalan transaksi hari lain. 'entri' terurut dari dampak paling negatif, jadi baris teratas adalah penyebab terbesarnya.",
      entri: entri.slice(0, limit),
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
