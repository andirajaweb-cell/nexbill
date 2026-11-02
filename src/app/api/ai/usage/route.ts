import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { assertAiRoleAllowed } from "@/lib/subscription/service";
import { getAiUsageSummary } from "@/lib/ai/quota";
import { aiErrorResponse } from "@/lib/ai/http";

/** Meter kuota AI outlet (pertanyaan hari ini/bulan ini, rekomendasi, anggaran token). Owner/Superuser. */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    assertAiRoleAllowed(session.role);
    return NextResponse.json(await getAiUsageSummary(session.outletId, session.role));
  } catch (err: unknown) {
    return aiErrorResponse(err);
  }
}
