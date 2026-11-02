import Anthropic from "@anthropic-ai/sdk";
import { toolDefinitions, executeTool, agentOutletId } from "./tools";
import { db } from "@/db/client";
import { chatThreads, chatMessages, agentSettings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { AI_CHATBOT_MODEL, addUsage, createMessage, usageOf, ZERO_USAGE, type AiTokenUsage } from "./models";
import { loadAiUsage, recordAiTokens } from "./quota";
import { checkQuota, resolveLimits, accessTierFor } from "./quota-rules";
import { assertAiAllowed, getOrCreateSubscription } from "@/lib/subscription/service";

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

  // Bot Instagram ini satu outlet (env IG_AGENT_OUTLET_ID, cadangan: outlet pertama). Dulu tool-nya
  // membaca unit/menu/promo SEMUA outlet dan pengaturan agent outlet mana saja.
  const outletId = await agentOutletId();
  if (!outletId) return "";
  const [settings] = await db.select().from(agentSettings).where(eq(agentSettings.outletId, outletId)).limit(1);
  const systemPrompt = settings?.systemPrompt || DEFAULT_SYSTEM_PROMPT;

  // Hak AI sama dengan dashboard (trial / Pro / AI Add-on / Akses Gratis Selamanya).
  try {
    await assertAiAllowed(outletId);
  } catch {
    return "";
  }
  // Anggaran token AI bulanan outlet (COGS) — bila habis, bot diam dan staf membalas dari dashboard.
  const sub = await getOrCreateSubscription(outletId);
  if (!checkQuota(await loadAiUsage(outletId), resolveLimits(accessTierFor(sub.status), process.env.AI_QUOTA), "chatbot").ok) return "";

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

  // Riwayat 20 pesan terakhir; pesan pertama wajib dari user (API menolak bila diawali asisten).
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length) return "";

  let finalText = "";
  let loopGuard = 0;
  let usage: AiTokenUsage = ZERO_USAGE;

  while (loopGuard < 4) {
    loopGuard++;
    const response = await createMessage({
      // Model ditentukan platform (COGS), bukan agent_settings.model.
      model: AI_CHATBOT_MODEL,
      max_tokens: 600,
      system: systemPrompt,
      tools: toolDefinitions,
      messages,
    });

    usage = addUsage(usage, usageOf(response));
    const toolUses = response.content.filter((c): c is Anthropic.ToolUseBlock => c.type === "tool_use");
    const textBlocks = response.content.filter((c): c is Anthropic.TextBlock => c.type === "text");
    finalText = textBlocks.map((t) => t.text).join("\n");

    if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
      break;
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const use of toolUses) {
      const result = await executeTool(use.name, use.input, threadId, outletId);
      toolResults.push({ type: "tool_result", tool_use_id: use.id, content: result });
    }
    messages.push({ role: "user", content: toolResults });
  }

  await recordAiTokens(outletId, usage);
  if (!finalText) return "";

  await db.insert(chatMessages).values({
    threadId,
    direction: "outbound",
    sender: "ai_agent",
    body: finalText,
  });

  await db.update(chatThreads).set({ lastMessageAt: new Date().toISOString() }).where(eq(chatThreads.id, threadId));

  return finalText;
}
