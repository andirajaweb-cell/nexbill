import { and, desc, eq, gte, inArray, like } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLogs, offlineSyncActions } from "@/db/schema";
import { TV_DEVICE_PREFIX, TV_STAFF_TEST_KIND } from "./tv-session-rules";

/**
 * Pengawasan NEXBILL TV untuk owner (kartu di halaman Rental):
 *  - aksi sesi dari TV yang DITOLAK server (sesi dimainkan tapi belum tertagih) sampai ditandai ditinjau;
 *  - mode staf / tes 10 menit yang dibuka di TV (tidak ditagih).
 * Data dari offline_sync_actions (migrasi 0032) — tanpa migrasi baru.
 */

export const TV_WATCH_DAYS = 14;

export interface TvWatchFailed {
  id: string;
  kind: string;
  occurredAt: string;
  device: string;
  error: string | null;
  plannedMinutes: number | null;
  minutes: number | null;
  promoId: string | null;
  sessionId: string | null;
}

export interface TvWatchStaffTest {
  id: string;
  occurredAt: string;
  device: string;
  minutes: number;
}

function isMissingTable(err: unknown) {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "42P01" || e?.cause?.code === "42P01";
}

const deviceName = (label: string | null) => (label ?? "").replace(TV_DEVICE_PREFIX, "") || "NEXBILL TV";

export async function getTvWatch(outletId: string): Promise<{ failed: TvWatchFailed[]; staffTests: TvWatchStaffTest[] }> {
  const since = new Date(Date.now() - TV_WATCH_DAYS * 86400000).toISOString();
  try {
    const rows = await db
      .select()
      .from(offlineSyncActions)
      .where(
        and(
          eq(offlineSyncActions.outletId, outletId),
          like(offlineSyncActions.deviceLabel, `${TV_DEVICE_PREFIX}%`),
          gte(offlineSyncActions.occurredAt, since),
          inArray(offlineSyncActions.status, ["failed", "done"])
        )
      )
      .orderBy(desc(offlineSyncActions.occurredAt))
      .limit(300);
    const failed: TvWatchFailed[] = [];
    const staffTests: TvWatchStaffTest[] = [];
    for (const r of rows) {
      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(r.payloadJson);
      } catch {
        /* payload rusak — tetap tampil tanpa rincian */
      }
      if (r.kind === TV_STAFF_TEST_KIND) {
        if (r.status === "done") staffTests.push({ id: r.id, occurredAt: r.occurredAt, device: deviceName(r.deviceLabel), minutes: Number(payload.minutes) || 10 });
        continue;
      }
      if (r.status !== "failed") continue;
      failed.push({
        id: r.id,
        kind: r.kind,
        occurredAt: r.occurredAt,
        device: deviceName(r.deviceLabel),
        error: r.error,
        plannedMinutes: typeof payload.plannedMinutes === "number" ? payload.plannedMinutes : null,
        minutes: typeof payload.minutes === "number" ? payload.minutes : null,
        promoId: typeof payload.promoId === "string" ? payload.promoId : null,
        sessionId: r.rentalSessionId,
      });
    }
    return { failed, staffTests };
  } catch (err) {
    if (isMissingTable(err)) return { failed: [], staffTests: [] };
    throw err;
  }
}

/** Owner menandai aksi TV yang gagal sudah ditangani (mis. sesinya sudah dicatat manual di Rental). */
export async function markTvActionReviewed(outletId: string, id: string, staffUserId: string) {
  const [row] = await db
    .update(offlineSyncActions)
    .set({ status: "reviewed", updatedAt: new Date().toISOString() })
    .where(and(eq(offlineSyncActions.id, id), eq(offlineSyncActions.outletId, outletId), eq(offlineSyncActions.status, "failed")))
    .returning();
  if (!row) throw new Error("Catatan tidak ditemukan atau sudah ditinjau.");
  await db.insert(auditLogs).values({ outletId, staffUserId, action: "tv_sync_reviewed", entityType: "offline_sync_action", entityId: id, afterData: JSON.stringify({ kind: row.kind, occurredAt: row.occurredAt, error: row.error }) });
  return row;
}

/**
 * Owner membersihkan daftar mode staf (tes) di kartu Pengawasan: catatan TIDAK dihapus dari database —
 * statusnya menjadi "reviewed" sehingga tidak tampil lagi, dan pembersihannya dicatat di Audit Log.
 * ids null = semua catatan mode staf outlet ini yang masih tampil.
 */
export async function dismissStaffTests(outletId: string, ids: string[] | null, staffUserId: string): Promise<number> {
  const conds = [eq(offlineSyncActions.outletId, outletId), eq(offlineSyncActions.kind, TV_STAFF_TEST_KIND), eq(offlineSyncActions.status, "done")];
  if (ids) {
    const clean = ids.filter((x) => typeof x === "string" && x.length > 0 && x.length <= 64).slice(0, 300);
    if (clean.length === 0) return 0;
    conds.push(inArray(offlineSyncActions.id, clean));
  }
  const rows = await db
    .update(offlineSyncActions)
    .set({ status: "reviewed", updatedAt: new Date().toISOString() })
    .where(and(...conds))
    .returning({ id: offlineSyncActions.id, occurredAt: offlineSyncActions.occurredAt, deviceLabel: offlineSyncActions.deviceLabel });
  if (rows.length > 0) {
    await db.insert(auditLogs).values({
      outletId,
      staffUserId,
      action: "tv_staff_test_dismissed",
      entityType: "offline_sync_action",
      entityId: rows.length === 1 ? rows[0].id : null,
      afterData: JSON.stringify({ count: rows.length, items: rows.slice(0, 50).map((r) => ({ at: r.occurredAt, device: deviceName(r.deviceLabel) })) }),
    });
  }
  return rows.length;
}
