/**
 * Memproses satu update Telegram (dipanggil webhook setelah respons 200 dikirim, lewat after()).
 * Alur sesuai dokumen kerangka: tautan akun → pesan merchant → bot AI (panduan + status akun) →
 * terjawab / tiket / P1. Balasan merchant ke pesan tim masuk langsung ke tiketnya.
 */
import { sendTelegramText, sendTyping, type TgMessage, type TgUpdate } from "./api";
import { escalateWithNotify, runSupportBrain, type BrainInput } from "@/lib/support-bot/brain";
import { botText } from "./bot-text";
import {
  accountStatus,
  appendToTicket,
  createSupportTicket,
  DASHBOARD_URL,
  getLinkByChat,
  logMessage,
  logUserMessage,
  outletLang,
  outletName,
  recentConversation,
  redeemLinkCode,
  statusLine,
  threadForTelegramMessage,
  touchLink,
  unlinkChat,
  type TelegramLink,
} from "./support-service";
import { enforcedPriority, isSupportHours, parseCommand } from "./support-rules";

function langOf(msg: TgMessage, fallback = "id"): string {
  const code = msg.from?.language_code?.slice(0, 2);
  if (code === "tl") return "fil";
  return code && ["id", "en", "ms", "th", "vi"].includes(code) ? code : fallback;
}

async function reply(chatId: string, text: string, outletId: string | null, extra: { resolution?: "answered" | "ticket" | "urgent"; priority?: "P1" | "P2" | "P3" | "P4" | null; threadId?: string | null } = {}) {
  await sendTelegramText(chatId, text);
  await logMessage({ chatId, outletId, role: "bot", body: text, resolution: extra.resolution ?? null, priority: extra.priority ?? null, supportThreadId: extra.threadId ?? null }).catch(() => undefined);
}

export async function handleTelegramUpdate(update: TgUpdate) {
  const msg = update.message;
  if (!msg || msg.from?.is_bot) return;
  const chatId = String(msg.chat.id);
  const text = (msg.text ?? msg.caption ?? "").trim();
  const cmd = text ? parseCommand(text) : null;

  // /id — untuk mengisi TELEGRAM_ONCALL_CHAT_IDS (petugas jaga). Boleh di grup tim NEXBILL.
  if (cmd?.command === "id") {
    await sendTelegramText(chatId, `Chat ID: ${chatId}`);
    return;
  }
  if (msg.chat.type !== "private") return; // support hanya lewat chat pribadi

  if (cmd?.command === "start" && cmd.arg) {
    const link = await redeemLinkCode(cmd.arg, chatId, msg.from?.username ?? null);
    const lang = link ? await outletLang(link.outletId) : langOf(msg);
    if (!link) {
      await sendTelegramText(chatId, botText(lang, "linkInvalid", { url: `${DASHBOARD_URL}/dashboard/chat` }));
      return;
    }
    await sendTelegramText(chatId, botText(lang, "linked", { outlet: await outletName(link.outletId), name: link.staffName ?? "" }));
    return;
  }

  const link = await getLinkByChat(chatId);
  if (!link) {
    await sendTelegramText(chatId, botText(langOf(msg), "notLinked", { url: `${DASHBOARD_URL}/dashboard/chat` }));
    return;
  }
  const lang = await outletLang(link.outletId);

  if (cmd?.command === "putus") {
    await unlinkChat(chatId);
    await sendTelegramText(chatId, botText(lang, "unlinked"));
    return;
  }
  if (cmd?.command === "bantuan" || cmd?.command === "help" || cmd?.command === "start") {
    await sendTelegramText(chatId, botText(lang, "help", { outlet: await outletName(link.outletId) }));
    return;
  }
  if (cmd?.command === "status") {
    const s = await accountStatus(link.outletId);
    await sendTelegramText(chatId, botText(lang, "status", { line: statusLine(s) }));
    return;
  }

  if (!text) {
    await sendTelegramText(chatId, botText(lang, "textOnly", { url: `${DASHBOARD_URL}/dashboard/chat` }));
    return;
  }

  // Pesan dicatat dulu; update_id yang sama (Telegram mengirim ulang) tidak diproses dua kali.
  const fresh = await logUserMessage({ chatId, outletId: link.outletId, body: text.slice(0, 4000), updateId: String(update.update_id) });
  if (!fresh) return;
  await touchLink(chatId);

  // Membalas pesan tim di Telegram → masuk ke tiket yang sama, tanpa lewat bot.
  if (msg.reply_to_message) {
    const threadId = await threadForTelegramMessage(chatId, String(msg.reply_to_message.message_id));
    if (threadId) {
      await appendToTicket(threadId, link, text);
      await reply(chatId, botText(lang, "appended", { ticket: threadId.slice(0, 8) }), link.outletId, { resolution: "ticket", threadId });
      return;
    }
  }

  if (cmd?.command === "tim") {
    await escalateToTeam(link, lang, cmd.arg);
    return;
  }

  await sendTyping(chatId);
  const outlet = await outletName(link.outletId);
  try {
    const turns = await recentConversation(chatId);
    const result = await runSupportBrain({ ...brainBase(link, outlet, lang), turns });
    await reply(chatId, result.reply, link.outletId, { resolution: result.resolution, priority: result.priority, threadId: result.ref ? threadIdByRef.get(result.ref) ?? null : null });
  } catch (err) {
    // AI gagal → pesan tidak boleh hilang: langsung jadi tiket.
    console.error("Bot Telegram support gagal menjawab:", err);
    await escalateToTeam(link, lang, text, true);
  }
}

/** Nomor tiket pendek (ref) → id tiket penuh, untuk log percakapan. Hanya hidup selama satu update. */
const threadIdByRef = new Map<string, string>();

/** Kanal Telegram untuk otak bot: meneruskan = membuat tiket baru di Customer Service. */
function brainBase(link: TelegramLink, outlet: string, lang: string): Omit<BrainInput, "turns"> {
  return {
    channel: "telegram",
    outletId: link.outletId,
    outletName: outlet,
    staffName: link.staffName ?? "Staf",
    lang,
    escalate: async (e) => {
      const { threadId } = await createSupportTicket({ link, ...e });
      const ref = threadId.slice(0, 8);
      threadIdByRef.set(ref, threadId);
      return { ref };
    },
  };
}

/** /tim, atau AI gagal: ringkas percakapan berjalan menjadi tiket. */
async function escalateToTeam(link: TelegramLink, lang: string, note: string, botFailed = false) {
  const chatId = link.chatId!;
  const turns = await recentConversation(chatId);
  const userLines = turns.filter((t) => t.role === "user" && !t.body.startsWith("/")).map((t) => t.body);
  const summary = (note || userLines.slice(-3).join(" / ") || "Merchant minta bicara dengan tim lewat Telegram.").slice(0, 2000);
  const priority = enforcedPriority(botFailed ? "P2" : "P3", { text: [note, ...userLines].join(" ") });
  const status = await accountStatus(link.outletId).catch(() => null);
  const outlet = await outletName(link.outletId);
  const { ref } = await escalateWithNotify(brainBase(link, outlet, lang), {
    priority,
    category: priority === "P1" || priority === "P2" ? "kendala_teknis" : "lainnya",
    summary,
    tried: botFailed ? "Bot AI gagal menjawab (gangguan sementara) — diteruskan otomatis." : "Merchant memilih /tim.",
    accountStatus: status ? statusLine(status) : undefined,
  });
  const key = isSupportHours() ? "ticketInHours" : priority === "P1" ? "ticketUrgentAfterHours" : "ticketAfterHours";
  await reply(chatId, botText(lang, key, { ticket: ref }), link.outletId, {
    resolution: priority === "P1" ? "urgent" : "ticket",
    priority,
    threadId: threadIdByRef.get(ref) ?? null,
  });
}
