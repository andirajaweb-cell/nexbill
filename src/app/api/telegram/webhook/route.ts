import { NextRequest, NextResponse, after } from "next/server";
import { timingSafeEqual } from "crypto";
import { telegramConfigured, telegramWebhookSecret, type TgUpdate } from "@/lib/telegram/api";
import { handleTelegramUpdate } from "@/lib/telegram/handler";
import { isMissingTable } from "@/lib/telegram/support-service";

/**
 * Webhook bot Telegram support 24 jam. Telegram mengirim header X-Telegram-Bot-Api-Secret-Token
 * (dipasang dari /platform-admin/telegram-bot); tanpa rahasia yang cocok, update ditolak. Respons 200
 * dikirim segera dan update diproses lewat after() — Telegram mengirim ulang bila menunggu terlalu
 * lama, dan pesan yang sama tidak diproses dua kali (update_id unik di log).
 */
export const maxDuration = 60;

function secretOk(req: NextRequest): boolean {
  const expected = telegramWebhookSecret();
  const got = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!expected || got.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

export async function POST(req: NextRequest) {
  if (!telegramConfigured() || !secretOk(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const update = (await req.json().catch(() => null)) as TgUpdate | null;
  if (!update || typeof update.update_id !== "number") return NextResponse.json({ ok: true });
  after(async () => {
    try {
      await handleTelegramUpdate(update);
    } catch (err) {
      if (isMissingTable(err)) console.error("Bot Telegram: migrasi 0037_telegram_support_bot.sql belum dijalankan.");
      else console.error("Bot Telegram gagal memproses update:", err);
    }
  });
  return NextResponse.json({ ok: true });
}
