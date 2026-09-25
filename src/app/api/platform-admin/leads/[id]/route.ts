import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { outlets, platformLeadActivities, platformLeads } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";
import { LEAD_STATUS_LABEL } from "@/lib/leads/constants";
import { toWhatsappNumber } from "@/lib/leads/places";
import { addLeadActivity, isLeadStatus } from "@/lib/leads/service";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;
    const [lead] = await db.select().from(platformLeads).where(eq(platformLeads.id, id));
    if (!lead) return NextResponse.json({ error: "Lead tidak ditemukan." }, { status: 404 });
    const activities = await db
      .select()
      .from(platformLeadActivities)
      .where(eq(platformLeadActivities.leadId, id))
      .orderBy(desc(platformLeadActivities.createdAt));
    const [convertedOutlet] = lead.convertedOutletId
      ? await db.select({ id: outlets.id, name: outlets.name }).from(outlets).where(eq(outlets.id, lead.convertedOutletId))
      : [];
    return NextResponse.json({ lead, activities, convertedOutlet: convertedOutlet ?? null });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

const EDITABLE_TEXT = ["contactName", "address", "city", "notes", "nextFollowUpDate", "convertedOutletId"] as const;

/** Partial update. A status change is also written to the activity timeline so the pipeline history stays auditable. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePlatformAdmin();
    const { id } = await params;
    const body = await req.json();
    const [lead] = await db.select().from(platformLeads).where(eq(platformLeads.id, id));
    if (!lead) return NextResponse.json({ error: "Lead tidak ditemukan." }, { status: 404 });

    const patch: Partial<typeof platformLeads.$inferInsert> = { updatedAt: new Date().toISOString() };
    for (const key of EDITABLE_TEXT) {
      if (key in body) patch[key] = String(body[key] ?? "").trim() || null;
    }
    if ("name" in body) {
      const name = String(body.name ?? "").trim();
      if (!name) return NextResponse.json({ error: "Nama usaha tidak boleh kosong." }, { status: 400 });
      patch.name = name;
    }
    if ("phone" in body) {
      patch.phone = String(body.phone ?? "").trim() || null;
      patch.waNumber = toWhatsappNumber(patch.phone);
    }
    if ("status" in body) {
      if (!isLeadStatus(body.status)) return NextResponse.json({ error: "Status tidak valid." }, { status: 400 });
      patch.status = body.status;
    }

    const [updated] = await db.update(platformLeads).set(patch).where(eq(platformLeads.id, id)).returning();

    if (patch.status && patch.status !== lead.status) {
      await addLeadActivity(id, "status", `${LEAD_STATUS_LABEL[lead.status]} → ${LEAD_STATUS_LABEL[patch.status]}`, session);
    }
    return NextResponse.json(updated);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;
    await db.delete(platformLeads).where(eq(platformLeads.id, id));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
