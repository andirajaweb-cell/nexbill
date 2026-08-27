import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { agentSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

/** Get-or-create so the Settings > WhatsApp/AI tab always has a row to edit, mirroring seedChartOfAccounts' idempotent-bootstrap pattern. */
async function getOrCreateAgentSettings(outletId: string) {
  const [existing] = await db.select().from(agentSettings).where(eq(agentSettings.outletId, outletId)).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(agentSettings).values({ outletId }).returning();
  return created;
}

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin melihat pengaturan AI/WhatsApp." }, { status: 403 });
    }
    // Always the caller's own outlet — never trust a client-supplied outletId here.
    return NextResponse.json(await getOrCreateAgentSettings(session.outletId));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengubah pengaturan AI/WhatsApp." }, { status: 403 });
    }
    const body = await req.json();

    // Always the caller's own outlet — never trust a client-supplied outletId here.
    const existing = await getOrCreateAgentSettings(session.outletId);
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const key of ["systemPrompt", "model", "isWhatsappEnabled", "isInstagramEnabled", "handoffKeywords"] as const) {
      if (body[key] !== undefined) patch[key] = body[key];
    }
    const [updated] = await db.update(agentSettings).set(patch).where(eq(agentSettings.id, existing.id)).returning();
    return NextResponse.json(updated);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
