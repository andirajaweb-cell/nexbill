import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { accounts, journalEntries, journalLines } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { logAudit } from "@/lib/audit/log";
import { isPeriodLocked } from "@/lib/accounting/periods";
import { pairReversals, impactByDay, type ReversalRepairEntry, type RepairablePair } from "@/lib/accounting/reversal-repair";

/**
 * Perbaikan sekali-jalan untuk jurnal pembalik yang tanggalnya salah.
 *
 * GET  → pratinjau, read-only. Menampilkan pembalik mana saja yang tanggalnya menyimpang dari entri
 *        aslinya dan berapa nilai yang salah jatuh ke tiap hari.
 * POST → benar-benar mengembalikan entryDate tiap pembalik ke tanggal entri aslinya.
 *
 * LATAR BELAKANG. Sampai 2026-09-20, voidJournal() tidak meneruskan entryDate ke postJournal, jadi
 * setiap pembalik ditulis bertanggal hari pembatalan. Bug itu sudah diperbaiki, tapi hanya berlaku
 * ke depan — pembalik yang terlanjur salah tetap membawa revenue negatif ke hari yang salah.
 *
 * KENAPA INI MENGUBAH JURNAL YANG SUDAH TERPOSTING, PADAHAL ITU PANTANGAN DI SISTEM INI.
 *
 * Aturan "jangan pernah mengubah baris jurnal yang sudah terposting" ada untuk melindungi jejak
 * audit: koreksi harus lewat entri pembalik supaya riwayatnya tetap utuh. Di sini aturan itu tidak
 * bisa dipakai, karena entri yang salah ADALAH entri pembalik. Membalik sebuah pembalik akan
 * menghidupkan kembali transaksi yang sudah dibatalkan; memposting entri koreksi ketiga hanya
 * memindahkan masalah sambil menambah dua baris baru per transaksi di buku besar. Yang benar-benar
 * salah pun bukan angkanya — debit dan kredit sudah tepat dan tetap seimbang — melainkan SATU
 * kolom: tanggal entri. Mengembalikan kolom itu ke nilai yang seharusnya ditulis sejak awal adalah
 * perbaikan data, bukan koreksi akuntansi.
 *
 * Karena itu tetap dijaga ketat:
 *  - hanya Owner/Superuser;
 *  - hanya entri berdeskripsi "[VOID] ..." — entri transaksi asli tidak pernah disentuh;
 *  - hanya yang pasangannya TEPAT SATU, sisanya dilaporkan dan dilewati;
 *  - periode akuntansi yang sudah ditutup dilewati, di sisi asal maupun tujuan;
 *  - setiap perubahan dicatat di audit log lengkap dengan tanggal sebelum dan sesudahnya;
 *  - POST wajib menyertakan {"konfirmasi": true} supaya tidak mungkin terpicu tanpa sengaja.
 */

/** Mengambil setiap entri jurnal outlet beserta dampak revenue-nya — dipakai GET dan POST. */
async function loadEntries(outletId: string): Promise<ReversalRepairEntry[]> {
  const rows = await db
    .select({
      entryId: journalEntries.id,
      entryDate: journalEntries.entryDate,
      description: journalEntries.description,
      sourceId: journalEntries.sourceId,
      status: journalEntries.status,
      accountType: accounts.type,
      debit: journalLines.debit,
      credit: journalLines.credit,
    })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
    .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
    .where(eq(journalEntries.outletId, outletId));

  const map = new Map<string, ReversalRepairEntry>();
  for (const r of rows) {
    const e = map.get(r.entryId) ?? {
      entryId: r.entryId,
      entryDate: r.entryDate,
      description: r.description,
      sourceId: r.sourceId,
      status: r.status,
      revenue: 0,
    };
    if (r.accountType === "revenue") e.revenue += r.credit - r.debit;
    map.set(r.entryId, e);
  }
  return Array.from(map.values());
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (session.role !== "owner" && session.role !== "superuser") {
      return NextResponse.json({ error: "Hanya Owner/Superuser yang bisa menjalankan diagnosa ini." }, { status: 403 });
    }

    const entries = await loadEntries(session.outletId);
    const { repairable, ambiguous, alreadyCorrect, totalReversals } = pairReversals(entries);
    const limit = Number(req.nextUrl.searchParams.get("limit") ?? 50);

    return NextResponse.json({
      kesimpulan:
        repairable.length === 0
          ? "Tidak ada jurnal pembalik yang tanggalnya menyimpang dari entri aslinya."
          : `Ada ${repairable.length} jurnal pembalik yang tanggalnya tidak sama dengan entri aslinya. Nilainya jatuh ke hari yang salah, dan itulah yang membuat Laba Rugi hari tersebut minus. Lihat "dampakPerHari" untuk besarannya per tanggal.`,
      ringkasan: {
        totalEntri: entries.length,
        totalPembalik: totalReversals,
        sudahBenarTanggalnya: alreadyCorrect,
        perluDiperbaiki: repairable.length,
        tidakBisaDipasangkan: ambiguous.length,
      },
      dampakPerHari: impactByDay(repairable),
      contohPerluDiperbaiki: repairable.slice(0, limit),
      tidakBisaDipasangkan: ambiguous.slice(0, limit),
      caraMenjalankanPerbaikan:
        repairable.length === 0
          ? null
          : 'Kirim POST ke URL yang sama dengan body {"konfirmasi": true}. Jalankan pratinjau ini lagi sesudahnya — "perluDiperbaiki" seharusnya jadi 0.',
      catatan:
        "GET ini read-only. Penyebabnya (voidJournal menulis pembalik bertanggal hari ini) sudah diperbaiki, tapi perbaikan itu hanya berlaku untuk pembalikan baru.",
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (session.role !== "owner" && session.role !== "superuser") {
      return NextResponse.json({ error: "Hanya Owner/Superuser yang bisa menjalankan perbaikan ini." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    if (body?.konfirmasi !== true) {
      return NextResponse.json(
        { error: 'Perbaikan ini mengubah tanggal jurnal yang sudah terposting. Jalankan GET dulu untuk melihat pratinjaunya, lalu kirim POST dengan body {"konfirmasi": true} bila sudah yakin.' },
        { status: 400 }
      );
    }

    const entries = await loadEntries(session.outletId);
    const { repairable, ambiguous } = pairReversals(entries);

    if (repairable.length === 0) {
      return NextResponse.json({ diperbaiki: 0, dilewatiPeriodeTerkunci: 0, tidakBisaDipasangkan: ambiguous.length, pesan: "Tidak ada yang perlu diperbaiki." });
    }

    /*
     * Periode yang sudah ditutup dilewati di KEDUA sisi.
     *
     * Memindahkan entri KE periode yang terkunci berarti menyisipkan angka ke buku yang sudah
     * disegel — persis yang dicegah postJournal. Memindahkannya DARI periode terkunci sama
     * buruknya: nilai yang sudah ikut terhitung dalam penutupan periode itu akan hilang dari sana
     * tanpa jejak, membuat angka tutup buku yang sudah disetujui berubah setelah fakta.
     */
    const periodChecks = new Map<string, boolean>();
    const isLocked = async (iso: string) => {
      const key = iso.slice(0, 7);
      if (!periodChecks.has(key)) periodChecks.set(key, await isPeriodLocked(session.outletId, iso));
      return periodChecks.get(key)!;
    };

    const layak: RepairablePair[] = [];
    const dilewati: (RepairablePair & { alasan: string })[] = [];
    for (const p of repairable) {
      if (await isLocked(p.originalDate)) {
        dilewati.push({ ...p, alasan: "Periode tujuan (tanggal entri asli) sudah ditutup." });
        continue;
      }
      if (await isLocked(p.reversalDate)) {
        dilewati.push({ ...p, alasan: "Periode asal (tanggal pembalik sekarang) sudah ditutup." });
        continue;
      }
      layak.push(p);
    }

    // Dikelompokkan per tanggal tujuan supaya jumlah UPDATE-nya sebanyak tanggal unik, bukan
    // sebanyak entri — ratusan entri biasanya hanya jatuh ke belasan tanggal asli.
    const byTargetDate = new Map<string, string[]>();
    for (const p of layak) {
      const list = byTargetDate.get(p.originalDate) ?? [];
      list.push(p.reversalEntryId);
      byTargetDate.set(p.originalDate, list);
    }

    await db.transaction(async (tx) => {
      for (const [targetDate, ids] of byTargetDate) {
        await tx.update(journalEntries).set({ entryDate: targetDate }).where(inArray(journalEntries.id, ids));
      }
    });

    await logAudit({
      outletId: session.outletId,
      staffUserId: session.sub,
      action: "repair_misdated_reversals",
      entityType: "journal_entry",
      entityId: `batch-${Date.now()}`,
      before: { perluDiperbaiki: repairable.length, tidakBisaDipasangkan: ambiguous.length },
      after: {
        diperbaiki: layak.length,
        dilewatiPeriodeTerkunci: dilewati.length,
        // Pasangan lengkapnya disimpan supaya setiap perubahan tanggal bisa ditelusuri dan, kalau
        // perlu, dikembalikan satu per satu.
        perubahan: layak.map((p) => ({ entryId: p.reversalEntryId, dari: p.reversalDate, ke: p.originalDate })),
      },
    });

    return NextResponse.json({
      diperbaiki: layak.length,
      dilewatiPeriodeTerkunci: dilewati.length,
      tidakBisaDipasangkan: ambiguous.length,
      dampakYangDikembalikan: impactByDay(layak),
      contohDilewati: dilewati.slice(0, 20),
      pesan: `${layak.length} jurnal pembalik dikembalikan ke tanggal entri aslinya. Buka kembali Laba Rugi dan Control Center untuk memastikan angkanya sudah wajar, lalu jalankan GET di URL ini lagi — "perluDiperbaiki" seharusnya tinggal ${dilewati.length}.`,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
