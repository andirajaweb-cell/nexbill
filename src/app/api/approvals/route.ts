import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { approvalRequests, staffUsers, orders } from "@/db/schema";
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
        }
        return { ...r, requesterName: requester?.name ?? "-", refLabel };
      })
    );

    return NextResponse.json(enriched);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
