import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { outletWhatsappContacts } from "@/db/schema";
import { describeError } from "@/lib/api/error";
import { normalizePhone } from "@/lib/booking/no-show-core";
import { cleanWhatsappLabel, MAX_WHATSAPP_CONTACTS } from "@/lib/booking/public-profile-core";
import { requireBookingProfileEditor } from "@/lib/booking/profile-access";

/** Admin WhatsApp halaman booking. POST { label, phone } · PATCH { id, label?, phone?, isActive?, sortOrder? } · DELETE ?id= */
export async function POST(req: NextRequest) {
  try {
    const session = await requireBookingProfileEditor();
    if (session instanceof NextResponse) return session;
    const body = await req.json().catch(() => ({}));
    const label = cleanWhatsappLabel(body?.label);
    const phone = normalizePhone(body?.phone);
    if (!label) return NextResponse.json({ error: "Nama/label admin wajib diisi (mis. Admin Booking)." }, { status: 400 });
    if (!phone) return NextResponse.json({ error: "Nomor WhatsApp tidak valid." }, { status: 400 });
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(outletWhatsappContacts).where(eq(outletWhatsappContacts.outletId, session.outletId));
    if (n >= MAX_WHATSAPP_CONTACTS) return NextResponse.json({ error: `Maksimal ${MAX_WHATSAPP_CONTACTS} admin WhatsApp.` }, { status: 400 });
    const [row] = await db.insert(outletWhatsappContacts).values({ outletId: session.outletId, label, phone, sortOrder: n }).returning();
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireBookingProfileEditor();
    if (session instanceof NextResponse) return session;
    const body = await req.json().catch(() => ({}));
    const set: Partial<typeof outletWhatsappContacts.$inferInsert> = { updatedAt: new Date().toISOString() };
    if (body?.label !== undefined) {
      const label = cleanWhatsappLabel(body.label);
      if (!label) return NextResponse.json({ error: "Nama/label admin wajib diisi." }, { status: 400 });
      set.label = label;
    }
    if (body?.phone !== undefined) {
      const phone = normalizePhone(body.phone);
      if (!phone) return NextResponse.json({ error: "Nomor WhatsApp tidak valid." }, { status: 400 });
      set.phone = phone;
    }
    if (typeof body?.isActive === "boolean") set.isActive = body.isActive;
    if (Number.isInteger(body?.sortOrder)) set.sortOrder = body.sortOrder;
    const [row] = await db.update(outletWhatsappContacts).set(set).where(and(eq(outletWhatsappContacts.id, String(body?.id ?? "")), eq(outletWhatsappContacts.outletId, session.outletId))).returning();
    if (!row) return NextResponse.json({ error: "Kontak tidak ditemukan." }, { status: 404 });
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireBookingProfileEditor();
    if (session instanceof NextResponse) return session;
    const id = req.nextUrl.searchParams.get("id") ?? "";
    const rows = await db.delete(outletWhatsappContacts).where(and(eq(outletWhatsappContacts.id, id), eq(outletWhatsappContacts.outletId, session.outletId))).returning();
    if (!rows.length) return NextResponse.json({ error: "Kontak tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
