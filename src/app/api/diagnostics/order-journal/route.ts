import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { accounts, journalEntries, journalLines, orders, payments } from "@/db/schema";
import { and, eq, like, or } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

/**
 * READ-ONLY. Membongkar isi buku besar untuk SATU order, apa adanya.
 *
 * Dibuat karena baris "Beda Nominal" di tab Rekonsiliasi hanya menampilkan satu angka agregat
 * (`sum(credit - debit)` atas seluruh entri revenue order itu). Angka itu cukup untuk tahu ADA
 * selisih, tapi tidak pernah cukup untuk tahu KENAPA — dan tanpa itu, satu-satunya pilihan yang
 * tersisa adalah menebak, lalu menekan "Sinkronkan Ulang Jurnal" berulang kali sambil berharap.
 *
 * Endpoint ini menjawab pertanyaan yang sebenarnya: entri apa saja yang dimiliki order ini, mana
 * yang masih hidup, mana yang sudah dibalik, dan entri mana yang menyumbang selisihnya.
 *
 * Pemakaian:
 *   /api/diagnostics/order-journal?orderId=10d08265
 *
 * `orderId` boleh dipersingkat 8 karakter seperti yang tampil di layar Rekonsiliasi — tidak perlu
 * menyalin UUID penuh.
 *
 * CARA MEMBACA `kesimpulan`:
 *  - `liveRevenue` adalah jumlah revenue dari entri yang MASIH HIDUP (status posted, bukan jurnal
 *    pembalik). Inilah yang seharusnya sama dengan total order.
 *  - `selisih` = liveRevenue − order.total. Kalau bukan nol, `entriHidup` di bawahnya menunjukkan
 *    entri mana saja yang menyusunnya — biasanya akan terlihat ada dua entri penjualan padahal
 *    seharusnya satu, atau satu entri bernominal lama yang tidak ikut terbalik.
 *  - `totalSemuaEntri` menjumlahkan SEMUA entri termasuk yang void dan pembaliknya. Angka ini
 *    seharusnya sama dengan `liveRevenue`; kalau berbeda, berarti ada entri void yang pembaliknya
 *    hilang atau sebaliknya.
 *
 * Tidak mengubah apa pun. Perbaikannya tetap lewat tombol Sinkronkan Ulang Jurnal di Rekonsiliasi,
 * supaya setiap koreksi melewati jalur jurnal yang benar dan tercatat siapa pelakunya.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (session.role !== "owner" && session.role !== "superuser") {
      return NextResponse.json({ error: "Hanya Owner/Superuser yang bisa menjalankan diagnosa ini." }, { status: 403 });
    }

    const orderIdParam = req.nextUrl.searchParams.get("orderId")?.trim();
    if (!orderIdParam) return NextResponse.json({ error: "Parameter orderId wajib diisi." }, { status: 400 });

    // Menerima id penuh maupun 8 karakter awal yang tampil di layar Rekonsiliasi.
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.outletId, session.outletId), or(eq(orders.id, orderIdParam), like(orders.id, `${orderIdParam}%`))))
      .limit(1);

    if (!order) return NextResponse.json({ error: `Order "${orderIdParam}" tidak ditemukan di outlet ini.` }, { status: 404 });

    const lines = await db
      .select({
        entryId: journalEntries.id,
        entryDate: journalEntries.entryDate,
        reference: journalEntries.reference,
        description: journalEntries.description,
        sourceType: journalEntries.sourceType,
        status: journalEntries.status,
        voidReason: journalEntries.voidReason,
        accountCode: accounts.code,
        accountName: accounts.name,
        accountType: accounts.type,
        debit: journalLines.debit,
        credit: journalLines.credit,
      })
      .from(journalLines)
      .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
      .where(and(eq(journalEntries.outletId, session.outletId), eq(journalEntries.sourceId, order.id)));

    interface EntryView {
      entryId: string;
      entryDate: string;
      reference: string | null;
      description: string;
      sourceType: string;
      status: string;
      voidReason: string | null;
      isReversal: boolean;
      isLive: boolean;
      revenue: number;
      cogs: number;
      baris: { akun: string; debit: number; kredit: number }[];
    }

    const entries = new Map<string, EntryView>();
    for (const l of lines) {
      const view = entries.get(l.entryId) ?? {
        entryId: l.entryId,
        entryDate: l.entryDate,
        reference: l.reference,
        description: l.description,
        sourceType: l.sourceType,
        status: l.status,
        voidReason: l.voidReason,
        // Konvensi yang dipakai voidJournal sejak awal: jurnal pembalik selalu berawalan "[VOID] ".
        isReversal: l.description.startsWith("[VOID]"),
        isLive: l.status === "posted" && !l.description.startsWith("[VOID]"),
        revenue: 0,
        cogs: 0,
        baris: [],
      };
      if (l.accountType === "revenue") view.revenue += l.credit - l.debit;
      if (l.accountType === "expense" && l.accountCode.startsWith("5")) view.cogs += l.debit - l.credit;
      view.baris.push({ akun: `${l.accountName} (${l.accountCode})`, debit: l.debit, kredit: l.credit });
      entries.set(l.entryId, view);
    }

    const semua = Array.from(entries.values()).sort((a, b) => a.entryDate.localeCompare(b.entryDate));
    const hidup = semua.filter((e) => e.isLive);

    const liveRevenue = hidup.reduce((s, e) => s + e.revenue, 0);
    const liveCogs = hidup.reduce((s, e) => s + e.cogs, 0);
    const totalSemuaEntri = semua.reduce((s, e) => s + e.revenue, 0);
    const selisih = liveRevenue - order.total;

    const successPayments = await db
      .select({ amount: payments.amount, method: payments.method, status: payments.status, paidAt: payments.paidAt })
      .from(payments)
      .where(eq(payments.orderId, order.id));

    const catatan: string[] = [];
    if (hidup.filter((e) => e.revenue !== 0).length > 1) {
      catatan.push(
        `Ada ${hidup.filter((e) => e.revenue !== 0).length} entri penjualan yang masih hidup untuk satu order — seharusnya hanya satu. Inilah penyebab Beda Nominal; sisa dari race double-posting lama atau koreksi yang pembalikannya tidak lengkap.`
      );
    }
    if (hidup.filter((e) => e.cogs !== 0).length > 1) {
      catatan.push(
        `Ada ${hidup.filter((e) => e.cogs !== 0).length} entri HPP yang masih hidup — HPP order ini terhitung berlipat di Laba Rugi. Tidak terlihat di tab Rekonsiliasi karena tab itu hanya menjumlahkan akun revenue.`
      );
    }
    if (Math.round(totalSemuaEntri) !== Math.round(liveRevenue)) {
      catatan.push(
        "Jumlah seluruh entri tidak sama dengan jumlah entri hidup — berarti ada entri void yang jurnal pembaliknya hilang, atau pembalik yang entri aslinya tidak ditandai void."
      );
    }
    if (selisih === 0 && catatan.length === 0) catatan.push("Jurnal order ini sudah sesuai dengan total transaksinya.");

    return NextResponse.json({
      order: {
        id: order.id,
        status: order.status,
        total: order.total,
        businessDate: order.businessDate,
        createdAt: order.createdAt,
      },
      kesimpulan: {
        liveRevenue,
        orderTotal: order.total,
        selisih,
        liveCogs,
        totalSemuaEntri,
        jumlahEntri: semua.length,
        jumlahEntriHidup: hidup.length,
        catatan,
      },
      entriHidup: hidup,
      semuaEntri: semua,
      pembayaran: successPayments,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
