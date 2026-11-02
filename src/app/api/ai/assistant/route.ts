import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { outlets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { runBusinessAssistant } from "@/lib/ai/assistant";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { assertAiAllowed, assertAiRoleAllowed } from "@/lib/subscription/service";
import { getAiUsageSummary, reserveAiCall } from "@/lib/ai/quota";
import { aiConfigured } from "@/lib/ai/models";
import { aiErrorResponse, aiNotConfiguredResponse, langOf } from "@/lib/ai/http";

export const maxDuration = 60;

/**
 * AI Business Assistant (chat). Urutan penjagaan: login → view_reports → role Owner/Superuser →
 * hak AI (trial / Pro / AI Add-on / Akses Gratis Selamanya) → kuota pemakaian outlet (COGS).
 * Body: { messages: {role, content}[], lang?: LangCode } — riwayat dirapikan & dipotong di server.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "view_reports")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengakses AI Business Assistant." }, { status: 403 });
    }
    assertAiRoleAllowed(session.role);
    await assertAiAllowed(session.outletId, session.role);
    if (!aiConfigured()) return aiNotConfiguredResponse();

    const body = (await req.json().catch(() => null)) as { messages?: unknown; lang?: unknown } | null;
    if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({ error: "messages wajib diisi." }, { status: 400 });
    }
    const outletId = session.outletId;
    const [outlet] = await db.select({ name: outlets.name }).from(outlets).where(eq(outlets.id, outletId)).limit(1);
    if (!outlet) return NextResponse.json({ error: "Outlet tidak ditemukan." }, { status: 404 });

    await reserveAiCall(outletId, "assistant", session.role);
    const result = await runBusinessAssistant(outletId, outlet.name, body.messages, { lang: langOf(body.lang), role: session.role });
    const quota = await getAiUsageSummary(outletId, session.role).catch(() => null);
    return NextResponse.json({ reply: result.reply, toolsCalled: result.toolsCalled, quota });
  } catch (err: unknown) {
    return aiErrorResponse(err);
  }
}
