/**
 * Balasan tim di Customer Service platform-admin → diteruskan ke chat Telegram merchant bila tiket itu
 * dibuat lewat bot. Tidak pernah menggagalkan balasan tim (error hanya dicatat).
 */
import { sendTelegramText, telegramConfigured } from "./api";
import { botText } from "./bot-text";
import { isMissingTable, logMessage, outletLang, telegramChatForThread } from "./support-service";

export async function forwardTeamReplyToTelegram(threadId: string, body: string, hasAttachment: boolean) {
  if (!telegramConfigured()) return;
  try {
    const target = await telegramChatForThread(threadId);
    if (!target) return;
    const lang = target.outletId ? await outletLang(target.outletId) : "id";
    const text = botText(lang, "teamReply", {
      ticket: threadId.slice(0, 8),
      body: `${body.trim()}${hasAttachment ? `${body.trim() ? "\n\n" : ""}[lampiran — buka menu Customer Service di dashboard]` : ""}`,
    });
    const messageId = await sendTelegramText(target.chatId, text);
    await logMessage({ chatId: target.chatId, outletId: target.outletId, role: "team", body: body.trim() || "[lampiran]", supportThreadId: threadId, tgMessageId: messageId != null ? String(messageId) : null });
  } catch (err) {
    if (!isMissingTable(err)) console.error("Gagal meneruskan balasan tim ke Telegram:", err);
  }
}
