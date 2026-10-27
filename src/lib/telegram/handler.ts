/**
 * Memproses satu update Telegram (dipanggil webhook setelah respons 200 dikirim, lewat after()).
 *
 * Support 3 tingkat (lib/support-bot/tiers.ts):
 *   1. FAQ tanpa AI  — Jawaban Bot yang cocoknya yakin (outlet berbahasa Indonesia). Gratis, instan.
 *   2. Claude Haiku  — bila FAQ tidak yakin, atau merchant menekan "Belum terselesaikan".
 *   3. Staf jaga     — bila AI meneruskan, merchant menekan "Bicara dengan tim" / "Belum terselesaikan"
 *                      setelah AI, AI tidak tersedia, atau darurat.
 * Setiap jawaban tingkat 1–2 diberi tombol ✅ Sudah terbantu · ❌ Belum terselesaikan · 👤 Bicara dengan tim.
 * Balasan merchant ke pesan tim masuk langsung ke tiketnya.
 */
import {
  answerCallbackQuery,
  editTelegramText,
  removeButtons,
  sendTelegramText,
  sendTyping,
  type TgCallbackQuery,
  type TgInlineButton,
  type TgMessage,
  type TgReplyKeyboard,
  type TgUpdate,
} from "./api";
import { STARTER_TOPICS } from "@/lib/support-bot/starter-answers";
import { TELEGRAM_GROUP_URL } from "@/lib/support/community";
import { aiAvailable, escalateWithNotify, runSupportBrain, type BrainInput, type BrainResult } from "@/lib/support-bot/brain";
import { helpMenu, tier1Answer } from "@/lib/support-bot/knowledge";
import {
  composeTier1Reply,
  detectIntent,
  feedbackData,
  isFeedbackEcho,
  isFrustrated,
  MAX_MESSAGES_PER_10_MIN,
  nameVar,
  nextTier,
  parseFeedbackData,
  type Feedback,
} from "@/lib/support-bot/tiers";
import { BOT_LANGS, BOT_TEXT, botText, type BotTextKey } from "./bot-text";
import {
  accountStatus,
  appendToTicket,
  botLogForChat,
  createSupportTicket,
  DASHBOARD_URL,
  getLinkByChat,
  logMessage,
  logUserMessage,
  outletLang,
  outletName,
  recentConversation,
  recordBotError,
  redeemLinkCode,
  statusLine,
  threadForTelegramMessage,
  touchLink,
  unlinkChat,
  userMessagesSince,
  type TelegramLink,
} from "./support-service";
import { enforcedPriority, isSupportHours, parseCommand, type SupportPriority } from "./support-rules";

function langOf(msg: TgMessage, fallback = "id"): string {
  const code = msg.from?.language_code?.slice(0, 2);
  if (code === "tl") return "fil";
  return code && ["id", "en", "ms", "th", "vi"].includes(code) ? code : fallback;
}

type Resolution = "answered" | "ticket" | "urgent" | "faq";

function feedbackButtons(lang: string, logId: string, only?: Feedback[]): TgInlineButton[][] {
  const b = (kind: Feedback, key: "btnOk" | "btnNo" | "btnTeam") => ({ text: botText(lang, key), callback_data: feedbackData(kind, logId) });
  if (only) return [only.map((k) => b(k, k === "ok" ? "btnOk" : k === "no" ? "btnNo" : "btnTeam"))];
  return [[b("ok", "btnOk")], [b("no", "btnNo"), b("team", "btnTeam")]];
}

/**
 * Kirim balasan bot + catat di log. `buttons` = pasang tombol penilaian (butuh id log, jadi dicatat dulu);
 * bila pencatatan gagal, pesan tetap terkirim tanpa tombol.
 */
async function reply(
  chatId: string,
  lang: string,
  text: string,
  outletId: string | null,
  extra: { resolution?: Resolution; priority?: SupportPriority | null; threadId?: string | null; buttons?: true | Feedback[]; keyboard?: TgReplyKeyboard } = {}
) {
  const logId = await logMessage({ chatId, outletId, role: "bot", body: text, resolution: extra.resolution ?? null, priority: extra.priority ?? null, supportThreadId: extra.threadId ?? null }).catch(() => null);
  const buttons = extra.buttons && logId ? feedbackButtons(lang, logId, extra.buttons === true ? undefined : extra.buttons) : undefined;
  await sendTelegramText(chatId, text, { buttons, keyboard: extra.keyboard });
}

/* -------------------------------------------------------------- menu bantuan -------------------------------------------------------------- */

const TOPIC_ICON: Record<string, string> = {
  "Akun & login": "🔐",
  "Langganan & paket": "💳",
  "Setup outlet baru": "🏁",
  "Rental PS (sesi)": "🎮",
  Booking: "📅",
  "Kasir & pembayaran": "🧾",
  "Shift & kas": "💰",
  "Member, promo & voucher": "🎟️",
  "Stok & inventori": "📦",
  "Laporan & pembukuan": "📈",
  "NEXBILL TV — instalasi": "📺",
  "NEXBILL TV — pemakaian": "🕹️",
  "NEXBILL TV — masalah": "🛠️",
  "Kontrol perangkat (Agent & smart plug)": "🔌",
  "Internet putus / Mode Offline": "📶",
  "Printer & struk": "🖨️",
  "Bantuan & Telegram": "💬",
};
const topicLabel = (topic: string) => `${TOPIC_ICON[topic] ?? "•"} ${topic}`;
const short = (s: string, n = 60) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Tombol tetap di atas keyboard HP. */
function replyKeyboard(lang: string): TgReplyKeyboard {
  return [
    [botText(lang, "kbMenu"), botText(lang, "btnStatus")],
    [botText(lang, "btnTeam"), botText(lang, "kbGroup")],
  ];
}

/** Teks dari tombol keyboard tetap (bahasa apa pun) → aksi. */
function keyboardAction(text: string): "menu" | "status" | "team" | "group" | null {
  const is = (key: BotTextKey) => BOT_LANGS.some((l) => (BOT_TEXT[key] as Record<string, string>)[l] === text);
  if (is("kbMenu")) return "menu";
  if (is("btnStatus")) return "status";
  if (is("btnTeam")) return "team";
  if (is("kbGroup") || is("btnGroup")) return "group";
  return null;
}

async function menuHome(lang: string): Promise<TgInlineButton[][]> {
  const items = await helpMenu();
  const topics = STARTER_TOPICS.map((topic, i) => ({ topic, i })).filter(({ topic }) => items.some((x) => x.topic === topic));
  const rows: TgInlineButton[][] = [];
  for (let k = 0; k < topics.length; k += 2) {
    rows.push(topics.slice(k, k + 2).map(({ topic, i }) => ({ text: topicLabel(topic), callback_data: `mn:t:${i}` })));
  }
  rows.push([
    { text: botText(lang, "btnStatus"), callback_data: "mn:st" },
    { text: botText(lang, "btnTeam"), callback_data: "mn:tim" },
  ]);
  rows.push([{ text: botText(lang, "btnGroup"), url: TELEGRAM_GROUP_URL }]);
  return rows;
}

async function sendMenu(chatId: string, lang: string) {
  await sendTelegramText(chatId, botText(lang, "menuIntro"), { buttons: await menuHome(lang) });
}

async function sendGroupInvite(chatId: string, lang: string) {
  await sendTelegramText(chatId, botText(lang, "groupInvite"), { buttons: [[{ text: botText(lang, "btnGroup"), url: TELEGRAM_GROUP_URL }]] });
}

/** Navigasi menu (mn:home, mn:t:<topik>, mn:q:<key>, mn:st, mn:tim). Pesan menu diedit di tempat; jawaban dikirim sebagai pesan baru. */
async function handleMenu(cq: TgCallbackQuery, data: string) {
  const chat = cq.message?.chat;
  if (!chat || chat.type !== "private" || !cq.message) {
    await answerCallbackQuery(cq.id);
    return;
  }
  const chatId = String(chat.id);
  const link = await getLinkByChat(chatId);
  if (!link) {
    await answerCallbackQuery(cq.id);
    await sendTelegramText(chatId, botText("id", "notLinked", { url: `${DASHBOARD_URL}/dashboard/chat` }));
    return;
  }
  const lang = await outletLang(link.outletId);
  await answerCallbackQuery(cq.id);
  const [, kind, arg] = data.split(":");

  if (kind === "home") {
    await editTelegramText(chatId, cq.message.message_id, botText(lang, "menuIntro"), await menuHome(lang));
    return;
  }
  if (kind === "t") {
    const topic = STARTER_TOPICS[Number(arg)];
    const items = topic ? (await helpMenu()).filter((x) => x.topic === topic) : [];
    if (!topic || items.length === 0) return;
    const rows: TgInlineButton[][] = items.map((x) => [{ text: short(x.question), callback_data: `mn:q:${x.key}` }]);
    rows.push([{ text: botText(lang, "btnBack"), callback_data: "mn:home" }]);
    await editTelegramText(chatId, cq.message.message_id, botText(lang, "menuTopic", { topic: topicLabel(topic) }), rows);
    return;
  }
  if (kind === "st") {
    const st = await accountStatus(link.outletId);
    await sendTelegramText(chatId, botText(lang, "status", { line: statusLine(st) }));
    return;
  }
  // Pilihan yang memicu tindakan dicatat sekali saja (Telegram bisa mengirim ulang callback yang sama).
  const fresh = await logUserMessage({
    chatId,
    outletId: link.outletId,
    body: kind === "q" ? `📖 ${(await helpMenu()).find((x) => x.key === arg)?.question ?? arg}` : botText(lang, "btnTeam"),
    // Ketukan berulang pada tombol yang sama (HP lambat/merchant menekan berkali-kali) dalam 1 menit = satu aksi.
    updateId: `cb:${chatId}:${cq.message.message_id}:${data}:${Math.floor(Date.now() / 60_000)}`,
  });
  if (!fresh) return;
  await touchLink(chatId);
  if (kind === "tim") {
    await escalateToTeam(link, lang, "", { tried: "Merchant memilih \"Bicara dengan tim\" dari menu bantuan." });
    return;
  }
  if (kind === "q") {
    const item = (await helpMenu()).find((x) => x.key === arg);
    if (!item) return;
    const body = composeTier1Reply(
      { chunk: { source: "Jawaban tim NEXBILL", title: item.question, text: item.answer }, score: 99, coverage: 1, confident: true },
      { name: link.staffName, seed: `${chatId}:${cq.id}` }
    );
    await reply(chatId, lang, body, link.outletId, { resolution: "faq", buttons: true });
  }
}

export async function handleTelegramUpdate(update: TgUpdate) {
  if (update.callback_query) {
    const data = update.callback_query.data ?? "";
    return data.startsWith("mn:") ? handleMenu(update.callback_query, data) : handleFeedback(update.callback_query);
  }
  const msg = update.message;
  if (!msg || msg.from?.is_bot) return;
  const chatId = String(msg.chat.id);
  const text = (msg.text ?? msg.caption ?? "").trim();
  // Tanda "sedang mengetik…" langsung muncul di HP merchant selagi data dibaca.
  if (msg.chat.type === "private") void sendTyping(chatId);
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
    await sendTelegramText(chatId, botText(lang, "linked", { outlet: await outletName(link.outletId), name: link.staffName ?? "" }), { keyboard: replyKeyboard(lang) });
    await sendMenu(chatId, lang);
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
  const action = text && !cmd ? keyboardAction(text) : null;
  if (cmd?.command === "bantuan" || cmd?.command === "help" || cmd?.command === "start") {
    await sendTelegramText(chatId, botText(lang, "help", { outlet: await outletName(link.outletId) }), { keyboard: replyKeyboard(lang) });
    await sendMenu(chatId, lang);
    return;
  }
  if (cmd?.command === "menu" || action === "menu") {
    await sendMenu(chatId, lang);
    return;
  }
  if (cmd?.command === "grup" || cmd?.command === "group" || action === "group") {
    await sendGroupInvite(chatId, lang);
    return;
  }
  if (cmd?.command === "status" || action === "status") {
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
      await reply(chatId, lang, botText(lang, "appended", { ticket: threadId.slice(0, 8) }), link.outletId, { resolution: "ticket", threadId });
      return;
    }
  }

  // Rem banjir pesan (melindungi kuota AI): balas sekali saat ambang terlewati, sesudahnya diam.
  const recent = await userMessagesSince(chatId, 10).catch(() => 0);
  if (recent > MAX_MESSAGES_PER_10_MIN) {
    if (recent === MAX_MESSAGES_PER_10_MIN + 1) await sendTelegramText(chatId, botText(lang, "slowDown"));
    return;
  }

  if (cmd?.command === "tim" || action === "team") {
    await escalateToTeam(link, lang, cmd?.arg ?? "", { tried: "Merchant memilih /tim." });
    return;
  }

  const name = nameVar(link.staffName, lang);
  const outlet = await outletName(link.outletId);
  const intent = detectIntent(text);
  const turns = await recentConversation(chatId);
  const earlierUser = turns.filter((t) => t.role === "user" && !isFeedbackEcho(t.body)).length > 1;

  switch (intent) {
    case "human":
      await escalateToTeam(link, lang, text, { tried: "Merchant minta bicara dengan staf." });
      return;
    case "is_bot":
      await reply(chatId, lang, botText(lang, "isBot", { name }), link.outletId, { buttons: ["team"] });
      return;
    case "greeting":
      await reply(chatId, lang, botText(lang, "greeting", { name, outlet }), link.outletId, { keyboard: replyKeyboard(lang) });
      await sendMenu(chatId, lang);
      return;
    case "thanks":
      await reply(chatId, lang, botText(lang, "thanks", { name }), link.outletId);
      return;
    case "not_resolved": {
      // "masih belum bisa" setelah jawaban bot = sama dengan menekan "Belum terselesaikan".
      const lastBot = [...turns].reverse().find((t) => t.role === "bot");
      if (lastBot) {
        await notResolved(link, lang, outlet, lastBot.resolution === "faq" ? "faq" : "ai");
        return;
      }
      break;
    }
    case "vague":
      // Pesan pendek tanpa topik di awal percakapan → tanya balik dengan ramah (bukan tiket).
      if (!earlierUser) {
        await reply(chatId, lang, botText(lang, "clarify", { name }), link.outletId);
        await sendMenu(chatId, lang);
        return;
      }
      break; // lanjutan percakapan ("yang di kasir") → AI membaca konteksnya
    default:
      break;
  }

  // Tingkat 1: FAQ tanpa AI — hanya pertanyaan baru yang cocoknya yakin (bukan darurat, bukan lanjutan samar).
  if (intent === "question") {
    const m = await tier1Answer(text, lang).catch(() => null);
    if (m) {
      const body = composeTier1Reply(m, { name: link.staffName, frustrated: isFrustrated(text), seed: `${chatId}:${update.update_id}` });
      await reply(chatId, lang, body, link.outletId, { resolution: "faq", buttons: true });
      return;
    }
  }

  // Tingkat 2: AI. Tidak tersedia → langsung ke staf (pesan tidak boleh hilang).
  await runAi(link, lang, outlet, turns);
}

async function runAi(link: TelegramLink, lang: string, outlet: string, turns: Awaited<ReturnType<typeof recentConversation>>, tierNote?: string) {
  const chatId = link.chatId!;
  const latest = [...turns].reverse().find((t) => t.role === "user" && !isFeedbackEcho(t.body))?.body ?? "";
  if (!aiAvailable()) {
    await escalateToTeam(link, lang, latest, { tried: tierNote ? "Jawaban FAQ sudah dicoba, belum terselesaikan." : "Belum ada di Jawaban Bot (FAQ).", priority: tierNote ? "P2" : "P3" });
    return;
  }
  await sendTyping(chatId);
  let result: BrainResult;
  try {
    result = await runSupportBrain({ ...brainBase(link, outlet, lang), turns, tierNote });
  } catch (err) {
    // AI gagal → pesan tidak boleh hilang: langsung ke staf.
    await recordBotError("asisten AI", err);
    await escalateToTeam(link, lang, latest, { tried: "Asisten AI sedang gangguan — diteruskan otomatis.", priority: "P2" });
    return;
  }
  const threadId = result.ref ? threadIdByRef.get(result.ref) ?? null : null;
  await reply(chatId, lang, result.reply, link.outletId, {
    resolution: result.resolution,
    priority: result.priority,
    threadId,
    // Sudah diteruskan ke staf → cukup satu tombol penutup; dijawab AI → tombol lengkap.
    buttons: result.resolution === "answered" ? true : undefined,
  });
}

/** "Belum terselesaikan": naik satu tingkat (FAQ → AI → staf). */
async function notResolved(link: TelegramLink, lang: string, outlet: string, from: "faq" | "ai") {
  const chatId = link.chatId!;
  const next = nextTier(from);
  if (next === "ai" && aiAvailable()) {
    await sendTelegramText(chatId, botText(lang, "fbDeeper", { name: nameVar(link.staffName, lang) }));
    const turns = await recentConversation(chatId);
    await runAi(
      link,
      lang,
      outlet,
      turns,
      'Merchant menekan "Belum terselesaikan" atas jawaban FAQ sebelumnya (tingkat 1). Jangan ulangi jawaban itu: periksa status_akun, tanyakan singkat di langkah mana gagal bila belum jelas, beri pendekatan lain; bila tetap buntu teruskan_ke_tim.'
    );
    return;
  }
  await escalateToTeam(link, lang, "", { tried: from === "faq" ? "Jawaban FAQ sudah dicoba, belum terselesaikan." : "Jawaban FAQ & asisten AI sudah dicoba, merchant menekan \"Belum terselesaikan\".", priority: "P2" });
}

/** Tombol penilaian di bawah jawaban bot. Satu penilaian per jawaban (update_id "fb:<id>" unik di log). */
async function handleFeedback(cq: TgCallbackQuery) {
  const fb = parseFeedbackData(cq.data);
  const chat = cq.message?.chat;
  if (!fb || !chat || chat.type !== "private") {
    await answerCallbackQuery(cq.id);
    return;
  }
  const chatId = String(chat.id);
  const link = await getLinkByChat(chatId);
  const bot = link ? await botLogForChat(chatId, fb.logId) : null;
  if (!link || !bot) {
    await answerCallbackQuery(cq.id);
    return;
  }
  const lang = await outletLang(link.outletId);
  const label = botText(lang, fb.kind === "ok" ? "btnOk" : fb.kind === "no" ? "btnNo" : "btnTeam");
  const fresh = await logUserMessage({ chatId, outletId: link.outletId, body: label, updateId: `fb:${fb.logId}`, resolution: `fb_${fb.kind}` as const });
  if (cq.message) await removeButtons(chatId, cq.message.message_id);
  if (!fresh) {
    await answerCallbackQuery(cq.id, botText(lang, "fbDone"));
    return;
  }
  await answerCallbackQuery(cq.id);
  await touchLink(chatId);
  if (fb.kind === "ok") {
    await reply(chatId, lang, botText(lang, "fbThanks", { name: nameVar(link.staffName, lang) }), link.outletId);
    return;
  }
  if (fb.kind === "team") {
    await escalateToTeam(link, lang, "", { tried: `Merchant menekan "Bicara dengan tim" setelah jawaban ${bot.resolution === "faq" ? "FAQ" : "asisten"}.` });
    return;
  }
  await notResolved(link, lang, await outletName(link.outletId), bot.resolution === "faq" ? "faq" : "ai");
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

/** Tingkat 3 — staf: ringkas percakapan berjalan menjadi tiket (+ notifikasi petugas jaga sesuai prioritas). */
async function escalateToTeam(link: TelegramLink, lang: string, note: string, opts: { tried: string; priority?: SupportPriority }) {
  const chatId = link.chatId!;
  const turns = await recentConversation(chatId);
  const userLines = turns.filter((t) => t.role === "user" && !t.body.startsWith("/") && !isFeedbackEcho(t.body)).map((t) => t.body);
  const summary = (note || userLines.slice(-3).join(" / ") || "Merchant minta bicara dengan staf lewat Telegram.").slice(0, 2000);
  const priority = enforcedPriority(opts.priority ?? "P3", { text: [note, ...userLines].join(" ") });
  const status = await accountStatus(link.outletId).catch(() => null);
  const outlet = await outletName(link.outletId);
  const { ref } = await escalateWithNotify(brainBase(link, outlet, lang), {
    priority,
    category: priority === "P1" || priority === "P2" ? "kendala_teknis" : "lainnya",
    summary,
    tried: opts.tried,
    accountStatus: status ? statusLine(status) : undefined,
  });
  const key = priority === "P1" && !isSupportHours() ? "ticketUrgentAfterHours" : isSupportHours() ? "ticketInHours" : "ticketAfterHours";
  await reply(chatId, lang, botText(lang, key, { ticket: ref }), link.outletId, {
    resolution: priority === "P1" ? "urgent" : "ticket",
    priority,
    threadId: threadIdByRef.get(ref) ?? null,
  });
}
