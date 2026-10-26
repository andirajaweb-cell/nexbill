import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { supportThreads, supportMessages, outlets } from "@/db/schema";
import { eq, desc, asc, inArray } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";
import { isBotSender, needsHuman } from "@/lib/support-bot/autoreply-rules";
import { autoReplyEnabled } from "@/lib/support-bot/dashboard-autoreply";

/**
 * Cross-tenant inbox — every outlet's support tickets, joined with the outlet name, newest first. Gated by requirePlatformAdmin, a wholly separate auth system from outlet staff sessions.
 * Tiap tiket terbuka diberi `needsHuman` (+ prioritas penerusan bot) supaya admin tunggal cukup melihat
 * filter "Perlu saya"; `botReplies` = jumlah balasan bot di tiket itu.
 */
export async function GET() {
  try {
    await requirePlatformAdmin();
    const rows = await db
      .select({
        id: supportThreads.id,
        outletId: supportThreads.outletId,
        outletName: outlets.name,
        outletPreferredLang: outlets.preferredLang,
        subject: supportThreads.subject,
        category: supportThreads.category,
        status: supportThreads.status,
        lastMessageAt: supportThreads.lastMessageAt,
        createdAt: supportThreads.createdAt,
      })
      .from(supportThreads)
      .innerJoin(outlets, eq(supportThreads.outletId, outlets.id))
      .orderBy(desc(supportThreads.lastMessageAt), desc(supportThreads.createdAt));

    const openIds = rows.filter((r) => r.status === "open").map((r) => r.id);
    const byThread = new Map<string, { sender: "outlet" | "platform_admin"; senderName: string | null }[]>();
    if (openIds.length > 0) {
      const msgs = await db
        .select({ threadId: supportMessages.threadId, sender: supportMessages.sender, senderName: supportMessages.senderName })
        .from(supportMessages)
        .where(inArray(supportMessages.threadId, openIds))
        .orderBy(asc(supportMessages.createdAt));
      for (const m of msgs) {
        if (!byThread.has(m.threadId)) byThread.set(m.threadId, []);
        byThread.get(m.threadId)!.push(m);
      }
    }
    const autoReply = autoReplyEnabled();
    return NextResponse.json(
      rows.map((r) => {
        const msgs = byThread.get(r.id) ?? [];
        const h = needsHuman(msgs, r.status);
        return { ...r, needsHuman: h.needs, escalatedPriority: h.priority, botReplies: msgs.filter((m) => m.sender === "platform_admin" && isBotSender(m.senderName)).length, autoReply };
      })
    );
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
