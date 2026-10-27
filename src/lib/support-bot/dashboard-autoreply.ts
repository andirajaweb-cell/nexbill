/**
 * Balas otomatis tiket Customer Service (dashboard) 24/7 — support 3 tingkat (lib/support-bot/tiers.ts):
 *   1. FAQ tanpa AI (Jawaban Bot yang cocoknya yakin, outlet berbahasa Indonesia) — tidak butuh kunci AI.
 *   2. Claude Haiku — FAQ tidak yakin, atau outlet menekan "Belum terselesaikan" pada jawaban FAQ.
 *   3. Staf — AI meneruskan, outlet menekan "Bicara dengan tim" / "Belum terselesaikan" setelah AI,
 *      AI tidak tersedia/gagal, atau darurat.
 * Dipanggil lewat after() setiap kali outlet membuat tiket, mengirim pesan, atau menekan tombol penilaian.
 * Bot diam bila staf (manusia) membalas di tiket itu dalam 2 jam terakhir, dan bisa dimatikan total dengan
 * env SUPPORT_AUTOREPLY=off. Tidak pernah melempar error ke pemanggil.
 */
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { outlets, supportMessages, supportThreads } from "@/db/schema";
import { aiAvailable, escalateWithNotify, runSupportBrain, type BrainInput } from "./brain";
import { botSenderName, botTierOf, pendingEscalation, shouldAutoReply, threadToTurns, type ThreadMsg } from "./autoreply-rules";
import { tier1Answer } from "./knowledge";
import { composeTier1Reply, detectIntent, isFeedbackEcho, isFrustrated, nameVar, nextTier, type Feedback } from "./tiers";
import { accountStatus, recordBotError, statusLine, type TicketCategory } from "@/lib/telegram/support-service";
import { enforcedPriority, isSupportHours, type SupportPriority } from "@/lib/telegram/support-rules";
import { botText } from "@/lib/telegram/bot-text";

export function autoReplyEnabled(): boolean {
  return (process.env.SUPPORT_AUTOREPLY ?? "on").toLowerCase() !== "off";
}

async function loadThread(threadId: string) {
  const [thread] = await db
    .select({ id: supportThreads.id, outletId: supportThreads.outletId, status: supportThreads.status, outletName: outlets.name, lang: outlets.preferredLang })
    .from(supportThreads)
    .innerJoin(outlets, eq(outlets.id, supportThreads.outletId))
    .where(eq(supportThreads.id, threadId))
    .limit(1);
  if (!thread) return null;
  const msgs = (await db
    .select({
      id: supportMessages.id,
      sender: supportMessages.sender,
      senderName: supportMessages.senderName,
      body: supportMessages.body,
      attachmentName: supportMessages.attachmentName,
      attachmentType: supportMessages.attachmentType,
      createdAt: supportMessages.createdAt,
    })
    .from(supportMessages)
    .where(eq(supportMessages.threadId, threadId))
    .orderBy(asc(supportMessages.createdAt))) as ThreadMsg[];
  return { thread, msgs };
}

type Outcome = { body: string; tier: "faq" | "ai" | "info"; escalated: SupportPriority | null; resolve?: boolean };

export async function autoReplySupportThread(threadId: string, opts: { feedback?: Feedback } = {}): Promise<void> {
  try {
    const loaded = await loadThread(threadId);
    if (!loaded) return;
    const { thread, msgs } = loaded;
    const gate = shouldAutoReply(msgs, Date.now(), autoReplyEnabled());
    if (!gate.ok) return;
    const answering = msgs[msgs.length - 1];
    const staffName = answering.senderName || "Staf";
    const lang = thread.lang;
    const name = nameVar(staffName, lang);
    const pending = pendingEscalation(msgs);
    const ref = threadId.slice(0, 8);
    const prevBot = [...msgs.slice(0, -1)].reverse().find((m) => m.sender === "platform_admin" && botTierOf(m.senderName));
    const prevTier = prevBot ? botTierOf(prevBot.senderName) : null;

    const base: Omit<BrainInput, "turns"> = {
      channel: "dashboard",
      outletId: thread.outletId,
      outletName: thread.outletName,
      staffName,
      lang,
      alreadyEscalated: pending ? { ref, priority: pending } : null,
      // Tiketnya sudah ada — "meneruskan" = menandai tiket ini perlu tim (lewat senderName balasan bot) + notifikasi.
      escalate: async () => ({ ref }),
    };

    const outletText = (n = 3) =>
      msgs
        .filter((m) => m.sender === "outlet" && !isFeedbackEcho(m.body))
        .slice(-n)
        .map((m) => m.body)
        .join(" / ");

    /** Tingkat 3: tandai tiket perlu staf (+ notifikasi petugas jaga sesuai prioritas). */
    const toTeam = async (tried: string, priority: SupportPriority, category: TicketCategory = "kendala_teknis"): Promise<Outcome> => {
      const p = enforcedPriority(priority, { text: outletText() });
      if (!pending) {
        const status = await accountStatus(thread.outletId).catch(() => null);
        await escalateWithNotify(base, { priority: p, category, summary: outletText().slice(0, 1000) || "Outlet minta bicara dengan staf", tried, accountStatus: status ? statusLine(status) : undefined });
      }
      const key = p === "P1" && !isSupportHours() ? "ticketUrgentAfterHours" : isSupportHours() ? "ticketInHours" : "ticketAfterHours";
      return { body: botText(lang, key, { ticket: ref }), tier: "info", escalated: pending ?? p };
    };

    /** Tingkat 2: AI (atau langsung ke staf bila AI tidak tersedia/gagal). */
    const toAi = async (tierNote?: string): Promise<Outcome> => {
      if (!aiAvailable()) return toTeam(tierNote ? "Jawaban FAQ sudah dicoba, belum terselesaikan." : "Belum ada di Jawaban Bot (FAQ).", tierNote ? "P2" : "P3");
      try {
        const result = await runSupportBrain({ ...base, turns: threadToTurns(msgs), tierNote });
        return { body: result.reply, tier: "ai", escalated: result.priority ?? pending };
      } catch (err) {
        await recordBotError("asisten AI · Customer Service", err);
        return toTeam("Asisten AI sedang gangguan — diteruskan otomatis.", "P2");
      }
    };

    const notResolved = (from: "faq" | "ai"): Promise<Outcome> =>
      nextTier(from) === "ai" && aiAvailable()
        ? toAi(
            'Outlet menekan "Belum terselesaikan" atas jawaban FAQ sebelumnya (tingkat 1). Jangan ulangi jawaban itu: periksa status_akun, tanyakan singkat di langkah mana gagal bila belum jelas, beri pendekatan lain; bila tetap buntu teruskan_ke_tim.'
          )
        : toTeam(from === "faq" ? "Jawaban FAQ sudah dicoba, belum terselesaikan." : 'Jawaban FAQ & asisten AI sudah dicoba, outlet menekan "Belum terselesaikan".', "P2");

    let out: Outcome;
    if (opts.feedback === "ok") {
      out = { body: botText(lang, "fbThanks", { name }), tier: "info", escalated: null, resolve: true };
    } else if (opts.feedback === "team") {
      out = await toTeam(`Outlet menekan "Bicara dengan tim" setelah jawaban ${prevTier === "faq" ? "FAQ" : "asisten"}.`, "P3", "lainnya");
    } else if (opts.feedback === "no") {
      out = await notResolved(prevTier === "faq" ? "faq" : "ai");
    } else {
      const text = answering.body.trim();
      const earlierOutlet = msgs.filter((m) => m.sender === "outlet" && !isFeedbackEcho(m.body)).length > 1;
      const hasAttachment = !!(answering.attachmentName || answering.attachmentType);
      const intent = text ? detectIntent(text) : "question";
      if (intent === "human") out = await toTeam("Outlet minta bicara dengan staf.", "P3", "lainnya");
      else if (intent === "is_bot") out = { body: botText(lang, "isBot", { name }), tier: "info", escalated: null };
      else if (intent === "greeting" && !earlierOutlet) out = { body: botText(lang, "greeting", { name, outlet: thread.outletName }), tier: "info", escalated: null };
      else if (intent === "thanks") out = { body: botText(lang, "thanks", { name }), tier: "info", escalated: null };
      else if (intent === "not_resolved" && (prevTier === "faq" || prevTier === "ai")) out = await notResolved(prevTier);
      else if (intent === "vague" && !earlierOutlet && !hasAttachment) out = { body: botText(lang, "clarify", { name }), tier: "info", escalated: null };
      else {
        // Tingkat 1 hanya untuk pertanyaan baru tanpa lampiran (FAQ tidak bisa melihat foto/konteks).
        const m = intent === "question" && !hasAttachment ? await tier1Answer(text, lang).catch(() => null) : null;
        out = m
          ? { body: composeTier1Reply(m, { name: staffName, frustrated: isFrustrated(text), seed: answering.id }), tier: "faq", escalated: pending }
          : await toAi();
      }
    }

    // Pesan baru masuk selama bot berpikir → biarkan pemicu pesan baru yang menjawab (tidak membalas dua kali).
    const fresh = await loadThread(threadId);
    const latest = fresh?.msgs[fresh.msgs.length - 1];
    if (!latest || latest.id !== answering.id) return;
    const now = new Date().toISOString();
    await db.insert(supportMessages).values({ threadId, sender: "platform_admin", senderName: botSenderName(out.escalated, out.tier), body: out.body });
    await db
      .update(supportThreads)
      .set({ lastMessageAt: now, ...(out.resolve && !pending ? { status: "resolved" as const } : {}) })
      .where(and(eq(supportThreads.id, threadId), eq(supportThreads.outletId, thread.outletId)));
  } catch (err) {
    console.error("Balas otomatis Customer Service gagal:", err);
  }
}
