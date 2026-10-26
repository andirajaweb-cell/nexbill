/**
 * Balas otomatis tiket Customer Service (dashboard) 24/7. Dipanggil lewat after() setiap kali outlet
 * membuat tiket atau mengirim pesan (api/support-chat). Bot diam bila tim (manusia) membalas di tiket
 * itu dalam 2 jam terakhir, dan bisa dimatikan total dengan env SUPPORT_AUTOREPLY=off.
 * Tidak pernah melempar error ke pemanggil — kegagalan hanya dicatat dan tiket tetap "perlu saya".
 */
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { outlets, supportMessages, supportThreads } from "@/db/schema";
import { escalateWithNotify, runSupportBrain, type BrainInput } from "./brain";
import { botSenderName, pendingEscalation, shouldAutoReply, threadToTurns, type ThreadMsg } from "./autoreply-rules";
import { accountStatus, statusLine } from "@/lib/telegram/support-service";
import { enforcedPriority } from "@/lib/telegram/support-rules";

export function autoReplyEnabled(): boolean {
  return (process.env.SUPPORT_AUTOREPLY ?? "on").toLowerCase() !== "off" && !!process.env.ANTHROPIC_API_KEY;
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

async function postBotMessage(threadId: string, outletId: string, body: string, escalated: Parameters<typeof botSenderName>[0]) {
  const now = new Date().toISOString();
  await db.insert(supportMessages).values({ threadId, sender: "platform_admin", senderName: botSenderName(escalated), body });
  await db.update(supportThreads).set({ lastMessageAt: now }).where(and(eq(supportThreads.id, threadId), eq(supportThreads.outletId, outletId)));
}

export async function autoReplySupportThread(threadId: string): Promise<void> {
  try {
    const loaded = await loadThread(threadId);
    if (!loaded) return;
    const { thread, msgs } = loaded;
    const gate = shouldAutoReply(msgs, Date.now(), autoReplyEnabled());
    if (!gate.ok) return;
    const answering = msgs[msgs.length - 1];
    const staffName = answering.senderName || "Staf";
    const pending = pendingEscalation(msgs);
    const ref = threadId.slice(0, 8);

    const base: Omit<BrainInput, "turns"> = {
      channel: "dashboard",
      outletId: thread.outletId,
      outletName: thread.outletName,
      staffName,
      lang: thread.lang,
      alreadyEscalated: pending ? { ref, priority: pending } : null,
      // Tiketnya sudah ada — "meneruskan" = menandai tiket ini perlu tim (lewat senderName balasan bot) + notifikasi.
      escalate: async () => ({ ref }),
    };

    let reply: string;
    let escalated = pending;
    try {
      const result = await runSupportBrain({ ...base, turns: threadToTurns(msgs) });
      reply = result.reply;
      if (result.priority) escalated = result.priority;
    } catch (err) {
      console.error("Bot Customer Service gagal menjawab:", err);
      const text = msgs.filter((m) => m.sender === "outlet").slice(-3).map((m) => m.body).join(" / ");
      const priority = enforcedPriority("P2", { text });
      if (!pending) {
        const status = await accountStatus(thread.outletId).catch(() => null);
        await escalateWithNotify(base, { priority, category: "kendala_teknis", summary: text.slice(0, 1000) || "Pesan tanpa teks", tried: "Bot AI gagal menjawab — diteruskan otomatis.", accountStatus: status ? statusLine(status) : undefined });
      }
      escalated = pending ?? priority;
      reply = "Pesanmu sudah kami terima dan diteruskan ke tim NEXBILL. Balasan tim akan muncul di tiket ini.";
    }

    // Pesan baru masuk selama bot berpikir → biarkan pemicu pesan baru yang menjawab (tidak membalas dua kali).
    const fresh = await loadThread(threadId);
    const latest = fresh?.msgs[fresh.msgs.length - 1];
    if (!latest || latest.id !== answering.id) return;
    await postBotMessage(threadId, thread.outletId, reply, escalated);
  } catch (err) {
    console.error("Balas otomatis Customer Service gagal:", err);
  }
}
