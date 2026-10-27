import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { answerCallbackQuery, telegramConfigured, telegramWebhookSecret, type TgUpdate } from "@/lib/telegram/api";
import { handleTelegramUpdate } from "@/lib/telegram/handler";
import { isMissingTable, recordBotError } from "@/lib/telegram/support-service";

/**
 * Webhook bot Telegram support 24 jam. Telegram mengirim header X-Telegram-Bot-Api-Secret-Token
 * (dipasang dari /platform-admin/telegram-bot); tanpa rahasia yang cocok, update ditolak.
 *
 * Update diproses langsung di request ini (bukan after()) supaya tidak terputus di tengah jalan; Telegram
 * mengirim ulang bila menunggu terlalu lama, dan pesan/tombol yang sama tidak diproses dua kali (update_id /
 * kunci tombol unik di log). Tombol dijawab paling awal supaya ikon loading di HP merchant langsung hilang.
 * Error dicatat ke log (Platform Admin › Telegram Bot › Error terakhir).
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
  if (update.callback_query) await answerCallbackQuery(update.callback_query.id);
  try {
    await Promise.race([
      handleTelegramUpdate(update),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Pemrosesan melebihi 55 detik")), 55_000)),
    ]);
  } catch (err) {
    if (isMissingTable(err)) console.error("Bot Telegram: migrasi 0037_telegram_support_bot.sql belum dijalankan.");
    else await recordBotError(update.callback_query ? "tombol" : "pesan", err);
  }
  return NextResponse.json({ ok: true });
}
