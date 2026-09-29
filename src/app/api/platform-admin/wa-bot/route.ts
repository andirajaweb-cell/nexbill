import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { platformLeads, platformWaOutbox } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";
import { getBotStatus, outboxSummary } from "@/lib/leads/wa-bot";
import { botState, parseDailyLimit } from "@/lib/leads/wa-bot-rules";

/**
 * Status bot WhatsApp CRM untuk /platform-admin/whatsapp-bot: koneksi, QR login (hanya untuk admin
 * yang login — QR ini memberi akses penuh ke nomor bot), ringkasan antrean, dan pesan gagal terbaru.
 */
export async function GET() {
  try {
    await requirePlatformAdmin();
    const status = await getBotStatus();
    const state = botState(status);
    const summary = await outboxSummary();
    const recent = await db
      .select({
        id: platformWaOutbox.id,
        leadId: platformWaOutbox.leadId,
        leadName: platformLeads.name,
        phone: platformWaOutbox.phone,
        templateTitle: platformWaOutbox.templateTitle,
        status: platformWaOutbox.status,
        error: platformWaOutbox.error,
        createdByName: platformWaOutbox.createdByName,
        createdAt: platformWaOutbox.createdAt,
        sentAt: platformWaOutbox.sentAt,
      })
      .from(platformWaOutbox)
      .innerJoin(platformLeads, eq(platformLeads.id, platformWaOutbox.leadId))
      .orderBy(desc(platformWaOutbox.createdAt))
      .limit(30);
    return NextResponse.json({
      state,
      status: status && {
        connected: status.connected,
        number: status.number,
        // QR hanya relevan saat menunggu scan; QR basi tidak dikirim.
        qrDataUrl: state === "menunggu_scan" ? status.qrDataUrl : null,
        lastHeartbeatAt: status.lastHeartbeatAt,
        lastError: status.lastError,
      },
      summary,
      dailyLimit: parseDailyLimit(process.env.WA_BOT_DAILY_LIMIT),
      recent,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
