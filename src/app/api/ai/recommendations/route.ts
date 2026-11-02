import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { outlets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cachedRecommendation, generateRecommendations } from "@/lib/ai/insights";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { assertAiAllowed, assertAiRoleAllowed } from "@/lib/subscription/service";
import { getAiUsageSummary, reserveAiCall } from "@/lib/ai/quota";
import { aiConfigured } from "@/lib/ai/models";
import { aiErrorResponse, aiNotConfiguredResponse, langOf } from "@/lib/ai/http";

export const maxDuration = 60;

/**
 * Rekomendasi naratif AI. GET = hasil tersimpan (≤ 6 jam, tanpa kuota). POST {lang, force?} = buat
 * (memakai kuota; tanpa force, hasil tersimpan yang masih segar dikembalikan tanpa memanggil AI).
 */
async function guard() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "Belum login." }, { status: 401 }) } as const;
  if (!hasPermission(session.role as StaffRole, "view_reports")) {
    return { error: NextResponse.json({ error: "Role kamu tidak punya izin mengakses AI Insights." }, { status: 403 }) } as const;
  }
  assertAiRoleAllowed(session.role);
  await assertAiAllowed(session.outletId, session.role);
  return { session } as const;
}

export async function GET(req: NextRequest) {
  try {
    const g = await guard();
    if ("error" in g) return g.error;
    const cached = await cachedRecommendation(g.session.outletId, langOf(req.nextUrl.searchParams.get("lang")));
    return NextResponse.json({ recommendation: cached ? { ...cached, cached: true } : null });
  } catch (err: unknown) {
    return aiErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const g = await guard();
    if ("error" in g) return g.error;
    const { session } = g;
    const body = (await req.json().catch(() => ({}))) as { lang?: unknown; force?: unknown };
    const lang = langOf(body.lang);
    if (body.force !== true) {
      const cached = await cachedRecommendation(session.outletId, lang);
      if (cached) return NextResponse.json({ ...cached, cached: true, quota: await getAiUsageSummary(session.outletId, session.role).catch(() => null) });
    }
    if (!aiConfigured()) return aiNotConfiguredResponse();
    const [outlet] = await db.select({ name: outlets.name }).from(outlets).where(eq(outlets.id, session.outletId)).limit(1);
    if (!outlet) return NextResponse.json({ error: "Outlet tidak ditemukan." }, { status: 404 });

    await reserveAiCall(session.outletId, "recommendations", session.role);
    const r = await generateRecommendations(session.outletId, outlet.name, { lang, role: session.role });
    const quota = await getAiUsageSummary(session.outletId, session.role).catch(() => null);
    return NextResponse.json({ narrative: r.narrative, generatedAt: r.generatedAt, cached: false, quota });
  } catch (err: unknown) {
    return aiErrorResponse(err);
  }
}
