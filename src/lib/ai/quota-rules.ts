/**
 * Kuota pemakaian AI per outlet — aturan murni (diuji di quota-rules.test.ts).
 *
 * Tujuan: biaya token Claude (COGS) per outlet tetap terkendali, baik outlet berbayar (Pro / AI
 * Add-on), masa percobaan, maupun Akses Gratis Selamanya. Tiga lapis batas:
 *  1. jumlah pertanyaan Asisten per hari & per bulan,
 *  2. jumlah "Generate Rekomendasi" per hari & per bulan (hasilnya juga di-cache, lihat insights.ts),
 *  3. anggaran token tertimbang per bulan (semua fitur AI outlet itu, termasuk bot Instagram).
 *
 * Token tertimbang = setara token input: input + cache_write×1,25 + cache_read×0,1 + output×5
 * (rasio harga Claude Haiku). Anggaran 3 juta ≈ US$3/bulan pada harga Haiku US$1/US$5 per juta
 * token — di bawah sepertiga harga AI Add-on. Nilai bisa diubah tanpa deploy ulang kode lewat env
 * AI_QUOTA (JSON parsial), mis. {"paid":{"assistantPerDay":60}}.
 *
 * Hari & bulan dihitung dalam tanggal lokal outlet (YYYY-MM-DD), reset otomatis saat berganti.
 */

export type AiKind = "assistant" | "recommendations" | "chatbot";
export type AiAccessTier = "paid" | "trial" | "free_forever" | "internal";

export interface AiLimits {
  assistantPerDay: number;
  assistantPerMonth: number;
  recommendationsPerDay: number;
  recommendationsPerMonth: number;
  /** Token tertimbang per bulan (lihat weightedTokens). */
  tokenBudgetPerMonth: number;
}

export const DEFAULT_AI_LIMITS: Record<AiAccessTier, AiLimits> = {
  paid: { assistantPerDay: 40, assistantPerMonth: 600, recommendationsPerDay: 5, recommendationsPerMonth: 60, tokenBudgetPerMonth: 3_000_000 },
  free_forever: { assistantPerDay: 20, assistantPerMonth: 300, recommendationsPerDay: 2, recommendationsPerMonth: 30, tokenBudgetPerMonth: 1_500_000 },
  trial: { assistantPerDay: 20, assistantPerMonth: 200, recommendationsPerDay: 3, recommendationsPerMonth: 20, tokenBudgetPerMonth: 1_500_000 },
  // Akun internal NEXBILL (superuser) — tetap dicatat, batasnya longgar.
  internal: { assistantPerDay: 500, assistantPerMonth: 10_000, recommendationsPerDay: 100, recommendationsPerMonth: 2_000, tokenBudgetPerMonth: 100_000_000 },
};

/** Sisa anggaran minimum sebelum satu pertanyaan Asisten boleh dimulai (≈ 1 pertanyaan dengan tool). */
export const MIN_TOKENS_TO_START = 20_000;

export interface AiUsage {
  /** YYYY-MM lokal outlet */
  month: string;
  /** YYYY-MM-DD lokal outlet */
  day: string;
  assistantDay: number;
  assistantMonth: number;
  recommendationsDay: number;
  recommendationsMonth: number;
  chatbotMonth: number;
  /** Token tertimbang bulan ini. */
  tokensMonth: number;
  inputTokensMonth: number;
  outputTokensMonth: number;
}

export function emptyUsage(day: string): AiUsage {
  return {
    month: day.slice(0, 7),
    day,
    assistantDay: 0,
    assistantMonth: 0,
    recommendationsDay: 0,
    recommendationsMonth: 0,
    chatbotMonth: 0,
    tokensMonth: 0,
    inputTokensMonth: 0,
    outputTokensMonth: 0,
  };
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);

/** Baca payload tersimpan (JSON) dengan aman lalu reset hitungan bila hari/bulan berganti. */
export function parseUsage(raw: string | null | undefined, today: string): AiUsage {
  let u: Partial<AiUsage> = {};
  try {
    u = raw ? (JSON.parse(raw) as Partial<AiUsage>) : {};
  } catch {
    u = {};
  }
  return rollUsage(
    {
      month: typeof u.month === "string" ? u.month : today.slice(0, 7),
      day: typeof u.day === "string" ? u.day : today,
      assistantDay: num(u.assistantDay),
      assistantMonth: num(u.assistantMonth),
      recommendationsDay: num(u.recommendationsDay),
      recommendationsMonth: num(u.recommendationsMonth),
      chatbotMonth: num(u.chatbotMonth),
      tokensMonth: num(u.tokensMonth),
      inputTokensMonth: num(u.inputTokensMonth),
      outputTokensMonth: num(u.outputTokensMonth),
    },
    today
  );
}

export function rollUsage(u: AiUsage, today: string): AiUsage {
  const month = today.slice(0, 7);
  if (u.month !== month) return emptyUsage(today);
  if (u.day !== today) return { ...u, day: today, assistantDay: 0, recommendationsDay: 0 };
  return u;
}

export function weightedTokens(t: { input: number; output: number; cacheRead: number; cacheWrite: number }): number {
  return Math.round(t.input + t.cacheWrite * 1.25 + t.cacheRead * 0.1 + t.output * 5);
}

export type QuotaBlock = "daily" | "monthly" | "tokens";

export type QuotaCheck = { ok: true } | { ok: false; reason: QuotaBlock; limit: number; used: number };

export function checkQuota(u: AiUsage, limits: AiLimits, kind: AiKind): QuotaCheck {
  const remainingTokens = limits.tokenBudgetPerMonth - u.tokensMonth;
  if (kind === "chatbot") {
    return remainingTokens > 0 ? { ok: true } : { ok: false, reason: "tokens", limit: limits.tokenBudgetPerMonth, used: u.tokensMonth };
  }
  const [dayUsed, dayLimit, monthUsed, monthLimit] =
    kind === "assistant"
      ? [u.assistantDay, limits.assistantPerDay, u.assistantMonth, limits.assistantPerMonth]
      : [u.recommendationsDay, limits.recommendationsPerDay, u.recommendationsMonth, limits.recommendationsPerMonth];
  if (monthUsed >= monthLimit) return { ok: false, reason: "monthly", limit: monthLimit, used: monthUsed };
  if (dayUsed >= dayLimit) return { ok: false, reason: "daily", limit: dayLimit, used: dayUsed };
  if (remainingTokens < MIN_TOKENS_TO_START) return { ok: false, reason: "tokens", limit: limits.tokenBudgetPerMonth, used: u.tokensMonth };
  return { ok: true };
}

/** Catat satu permintaan (dipanggil sebelum memanggil AI, supaya klik beruntun tetap terhitung). */
export function countRequest(u: AiUsage, kind: AiKind): AiUsage {
  if (kind === "assistant") return { ...u, assistantDay: u.assistantDay + 1, assistantMonth: u.assistantMonth + 1 };
  if (kind === "recommendations") return { ...u, recommendationsDay: u.recommendationsDay + 1, recommendationsMonth: u.recommendationsMonth + 1 };
  return { ...u, chatbotMonth: u.chatbotMonth + 1 };
}

export function addTokens(u: AiUsage, t: { input: number; output: number; cacheRead: number; cacheWrite: number }): AiUsage {
  return {
    ...u,
    tokensMonth: u.tokensMonth + weightedTokens(t),
    inputTokensMonth: u.inputTokensMonth + t.input + t.cacheRead + t.cacheWrite,
    outputTokensMonth: u.outputTokensMonth + t.output,
  };
}

export function accessTierFor(status: string | null | undefined, role?: string | null): AiAccessTier {
  if (role === "superuser") return "internal";
  if (status === "trial") return "trial";
  if (status === "free_forever") return "free_forever";
  return "paid";
}

/** Gabungkan batas bawaan dengan override env AI_QUOTA (JSON parsial). Nilai tidak valid diabaikan. */
export function resolveLimits(tier: AiAccessTier, overrideJson?: string | null): AiLimits {
  const base = { ...DEFAULT_AI_LIMITS[tier] };
  if (!overrideJson) return base;
  try {
    const o = JSON.parse(overrideJson) as Partial<Record<AiAccessTier, Partial<AiLimits>>>;
    const patch = o?.[tier];
    if (patch && typeof patch === "object") {
      for (const k of Object.keys(base) as (keyof AiLimits)[]) {
        const v = patch[k];
        if (typeof v === "number" && Number.isFinite(v) && v >= 0) base[k] = Math.floor(v);
      }
    }
  } catch {
    // abaikan JSON rusak — tetap pakai bawaan
  }
  return base;
}

/** Ringkasan untuk UI (meter kuota di halaman AI). */
export function usageSummary(u: AiUsage, limits: AiLimits, tier: AiAccessTier) {
  return {
    tier,
    month: u.month,
    day: u.day,
    assistant: { day: u.assistantDay, dayLimit: limits.assistantPerDay, month: u.assistantMonth, monthLimit: limits.assistantPerMonth },
    recommendations: { day: u.recommendationsDay, dayLimit: limits.recommendationsPerDay, month: u.recommendationsMonth, monthLimit: limits.recommendationsPerMonth },
    tokens: {
      used: u.tokensMonth,
      budget: limits.tokenBudgetPerMonth,
      pct: limits.tokenBudgetPerMonth > 0 ? Math.min(100, Math.round((u.tokensMonth / limits.tokenBudgetPerMonth) * 100)) : 100,
    },
  };
}

export type AiUsageSummary = ReturnType<typeof usageSummary>;

/** Potong teks panjang (hasil tool / pesan) supaya input token tidak membengkak. */
export function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…[dipotong ${text.length - max} karakter]`;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/**
 * Rapikan riwayat chat dari klien: buang pesan kosong/aneh, buang pesan asisten di awal (sapaan UI —
 * API mewajibkan pesan pertama dari user), gabungkan peran yang berurutan, ambil N giliran terakhir,
 * dan potong tiap pesan. Klien bisa mengirim riwayat sepanjang apa pun; server yang menentukan.
 */
export function trimHistory(raw: unknown, opts: { maxTurns?: number; maxChars?: number; maxLastChars?: number } = {}): ChatTurn[] {
  const maxTurns = opts.maxTurns ?? 10;
  const maxChars = opts.maxChars ?? 1500;
  const maxLast = opts.maxLastChars ?? 1000;
  if (!Array.isArray(raw)) return [];
  const clean: ChatTurn[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") continue;
    const role = (m as { role?: unknown }).role;
    const content = (m as { content?: unknown }).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string" || !content.trim()) continue;
    const prev = clean[clean.length - 1];
    if (prev && prev.role === role) prev.content = `${prev.content}\n${content.trim()}`;
    else clean.push({ role, content: content.trim() });
  }
  let out = clean.slice(-maxTurns);
  while (out.length && out[0].role !== "user") out = out.slice(1);
  if (!out.length || out[out.length - 1].role !== "user") return [];
  return out.map((m, i) => ({ role: m.role, content: clip(m.content, i === out.length - 1 ? maxLast : maxChars) }));
}
