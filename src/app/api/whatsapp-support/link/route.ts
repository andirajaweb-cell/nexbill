import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { getBotStatus } from "@/lib/leads/wa-bot";
import { botState } from "@/lib/leads/wa-bot-rules";
import { isMissingTable } from "@/lib/telegram/support-service";
import { botPhoneFromJid, waMeUrl } from "@/lib/whatsapp-support/rules";
import { createWaLinkCode, linkedWaPhone, outletWaPhone, unlinkWaStaff } from "@/lib/whatsapp-support/service";

/**
 * Tautan WhatsApp untuk staf yang login (kartu "Support 24 jam di WhatsApp" di Customer Service).
 * Selalu dibatasi session.sub + session.outletId — staf hanya menautkan nomornya sendiri.
 * GET status · POST kode sekali pakai (15 menit) → link wa.me berisi "NEXBILL KODE …" · DELETE lepas tautan.
 * Bot WhatsApp berjalan di VPS; nomor bot dibaca dari status bot (platform_wa_bot_status).
 */
async function botInfo() {
  const st = await getBotStatus().catch(() => null);
  const state = botState(st);
  const phone = botPhoneFromJid(st?.number ?? null);
  return { online: state === "online", phone };
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const bot = await botInfo();
    if (!bot.phone) return NextResponse.json({ available: false, reason: "bot_offline" });
    try {
      const linkedPhone = await linkedWaPhone(session.sub);
      const outletPhone = session.role === "owner" ? await outletWaPhone(session.outletId) : null;
      return NextResponse.json({
        available: true,
        online: bot.online,
        botPhone: bot.phone,
        chatUrl: waMeUrl(bot.phone, "Halo NEXBILL"),
        linkedPhone,
        outletPhone,
      });
    } catch (err) {
      if (isMissingTable(err)) return NextResponse.json({ available: false, reason: "migration" });
      throw err;
    }
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const bot = await botInfo();
    if (!bot.phone) return NextResponse.json({ error: "Bot WhatsApp NEXBILL belum aktif." }, { status: 503 });
    const code = await createWaLinkCode(session.sub, session.outletId, session.name);
    return NextResponse.json({ code, url: waMeUrl(bot.phone, `NEXBILL KODE ${code}`), botPhone: bot.phone });
  } catch (err: unknown) {
    if (isMissingTable(err)) return NextResponse.json({ error: "Fitur support belum siap (migrasi 0037)." }, { status: 503 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    await unlinkWaStaff(session.sub);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
