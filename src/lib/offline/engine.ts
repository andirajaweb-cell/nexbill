import { computeSessionCharge } from "@/lib/rental/charge";
import { pickPricingRule, ruleRateFor, type PricingRuleInput } from "@/lib/rental/rate-rules";
import type { OfflineAction } from "./protocol";
import type { OfflineLocalControl } from "@/lib/relay/local-control";

/**
 * Mode Offline — keadaan papan kasir rental di perangkat saat internet putus. MURNI: snapshot
 * terakhir dari server (GET /api/offline/snapshot) + antrean aksi offline → daftar unit, sesi yang
 * sedang berjalan, dan sesi yang sudah dihentikan offline beserta perkiraan tagihannya.
 *
 * Tarif dihitung dengan fungsi yang sama dengan server (rate-rules.ts + computeSessionCharge), jadi
 * perkiraan di layar = total yang nanti dihitung server saat sinkron, KECUALI hal yang memang tidak
 * bisa diketahui offline: diskon member (pelanggan offline dicatat sebagai non-member), aksesori
 * per jam, serta perubahan harga/tarif yang dibuat owner selama outlet offline.
 */

export interface SnapUnit {
  id: string;
  name: string;
  consoleType: string;
  hourlyRate: number;
  status: string;
  hasDevice: boolean;
}

export interface SnapSession {
  id: string;
  rentalUnitId: string;
  customerName: string | null;
  startedAt: string;
  status: "running" | "paused";
  pausedAt: string | null;
  accumulatedPauseMs: number;
  plannedMinutes: number | null;
  extendedMinutes: number;
  ratePerHour: number;
  promoId: string | null;
  promoPackagePrice: number | null;
  discountAmount: number;
}

export interface BillLine {
  description: string;
  qty: number;
  lineTotal: number;
}

export interface OfflineSnapshot {
  version: 1;
  serverTime: string;
  outlet: { id: string; name: string; billingRoundingMinutes: number };
  staff: { id: string; name: string };
  units: SnapUnit[];
  sessions: SnapSession[];
  pricingRules: PricingRuleInput[];
  promos: { id: string; name: string; consoleType: string; durationMinutes: number; packagePrice: number }[];
  durationPresets: { minutes: number; label: string }[];
  products: { id: string; name: string; price: number; category: string | null }[];
  /** Per active session id: F&B already on its open bill and money already received (DP). */
  bills: Record<string, { items: BillLine[]; paidTotal: number }>;
  /** NexbillAgent di LAN outlet yang bisa menyalakan/mematikan perangkat unit saat offline (lib/relay/local-control.ts). */
  localControl?: OfflineLocalControl;
}

export interface LocalSession extends SnapSession {
  /** "server" = started before the outage (known to the server); "offline" = started on this device. */
  origin: "server" | "offline";
  items: BillLine[];
  paidTotal: number;
}

export interface Estimate {
  rental: number;
  items: number;
  paid: number;
  total: number;
  due: number;
  billedMinutes: number;
  elapsedMinutes: number;
  remainingMinutes: number | null;
}

export interface FinishedLocal {
  session: LocalSession;
  endedAt: string;
  estimate: Estimate;
  /** Cash recorded offline for this session (payCash actions). */
  cashPaid: number;
}

export interface LocalUnit extends SnapUnit {
  session: LocalSession | null;
}

export interface LocalState {
  units: LocalUnit[];
  finished: FinishedLocal[];
}

const MINUTE = 60_000;

export function elapsedMinutesAt(s: Pick<LocalSession, "startedAt" | "status" | "pausedAt" | "accumulatedPauseMs">, atMs: number): number {
  let pauseMs = s.accumulatedPauseMs;
  if (s.status === "paused" && s.pausedAt) pauseMs += Math.max(0, atMs - Date.parse(s.pausedAt));
  return Math.max(0, (atMs - Date.parse(s.startedAt) - pauseMs) / MINUTE);
}

/** Bill estimate for a session at `atMs` (device time already corrected to server time). */
export function estimateSession(s: LocalSession, roundingMinutes: number, atMs: number): Estimate {
  const elapsed = elapsedMinutesAt(s, atMs);
  const charge = computeSessionCharge({
    promo: s.promoId ? { name: null, packagePrice: s.promoPackagePrice ?? 0, durationMinutes: 0 } : null,
    plannedMinutes: s.plannedMinutes,
    extendedMinutes: s.extendedMinutes,
    ratePerHour: s.ratePerHour,
    elapsedMinutes: elapsed,
    roundingMinutes,
  });
  const rental = Math.max(0, charge.subtotal - s.discountAmount);
  const items = s.items.reduce((sum, i) => sum + i.lineTotal, 0);
  const total = rental + items;
  const allowed = s.plannedMinutes !== null ? s.plannedMinutes + s.extendedMinutes : null;
  return {
    rental,
    items,
    paid: s.paidTotal,
    total,
    due: Math.max(0, total - s.paidTotal),
    billedMinutes: charge.billedMinutes,
    elapsedMinutes: elapsed,
    remainingMinutes: allowed === null ? null : allowed - elapsed,
  };
}

/** Hourly rate for a session started offline (no member discount — offline customers are walk-ins). */
export function offlineRateFor(unit: SnapUnit, rules: PricingRuleInput[], at: Date): number {
  return ruleRateFor(unit.hourlyRate, pickPricingRule(unit, rules, at));
}

/**
 * Snapshot + queued actions → what the offline board shows. Actions that don't apply (unknown
 * unit/session, unit already busy) are skipped here exactly as the board would have refused them;
 * the board only records actions that are valid against this same state, so in practice nothing
 * is skipped.
 */
export function deriveLocalState(snapshot: OfflineSnapshot, actions: OfflineAction[]): LocalState {
  const sessions = new Map<string, LocalSession>();
  for (const s of snapshot.sessions) {
    const bill = snapshot.bills[s.id];
    sessions.set(s.id, { ...s, origin: "server", items: bill ? [...bill.items] : [], paidTotal: bill?.paidTotal ?? 0 });
  }
  const finished: FinishedLocal[] = [];
  const unitById = new Map(snapshot.units.map((u) => [u.id, u]));
  const productById = new Map(snapshot.products.map((p) => [p.id, p]));
  const promoById = new Map(snapshot.promos.map((p) => [p.id, p]));
  const rounding = snapshot.outlet.billingRoundingMinutes || 1;

  for (const a of actions) {
    switch (a.kind) {
      case "start": {
        const unit = unitById.get(a.rentalUnitId);
        if (!unit || [...sessions.values()].some((s) => s.rentalUnitId === unit.id)) break;
        const promo = a.promoId ? promoById.get(a.promoId) : undefined;
        sessions.set(a.sessionId, {
          id: a.sessionId,
          rentalUnitId: unit.id,
          customerName: a.customerName ?? null,
          startedAt: a.at,
          status: "running",
          pausedAt: null,
          accumulatedPauseMs: 0,
          plannedMinutes: promo ? promo.durationMinutes : a.plannedMinutes ?? null,
          extendedMinutes: 0,
          ratePerHour: offlineRateFor(unit, snapshot.pricingRules, new Date(a.at)),
          promoId: promo ? promo.id : null,
          promoPackagePrice: promo ? promo.packagePrice : null,
          discountAmount: 0,
          origin: "offline",
          items: [],
          paidTotal: 0,
        });
        break;
      }
      case "extend": {
        const s = sessions.get(a.sessionId);
        if (s) s.extendedMinutes += a.minutes;
        break;
      }
      case "pause": {
        const s = sessions.get(a.sessionId);
        if (s && s.status === "running") {
          s.status = "paused";
          s.pausedAt = a.at;
        }
        break;
      }
      case "resume": {
        const s = sessions.get(a.sessionId);
        if (s && s.status === "paused" && s.pausedAt) {
          s.accumulatedPauseMs += Math.max(0, Date.parse(a.at) - Date.parse(s.pausedAt));
          s.status = "running";
          s.pausedAt = null;
        }
        break;
      }
      case "addItems": {
        const s = sessions.get(a.sessionId);
        if (!s) break;
        for (const it of a.items) {
          const p = productById.get(it.productId);
          if (p) s.items.push({ description: p.name, qty: it.qty, lineTotal: p.price * it.qty });
        }
        break;
      }
      case "stop": {
        const s = sessions.get(a.sessionId);
        if (!s) break;
        sessions.delete(a.sessionId);
        finished.push({ session: s, endedAt: a.at, estimate: estimateSession(s, rounding, Date.parse(a.at)), cashPaid: 0 });
        break;
      }
      case "payCash": {
        const f = finished.find((x) => x.session.id === a.sessionId);
        if (f) f.cashPaid += a.amount;
        break;
      }
    }
  }

  const units: LocalUnit[] = snapshot.units.map((u) => ({
    ...u,
    session: [...sessions.values()].find((s) => s.rentalUnitId === u.id) ?? null,
  }));
  return { units, finished };
}
