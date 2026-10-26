import { NextRequest, NextResponse } from "next/server";
import { count, gte, isNotNull } from "drizzle-orm";
import { db } from "@/db/client";
import { telegramSupportLinks, telegramSupportMessages } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";
import { getBotInfo, getWebhookInfo, setWebhook, telegramConfigured, telegramWebhookSecret } from "@/lib/telegram/api";
import { isMissingTable } from "@/lib/telegram/support-service";
import { conversationStats } from "@/lib/telegram/support-rules";

/**
 * Status bot Telegram support 24 jam untuk /platform-admin/telegram-bot: konfigurasi env, webhook,
 * dan metrik 30 hari (selesai di bot, tiket, P1) sesuai dokumen kerangka. POST = pasang webhook.
 */
function webhookUrl(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "dashboard.nexbill.id";
  return `https://${host}/api/telegram/webhook`;
}

export async function GET(req: NextRequest) {
  try {
    await requirePlatformAdmin();
    const configured = telegramConfigured();
    const bot = configured ? await getBotInfo() : null;
    const webhook = bot ? await getWebhookInfo().catch(() => null) : null;
    const oncall = (process.env.TELEGRAM_ONCALL_CHAT_IDS ?? "").split(",").filter((s) => s.trim()).length;

    let stats = null;
    let linkedChats = 0;
    let migration = true;
    try {
      const since = new Date(Date.now() - 30 * 86400_000).toISOString();
      const rows = await db
        .select({ chatId: telegramSupportMessages.chatId, role: telegramSupportMessages.role, resolution: telegramSupportMessages.resolution, createdAt: telegramSupportMessages.createdAt })
        .from(telegramSupportMessages)
        .where(gte(telegramSupportMessages.createdAt, since));
      stats = conversationStats(rows);
      const [l] = await db.select({ n: count() }).from(telegramSupportLinks).where(isNotNull(telegramSupportLinks.chatId));
      linkedChats = l?.n ?? 0;
    } catch (err) {
      if (!isMissingTable(err)) throw err;
      migration = false;
    }

    return NextResponse.json({
      configured,
      hasSecret: !!telegramWebhookSecret(),
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      model: process.env.SUPPORT_BOT_MODEL || process.env.TELEGRAM_SUPPORT_MODEL || "claude-haiku-5-5",
      bot: bot && { username: bot.username, name: bot.first_name },
      webhook: webhook && {
        url: webhook.url,
        pending: webhook.pending_update_count,
        lastError: webhook.last_error_message ?? null,
        lastErrorAt: webhook.last_error_date ? new Date(webhook.last_error_date * 1000).toISOString() : null,
      },
      expectedWebhookUrl: webhookUrl(req),
      oncallChats: oncall,
      migration,
      linkedChats,
      stats,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePlatformAdmin();
    const secret = telegramWebhookSecret();
    if (!telegramConfigured() || !secret) {
      return NextResponse.json({ error: "Isi TELEGRAM_BOT_TOKEN dan TELEGRAM_WEBHOOK_SECRET di env Vercel lalu redeploy." }, { status: 400 });
    }
    const url = webhookUrl(req);
    await setWebhook(url, secret);
    return NextResponse.json({ ok: true, url });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
