import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { supportThreads, outlets } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";

/** Cross-tenant inbox — every outlet's support tickets, joined with the outlet name, newest first. Gated by requirePlatformAdmin, a wholly separate auth system from outlet staff sessions. */
export async function GET() {
  try {
    await requirePlatformAdmin();
    const rows = await db
      .select({
        id: supportThreads.id,
        outletId: supportThreads.outletId,
        outletName: outlets.name,
        outletPreferredLang: outlets.preferredLang,
        subject: supportThreads.subject,
        category: supportThreads.category,
        status: supportThreads.status,
        lastMessageAt: supportThreads.lastMessageAt,
        createdAt: supportThreads.createdAt,
      })
      .from(supportThreads)
      .innerJoin(outlets, eq(supportThreads.outletId, outlets.id))
      .orderBy(desc(supportThreads.lastMessageAt), desc(supportThreads.createdAt));
    return NextResponse.json(rows);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
