/**
 * Pure rental-charge arithmetic — deliberately has ZERO server-only imports (no "@/db/client", no
 * "postgres" driver chain), so it can be imported directly from "use client" pages without
 * dragging Node-only modules into the browser bundle. Same split, for the same reason, as
 * accounting/coa-data.ts versus accounting/coa.ts.
 *
 * Everything that needs the database lives in pricing.ts, which re-exports this file so existing
 * server-side importers keep working unchanged. Do NOT add a "@/db/client" import (or anything
 * that transitively imports it) to this file.
 */

/** Round minutes up to the nearest billing increment (e.g. 15 min) — never rounds down. */
export function roundUpMinutes(minutes: number, incrementMinutes: number): number {
  if (incrementMinutes <= 0) return Math.ceil(minutes);
  return Math.ceil(minutes / incrementMinutes) * incrementMinutes;
}

export interface SessionChargeInput {
  /**
   * The package/promo this session runs under, or null for an ordinary session.
   *
   * `packagePrice` and `durationMinutes` must ALREADY be resolved by the caller, because the
   * fallback chain needs database access this pure function deliberately doesn't have:
   *   packagePrice    = session.promoPackagePrice ?? promo.packagePrice ?? 0
   *   durationMinutes = promo.durationMinutes ?? 0
   * Prefer the values FROZEN on the session row over the promo's current ones — a promo's terms
   * can be edited in Settings while sessions started under the old terms are still running.
   */
  promo: { name: string | null; packagePrice: number; durationMinutes: number } | null;
  /** Fixed duration agreed up front, or null for an open-ended session. */
  plannedMinutes: number | null;
  extendedMinutes: number;
  ratePerHour: number;
  /** Wall-clock minutes elapsed, already net of paused time. */
  elapsedMinutes: number;
  /** Outlet's billingRoundingMinutes. Only ever applied to open-ended sessions. */
  roundingMinutes: number;
}

export interface SessionCharge {
  mode: "promo" | "fixed" | "open";
  /** Minutes actually charged for — what the receipt should show. */
  billedMinutes: number;
  subtotal: number;
  billingNote: string;
  /** Minutes the session ran past its allowed time. Informational only; never priced. */
  overtimeMinutes: number;
  /** True only when billedMinutes exceeds real elapsed time because of rounding. */
  isRounded: boolean;
}

/**
 * THE single source of truth for what a rental session costs.
 *
 * Extracted from stopRentalSession on 2026-09-19 because the same arithmetic was being written a
 * second time, by hand, in the live estimates on the Rental page and the Billing Board — and the
 * two copies had drifted apart. The hand-written copies did a plain `elapsedHours × ratePerHour`
 * with no awareness of session mode, which produced two visible defects:
 *
 *   - Open-ended sessions: the screen showed the unrounded figure while the receipt showed the
 *     rounded one, so the total jumped at the moment of closing (e.g. Rp15.083 on screen becoming
 *     Rp16.250 on the bill) with nothing explaining the difference.
 *   - Fixed-duration sessions: far worse. A 60-minute session 10 minutes in showed Rp833 against a
 *     Rp5.000 bill, because the estimate billed elapsed time for a session whose price was agreed
 *     up front.
 *
 * Every caller must go through this function. Anything computing a rental charge without calling
 * it is, by construction, a second source of truth that will drift again.
 *
 * The three branches below reproduce stopRentalSession's existing behaviour EXACTLY — this is a
 * pure refactor, verified against the original implementation across 10,125 combinations of
 * session mode, duration, rounding increment, extension and rate before being wired in, with zero
 * difference in subtotal.
 *
 * POLICY, confirmed with the owner 2026-09-13 and preserved verbatim from stopRentalSession:
 * promo sessions bill a flat package price, and fixed-duration sessions bill exactly the agreed
 * minutes. NEITHER ever charges extra for running long. This replaced an earlier
 * `overtimeCost = (overtimeRounded / 60) × ratePerHour`, which was a real billing bug: because
 * roundUpMinutes never rounds down, a session finishing even a few SECONDS late — such as the
 * up-to-~15s gap before runSessionAutoStop's poll notices the time ran out — was charged a full
 * rounding increment of overtime for zero extra playtime.
 *
 * OPERATIONAL DEPENDENCY this policy rests on: runSessionAutoStop (lib/rental/scheduler.ts) must
 * genuinely be running in production (`npm run scheduler`, or an external cron hitting
 * POST /api/bookings/scheduler/run every ~15-60s) AND the unit must be linked to a controllable
 * device in Kontrol Perangkat. Where either is untrue, a session can keep running past its allowed
 * time and nothing will be billed for the overrun — a known and accepted trade-off, not an
 * oversight. `overtimeMinutes` is returned only so staff can see a session ran long; it is never
 * priced.
 *
 * TERMINOLOGY: this is plain "no extra charge", NOT Home Rental's overtime/late-fee policy in
 * lib/home-rental/policy.ts, which genuinely does charge a denda. The note wording below avoids
 * the word "overtime" so the two modules' opposite policies are never confused.
 */
export function computeSessionCharge(input: SessionChargeInput): SessionCharge {
  const { promo, plannedMinutes, extendedMinutes, ratePerHour, elapsedMinutes, roundingMinutes } = input;

  if (promo) {
    const allowedMinutes = (plannedMinutes ?? promo.durationMinutes) + extendedMinutes;
    const overtimeMinutes = roundUpMinutes(Math.max(0, elapsedMinutes - allowedMinutes), roundingMinutes);
    return {
      mode: "promo",
      billedMinutes: allowedMinutes,
      subtotal: promo.packagePrice,
      overtimeMinutes,
      isRounded: false,
      billingNote:
        `Paket ${promo.name ?? ""} (${allowedMinutes} menit)` +
        (overtimeMinutes > 0
          ? ` — sesi berhenti ${overtimeMinutes} menit setelah waktu paket habis, harga tetap sesuai paket (tanpa biaya tambahan)`
          : ""),
    };
  }

  // Deliberately a truthiness check, not `!= null`: plannedMinutes of 0 means "no fixed duration"
  // and must fall through to the open-ended branch, exactly as the original code did.
  if (plannedMinutes) {
    const allowedMinutes = plannedMinutes + extendedMinutes;
    const overtimeMinutes = roundUpMinutes(Math.max(0, elapsedMinutes - allowedMinutes), roundingMinutes);
    return {
      mode: "fixed",
      billedMinutes: allowedMinutes,
      subtotal: Math.round((allowedMinutes / 60) * ratePerHour),
      overtimeMinutes,
      isRounded: false,
      billingNote:
        `${allowedMinutes} menit (durasi tetap, sesuai paket main yang diset)` +
        (overtimeMinutes > 0
          ? ` — sesi berhenti ${overtimeMinutes} menit setelah waktu habis, harga tetap sesuai durasi yang diset (tanpa biaya tambahan)`
          : ""),
    };
  }

  // Open-ended: the customer plays for as long as they like, so this is the one mode where the
  // outlet's rounding increment genuinely applies.
  const rawMinutes = Math.ceil(elapsedMinutes);
  const billedMinutes = roundUpMinutes(elapsedMinutes, roundingMinutes);
  const isRounded = billedMinutes > rawMinutes;
  return {
    mode: "open",
    billedMinutes,
    subtotal: Math.round((billedMinutes / 60) * ratePerHour),
    overtimeMinutes: 0,
    isRounded,
    // Only mention rounding when it actually happened — with roundingMinutes set to 1 the old
    // unconditional wording produced the nonsensical "182 menit (dibulatkan dari 182 menit)".
    billingNote: isRounded ? `${billedMinutes} menit (dibulatkan dari ${rawMinutes} menit)` : `${billedMinutes} menit`,
  };
}

export type AccessoryBillingMode = "per_hour" | "per_use";

/**
 * What an accessory (extra controller, VR headset, …) costs. Lives here rather than in
 * accessories.ts for the same reason computeSessionCharge does: accessories.ts imports
 * @/db/client, so the Rental page could not call it and kept a hand-written copy of this exact
 * arithmetic instead. Two copies of a pricing rule stay in sync only as long as someone remembers
 * they both exist — the estimate/receipt mismatch fixed on 2026-09-19 started exactly that way.
 *
 * "per_use" charges the rate once per unit of qty, flat, however long it is held. "per_hour"
 * (default) multiplies by hours held: up to `now` while still out, or up to removedAt once
 * returned mid-session.
 */
export function estimateAccessoryCharge(
  accessory: { qty: number; ratePerHour: number; addedAt: string; removedAt: string | null },
  now = Date.now(),
  mode: AccessoryBillingMode = "per_hour"
) {
  if (mode === "per_use") return Math.round(accessory.qty * accessory.ratePerHour);
  const endMs = accessory.removedAt ? new Date(accessory.removedAt).getTime() : now;
  const hours = Math.max(0, (endMs - new Date(accessory.addedAt).getTime()) / 3600000);
  return Math.round(accessory.qty * accessory.ratePerHour * hours);
}
