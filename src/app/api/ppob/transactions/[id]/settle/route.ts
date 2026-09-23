import { NextRequest, NextResponse } from "next/server";
import { postPpobSettlementJournal } from "@/lib/ppob/engine";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { db } from "@/db/client";
import { ppobTransactions } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Menandai satu transaksi PPOB sebagai sudah disetorkan ke provider — memposting jurnal
 * "Dr Utang Provider PPOB / Cr sumber dana" yang menutup utang dari sisi pemungutannya.
 *
 * KENAPA ENDPOINT INI BARU ADA SEKARANG.
 *
 * postPpobSettlementJournal() sudah lama ada di lib/ppob/engine.ts, lengkap dengan komentar yang
 * menyebutnya "manual repair path for any row that somehow ended up pending". Tapi fungsi itu
 * TIDAK PERNAH DIPANGGIL dari mana pun — tidak ada endpoint, tidak ada tombol. Jadi begitu sebuah
 * transaksi tertinggal berstatus "Pending", tidak ada satu pun cara membereskannya dari dalam
 * aplikasi, dan utang ke provider itu menggantung selamanya di Neraca.
 *
 * Transaksi baru tidak akan pernah pending: postPpobTransaction menyelesaikan pemungutan dan
 * penyetoran dalam satu operasi. Yang pending adalah sisa dari perilaku lama dan data impor —
 * persis yang butuh jalur perbaikan ini.
 *
 * AMAN DITEKAN BERULANG. postPpobSettlementJournal memeriksa settlementStatus lebih dulu; transaksi
 * yang sudah settled langsung mengembalikan id jurnal lamanya tanpa memposting yang kedua.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_ppob")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin menyelesaikan settlement PPOB." }, { status: 403 });
    }

    const { id } = await params;
    // Lingkup outlet diperiksa dari sesi, tidak pernah dari parameter URL — sama seperti endpoint
    // void di sebelahnya.
    const [existing] = await db.select().from(ppobTransactions).where(eq(ppobTransactions.id, id)).limit(1);
    if (!existing || existing.outletId !== session.outletId) {
      return NextResponse.json({ error: "Transaksi PPOB tidak ditemukan." }, { status: 404 });
    }
    if (existing.status === "reversed") {
      return NextResponse.json({ error: "Transaksi ini sudah dibatalkan — tidak perlu diselesaikan settlement-nya." }, { status: 400 });
    }

    const journalEntryId = await postPpobSettlementJournal(id, session.sub);
    return NextResponse.json({
      id,
      journalEntryId,
      pesan:
        journalEntryId === null
          ? "Transaksi ini bernilai modal nol, jadi tidak ada yang perlu disetorkan ke provider. Statusnya ditandai selesai."
          : "Settlement dicatat. Jurnalnya memakai tanggal transaksi aslinya, bukan tanggal hari ini.",
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
