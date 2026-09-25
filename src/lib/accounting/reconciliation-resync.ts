import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { postSalesJournal } from "./postings";
import { reverseOrderJournalForCorrection } from "./order-journal-correction";
import { logAudit } from "@/lib/audit/log";

/**
 * Generic "make the journal match reality" resync for the Rekonsiliasi tab's "Perlu Diperiksa"
 * rows — covers all four non-"match" statuses reconcileOrders (lib/reports/reconciliation.ts) can
 * flag (missing_gl, amount_mismatch, date_mismatch, cancelled_with_gl) with ONE safe action,
 * instead of a merchant being tempted to hand-edit a posted journal line (this codebase's standing
 * rule is: never mutate a posted line in place — see voidJournal's own doc comment).
 *
 * HOW IT WORKS: reverses whatever stale journal history exists for this order via the shared
 * reverseOrderJournalForCorrection() (voids the sales entry if one exists, plus every receivable
 * settlement, and deletes the now-stale receivable — see that helper's own doc comment for why both
 * have to go together), then:
 *  - if the order is "cancelled": stops there. A cancelled order must show ZERO revenue — reposting
 *    would just recreate the exact "cancelled_with_gl" bug this exists to fix.
 *  - otherwise: calls postSalesJournal(orderId) fresh, which recomputes everything (amount, date,
 *    payment-method mix) from the order/orderItems/payments tables' CURRENT state. This
 *    self-corrects amount_mismatch and date_mismatch, and — for missing_gl, where the reversal step
 *    above is a no-op since no entry existed yet to reverse — is functionally identical to the
 *    older single-purpose "Post Ulang"/retry-posting action this generalizes.
 *
 * NOT a substitute for an actual data correction: if an order's OWN total/payments are wrong (not
 * just its journal), fix that first via the Transaction Center tools (Koreksi Nominal Rental,
 * Koreksi Pembayaran, Hapus Item) — each of those already calls this exact reversal step
 * internally before reposting, so a plain resync afterward is rarely needed on its own. This
 * function is for the case where the order's own data is already correct but the journal simply
 * fell out of sync with it (a postSalesJournal call that ran before a correction, then failed to
 * rerun, or the classic missing_gl "postSalesJournal never ran at all" case).
 */
export async function resyncOrderJournal(orderId: string, staffUserId: string | undefined) {
  const outcome = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${orderId}))`);
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) throw new Error("Order tidak ditemukan.");
    const reason = "Sinkronisasi ulang jurnal (Rekonsiliasi)";
    const { hadSalesEntry, reversedReceivable } = await reverseOrderJournalForCorrection(tx, orderId, reason);
    return { orderStatus: order.status, hadSalesEntry, reversedReceivable };
  });

  let reposted = false;
  let repostError: string | null = null;
  if (outcome.orderStatus !== "cancelled") {
    try {
      await postSalesJournal(orderId);
      reposted = true;
    } catch (err: any) {
      // The reversal above already committed — surface the repost failure distinctly rather than
      // letting it look like a generic 500, so the caller can tell "reversed but repost failed"
      // (recoverable — Rekonsiliasi will now show missing_gl, and this same action posts fresh)
      // apart from "nothing happened at all".
      repostError = err?.message ?? String(err);
    }
  }

  await logAudit({
    staffUserId,
    action: "resync_order_journal",
    entityType: "order",
    entityId: orderId,
    before: { hadSalesEntry: outcome.hadSalesEntry, reversedReceivable: outcome.reversedReceivable },
    after: { reposted, repostError },
  });

  return { orderId, reposted, repostError, orderStatus: outcome.orderStatus };
}

/**
 * What this order still has sitting in Piutang Usaha (1141) according to its LIVE journals: the
 * 1141 debit on its sales journal minus every 1141 credit from settlements of its receivable.
 * Voided entries and their reversals are left out (they cancel each other). Zero for an order the
 * books consider fully collected.
 */
export async function orderReceivableGap(orderId: string): Promise<number> {
  const [row] = (await db.execute(sql`
    SELECT COALESCE(SUM(jl.debit - jl.credit), 0)::float AS gap
    FROM journal_lines jl
    JOIN journal_entries je ON je.id = jl.journal_entry_id
    JOIN accounts a ON a.id = jl.account_id
    WHERE a.code = '1141'
      AND je.status = 'posted'
      AND je.reversal_of_entry_id IS NULL
      AND (
        (je.source_id = ${orderId} AND je.source_type IN ('rental', 'pos'))
        OR (je.source_type = 'receivable_payment' AND je.source_id IN (SELECT r.id FROM receivables r WHERE r.order_id = ${orderId}))
      )
  `)) as unknown as { gap: number }[];
  return Math.round((row?.gap ?? 0) * 100) / 100;
}

/**
 * Called whenever an order becomes fully paid (or is re-evaluated as such): if its journals still
 * leave a balance in Piutang Usaha, they were built against a total that has since changed, so
 * rebuild them from the order's current state.
 *
 * BUG YANG DIPERBAIKI DI SINI (2026-09-25). Piutang dicatat pada pembayaran PERTAMA, memakai total
 * order saat itu. Kalau totalnya lalu berubah — bayar di muka lalu sesi ditutup dengan total final,
 * F&B ditambah di tengah sesi, jam tambahan, Koreksi Nominal — pelunasan berikutnya hanya
 * mengurangi piutang sebesar pembayarannya, bukan menyesuaikan pendapatan. Ditambah: penutupan sesi
 * dan "Tandai Lunas" menilai ulang order tanpa id pembayaran, sehingga pelunasannya dilewati sama
 * sekali. Hasilnya order berstatus lunas (cash/QRIS sudah diterima) tapi Piutang Pelanggan di
 * Neraca Saldo tidak pernah kembali ke nol.
 */
export async function resyncIfReceivableStale(orderId: string, staffUserId?: string): Promise<boolean> {
  const gap = await orderReceivableGap(orderId);
  if (Math.abs(gap) <= 0.5) return false;
  await resyncOrderJournal(orderId, staffUserId);
  return true;
}
