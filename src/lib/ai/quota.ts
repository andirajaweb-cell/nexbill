import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { activitySyncState } from "@/db/schema";
import { outletDateYmd } from "@/lib/time/outlet-time";
import { isMissingRelation } from "@/lib/activity-calendar/http";
import { getOrCreateSubscription } from "@/lib/subscription/service";
import {
  accessTierFor,
  addTokens,
  checkQuota,
  countRequest,
  emptyUsage,
  parseUsage,
  resolveLimits,
  usageSummary,
  type AiAccessTier,
  type AiKind,
  type AiLimits,
  type AiUsage,
  type QuotaBlock,
} from "./quota-rules";
import type { AiTokenUsage } from "./models";

/**
 * Penyimpanan kuota AI per outlet — tanpa migrasi baru: satu baris per outlet di tabel
 * activity_sync_state (migrasi 0039) dengan key "ai-usage:<outletId>" dan payload JSON AiUsage.
 * Bila tabel belum ada (0039 belum dijalankan), hitungan disimpan di memori proses sebagai cadangan
 * supaya batas tetap berlaku sementara.
 */
const keyOf = (outletId: string) => `ai-usage:${outletId}`;
const memory = new Map<string, string>();

export class AiQuotaError extends Error {
  status = 429;
  code = "ai_quota" as const;
  constructor(
    public reason: QuotaBlock,
    public limit: number,
    public used: number,
    public tier: AiAccessTier
  ) {
    super(
      reason === "daily"
        ? `Batas harian AI outlet ini sudah tercapai (${used}/${limit}). Coba lagi besok.`
        : reason === "monthly"
          ? `Batas bulanan AI outlet ini sudah tercapai (${used}/${limit}). Kuota terisi lagi awal bulan depan.`
          : "Anggaran token AI bulan ini untuk outlet ini sudah habis. Kuota terisi lagi awal bulan depan."
    );
  }
}

function today(): string {
  return outletDateYmd(new Date());
}

async function readRaw(outletId: string): Promise<string | null> {
  try {
    const [row] = await db.select({ payload: activitySyncState.payload }).from(activitySyncState).where(eq(activitySyncState.key, keyOf(outletId))).limit(1);
    return row?.payload ?? null;
  } catch (err) {
    if (!isMissingRelation(err)) throw err;
    return memory.get(outletId) ?? null;
  }
}

async function writeUsage(outletId: string, u: AiUsage): Promise<void> {
  const payload = JSON.stringify(u);
  const now = new Date().toISOString();
  try {
    await db
      .insert(activitySyncState)
      .values({ key: keyOf(outletId), payload, lastSuccessAt: now, updatedAt: now })
      .onConflictDoUpdate({ target: activitySyncState.key, set: { payload, lastSuccessAt: now, updatedAt: now } });
  } catch (err) {
    if (!isMissingRelation(err)) throw err;
    memory.set(outletId, payload);
  }
}

export async function loadAiUsage(outletId: string): Promise<AiUsage> {
  return parseUsage(await readRaw(outletId), today());
}

async function contextFor(outletId: string, role?: string | null): Promise<{ tier: AiAccessTier; limits: AiLimits }> {
  const sub = await getOrCreateSubscription(outletId);
  const tier = accessTierFor(sub.status, role);
  return { tier, limits: resolveLimits(tier, process.env.AI_QUOTA) };
}

/**
 * Cek kuota lalu langsung hitung satu permintaan (sebelum memanggil Claude). Lempar AiQuotaError
 * (HTTP 429) bila batas tercapai. Panggil SETELAH assertAiRoleAllowed/assertAiAllowed.
 */
export async function reserveAiCall(outletId: string, kind: AiKind, role?: string | null): Promise<{ tier: AiAccessTier; limits: AiLimits }> {
  const ctx = await contextFor(outletId, role);
  const usage = await loadAiUsage(outletId);
  const check = checkQuota(usage, ctx.limits, kind);
  if (!check.ok) throw new AiQuotaError(check.reason, check.limit, check.used, ctx.tier);
  await writeUsage(outletId, countRequest(usage, kind));
  return ctx;
}

/** Tambahkan token yang benar-benar terpakai (dipanggil setelah respons Claude, juga saat gagal sebagian). */
export async function recordAiTokens(outletId: string, tokens: AiTokenUsage): Promise<void> {
  if (!tokens.input && !tokens.output && !tokens.cacheRead && !tokens.cacheWrite) return;
  try {
    const usage = await loadAiUsage(outletId);
    await writeUsage(outletId, addTokens(usage, tokens));
  } catch (err) {
    console.warn("[ai-quota] gagal mencatat token:", err instanceof Error ? err.message : err);
  }
}

/** Untuk UI meter kuota. */
export async function getAiUsageSummary(outletId: string, role?: string | null) {
  const ctx = await contextFor(outletId, role);
  const usage = await loadAiUsage(outletId).catch(() => emptyUsage(today()));
  return usageSummary(usage, ctx.limits, ctx.tier);
}
