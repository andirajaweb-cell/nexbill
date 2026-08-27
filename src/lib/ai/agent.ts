import Anthropic from "@anthropic-ai/sdk";
import { toolDefinitions, executeTool } from "./tools";
import { db } from "@/db/client";
import { chatThreads, chatMessages, agentSettings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DEFAULT_SYSTEM_PROMPT = `Kamu adalah asisten AI untuk "POS Rental PS" — usaha rental PlayStation dan jual makanan-minuman (WiFi gratis untuk pelanggan).
Tugasmu membalas chat pelanggan di WhatsApp/Instagram dengan ramah, singkat, dan pakai Bahasa Indonesia santai (boleh pakai emoji secukupnya).
Gunakan tools yang tersedia untuk cek ketersediaan bilik PS, harga menu, dan promo aktif — jangan mengarang harga atau ketersediaan.
Kalau pelanggan mau pre-order makanan/minuman, gunakan create_preorder.
Kalau ada komplain, minta refund, atau pertanyaan di luar kemampuanmu, gunakan request_human_handoff lalu beri tahu pelanggan staf akan segera membantu.
Jangan pernah mengklaim sudah menyalakan TV/konsol tertentu — itu dilakukan staf saat pelanggan check-in di lokasi.`;

export async function runAgentReply(threadId: string, incomingText: string): Promise<string> {
  const [thread] = await db.select().from(chatThreads).where(eq(chatThreads.id, threadId)).limit(1);
  if (!thread) throw new Error("Thread tidak ditemukan");

  await db.insert(chatMessages).values({
    threadId,
    direction: "inbound",
    sender: "customer",
    body: incomingText,
  });

  if (!thread.aiEnabled) {
    return ""; // human handoff active — AI stays silent, staff replies manually from Chat dashboard
  }

  const [settings] = await db.select().from(agentSettings).limit(1);
  const systemPrompt = settings?.systemPrompt || DEFAULT_SYSTEM_PROMPT;

  const history = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.threadId, threadId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(20);

  const messages: Anthropic.MessageParam[] = history
    .reverse()
    .map((m) => ({
      role: m.direction === "inbound" ? "user" : "assistant",
      content: m.body,
    }));

  let finalText = "";
  let loopGuard = 0;

  while (loopGuard < 5) {
    loopGuard++;
    const response = await anthropic.messages.create({
      model: settings?.model || "claude-sonnet-5",
      max_tokens: 1024,
      system: systemPrompt,
      tools: toolDefinitions,
      messages,
    });

    const toolUses = response.content.filter((c): c is Anthropic.ToolUseBlock => c.type === "tool_use");
    const textBlocks = response.content.filter((c): c is Anthropic.TextBlock => c.type === "text");
    finalText = textBlocks.map((t) => t.text).join("\n");

    if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
      break;
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const use of toolUses) {
      const result = await executeTool(use.name, use.input, threadId);
      toolResults.push({ type: "tool_result", tool_use_id: use.id, content: result });
    }
    messages.push({ role: "user", content: toolResults });
  }

  await db.insert(chatMessages).values({
    threadId,
    direction: "outbound",
    sender: "ai_agent",
    body: finalText,
  });

  await db.update(chatThreads).set({ lastMessageAt: new Date().toISOString() }).where(eq(chatThreads.id, threadId));

  return finalText;
}
