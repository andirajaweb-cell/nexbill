import { NextRequest, NextResponse } from "next/server";
import { computeTrends, computeForecast, detectAnomalies } from "@/lib/ai/insights";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { assertAiAllowed, assertAiRoleAllowed } from "@/lib/subscription/service";

/** Pure-computation trend/forecast/anomaly numbers — cheap, no AI call, safe to load on every dashboard visit. Still gated by the NEXBILL AI-lock since it's part of the AI Business Intelligence tier, and further restricted to Owner/Superuser only (see assertAiRoleAllowed). */
export async function GET(req: NextRequest) {
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
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
