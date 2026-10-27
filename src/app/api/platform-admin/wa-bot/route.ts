import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { platformLeads, platformWaOutbox } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";
import { getBotStatus, outboxSummary, writeBotStatus } from "@/lib/leads/wa-bot";
import { BOT_COMMAND_RESTART, botState, parseDailyLimit } from "@/lib/leads/wa-bot-rules";

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

/**
 * "Minta QR baru": menitipkan perintah ke proses bot (dibaca bot tiap ±5 dtk). Bot memulai ulang dirinya
 * lewat pm2; sesi yang belum tertaut dibuang supaya QR baru. Nomor yang sudah tertaut tidak di-logout.
 */
export async function POST(req: NextRequest) {
  try {
    await requirePlatformAdmin();
    const body = await req.json().catch(() => ({}));
    if (body?.action !== "restart") return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
    const status = await getBotStatus();
    if (botState(status) === "offline" || !status) {
      return NextResponse.json({ error: "Bot tidak berjalan (heartbeat berhenti) — jalankan/restart di server: pm2 restart whatsapp-bot. Lihat panduan di halaman ini." }, { status: 409 });
    }
    // Hanya kolom catatan yang diubah; heartbeat dibiarkan supaya status halaman tetap jujur.
    await writeBotStatus({ lastError: BOT_COMMAND_RESTART, lastHeartbeatAt: status.lastHeartbeatAt ?? undefined });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
