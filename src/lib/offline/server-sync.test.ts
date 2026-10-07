import { describe, it, expect, vi } from "vitest";

// processOfflineBatch's replay rules are tested with injected side effects — no database.
vi.mock("@/db/client", () => ({ db: {} }));
vi.mock("@/lib/rental/sessions", () => ({ syncUnitDeviceToSessions: vi.fn() }));
vi.mock("@/lib/payments", () => ({}));
vi.mock("@/lib/pos/bill", () => ({}));
vi.mock("@/lib/shift/drawer", () => ({}));

import { processOfflineBatch, type SyncDeps, type Claim } from "./server-sync";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const now = new Date().toISOString();
const act = (n: number, kind: string, sessionId: number, extra: Record<string, unknown> = {}) => ({ id: uuid(n), kind, sessionId: uuid(100 + sessionId), at: now, clockOffsetMs: 0, ...extra });
const ctx = { outletId: "o1", staffUserId: "staff-1", currentClockOffsetMs: 0, deviceLabel: "test" };

function fakeDeps(over: Partial<SyncDeps> = {}) {
  const executed: string[] = [];
  const finished: Record<string, { error?: string }> = {};
  const deps: SyncDeps = {
    claim: async (): Promise<Claim> => ({ kind: "claimed" }),
    finish: async (id, outcome) => {
      finished[id] = outcome;
    },
    execute: async (_c, a, units) => {
      executed.push(`${a.kind}:${a.id.slice(-2)}`);
      if (a.kind === "start") units.add("unit-1");
      return {};
    },
    resolveActor: async (c, staffId) => (staffId === "other-outlet-staff" ? c.staffUserId : staffId),
    syncDevice: vi.fn(async () => null),
    audit: vi.fn(async () => undefined),
    ...over,
  };
  return { deps, executed, finished };
}

describe("processOfflineBatch", () => {
  it("replays actions in order and reconciles each touched unit's device once at the end", async () => {
    const { deps, executed } = fakeDeps();
    const res = await processOfflineBatch(ctx, [act(1, "start", 1, { rentalUnitId: "unit-1" }), act(2, "extend", 1, { minutes: 30 }), act(3, "stop", 1)], deps);
    expect(executed).toEqual(["start:01", "extend:02", "stop:03"]);
    expect(res.results.map((r) => r.status)).toEqual(["done", "done", "done"]);
    expect(deps.syncDevice).toHaveBeenCalledTimes(1);
    expect(deps.audit).toHaveBeenCalledTimes(1);
  });

  it("never replays an action the server already completed (idempotent re-send)", async () => {
    const { deps, executed } = fakeDeps({ claim: async (_c, a) => (a.id === uuid(1) ? { kind: "duplicate", result: { orderId: "ord-1" } } : { kind: "claimed" }) });
    const res = await processOfflineBatch(ctx, [act(1, "stop", 1), act(2, "payCash", 1, { amount: 10000 })], deps);
    expect(res.results[0]).toMatchObject({ status: "duplicate", orderId: "ord-1" });
    expect(executed).toEqual(["payCash:02"]);
  });

  it("passes note codes through (fresh and re-sent) so the device can show them in its own language", async () => {
    const overpaid = { orderId: "ord-1", note: "teks audit", noteCode: "overpaid" as const, noteAmount: 2000 };
    const { deps } = fakeDeps({
      claim: async (_c, a) => (a.id === uuid(2) ? { kind: "duplicate", result: overpaid } : { kind: "claimed" }),
      execute: async () => overpaid,
    });
    const res = await processOfflineBatch(ctx, [act(1, "payCash", 1, { amount: 12000 }), act(2, "payCash", 2, { amount: 12000 })], deps);
    for (const r of res.results) expect(r).toMatchObject({ noteCode: "overpaid", noteAmount: 2000, note: "teks audit" });
  });

  it("holds back later actions of a session whose earlier action failed, without blocking other sessions", async () => {
    const executed: string[] = [];
    const { deps, finished } = fakeDeps({
      execute: async (_c, a) => {
        if (a.kind === "start") throw new Error("Unit sedang dipakai.");
        executed.push(`${a.kind}:${a.id.slice(-2)}`);
        return {};
      },
    });
    const res = await processOfflineBatch(ctx, [act(1, "start", 1, { rentalUnitId: "u" }), act(2, "stop", 1), act(3, "extend", 2, { minutes: 15 })], deps);
    expect(res.results.map((r) => r.status)).toEqual(["failed", "failed", "done"]);
    expect(res.results[0].error).toBe("Unit sedang dipakai.");
    expect(finished[uuid(2)].error).toMatch(/Menunggu aksi sebelumnya/);
    expect(executed).toEqual(["extend:03"]);
  });

  it("rejects malformed and out-of-window actions without executing them", async () => {
    const { deps, executed } = fakeDeps();
    const old = new Date(Date.now() - 80 * 60 * 60 * 1000).toISOString();
    const res = await processOfflineBatch(ctx, [{ id: "x", kind: "stop" }, act(2, "stop", 1, { at: old })], deps);
    expect(res.results.map((r) => r.status)).toEqual(["failed", "failed"]);
    expect(executed).toEqual([]);
  });

  it("flags a device clock that moved while offline", async () => {
    const { deps } = fakeDeps();
    const res = await processOfflineBatch({ ...ctx, currentClockOffsetMs: 60 * 60 * 1000 }, [act(1, "pause", 1)], deps);
    expect(res.clockFlagged).toBe(true);
  });

  it("attributes actions to the cashier who recorded them only when they belong to this outlet", async () => {
    const seen: string[] = [];
    const { deps } = fakeDeps({
      execute: async (c) => {
        seen.push(c.staffUserId);
        return {};
      },
    });
    await processOfflineBatch(ctx, [act(1, "pause", 1, { recordedBy: "cashier-2" }), act(2, "pause", 2, { recordedBy: "other-outlet-staff" })], deps);
    expect(seen).toEqual(["cashier-2", "staff-1"]);
  });
});
