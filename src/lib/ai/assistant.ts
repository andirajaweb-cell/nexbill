import Anthropic from "@anthropic-ai/sdk";
import { businessToolDefinitions, executeBusinessTool } from "./business-tools";
import { db } from "@/db/client";
import { agentSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = (outletName: string, todayIso: string) => `Kamu adalah Business Assistant internal untuk pemilik/manajer usaha "${outletName}" (rental PlayStation + F&B).
Tugasmu menjawab pertanyaan pemilik/staf tentang kondisi bisnis mereka — penjualan, rental, biaya, laba rugi, arus kas, neraca, inventori, pelanggan, dan aset — menggunakan tools yang tersedia. JANGAN mengarang angka; selalu panggil tool yang relevan untuk mengambil data asli sebelum menjawab.
Hari ini tanggal ${todayIso}. Kalau user bilang "bulan ini", "minggu ini", "hari ini", "6 bulan terakhir", dst, hitung tanggal from/to yang sesuai sebelum memanggil tool.
Jawab dalam Bahasa Indonesia, ringkas dan langsung ke angka/insight yang relevan — pakai format Rupiah (Rp) dengan pemisah ribuan. Kalau relevan, beri 1-2 kalimat insight/rekomendasi singkat, tapi jangan berlebihan.
Kalau pertanyaan di luar data bisnis (rental/POS/accounting/expense/asset/customer), jawab sewajarnya sebagai asisten yang membantu.`;

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Stateless per-turn business assistant: caller (the API route) keeps the
 * full conversation in `messages` (last item = the newest user message) and
 * gets back the assistant's reply text plus which tools it called, purely
 * for a "sedang mengecek: ..." transparency line in the UI. No DB table for
 * conversation history — this is a dashboard chat for staff, not a customer
 * thread like chatThreads/chatMessages (the WA/IG bot's tables).
 */
export async function runBusinessAssistant(outletId: string, outletName: string, messages: AssistantMessage[]) {
  const [settings] = await db.select().from(agentSettings).where(eq(agentSettings.outletId, outletId)).limit(1);
  const todayIso = new Date().toISOString().slice(0, 10);

  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({ role: m.role, content: m.content }));
  const toolsCalled: string[] = [];

  let finalText = "";
  let loopGuard = 0;

  while (loopGuard < 6) {
    loopGuard++;
    const response = await anthropic.messages.create({
      model: settings?.model || "claude-sonnet-5",
      max_tokens: 1536,
      system: SYSTEM_PROMPT(outletName, todayIso),
      tools: businessToolDefinitions,
      messages: anthropicMessages,
    });

    const toolUses = response.content.filter((c): c is Anthropic.ToolUseBlock => c.type === "tool_use");
    const textBlocks = response.content.filter((c): c is Anthropic.TextBlock => c.type === "text");
    finalText = textBlocks.map((t) => t.text).join("\n");

    if (response.stop_reason !== "tool_use" || toolUses.length === 0) break;

    anthropicMessages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const use of toolUses) {
      toolsCalled.push(use.name);
      const result = await executeBusinessTool(use.name, use.input, outletId);
      toolResults.push({ type: "tool_result", tool_use_id: use.id, content: result });
    }
    anthropicMessages.push({ role: "user", content: toolResults });
  }

  return { reply: finalText || "Maaf, aku belum bisa menjawab itu.", toolsCalled };
}
