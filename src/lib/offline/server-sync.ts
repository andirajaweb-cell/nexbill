import { db } from "@/db/client";
import { auditLogs, offlineSyncActions, orders, products, promos, rentalSessions, rentalUnits, staffUsers } from "@/db/schema";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { describeError } from "@/lib/api/error";
import { resolveDrawerShiftId } from "@/lib/shift/drawer";
import { addItemsToBill, getOpenBillForSession } from "@/lib/pos/bill";
import { getOrderPaymentSummary, initiatePayment, markPaymentSuccess } from "@/lib/payments";
import {
  extendRentalSession,
  pauseRentalSession,
  resumeRentalSession,
  startRentalSession,
  stopRentalSession,
  syncUnitDeviceToSessions,
} from "@/lib/rental/sessions";
import {
  SYNC_BATCH_LIMIT,
  OfflineActionError,
  checkActionTime,
  clockLooksTampered,
  parseOfflineAction,
  type OfflineAction,
  type SyncActionResult,
  type SyncNoteCode,
  type SyncResponse,
} from "./protocol";

/**
 * Server side of Mode Offline: replays the actions a cashier's device recorded while the outlet's
 * internet was down (see protocol.ts for the format and guarantees).
 *
 *  - Actions run strictly in the order received (the device sends its queue in recording order).
 *  - Idempotent per action id (offline_sync_actions): "done" actions are never replayed, so a
 *    re-sent queue can't double a session or a cash payment.
 *  - Times are the moment things happened at the outlet, not the moment of sync — billing,
 *    pause accounting, the bill's business date and the cash payment's paidAt all use them.
 *  - Device commands are skipped per action and reconciled once per unit at the end
 *    (syncUnitDeviceToSessions).
 *  - Conflicts are never resolved silently: a failed action keeps its error, stays in the
 *    device's queue, and is shown to the cashier for review.
 */

export interface SyncContext {
  outletId: string;
  staffUserId: string;
  /** Server − device clock offset the device measured right before this sync (ms). */
  currentClockOffsetMs: number | null;
  deviceLabel?: string | null;
}

const STALE_PROCESSING_MS = 2 * 60 * 1000;

class ActionFailure extends Error {}

export type Done = { note?: string; noteCode?: SyncNoteCode; noteAmount?: number; orderId?: string };

/** Side effects of a sync, injectable so the replay rules above can be unit-tested without a database. */
export interface SyncDeps {
  claim: (ctx: SyncContext, action: OfflineAction, flagged: boolean) => Promise<Claim>;
  finish: (id: string, outcome: { result?: Done; error?: string }) => Promise<void>;
  execute: (ctx: SyncContext, action: OfflineAction, touchedUnits: Set<string>) => Promise<Done>;
  resolveActor: (ctx: SyncContext, staffId: string) => Promise<string>;
  syncDevice: (rentalUnitId: string) => Promise<string | null>;
  audit: (ctx: SyncContext, summary: Record<string, unknown>) => Promise<void>;
}

export async function processOfflineBatch(ctx: SyncContext, rawActions: unknown[], deps: SyncDeps = DEFAULT_DEPS): Promise<SyncResponse> {
  const serverNow = Date.now();
  const results: SyncActionResult[] = [];
  const touchedUnits = new Set<string>();
  /** Sessions with a failed action earlier in this batch — later actions on them wait for review. */
  const blockedSessions = new Set<string>();
  let clockFlagged = false;
  const staffCache = new Map<string, string>();
  /** The cashier who recorded the action offline, if they're staff of this outlet; else whoever is syncing. */
  const actorFor = async (action: OfflineAction) => {
    const id = action.recordedBy;
    if (!id || id === ctx.staffUserId) return ctx.staffUserId;
    if (!staffCache.has(id)) staffCache.set(id, await deps.resolveActor(ctx, id));
    return staffCache.get(id)!;
  };

  for (const raw of rawActions.slice(0, SYNC_BATCH_LIMIT)) {
    const rawId = typeof (raw as { id?: unknown })?.id === "string" ? String((raw as { id: string }).id) : "";
    let action: OfflineAction;
    try {
      action = parseOfflineAction(raw);
    } catch (err) {
      results.push({ id: rawId, status: "failed", error: describeError(err) });
      continue;
    }

    const timeError = checkActionTime(action.at, serverNow);
    if (timeError) {
      results.push({ id: action.id, status: "failed", error: timeError });
      blockedSessions.add(action.sessionId);
      continue;
    }
    const flagged = ctx.currentClockOffsetMs !== null && clockLooksTampered(action.clockOffsetMs, ctx.currentClockOffsetMs);
    if (flagged) clockFlagged = true;

    const claim = await deps.claim(ctx, action, flagged);
    if (claim.kind === "duplicate") {
      results.push({ id: action.id, status: "duplicate", note: claim.result?.note, noteCode: claim.result?.noteCode, noteAmount: claim.result?.noteAmount, orderId: claim.result?.orderId });
      continue;
    }
    if (claim.kind === "busy" || claim.kind === "foreign") {
      results.push({ id: action.id, status: "failed", error: claim.kind === "busy" ? "Aksi ini sedang diproses perangkat lain — coba lagi sebentar." : "ID aksi bentrok." });
      blockedSessions.add(action.sessionId);
      continue;
    }

    if (blockedSessions.has(action.sessionId)) {
      const error = "Menunggu aksi sebelumnya untuk sesi ini berhasil disinkronkan.";
      await deps.finish(action.id, { error });
      results.push({ id: action.id, status: "failed", error });
      continue;
    }

    try {
      const done = await deps.execute({ ...ctx, staffUserId: await actorFor(action) }, action, touchedUnits);
      await deps.finish(action.id, { result: done });
      results.push({ id: action.id, status: "done", note: done.note, noteCode: done.noteCode, noteAmount: done.noteAmount, orderId: done.orderId });
    } catch (err) {
      const error = describeError(err);
      await deps.finish(action.id, { error });
      results.push({ id: action.id, status: "failed", error });
      blockedSessions.add(action.sessionId);
    }
  }

  for (const unitId of touchedUnits) {
    try {
      const warning = await deps.syncDevice(unitId);
      if (warning) console.warn(`[offline-sync] ${warning}`);
    } catch (err) {
      console.error(`[offline-sync] Gagal menyelaraskan device unit ${unitId}:`, err);
    }
  }

  const done = results.filter((r) => r.status === "done").length;
  const failed = results.filter((r) => r.status === "failed").length;
  if (done + failed > 0) {
    await deps.audit(ctx, { done, failed, duplicate: results.length - done - failed, clockFlagged, device: ctx.deviceLabel ?? null }).catch((err) => console.error("[offline-sync] audit log gagal:", err));
  }

  return { serverTime: new Date().toISOString(), results, clockFlagged };
}

/* ---------------- idempotency ---------------- */

export type Claim = { kind: "claimed" } | { kind: "duplicate"; result: Done | null } | { kind: "busy" } | { kind: "foreign" };

async function claimAction(ctx: SyncContext, action: OfflineAction, flagged: boolean): Promise<Claim> {
  const [inserted] = await db
    .insert(offlineSyncActions)
    .values({
      id: action.id,
      outletId: ctx.outletId,
      staffUserId: ctx.staffUserId,
      kind: action.kind,
      rentalSessionId: action.sessionId,
      occurredAt: action.at,
      payloadJson: JSON.stringify(action),
      status: "processing",
      clockFlagged: flagged,
      deviceLabel: ctx.deviceLabel?.slice(0, 120) ?? null,
    })
    .onConflictDoNothing()
    .returning({ id: offlineSyncActions.id });
  if (inserted) return { kind: "claimed" };

  const [existing] = await db.select().from(offlineSyncActions).where(eq(offlineSyncActions.id, action.id)).limit(1);
  if (!existing || existing.outletId !== ctx.outletId) return { kind: "foreign" };
  if (existing.status === "done") return { kind: "duplicate", result: existing.resultJson ? (JSON.parse(existing.resultJson) as Done) : null };
  if (existing.status === "processing" && Date.now() - Date.parse(existing.updatedAt) < STALE_PROCESSING_MS) return { kind: "busy" };

  // Failed before (or a crashed attempt) — retry, conditionally so two concurrent retries can't both run it.
  const [reclaimed] = await db
    .update(offlineSyncActions)
    .set({ status: "processing", attempts: existing.attempts + 1, error: null, clockFlagged: existing.clockFlagged || flagged, updatedAt: new Date().toISOString() })
    .where(and(eq(offlineSyncActions.id, action.id), eq(offlineSyncActions.updatedAt, existing.updatedAt)))
    .returning({ id: offlineSyncActions.id });
  return reclaimed ? { kind: "claimed" } : { kind: "busy" };
}

async function finishAction(id: string, outcome: { result?: Done; error?: string }) {
  await db
    .update(offlineSyncActions)
    .set({
      status: outcome.error ? "failed" : "done",
      resultJson: outcome.result ? JSON.stringify(outcome.result) : null,
      error: outcome.error ?? null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(offlineSyncActions.id, id));
}

/* ---------------- executors ---------------- */

async function loadOwnedSession(ctx: SyncContext, sessionId: string) {
  const [row] = await db.select().from(rentalSessions).where(eq(rentalSessions.id, sessionId)).limit(1);
  if (!row || row.outletId !== ctx.outletId) throw new ActionFailure("Sesi rental tidak ditemukan di server.");
  return row;
}

async function sessionBill(sessionId: string) {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.rentalSessionId, sessionId), ne(orders.status, "cancelled")))
    .orderBy(desc(orders.createdAt))
    .limit(1);
  return order ?? null;
}

/**
 * The server's scheduler auto-stops fixed-duration sessions when their time runs out — it keeps
 * running while the outlet is offline and can't know the customer was given extra time (or the
 * session was paused) at the counter. When an offline extend/pause/resume happened BEFORE the
 * server closed the session, the session is reopened so the outlet's action applies. Only while
 * the bill is still unpaid and the unit hasn't been taken by another session; otherwise it's left
 * for manual review (never silently).
 */
async function reopenIfAutoStopped(session: typeof rentalSessions.$inferSelect, at: string) {
  if (session.status !== "finished") return { session, reopened: false };
  if (!session.endedAt || Date.parse(at) >= Date.parse(session.endedAt)) throw new ActionFailure("Sesi sudah selesai di server sebelum aksi ini dilakukan.");
  const bill = await sessionBill(session.id);
  const summary = bill ? await getOrderPaymentSummary(bill.id) : null;
  if (!bill || (summary && summary.paidTotal > 0) || bill.status === "paid") {
    throw new ActionFailure("Sesi sudah selesai dan tagihannya sudah dibayar — tinjau manual.");
  }
  const [unit] = await db.select().from(rentalUnits).where(eq(rentalUnits.id, session.rentalUnitId)).limit(1);
  if (!unit || unit.status === "occupied") throw new ActionFailure("Unit sudah dipakai sesi lain — tinjau manual.");

  const countedMinutes = Math.max(0, (Date.parse(session.endedAt) - Date.parse(session.startedAt) - session.accumulatedPauseMs) / 60000);
  await db.update(rentalUnits).set({ status: "occupied", totalUsageMinutes: Math.max(0, unit.totalUsageMinutes - countedMinutes) }).where(eq(rentalUnits.id, unit.id));
  const [reopened] = await db
    .update(rentalSessions)
    .set({ status: "running", endedAt: null, totalAmount: 0 })
    .where(and(eq(rentalSessions.id, session.id), eq(rentalSessions.status, "finished")))
    .returning();
  if (!reopened) throw new ActionFailure("Sesi berubah saat sinkron — coba lagi.");
  await db.update(orders).set({ businessDate: null }).where(eq(orders.id, bill.id));
  return { session: reopened, reopened: true };
}

const REOPENED: Done = { note: "Sesi dibuka kembali: server sempat menghentikannya otomatis saat outlet offline.", noteCode: "reopened" };

async function execute(ctx: SyncContext, action: OfflineAction, touchedUnits: Set<string>): Promise<Done> {
  switch (action.kind) {
    case "start": {
      const [unit] = await db.select().from(rentalUnits).where(eq(rentalUnits.id, action.rentalUnitId)).limit(1);
      if (!unit || unit.outletId !== ctx.outletId) throw new ActionFailure("Unit tidak ditemukan.");
      if (action.promoId) {
        const [promo] = await db.select({ outletId: promos.outletId }).from(promos).where(eq(promos.id, action.promoId)).limit(1);
        if (!promo || promo.outletId !== ctx.outletId) throw new ActionFailure("Paket promo tidak ditemukan.");
      }
      const shiftId = await resolveDrawerShiftId(ctx.outletId, ctx.staffUserId);
      await startRentalSession({
        id: action.sessionId,
        startedAt: action.at,
        skipDevices: true,
        expectedOutletId: ctx.outletId,
        rentalUnitId: action.rentalUnitId,
        customerName: action.customerName ?? null,
        gameName: action.gameName ?? null,
        plannedMinutes: action.plannedMinutes ?? null,
        promoId: action.promoId ?? null,
        staffUserId: ctx.staffUserId,
        shiftId,
      });
      touchedUnits.add(action.rentalUnitId);
      return {};
    }
    case "extend": {
      const { session, reopened } = await reopenIfAutoStopped(await loadOwnedSession(ctx, action.sessionId), action.at);
      if (session.status === "cancelled") throw new ActionFailure("Sesi sudah dibatalkan.");
      await extendRentalSession(session.id, action.minutes);
      touchedUnits.add(session.rentalUnitId);
      return reopened ? REOPENED : {};
    }
    case "pause": {
      const { session, reopened } = await reopenIfAutoStopped(await loadOwnedSession(ctx, action.sessionId), action.at);
      if (session.status === "paused") return {};
      await pauseRentalSession(session.id, action.at);
      touchedUnits.add(session.rentalUnitId);
      return reopened ? REOPENED : {};
    }
    case "resume": {
      const { session, reopened } = await reopenIfAutoStopped(await loadOwnedSession(ctx, action.sessionId), action.at);
      if (session.status === "running") return reopened ? REOPENED : {};
      await resumeRentalSession(session.id, action.at);
      touchedUnits.add(session.rentalUnitId);
      return reopened ? REOPENED : {};
    }
    case "addItems": {
      const session = await loadOwnedSession(ctx, action.sessionId);
      const bill = (await getOpenBillForSession(session.id)) ?? null;
      if (!bill) throw new ActionFailure("Tagihan sesi ini sudah ditutup — tambahkan item lewat Kasir.");
      const ids = [...new Set(action.items.map((i) => i.productId))];
      const rows = await db.select().from(products).where(and(inArray(products.id, ids), eq(products.outletId, ctx.outletId)));
      const byId = new Map(rows.map((p) => [p.id, p]));
      const missing = ids.filter((id) => !byId.has(id));
      if (missing.length) throw new ActionFailure("Produk tidak ditemukan.");
      // Server's own price (the device's snapshot price is only an estimate shown offline).
      await addItemsToBill(
        bill.id,
        action.items.map((i) => ({ productId: i.productId, description: byId.get(i.productId)!.name, qty: i.qty, unitPrice: byId.get(i.productId)!.price })),
        ctx.staffUserId
      );
      return { orderId: bill.id };
    }
    case "stop": {
      const session = await loadOwnedSession(ctx, action.sessionId);
      if (session.status === "finished" || session.status === "cancelled") {
        const bill = await sessionBill(session.id);
        return { note: "Sesi sudah dihentikan otomatis oleh server saat outlet offline.", noteCode: "alreadyStopped", orderId: bill?.id };
      }
      const result = await stopRentalSession(session.id, { endedAt: action.at, skipDevices: true });
      touchedUnits.add(session.rentalUnitId);
      return { orderId: result.order.id };
    }
    case "payCash": {
      const session = await loadOwnedSession(ctx, action.sessionId);
      const bill = await sessionBill(session.id);
      if (!bill) throw new ActionFailure("Tagihan sesi tidak ditemukan.");
      const summary = await getOrderPaymentSummary(bill.id);
      if (!summary) throw new ActionFailure("Tagihan sesi tidak ditemukan.");
      const remaining = summary.remaining;
      if (remaining <= 0.5) {
        return {
          orderId: bill.id,
          note: `Tagihan sudah lunas di server — uang tunai Rp${Math.round(action.amount).toLocaleString("id-ID")} perlu dicek di laci.`,
          noteCode: "alreadyPaid",
          noteAmount: Math.round(action.amount),
        };
      }
      const charge = Math.min(action.amount, remaining);
      const shiftId = await resolveDrawerShiftId(ctx.outletId, ctx.staffUserId);
      const payment = await initiatePayment({ orderId: bill.id, amount: charge, method: "cash", description: `Pembayaran tunai (Mode Offline) order ${bill.id}`, shiftId });
      if (payment.status !== "success") {
        await markPaymentSuccess(payment.id, { staffUserId: ctx.staffUserId, shiftId, reference: "OFFLINE", paidAt: action.at });
      }
      const diff = Math.round(action.amount - remaining);
      if (diff > 0) {
        return {
          orderId: bill.id,
          note: `Uang diterima Rp${Math.round(action.amount).toLocaleString("id-ID")} melebihi tagihan final — kelebihan Rp${diff.toLocaleString("id-ID")} adalah kembalian.`,
          noteCode: "overpaid",
          noteAmount: diff,
        };
      }
      if (diff < 0) {
        return {
          orderId: bill.id,
          note: `Tagihan final lebih besar Rp${(-diff).toLocaleString("id-ID")} dari uang yang diterima — sisanya menunggu pelunasan.`,
          noteCode: "underpaid",
          noteAmount: -diff,
        };
      }
      return { orderId: bill.id };
    }
  }
}

const DEFAULT_DEPS: SyncDeps = {
  claim: claimAction,
  finish: finishAction,
  execute,
  resolveActor: async (ctx, staffId) => {
    const [row] = await db.select({ outletId: staffUsers.outletId }).from(staffUsers).where(eq(staffUsers.id, staffId)).limit(1);
    return row?.outletId === ctx.outletId ? staffId : ctx.staffUserId;
  },
  syncDevice: syncUnitDeviceToSessions,
  audit: async (ctx, summary) => {
    await db.insert(auditLogs).values({
      outletId: ctx.outletId,
      staffUserId: ctx.staffUserId,
      action: "offline_sync",
      entityType: "offline_sync",
      entityId: null,
      afterData: JSON.stringify(summary),
    });
  },
};

export { OfflineActionError };
