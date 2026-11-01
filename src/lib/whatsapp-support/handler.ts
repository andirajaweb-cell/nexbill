/**
 * Support 24 jam lewat WhatsApp — dijalankan proses bot WhatsApp (scripts/whatsapp-bot.mts) di VPS.
 * Sama dengan bot Telegram (lib/telegram/handler.ts), 3 tingkat:
 *   1. FAQ tanpa AI  — Jawaban Bot yang cocoknya yakin.
 *   2. Claude Haiku  — bila FAQ tidak yakin, atau merchant membalas "2" (Belum terselesaikan).
 *   3. Staf          — AI meneruskan, merchant mengetik TIM / membalas "3", AI tidak tersedia, darurat.
 * WhatsApp tidak punya tombol yang andal → menu & penilaian memakai balasan angka (status menu disimpan
 * di memori proses bot, basi setelah 30 menit). Balasan tim di tiket dikirim bot (pollTeamReplies);
 * merchant membalas pesan tim (Reply) → masuk ke tiket yang sama.
 */
import { aiAvailable, escalateWithNotify, runSupportBrain, type BrainInput, type BrainResult } from "@/lib/support-bot/brain";
import { helpMenu, tier1Answer } from "@/lib/support-bot/knowledge";
import { STARTER_TOPICS } from "@/lib/support-bot/starter-answers";
import { composeTier1Reply, detectIntent, isFeedbackEcho, isFrustrated, MAX_MESSAGES_PER_10_MIN, nameVar, nextTier, type Feedback } from "@/lib/support-bot/tiers";
import { TELEGRAM_GROUP_URL } from "@/lib/support/community";
import { botText } from "@/lib/telegram/bot-text";
import { enforcedPriority, isSupportHours, type SupportPriority } from "@/lib/telegram/support-rules";
import {
  accountStatus,
  botLogForChat,
  DASHBOARD_URL,
  logMessage,
  logUserMessage,
  outletLang,
  recentConversation,
  recordBotError,
  statusLine,
  threadForTelegramMessage,
  userMessagesSince,
} from "@/lib/telegram/support-service";
import { numberedList, parseLinkMessage, parseNumberReply, parseWaCommand, stateFresh, toWhatsAppText, waChatId, WA_NOT_LINKED_COOLDOWN_MS, type WaMenuState } from "./rules";
import {
  appendToWaTicket,
  createWaTicket,
  markWaTeamReplySent,
  notLinkedNoticeSentSince,
  pendingWaTeamReplies,
  redeemWaLinkCode,
  resolveWaStaff,
  type WaStaff,
} from "./service";
import { waText } from "./text";

export interface WaSender {
  /** Kirim teks ke nomor ini; mengembalikan id pesan WhatsApp (untuk balasan ke pesan tim). */
  send(text: string): Promise<string | null>;
  /** Tanda "sedang mengetik…" (opsional). */
  typing?(): Promise<void>;
}

export interface WaIncoming {
  phone: string;
  text: string;
  /** id pesan WhatsApp (dedup). */
  msgId: string;
  /** id pesan yang dibalas (Reply), bila ada. */
  quotedId: string | null;
  /** Pesan berupa gambar/suara/dokumen tanpa teks. */
  mediaOnly: boolean;
}

type Resolution = "answered" | "ticket" | "urgent" | "faq";

/** Status menu/penilaian per nomor (memori proses bot). */
const states = new Map<string, WaMenuState>();

const chatUrl = `${DASHBOARD_URL}/dashboard/chat`;

async function say(out: WaSender, chatId: string, outletId: string | null, text: string, extra: { resolution?: Resolution; priority?: SupportPriority | null; threadId?: string | null } = {}): Promise<string | null> {
  const logId = await logMessage({ chatId, outletId, role: "bot", body: text, resolution: extra.resolution ?? null, priority: extra.priority ?? null, supportThreadId: extra.threadId ?? null }).catch(() => null);
  await out.send(toWhatsAppText(text));
  return logId;
}

/** Jawaban bot + daftar penilaian 1/2/3 (status "feedback" diingat untuk balasan angka berikutnya). */
async function answer(out: WaSender, staff: WaStaff, lang: string, text: string, resolution: Resolution) {
  const chatId = waChatId(staff.phone);
  const logId = await logMessage({ chatId, outletId: staff.outletId, role: "bot", body: text, resolution }).catch(() => null);
  await out.send(`${toWhatsAppText(text)}\n\n${waText(lang, "feedbackFooter")}`);
  if (logId) states.set(staff.phone, { kind: "feedback", logId, at: Date.now() });
}

async function sendMenu(out: WaSender, staff: WaStaff, lang: string) {
  const items = await helpMenu();
  const topics = STARTER_TOPICS.filter((t) => items.some((x) => x.topic === t));
  states.set(staff.phone, { kind: "home", topics, at: Date.now() });
  await out.send(`${waText(lang, "menuIntro")}\n\n${numberedList(topics)}\n\n${waText(lang, "menuFooter")}`);
}

async function sendTopic(out: WaSender, staff: WaStaff, lang: string, topic: string) {
  const items = (await helpMenu()).filter((x) => x.topic === topic);
  states.set(staff.phone, { kind: "topic", topic, keys: items.map((x) => x.key), at: Date.now() });
  await out.send(`${waText(lang, "topicIntro", { topic })}\n\n${numberedList(items.map((x) => x.question))}`);
}

/**
 * Proses satu pesan WhatsApp. "not_staff" = nomor ini bukan staf outlet NEXBILL yang dikenali (bot lalu
 * memperlakukannya sebagai pesan CRM/lead seperti sebelumnya).
 */
export async function handleWaSupportMessage(msg: WaIncoming, out: WaSender): Promise<"handled" | "not_staff"> {
  const chatId = waChatId(msg.phone);
  const text = msg.text.trim();

  // Kode tautan dari dashboard ("NEXBILL KODE AB12CD").
  const code = text ? parseLinkMessage(text) : null;
  if (code) {
    const linked = await redeemWaLinkCode(code, msg.phone);
    if (!linked) {
      await out.send(waText("id", "linkInvalid", { url: chatUrl }));
      return "handled";
    }
    const lang = await outletLang(linked.outletId);
    await say(out, chatId, linked.outletId, waText(lang, "linked", { outlet: linked.outletName, name: linked.staffName.split(" ")[0] }));
    await sendMenu(out, linked, lang);
    return "handled";
  }

  const { staff, all } = await resolveWaStaff(msg.phone);
  if (!staff) return "not_staff";
  const lang = await outletLang(staff.outletId);

  if (!text) {
    if (msg.mediaOnly) await out.send(waText(lang, "textOnly", { url: chatUrl }));
    return "handled";
  }

  // Dicatat dulu; pesan yang sama (WhatsApp mengirim ulang) tidak diproses dua kali.
  const fresh = await logUserMessage({ chatId, outletId: staff.outletId, body: text.slice(0, 4000), updateId: `wa:${msg.msgId}` });
  if (!fresh) return "handled";
  void out.typing?.();

  // Membalas pesan tim → masuk ke tiket yang sama.
  if (msg.quotedId) {
    const threadId = await threadForTelegramMessage(chatId, msg.quotedId);
    if (threadId) {
      await appendToWaTicket(threadId, staff, text);
      await say(out, chatId, staff.outletId, botText(lang, "appended", { ticket: threadId.slice(0, 8) }), { resolution: "ticket", threadId });
      return "handled";
    }
  }

  // Rem banjir pesan (kuota AI).
  const recent = await userMessagesSince(chatId, 10).catch(() => 0);
  if (recent > MAX_MESSAGES_PER_10_MIN) {
    if (recent === MAX_MESSAGES_PER_10_MIN + 1) await out.send(waText(lang, "slowDown"));
    return "handled";
  }

  // Balasan angka untuk menu / penilaian / pilihan outlet.
  const num = parseNumberReply(text);
  const st = states.get(msg.phone);
  if (num !== null && stateFresh(st)) {
    if (num === 0) {
      await sendMenu(out, staff, lang);
      return "handled";
    }
    if (st.kind === "home" && st.topics[num - 1]) {
      await sendTopic(out, staff, lang, st.topics[num - 1]);
      return "handled";
    }
    if (st.kind === "topic" && st.keys[num - 1]) {
      const item = (await helpMenu()).find((x) => x.key === st.keys[num - 1]);
      if (item) {
        const body = composeTier1Reply(
          { chunk: { source: "Jawaban tim NEXBILL", title: item.question, text: item.answer }, score: 99, coverage: 1, confident: true },
          { name: staff.staffName, seed: `${chatId}:${msg.msgId}` }
        );
        await answer(out, staff, lang, body, "faq");
        return "handled";
      }
    }
    if (st.kind === "feedback" && num >= 1 && num <= 3) {
      await handleFeedback(out, staff, lang, st.logId, num === 1 ? "ok" : num === 2 ? "no" : "team");
      return "handled";
    }
    if (st.kind === "outlet" && st.outletIds[num - 1]) {
      const target = all.find((s) => s.outletId === st.outletIds[num - 1]);
      if (target) {
        states.delete(msg.phone);
        await say(out, chatId, target.outletId, waText(await outletLang(target.outletId), "outletSwitched", { outlet: target.outletName }));
        return "handled";
      }
    }
  }

  const cmd = parseWaCommand(text);
  if (cmd?.command === "menu") {
    await sendMenu(out, staff, lang);
    return "handled";
  }
  if (cmd?.command === "help") {
    await say(out, chatId, staff.outletId, waText(lang, "help", { outlet: staff.outletName }));
    return "handled";
  }
  if (cmd?.command === "status") {
    const s = await accountStatus(staff.outletId);
    await say(out, chatId, staff.outletId, botText(lang, "status", { line: statusLine(s) }));
    return "handled";
  }
  if (cmd?.command === "group") {
    await say(out, chatId, staff.outletId, waText(lang, "groupInvite", { url: TELEGRAM_GROUP_URL }));
    return "handled";
  }
  if (cmd?.command === "outlet") {
    if (all.length <= 1) {
      await say(out, chatId, staff.outletId, waText(lang, "outletSwitched", { outlet: staff.outletName }));
      return "handled";
    }
    states.set(msg.phone, { kind: "outlet", outletIds: all.map((s) => s.outletId), at: Date.now() });
    await out.send(`${waText(lang, "outletList", { current: staff.outletName })}\n\n${numberedList(all.map((s) => s.outletName))}`);
    return "handled";
  }
  if (cmd?.command === "team") {
    await escalateToTeam(out, staff, lang, cmd.arg, { tried: "Merchant mengetik TIM di WhatsApp." });
    return "handled";
  }

  const name = nameVar(staff.staffName, lang);
  const intent = detectIntent(text);
  const turns = await recentConversation(chatId);
  const earlierUser = turns.filter((t) => t.role === "user" && !isFeedbackEcho(t.body)).length > 1;

  switch (intent) {
    case "human":
      await escalateToTeam(out, staff, lang, text, { tried: "Merchant minta bicara dengan staf." });
      return "handled";
    case "is_bot":
      await say(out, chatId, staff.outletId, waText(lang, "isBot", { name }));
      return "handled";
    case "greeting":
      await say(out, chatId, staff.outletId, botText(lang, "greeting", { name, outlet: staff.outletName }));
      await sendMenu(out, staff, lang);
      return "handled";
    case "thanks":
      await say(out, chatId, staff.outletId, botText(lang, "thanks", { name }));
      return "handled";
    case "not_resolved": {
      const lastBot = [...turns].reverse().find((t) => t.role === "bot" && (t.resolution === "faq" || t.resolution === "answered"));
      if (lastBot) {
        await notResolved(out, staff, lang, lastBot.resolution === "faq" ? "faq" : "ai");
        return "handled";
      }
      break;
    }
    case "vague":
      if (!earlierUser) {
        await say(out, chatId, staff.outletId, botText(lang, "clarify", { name }));
        await sendMenu(out, staff, lang);
        return "handled";
      }
      break;
    default:
      break;
  }

  if (intent === "question") {
    const m = await tier1Answer(text, lang).catch(() => null);
    if (m) {
      await answer(out, staff, lang, composeTier1Reply(m, { name: staff.staffName, frustrated: isFrustrated(text), seed: `${chatId}:${msg.msgId}` }), "faq");
      return "handled";
    }
  }
  await runAi(out, staff, lang, turns);
  return "handled";
}

/** Nomor asing (bukan staf, bukan lead CRM): beri tahu cara menautkan — paling sering sekali per 24 jam. */
export async function replyNotLinkedIfDue(phone: string, out: WaSender) {
  const chatId = waChatId(phone);
  if (await notLinkedNoticeSentSince(chatId, WA_NOT_LINKED_COOLDOWN_MS).catch(() => true)) return;
  await say(out, chatId, null, waText("id", "notLinked", { url: chatUrl }));
}

async function runAi(out: WaSender, staff: WaStaff, lang: string, turns: Awaited<ReturnType<typeof recentConversation>>, tierNote?: string) {
  const latest = [...turns].reverse().find((t) => t.role === "user" && !isFeedbackEcho(t.body))?.body ?? "";
  if (!aiAvailable()) {
    await escalateToTeam(out, staff, lang, latest, { tried: tierNote ? "Jawaban FAQ sudah dicoba, belum terselesaikan." : "Belum ada di Jawaban Bot (FAQ).", priority: tierNote ? "P2" : "P3" });
    return;
  }
  void out.typing?.();
  let result: BrainResult;
  const refs = new Map<string, string>();
  try {
    result = await runSupportBrain({ ...brainBase(staff, lang, refs), turns, tierNote });
  } catch (err) {
    await recordBotError("asisten AI (WhatsApp)", err);
    await escalateToTeam(out, staff, lang, latest, { tried: "Asisten AI sedang gangguan — diteruskan otomatis.", priority: "P2" });
    return;
  }
  const threadId = result.ref ? refs.get(result.ref) ?? null : null;
  if (result.resolution === "answered") await answer(out, staff, lang, result.reply, "answered");
  else await say(out, waChatId(staff.phone), staff.outletId, result.reply, { resolution: result.resolution, priority: result.priority, threadId });
}

/** "Belum terselesaikan": naik satu tingkat (FAQ → AI → staf). */
async function notResolved(out: WaSender, staff: WaStaff, lang: string, from: "faq" | "ai") {
  const next = nextTier(from);
  if (next === "ai" && aiAvailable()) {
    await out.send(botText(lang, "fbDeeper", { name: nameVar(staff.staffName, lang) }));
    const turns = await recentConversation(waChatId(staff.phone));
    await runAi(
      out,
      staff,
      lang,
      turns,
      'Merchant membalas "Belum terselesaikan" atas jawaban FAQ sebelumnya (tingkat 1). Jangan ulangi jawaban itu: periksa status_akun, tanyakan singkat di langkah mana gagal bila belum jelas, beri pendekatan lain; bila tetap buntu teruskan_ke_tim.'
    );
    return;
  }
  await escalateToTeam(out, staff, lang, "", {
    tried: from === "faq" ? "Jawaban FAQ sudah dicoba, belum terselesaikan." : 'Jawaban FAQ & asisten AI sudah dicoba, merchant membalas "Belum terselesaikan".',
    priority: "P2",
  });
}

/** Penilaian 1/2/3 atas jawaban bot. Satu penilaian per jawaban (update_id "fb:<id log>"). */
async function handleFeedback(out: WaSender, staff: WaStaff, lang: string, logId: string, kind: Feedback) {
  const chatId = waChatId(staff.phone);
  states.delete(staff.phone);
  const bot = await botLogForChat(chatId, logId);
  if (!bot) return;
  const label = botText(lang, kind === "ok" ? "btnOk" : kind === "no" ? "btnNo" : "btnTeam");
  const fresh = await logUserMessage({ chatId, outletId: staff.outletId, body: label, updateId: `fb:${logId}`, resolution: `fb_${kind}` as const });
  if (!fresh) {
    await out.send(botText(lang, "fbDone"));
    return;
  }
  if (kind === "ok") {
    await say(out, chatId, staff.outletId, botText(lang, "fbThanks", { name: nameVar(staff.staffName, lang) }));
    return;
  }
  if (kind === "team") {
    await escalateToTeam(out, staff, lang, "", { tried: `Merchant memilih "Bicara dengan tim" setelah jawaban ${bot.resolution === "faq" ? "FAQ" : "asisten"}.` });
    return;
  }
  await notResolved(out, staff, lang, bot.resolution === "faq" ? "faq" : "ai");
}

function brainBase(staff: WaStaff, lang: string, refs: Map<string, string>): Omit<BrainInput, "turns"> {
  return {
    channel: "whatsapp",
    outletId: staff.outletId,
    outletName: staff.outletName,
    staffName: staff.staffName,
    lang,
    escalate: async (e) => {
      const { threadId } = await createWaTicket({ staff, ...e });
      const ref = threadId.slice(0, 8);
      refs.set(ref, threadId);
      return { ref };
    },
  };
}

/** Tingkat 3 — staf: ringkas percakapan berjalan menjadi tiket (+ notifikasi petugas jaga sesuai prioritas). */
async function escalateToTeam(out: WaSender, staff: WaStaff, lang: string, note: string, opts: { tried: string; priority?: SupportPriority }) {
  const chatId = waChatId(staff.phone);
  states.delete(staff.phone);
  const turns = await recentConversation(chatId);
  const userLines = turns.filter((t) => t.role === "user" && !isFeedbackEcho(t.body)).map((t) => t.body);
  const summary = (note || userLines.slice(-3).join(" / ") || "Merchant minta bicara dengan staf lewat WhatsApp.").slice(0, 2000);
  const priority = enforcedPriority(opts.priority ?? "P3", { text: [note, ...userLines].join(" ") });
  const status = await accountStatus(staff.outletId).catch(() => null);
  const refs = new Map<string, string>();
  const { ref } = await escalateWithNotify(brainBase(staff, lang, refs), {
    priority,
    category: priority === "P1" || priority === "P2" ? "kendala_teknis" : "lainnya",
    summary,
    tried: opts.tried,
    accountStatus: status ? statusLine(status) : undefined,
  });
  const key = priority === "P1" && !isSupportHours() ? "ticketUrgentAfterHours" : isSupportHours() ? "ticketInHours" : "ticketAfterHours";
  await say(out, chatId, staff.outletId, botText(lang, key, { ticket: ref }), {
    resolution: priority === "P1" ? "urgent" : "ticket",
    priority,
    threadId: refs.get(ref) ?? null,
  });
}

/**
 * Kirim balasan tim yang menunggu (tiket asal WhatsApp). `sendTo` mengirim ke nomor dan mengembalikan id
 * pesan WhatsApp. Dipanggil proses bot tiap beberapa detik selama terhubung.
 */
export async function pollTeamReplies(sendTo: (phone: string, text: string) => Promise<string | null>): Promise<number> {
  const rows = await pendingWaTeamReplies();
  let sent = 0;
  for (const r of rows) {
    const phone = r.chatId.slice(3);
    const lang = r.outletId ? await outletLang(r.outletId) : "id";
    const text = waText(lang, "teamReply", { ticket: (r.supportThreadId ?? "").slice(0, 8), body: r.body });
    try {
      const id = await sendTo(phone, text);
      // Tanpa id (jarang) tetap ditandai supaya tidak terkirim berulang.
      await markWaTeamReplySent(r.id, id ?? `sent-${Date.now()}`);
      sent++;
    } catch (err) {
      await recordBotError("kirim balasan tim (WhatsApp)", err);
    }
  }
  return sent;
}
