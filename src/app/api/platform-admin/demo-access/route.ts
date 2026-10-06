import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { auditLogs, staffUsers, outlets, subscriptions } from "@/db/schema";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { demoEmails, DEMO_LOGIN_ACTION } from "@/lib/auth/demo-account";
import { computeDemoStats } from "@/lib/auth/demo-stats";
import { describeError } from "@/lib/api/error";

/** Platform Admin → kartu "Akun Demo": status akun demo publik + berapa kali diakses (hari/7/30 hari). */
export async function GET() {
  try {
    await requirePlatformAdmin();
    const emails = demoEmails();
    const accounts = emails.length
      ? await db
          .select({
            id: staffUsers.id,
            email: staffUsers.email,
            role: staffUsers.role,
            isActive: staffUsers.isActive,
            outletId: staffUsers.outletId,
            outletName: outlets.name,
            subscriptionStatus: subscriptions.status,
            aiAddonActive: subscriptions.aiAddonActive,
          })
          .from(staffUsers)
          .leftJoin(outlets, eq(outlets.id, staffUsers.outletId))
          .leftJoin(subscriptions, eq(subscriptions.outletId, staffUsers.outletId))
          .where(inArray(staffUsers.email, emails))
      : [];
    const ids = accounts.map((a) => a.id);
    const since = new Date(Date.now() - 31 * 86_400_000).toISOString();
    const rows = ids.length
      ? await db
          .select({ createdAt: auditLogs.createdAt, afterData: auditLogs.afterData })
          .from(auditLogs)
          .where(and(eq(auditLogs.action, DEMO_LOGIN_ACTION), inArray(auditLogs.staffUserId, ids), gte(auditLogs.createdAt, since)))
      : [];
    const [all] = ids.length
      ? await db
          .select({ n: sql<number>`count(*)` })
          .from(auditLogs)
          .where(and(eq(auditLogs.action, DEMO_LOGIN_ACTION), inArray(auditLogs.staffUserId, ids)))
      : [{ n: 0 }];
    return NextResponse.json({
      emails,
      accounts,
      missing: emails.filter((e) => !accounts.some((a) => a.email === e)),
      allTime: Number(all?.n ?? 0),
      stats: computeDemoStats(rows),
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
