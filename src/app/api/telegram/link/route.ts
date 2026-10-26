import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { getBotInfo, sendTelegramText, telegramConfigured } from "@/lib/telegram/api";
import { botText } from "@/lib/telegram/bot-text";
import { createLinkCode, getLinkForStaff, isMissingTable, outletLang, unlinkStaff } from "@/lib/telegram/support-service";

/**
 * Tautan Telegram untuk staf yang login (kartu "Support 24 jam di Telegram" di Customer Service).
 * Selalu dibatasi session.sub + session.outletId — staf hanya menautkan akunnya sendiri.
 * GET status · POST buat kode sekali pakai (15 menit) → link t.me · DELETE putuskan.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!telegramConfigured()) return NextResponse.json({ available: false, reason: "not_configured" });
    const bot = await getBotInfo();
    try {
      const link = await getLinkForStaff(session.sub, session.outletId);
      return NextResponse.json({
        available: !!bot,
        reason: bot ? null : "not_configured",
        botUsername: bot?.username ?? null,
        linked: !!link?.chatId,
        telegramUsername: link?.telegramUsername ?? null,
        linkedAt: link?.linkedAt ?? null,
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
    const bot = await getBotInfo();
    if (!bot) return NextResponse.json({ error: "Bot Telegram NEXBILL belum aktif." }, { status: 503 });
    const code = await createLinkCode(session.sub, session.outletId, session.name);
    return NextResponse.json({ url: `https://t.me/${bot.username}?start=${code}`, botUsername: bot.username });
  } catch (err: unknown) {
    if (isMissingTable(err)) return NextResponse.json({ error: "Fitur Telegram belum siap (migrasi 0037)." }, { status: 503 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const chatId = await unlinkStaff(session.sub, session.outletId);
    if (chatId) await sendTelegramText(chatId, botText(await outletLang(session.outletId), "unlinked")).catch(() => undefined);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
