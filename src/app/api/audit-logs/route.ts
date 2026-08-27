import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { auditLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { describeError } from "@/lib/api/error";
import { getSession } from "@/lib/auth/session";

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const rows = await db.select().from(auditLogs).where(eq(auditLogs.outletId, session.outletId)).orderBy(desc(auditLogs.createdAt)).limit(200);
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
