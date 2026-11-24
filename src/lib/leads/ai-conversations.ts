/**
 * Pencatatan riwayat percakapan AI (tabel ai_conversations & ai_messages, migrasi 0041) untuk chatbot
 * WhatsApp. Satu sesi per nomor (status active). Kegagalan pencatatan TIDAK boleh menghentikan balasan
 * ke prospek, jadi semua error ditelan dan hanya dicatat ke console.
 */
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { aiConversations, aiMessages } from "@/db/schema";

export type AiRole = "user" | "assistant" | "system";

async function conversationFor(phone: string, leadId: string | null): Promise<string> {
  const [open] = await db
    .select({ id: aiConversations.id })
    .from(aiConversations)
    .where(and(eq(aiConversations.phone, phone), eq(aiConversations.status, "active")))
    .orderBy(desc(aiConversations.updatedAt))
    .limit(1);
  const now = new Date().toISOString();
  if (open) {
    await db.update(aiConversations).set({ updatedAt: now, ...(leadId ? { leadId } : {}) }).where(eq(aiConversations.id, open.id));
    return open.id;
  }
  const [created] = await db
    .insert(aiConversations)
    .values({ channel: "whatsapp", phone, leadId, status: "active", createdAt: now, updatedAt: now })
    .returning({ id: aiConversations.id });
  return created.id;
}

/** Catat satu pesan (user = prospek, assistant = balasan bot). Tidak melempar error. */
export async function logAiMessage(input: {
  phone: string;
  leadId: string | null;
  role: AiRole;
  content: string;
  agentName?: string | null;
  intent?: string | null;
}): Promise<void> {
  try {
    const conversationId = await conversationFor(input.phone, input.leadId);
    await db.insert(aiMessages).values({
      conversationId,
      role: input.role,
      content: input.content.slice(0, 4000),
      agentName: input.agentName ?? null,
      intent: input.intent ?? null,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("ai_messages: gagal mencatat pesan —", (err as Error)?.message ?? err);
  }
}
