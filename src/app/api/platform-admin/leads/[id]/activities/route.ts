import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { platformLeads } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";
import { LEAD_ACTIVITY_TYPES, LEAD_CONTACT_ACTIVITY_TYPES, type LeadActivityType } from "@/lib/leads/constants";
import { addLeadActivity } from "@/lib/leads/service";

/**
 * Log a follow-up (WA chat, call, visit, demo, note). Contact-type activities stamp
 * lastContactedAt; an optional nextFollowUpDate reschedules the reminder in the same step, and a
 * lead still at "baru" moves to "dihubungi" automatically on first contact.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePlatformAdmin();
    const { id } = await params;
    const body = await req.json();
    const type = body.type as LeadActivityType;
    const content = String(body.content ?? "").trim();
    if (!LEAD_ACTIVITY_TYPES.includes(type) || type === "status") return NextResponse.json({ error: "Jenis aktivitas tidak valid." }, { status: 400 });
    if (!content) return NextResponse.json({ error: "Isi catatan aktivitas wajib diisi." }, { status: 400 });

    const [lead] = await db.select().from(platformLeads).where(eq(platformLeads.id, id));
    if (!lead) return NextResponse.json({ error: "Lead tidak ditemukan." }, { status: 404 });

    const activity = await addLeadActivity(id, type, content, session);

    const now = new Date().toISOString();
    const patch: Partial<typeof platformLeads.$inferInsert> = { updatedAt: now };
    if (LEAD_CONTACT_ACTIVITY_TYPES.includes(type)) {
      patch.lastContactedAt = now;
      if (lead.status === "baru") patch.status = "dihubungi";
    }
    if ("nextFollowUpDate" in body) patch.nextFollowUpDate = String(body.nextFollowUpDate ?? "").trim() || null;
    await db.update(platformLeads).set(patch).where(eq(platformLeads.id, id));
    if (patch.status) await addLeadActivity(id, "status", "Baru → Sudah Dihubungi", session);

    return NextResponse.json(activity);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
