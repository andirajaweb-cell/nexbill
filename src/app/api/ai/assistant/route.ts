import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { outlets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { runBusinessAssistant, AssistantMessage } from "@/lib/ai/assistant";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { assertAiAllowed, assertAiRoleAllowed } from "@/lib/subscription/service";

/** Internal AI Business Assistant chat — gated by view_reports (same audience as Reports/Dashboard, since it only reads business data, never mutates), plus the NEXBILL subscription AI-lock (locked during trial/expired/suspended — see lib/subscription/service.ts). */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "view_reports")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengakses AI Business Assistant." }, { status: 403 });
    }
    assertAiRoleAllowed(session.role);
    await assertAiAllowed(session.outletId, session.role);

    const { messages } = (await req.json()) as { messages: AssistantMessage[] };
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages wajib diisi." }, { status: 400 });
    }
    const outletId = session.outletId;

    const [outlet] = await db.select().from(outlets).where(eq(outlets.id, outletId)).limit(1);
    if (!outlet) return NextResponse.json({ error: "Outlet tidak ditemukan." }, { status: 404 });

    const result = await runBusinessAssistant(outletId, outlet.name, messages);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
