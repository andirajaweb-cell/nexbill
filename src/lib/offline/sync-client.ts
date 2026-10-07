import { applySyncResults, deviceLabel, getClock, getQueue, saveSnapshot, saveSyncReport, setLastOutletId, saveClock, type SyncReportNote } from "./store";
import { probe } from "./connectivity";
import { SYNC_BATCH_LIMIT, type SyncResponse } from "./protocol";
import type { OfflineSnapshot } from "./engine";

/**
 * Sisi perangkat untuk sinkron Mode Offline: mengirim antrean ke POST /api/offline/sync (berurutan,
 * per batch) dan menyimpan snapshot terbaru dari GET /api/offline/snapshot. Hanya satu sinkron
 * berjalan pada satu waktu per tab; antar-tab dicegah dengan Web Locks bila tersedia (server tetap
 * idempoten bila dua tab kebetulan mengirim aksi yang sama).
 */

let syncing = false;
const syncListeners = new Set<() => void>();
const notify = () => syncListeners.forEach((l) => l());
export const isSyncing = () => syncing;
export function subscribeSyncing(listener: () => void) {
  syncListeners.add(listener);
  return () => syncListeners.delete(listener);
}

export type SyncOutcome = { status: "empty" | "offline" | "unauthorized" | "error" | "ok"; message?: string; done?: number; failed?: number };

async function withLock<T>(fn: () => Promise<T>): Promise<T | null> {
  const locks = (globalThis.navigator as Navigator & { locks?: { request: (name: string, opts: { ifAvailable: boolean }, cb: (lock: unknown) => Promise<T | null>) => Promise<T | null> } })?.locks;
  if (!locks) return fn();
  return locks.request("nexbill-offline-sync", { ifAvailable: true }, async (lock) => (lock ? fn() : null));
}

export async function syncQueue(outletId: string): Promise<SyncOutcome> {
  if (syncing) return { status: "ok" };
  if (getQueue(outletId).length === 0) return { status: "empty" };
  syncing = true;
  notify();
  try {
    const outcome = await withLock(async (): Promise<SyncOutcome> => {
      // Fresh clock measurement right before sending — the server compares it with the offset each
      // action was recorded with to flag a device clock changed during the outage.
      if (!(await probe())) return { status: "offline" };
      let done = 0;
      let failed = 0;
      const notes: SyncReportNote[] = [];
      let clockFlagged = false;
      // Batches, in recording order; stop early if a batch makes no progress.
      for (let round = 0; round < 50; round++) {
        const queue = getQueue(outletId);
        const batch = queue.slice(0, SYNC_BATCH_LIMIT);
        if (batch.length === 0) break;
        const res = await fetch("/api/offline/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actions: batch.map((q) => q.action), clockOffsetMs: getClock()?.offsetMs ?? null, deviceLabel: deviceLabel() }),
        }).catch(() => null);
        if (!res) return { status: "offline" };
        if (res.status === 401) return { status: "unauthorized" };
        const body = (await res.json().catch(() => null)) as (SyncResponse & { error?: string }) | null;
        if (!res.ok || !body?.results) return { status: "error", message: body?.error ?? `HTTP ${res.status}` };
        saveClock(body.serverTime);
        applySyncResults(outletId, body.results);
        clockFlagged ||= body.clockFlagged;
        for (const r of body.results) {
          if (r.status === "done") done++;
          if (r.status === "failed") failed++;
          const q = batch.find((b) => b.action.id === r.id);
          if (r.note && q) notes.push({ sessionId: q.action.sessionId, kind: q.action.kind, note: r.note, code: r.noteCode, amount: r.noteAmount });
        }
        const progressed = body.results.some((r) => r.status !== "failed");
        if (!progressed || batch.length < SYNC_BATCH_LIMIT) break;
      }
      if (done + failed > 0 || notes.length) {
        saveSyncReport(outletId, { at: new Date().toISOString(), done, failed, notes, clockFlagged });
      }
      return { status: "ok", done, failed };
    });
    return outcome ?? { status: "ok" };
  } finally {
    syncing = false;
    notify();
  }
}

/** Ambil & simpan snapshot terbaru (dipanggil berkala selama online). */
export async function refreshSnapshot(): Promise<OfflineSnapshot | null> {
  const startedAt = Date.now();
  const res = await fetch("/api/offline/snapshot", { cache: "no-store" }).catch(() => null);
  if (!res || !res.ok) return null;
  const snap = (await res.json().catch(() => null)) as OfflineSnapshot | null;
  if (!snap?.outlet?.id) return null;
  saveClock(snap.serverTime, Date.now() - startedAt);
  saveSnapshot(snap);
  setLastOutletId(snap.outlet.id);
  return snap;
}
