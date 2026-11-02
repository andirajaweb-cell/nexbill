import { NextResponse } from "next/server";
import { computeTrends, computeForecast, detectAnomalies } from "@/lib/ai/insights";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { assertAiAllowed, assertAiRoleAllowed } from "@/lib/subscription/service";
import { aiErrorResponse } from "@/lib/ai/http";

/** Tren/forecast/anomali — perhitungan murni tanpa panggilan AI (tidak memakai kuota). Owner/Superuser saja. */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "view_reports")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengakses AI Insights." }, { status: 403 });
    }
    assertAiRoleAllowed(session.role);
    await assertAiAllowed(session.outletId, session.role);
    const outletId = session.outletId;
    const [trends, forecast, anomalies] = await Promise.all([computeTrends(outletId), computeForecast(outletId), detectAnomalies(outletId)]);
    return NextResponse.json({ trends, forecast, anomalies });
  } catch (err: unknown) {
    return aiErrorResponse(err);
  }
}
