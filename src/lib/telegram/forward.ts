/**
 * Balasan tim di Customer Service platform-admin → diteruskan ke chat merchant bila tiket itu dibuat lewat
 * bot: Telegram (dikirim langsung) atau WhatsApp (dicatat di log sebagai "team" tanpa id pesan; proses bot
 * WhatsApp di VPS yang mengirimnya — lib/whatsapp-support/handler.ts pollTeamReplies). Tidak pernah
 * menggagalkan balasan tim (error hanya dicatat).
 */
import { isWaChatId } from "@/lib/whatsapp-support/rules";
import { sendTelegramText, telegramConfigured } from "./api";
import { botText } from "./bot-text";
import { isMissingTable, logMessage, outletLang, telegramChatForThread } from "./support-service";

export async function forwardTeamReplyToTelegram(threadId: string, body: string, hasAttachment: boolean) {
  try {
    const target = await telegramChatForThread(threadId);
    if (!target) return;
    const text = `${body.trim()}${hasAttachment ? `${body.trim() ? "\n\n" : ""}[lampiran — buka menu Customer Service di dashboard]` : ""}`;
    if (isWaChatId(target.chatId)) {
      // Antre untuk bot WhatsApp (tgMessageId diisi id pesan WhatsApp setelah terkirim).
      await logMessage({ chatId: target.chatId, outletId: target.outletId, role: "team", body: text || "[lampiran]", supportThreadId: threadId });
      return;
    }
    if (!telegramConfigured()) return;
    const lang = target.outletId ? await outletLang(target.outletId) : "id";
    const messageId = await sendTelegramText(target.chatId, botText(lang, "teamReply", { ticket: threadId.slice(0, 8), body: text }));
    await logMessage({ chatId: target.chatId, outletId: target.outletId, role: "team", body: body.trim() || "[lampiran]", supportThreadId: threadId, tgMessageId: messageId != null ? String(messageId) : null });
  } catch (err) {
    if (!isMissingTable(err)) console.error("Gagal meneruskan balasan tim ke Telegram/WhatsApp:", err);
  }
}
