import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { orders, payments } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

/**
 * READ-ONLY. Mencari tagihan yang BENAR-BENAR terhitung dua kali akibat fitur "Gabung Order" dan
 * "Split Bill" yang dihapus pada 2026-09-20.
 *
 * LATAR BELAKANG — kenapa endpoint ini perlu ada, dan kenapa hasilnya biasanya kosong.
 *
 * Kedua fitur itu bekerja dengan pola yang sama: buat order BARU (gabungan, atau N pecahan), lalu
 * set order ASAL jadi status "cancelled". Selama kedua langkah itu berhasil, tidak ada uang ganda —
 * order "cancelled" disaring dari setiap kartu ringkasan (validTransactions di
 * lib/reports/transactions.ts) dan tidak pernah memunculkan jurnal, karena jurnal hanya diposting
 * saat pembayaran diterima. Yang terlihat "double" di Transaction Center hanyalah baris berstatus
 * "Dibatalkan" yang ikut tampil di tabel — mengganggu, tapi tidak menggelembungkan omzet.
 *
 * Masalahnya: kedua fungsi itu TIDAK dibungkus db.transaction. Kalau prosesnya mati di antara dua
 * langkah tadi — koneksi terputus, serverless function timeout, deploy di tengah request — order
 * asal tetap "open" SEKALIGUS order barunya ada. Dua-duanya bisa dibayar, dan kalau dua-duanya
 * memang dibayar, omzetnya benar-benar dobel. Itu satu-satunya skenario yang merugikan, dan itulah
 * yang dicari di sini.
 *
 * CARA BACA HASILNYA:
 *  - `genuineDuplicates` KOSONG → tidak ada uang yang terhitung dua kali. Selisih apa pun antara
 *    catatan manual dan aplikasi berasal dari sebab lain, bukan dari fitur ini.
 *  - ada isinya → tiap entri memberi pasangan order yang bertabrakan beserta status dan pembayaran
 *    masing-masing. `bothPaid: true` berarti uangnya nyata-nyata masuk dua kali dan perlu di-refund
 *    atau divoid; `bothPaid: false` berarti baru berpotensi (salah satu masih belum dibayar) dan
 *    cukup dibatalkan lewat Transaction Center.
 *
 * Endpoint ini tidak mengubah apa pun. Perbaikannya sengaja diserahkan ke Transaction Center
 * (void/refund/hapus item) supaya setiap koreksi tetap melewati jalur jurnal yang benar dan
 * tercatat siapa yang melakukannya — bukan lewat pembersihan massal tanpa jejak.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (session.role !== "owner" && session.role !== "superuser") {
      return NextResponse.json({ error: "Hanya Owner/Superuser yang bisa menjalankan diagnosa ini." }, { status: 403 });
    }

    // Dibatasi ke outlet pemanggil — sama seperti setiap endpoint lain, jangan pernah bocorkan data
    // outlet lain lewat endpoint diagnosa.
    const all = await db
      .select({
        id: orders.id,
        status: orders.status,
        total: orders.total,
        createdAt: orders.createdAt,
        splitGroupId: orders.splitGroupId,
        mergedFromOrderIds: orders.mergedFromOrderIds,
      })
      .from(orders)
      .where(eq(orders.outletId, session.outletId));

    const byId = new Map(all.map((o) => [o.id, o]));

    /*
     * Kumpulkan setiap klaim "order X sudah digantikan oleh order Y".
     *
     * Untuk merge klaimnya eksplisit: order gabungan menyimpan daftar id asalnya di
     * mergedFromOrderIds (JSON array string). Untuk split tidak ada kolom penunjuk arah — semua
     * anggota, termasuk order asal, hanya berbagi splitGroupId yang sama. Order ASAL dikenali dari
     * dua ciri sekaligus: dia yang paling tua dalam grupnya, dan dia satu-satunya yang seharusnya
     * berstatus "cancelled". Kalau yang paling tua justru masih hidup sementara pecahannya sudah
     * ada, itu tepat kasus gagal-separuh-jalan yang dicari.
     */
    interface Claim { supersededId: string; replacementId: string; via: "merge" | "split" }
    const claims: Claim[] = [];

    for (const o of all) {
      if (!o.mergedFromOrderIds) continue;
      let sourceIds: unknown;
      try {
        sourceIds = JSON.parse(o.mergedFromOrderIds);
      } catch {
        continue; // kolom rusak/bukan JSON — dilewati, bukan tugas endpoint ini memperbaikinya
      }
      if (!Array.isArray(sourceIds)) continue;
      for (const sid of sourceIds) {
        if (typeof sid === "string" && sid !== o.id) claims.push({ supersededId: sid, replacementId: o.id, via: "merge" });
      }
    }

    const splitGroups = new Map<string, typeof all>();
    for (const o of all) {
      if (!o.splitGroupId) continue;
      const group = splitGroups.get(o.splitGroupId) ?? [];
      group.push(o);
      splitGroups.set(o.splitGroupId, group);
    }
    for (const group of splitGroups.values()) {
      if (group.length < 2) continue; // grup satu anggota tidak membuktikan apa pun
      const sorted = [...group].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
      const original = sorted[0];
      for (const part of sorted.slice(1)) {
        claims.push({ supersededId: original.id, replacementId: part.id, via: "split" });
      }
    }

    // Order yang DIKLAIM sudah digantikan tapi statusnya bukan "cancelled" — inilah kandidatnya.
    const suspects = claims.filter((c) => {
      const superseded = byId.get(c.supersededId);
      return superseded && superseded.status !== "cancelled";
    });

    // Satu pembayaran lunas di KEDUA sisi = uang benar-benar masuk dua kali. Diambil sekali untuk
    // seluruh id yang terlibat, bukan satu query per pasangan.
    const involvedIds = Array.from(new Set(suspects.flatMap((c) => [c.supersededId, c.replacementId])));
    const paymentRows = involvedIds.length
      ? await db
          .select({ orderId: payments.orderId, amount: payments.amount, status: payments.status, method: payments.method, paidAt: payments.paidAt })
          .from(payments)
          .where(inArray(payments.orderId, involvedIds))
      : [];

    const paidByOrder = new Map<string, { amount: number; method: string; paidAt: string | null }[]>();
    for (const p of paymentRows) {
      if (p.status !== "success") continue; // pending/failed/expired tidak memindahkan uang
      const list = paidByOrder.get(p.orderId) ?? [];
      list.push({ amount: p.amount, method: p.method, paidAt: p.paidAt });
      paidByOrder.set(p.orderId, list);
    }

    // Pasangan yang sama bisa muncul dua kali (mis. satu order asal masuk ke dua klaim); dedup
    // berdasarkan pasangan id supaya hitungannya tidak menggelembung sendiri.
    const seen = new Set<string>();
    const genuineDuplicates = [];
    for (const c of suspects) {
      const key = `${c.supersededId}>${c.replacementId}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const superseded = byId.get(c.supersededId)!;
      const replacement = byId.get(c.replacementId);
      const supersededPaid = paidByOrder.get(c.supersededId) ?? [];
      const replacementPaid = paidByOrder.get(c.replacementId) ?? [];

      genuineDuplicates.push({
        via: c.via,
        bothPaid: supersededPaid.length > 0 && replacementPaid.length > 0,
        doubleChargedAmount:
          supersededPaid.length > 0 && replacementPaid.length > 0
            ? supersededPaid.reduce((s, p) => s + p.amount, 0)
            : 0,
        supersededOrder: {
          id: c.supersededId,
          status: superseded.status,
          total: superseded.total,
          createdAt: superseded.createdAt,
          seharusnya: "cancelled",
          payments: supersededPaid,
        },
        replacementOrder: replacement
          ? { id: replacement.id, status: replacement.status, total: replacement.total, createdAt: replacement.createdAt, payments: replacementPaid }
          : { id: c.replacementId, catatan: "Order pengganti tidak ditemukan di outlet ini." },
      });
    }

    const cancelledFromClaims = claims.filter((c) => byId.get(c.supersededId)?.status === "cancelled").length;

    return NextResponse.json({
      kesimpulan:
        genuineDuplicates.length === 0
          ? "Tidak ada tagihan yang terhitung dua kali. Semua order asal dari fitur Gabung/Split sudah berstatus dibatalkan sebagaimana mestinya, jadi tidak ada omzet yang digelembungkan oleh fitur itu."
          : `Ditemukan ${genuineDuplicates.length} pasangan order yang bertabrakan. Yang bertanda bothPaid:true berarti uangnya nyata-nyata masuk dua kali dan perlu di-refund/void lewat Transaction Center.`,
      ringkasan: {
        totalOrderDiOutlet: all.length,
        orderHasilGabungan: all.filter((o) => !!o.mergedFromOrderIds).length,
        orderTerlibatSplit: all.filter((o) => !!o.splitGroupId).length,
        klaimPenggantian: claims.length,
        sudahDibatalkanDenganBenar: cancelledFromClaims,
        bermasalah: genuineDuplicates.length,
        uangGandaTerkonfirmasi: genuineDuplicates.filter((d) => d.bothPaid).length,
      },
      genuineDuplicates,
      catatan:
        "Endpoint ini read-only dan tidak mengubah data apa pun. Perbaiki lewat Transaction Center (void/refund/hapus item) supaya koreksinya tetap melewati jurnal yang benar dan tercatat pelakunya.",
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
