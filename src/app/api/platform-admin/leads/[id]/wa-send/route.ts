import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { platformLeads, platformWaOutbox, platformWaTemplates } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";
import { WA_BODY_MAX, leadWaNumber } from "@/lib/leads/wa-template";

/**
 * Antrekan pesan WhatsApp ke lead untuk dikirim bot NEXBILL (scripts/whatsapp-bot.mts). Aktivitas
 * lead baru dicatat saat bot BENAR-BENAR mengirim (lib/leads/wa-bot.ts markOutboxSent), bukan di sini.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePlatformAdmin();
    const { id } = await params;
    const body = await req.json();
    const text = String(body.body ?? "").replace(/\r\n/g, "\n").trim();
    if (!text) return NextResponse.json({ error: "Isi pesan wajib diisi." }, { status: 400 });
    if (text.length > WA_BODY_MAX) return NextResponse.json({ error: `Isi pesan maksimal ${WA_BODY_MAX} karakter.` }, { status: 400 });

    const [lead] = await db.select({ waNumber: platformLeads.waNumber, phone: platformLeads.phone }).from(platformLeads).where(eq(platformLeads.id, id)).limit(1);
    if (!lead) return NextResponse.json({ error: "Lead tidak ditemukan." }, { status: 404 });
    const phone = leadWaNumber(lead.waNumber, lead.phone);
    if (!phone) return NextResponse.json({ error: "Lead belum punya nomor WhatsApp yang valid (format 08xx/628xx)." }, { status: 400 });

    let templateId: string | null = null;
    let templateTitle: string | null = null;
    if (body.templateId) {
      const [t] = await db.select({ id: platformWaTemplates.id, title: platformWaTemplates.title }).from(platformWaTemplates).where(eq(platformWaTemplates.id, String(body.templateId))).limit(1);
      if (t) {
        templateId = t.id;
        templateTitle = t.title;
      }
    }

    const [row] = await db
      .insert(platformWaOutbox)
      .values({ leadId: id, phone, body: text, templateId, templateTitle, createdBy: session.sub, createdByName: session.name })
      .returning();
    return NextResponse.json(row);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
