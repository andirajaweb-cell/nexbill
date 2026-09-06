import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { approvalRequests, staffUsers, orders, shifts, cashTransfers, cashBankAccounts } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { describeError } from "@/lib/api/error";
import { getSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const status = req.nextUrl.searchParams.get("status");

    const conditions = [eq(approvalRequests.outletId, session.outletId)];
    if (status) conditions.push(eq(approvalRequests.status, status as "pending" | "approved" | "rejected"));

    const rows = await db
      .select()
      .from(approvalRequests)
      .where(and(...conditions))
      .orderBy(desc(approvalRequests.createdAt));

    const enriched = await Promise.all(
      rows.map(async (r) => {
        const [requester] = r.requestedBy ? await db.select({ name: staffUsers.name }).from(staffUsers).where(eq(staffUsers.id, r.requestedBy)).limit(1) : [null];
        let refLabel = r.refId;
        if (r.refType === "order") {
          const [order] = await db.select({ total: orders.total }).from(orders).where(eq(orders.id, r.refId)).limit(1);
          if (order) refLabel = `Order — Rp${order.total.toLocaleString("id-ID")}`;
        } else if (r.refType === "shift") {
          const [shift] = await db.select({ closedAt: shifts.closedAt, variance: shifts.variance, nonCashVarianceTotal: shifts.nonCashVarianceTotal }).from(shifts).where(eq(shifts.id, r.refId)).limit(1);
          if (shift) {
            const when = shift.closedAt ? new Date(shift.closedAt).toLocaleString("id-ID") : "-";
            refLabel = `Shift ditutup ${when}`;
          }
        } else if (r.refType === "cash_transfer") {
          const [transfer] = await db.select().from(cashTransfers).where(eq(cashTransfers.id, r.refId)).limit(1);
          if (transfer) {
            const accountRows = await db.select({ id: cashBankAccounts.id, name: cashBankAccounts.name }).from(cashBankAccounts).where(eq(cashBankAccounts.outletId, transfer.outletId));
            const nameById = new Map(accountRows.map((a) => [a.id, a.name]));
            const src = nameById.get(transfer.sourceCashBankAccountId) ?? "-";
            const dst = nameById.get(transfer.destinationCashBankAccountId) ?? "-";
            refLabel = `Pindah Kas Rp${transfer.amount.toLocaleString("id-ID")} (${src} → ${dst})`;
          }
        }
        return { ...r, requesterName: requester?.name ?? "-", refLabel };
      })
    );

    return NextResponse.json(enriched);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
