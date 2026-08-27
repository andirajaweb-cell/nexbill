import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { auditLogs, staffUsers } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { describeError } from "@/lib/api/error";
import { getSession } from "@/lib/auth/session";

/** Read-only audit trail viewer — recent actions across the whole system (expense approvals, void/refund, asset disposal, staff/settings changes, etc.), joined with staff name. */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const entityType = req.nextUrl.searchParams.get("entityType");
    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 200, 500);

    const conditions = [eq(auditLogs.outletId, session.outletId)];
    if (entityType) conditions.push(eq(auditLogs.entityType, entityType));

    const rows = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        beforeData: auditLogs.beforeData,
        afterData: auditLogs.afterData,
        createdAt: auditLogs.createdAt,
        staffName: staffUsers.name,
      })
      .from(auditLogs)
      .leftJoin(staffUsers, eq(auditLogs.staffUserId, staffUsers.id))
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
