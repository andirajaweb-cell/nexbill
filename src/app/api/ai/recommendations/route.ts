import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { outlets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateRecommendations } from "@/lib/ai/insights";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { assertAiAllowed, assertAiRoleAllowed } from "@/lib/subscription/service";

/** Generates a narrative + prioritized recommendations from the trend/forecast/anomaly data — one Claude call, only on explicit request (not auto-run on page load). Restricted to Owner/Superuser only, see assertAiRoleAllowed. */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "view_reports")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengakses AI Insights." }, { status: 403 });
    }
    assertAiRoleAllowed(session.role);
    await assertAiAllowed(session.outletId, session.role);
    const outletId = session.outletId;

    const [outlet] = await db.select().from(outlets).where(eq(outlets.id, outletId)).limit(1);
    if (!outlet) return NextResponse.json({ error: "Outlet tidak ditemukan." }, { status: 404 });

    return NextResponse.json(await generateRecommendations(outletId, outlet.name));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
