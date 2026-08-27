import Anthropic from "@anthropic-ai/sdk";
import type { LangCode } from "@/lib/i18n/registry";
import { LANG_OPTIONS } from "@/lib/i18n/registry";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Translation support for /platform-admin/support: NEXBILL ops always draft their reply in
 * Bahasa Indonesia, then this translates it into whichever language the outlet declared as its
 * preferredLang (Settings > Business & Tax) — see outlets.preferredLang in schema.ts. Kept as its
 * own tiny helper rather than reusing assistant.ts/agent.ts, since this has nothing to do with
 * the business-data tool-calling loop those files run — it's a single stateless text-in/text-out
 * call, same bare `new Anthropic(...)` + "claude-sonnet-5" pattern the rest of lib/ai/* already
 * uses (no shared client wrapper exists in this codebase yet).
 */
export async function translateReply(text: string, targetLang: LangCode): Promise<string> {
  if (targetLang === "id") return text;
  const label = LANG_OPTIONS.find((l) => l.code === targetLang)?.label ?? targetLang;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    system: `Kamu adalah penerjemah untuk tim customer support NEXBILL (SaaS POS/rental Asia Tenggara). Terjemahkan pesan balasan support dari Bahasa Indonesia ke ${label}. Pertahankan nada profesional dan ramah, pertahankan format (baris baru, angka, nama produk/fitur, kode/istilah teknis seperti nama menu atau kode error tetap apa adanya). Balas HANYA dengan hasil terjemahan, tanpa basa-basi, tanpa tanda kutip, tanpa penjelasan tambahan.`,
    messages: [{ role: "user", content: text }],
  });

  const textBlock = response.content.find((c): c is Anthropic.TextBlock => c.type === "text");
  return textBlock?.text?.trim() || text;
}
