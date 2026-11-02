import Anthropic from "@anthropic-ai/sdk";

/**
 * Pilihan model & klien Anthropic bersama untuk fitur AI dashboard (Business Assistant, Insights,
 * bot Instagram, terjemahan support).
 *
 * Model ditentukan platform (env), BUKAN per outlet: biaya token adalah COGS NEXBILL, jadi outlet
 * tidak bisa memilih model mahal sendiri. Bawaan Claude Haiku — cukup untuk tanya-jawab data +
 * tool, jauh lebih murah dari model besar.
 *
 * Bug lama: kode memakai "claude-sonnet-5" (juga default kolom agent_settings.model). Bila id model
 * itu tidak dikenali API, setiap pertanyaan gagal 404 → "Maaf, ada error". createMessage() kini
 * mencoba ulang sekali dengan model cadangan saat model tidak ditemukan.
 */
export const AI_FALLBACK_MODEL = "claude-haiku-5-5";
export const AI_ASSISTANT_MODEL = process.env.AI_ASSISTANT_MODEL || AI_FALLBACK_MODEL;
export const AI_INSIGHTS_MODEL = process.env.AI_INSIGHTS_MODEL || AI_ASSISTANT_MODEL;
export const AI_CHATBOT_MODEL = process.env.AI_CHATBOT_MODEL || AI_ASSISTANT_MODEL;
export const AI_TRANSLATE_MODEL = process.env.AI_TRANSLATE_MODEL || AI_ASSISTANT_MODEL;

let client: Anthropic | null = null;
export function anthropicClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export function aiConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/** True bila error API berarti "model tidak dikenal" (404 not_found / invalid model). */
export function isModelNotFound(err: unknown): boolean {
  const e = err as { status?: number; error?: { error?: { type?: string; message?: string } }; message?: string } | null;
  if (!e) return false;
  const msg = `${e.error?.error?.message ?? ""} ${e.message ?? ""}`.toLowerCase();
  if (e.status === 404) return true;
  return e.status === 400 && msg.includes("model");
}

/** Token terpakai satu panggilan (untuk kuota COGS). */
export interface AiTokenUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

export const ZERO_USAGE: AiTokenUsage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };

export function usageOf(res: Anthropic.Message): AiTokenUsage {
  const u = res.usage;
  return {
    input: u?.input_tokens ?? 0,
    output: u?.output_tokens ?? 0,
    cacheRead: u?.cache_read_input_tokens ?? 0,
    cacheWrite: u?.cache_creation_input_tokens ?? 0,
  };
}

export function addUsage(a: AiTokenUsage, b: AiTokenUsage): AiTokenUsage {
  return { input: a.input + b.input, output: a.output + b.output, cacheRead: a.cacheRead + b.cacheRead, cacheWrite: a.cacheWrite + b.cacheWrite };
}

/** messages.create dengan satu kali coba ulang ke model cadangan bila model tidak ditemukan. */
export async function createMessage(params: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message> {
  const api = anthropicClient();
  try {
    return await api.messages.create(params);
  } catch (err) {
    if (params.model !== AI_FALLBACK_MODEL && isModelNotFound(err)) {
      console.warn(`[ai] model "${params.model}" tidak dikenali, memakai ${AI_FALLBACK_MODEL}.`);
      return api.messages.create({ ...params, model: AI_FALLBACK_MODEL });
    }
    throw err;
  }
}

export function textOf(res: Anthropic.Message): string {
  return res.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("\n")
    .trim();
}
