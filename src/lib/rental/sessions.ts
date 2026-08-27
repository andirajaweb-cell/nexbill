import { db } from "@/db/client";
import { rentalSessions, rentalUnits, devices, promos, outlets, bookings, orders } from "@/db/schema";
import { eq, and, inArray, lte, gt } from "drizzle-orm";
import { turnDeviceOn, turnDeviceOff } from "@/lib/devices";
import { computeEffectiveHourlyRate, roundUpMinutes } from "./pricing";
import { openBillForSession, getOpenBillForSession, upsertRentalLineItem } from "@/lib/pos/bill";
import { finalizeAccessoryCharges } from "./accessories";
import { recordDeposit, confirmDeposit, settleOrderAfterPayment } from "@/lib/payments";

export interface StartSessionInput {
  outletId?: string; // derived from the unit if omitted — trust the DB, not the caller
  // When set (always set by the API route from the logged-in session), the unit's own
  // outletId must match this or the session refuses to start — prevents an authenticated
  // user from one outlet starting a session against another outlet's rental unit.
  expectedOutletId?: string;
  rentalUnitId: string;
  customerId?: string | null;
  customerName?: string | null;
  plannedMinutes?: number | null;
  promoId?: string | null;
  bookingId?: string | null;
  staffUserId?: string | null;
  shiftId?: string | null;
  gameName?: string | null;
  // Optional "bayar di muka" — customer pays some/all of the estimated bill
  // right when the session starts, instead of at End Session. Only "cash"
  // and "qris" are offered in the UI. Recorded via recordDeposit/
  // confirmDeposit (NOT the normal initiatePayment/markPaymentSuccess pair)
  // specifically because the order's total at this point is just a
  // placeholder estimate (see upsertRentalLineItem below), not the real
  // invoice — settlement (journal posting, "paid" status) is deliberately
  // deferred until stopRentalSession knows the real total and explicitly
  // re-evaluates it. The payment itself still counts toward paidTotal from
  // the moment it's created, so:
  //  - if the final total ends up HIGHER (overtime), the remaining balance
  //    is collected normally at End Session checkout;
  //  - if it ends up LOWER (session stopped early), postSalesJournal caps
  //    what it recognizes as cash at the final total — the excess is change
  //    handed back to the customer, not tracked as revenue or a liability.
  prepay?: { amount: number; method: string } | null;
}

export async function startRentalSession(input: StartSessionInput) {
  const [unit] = await db.select().from(rentalUnits).where(eq(rentalUnits.id, input.rentalUnitId)).limit(1);
  if (!unit) throw new Error("Unit tidak ditemukan.");
  if (input.expectedOutletId && unit.outletId !== input.expectedOutletId) throw new Error("Unit tidak ditemukan."); // different tenant — don't confirm it exists
  if (unit.status === "occupied") throw new Error("Unit sedang dipakai.");

  // Walk-in guard: a unit reserved by a confirmed/pending booking whose window
  // covers right now can't be grabbed by an unrelated walk-in session — the
  // customer who booked it is expected any moment. Bookings are checked in
  // through checkInBooking() (which passes bookingId), so that path always
  // skips this check; only genuine walk-ins hit it.
  if (!input.bookingId) {
    const nowIso = new Date().toISOString();
    const conflicting = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.rentalUnitId, input.rentalUnitId),
          inArray(bookings.status, ["pending", "confirmed"] as any),
          lte(bookings.scheduledStart, nowIso),
          gt(bookings.scheduledEnd, nowIso)
        )
      );
    if (conflicting.length > 0) {
      throw new Error(`Unit ini sedang dipesan (booking ${conflicting[0].bookingCode ?? conflicting[0].id.slice(0, 8)}) — gunakan Check-in Booking, bukan mulai sesi langsung.`);
    }
  }

  const outletId = unit.outletId;
  const rate = await computeEffectiveHourlyRate(outletId, input.rentalUnitId, input.customerId ?? undefined);

  let plannedMinutes = input.plannedMinutes ?? null;
  let ratePerHour = rate.finalRate;

  if (input.promoId) {
    const [promo] = await db.select().from(promos).where(eq(promos.id, input.promoId)).limit(1);
    if (promo?.durationMinutes) plannedMinutes = promo.durationMinutes;
  }

  const [session] = await db
    .insert(rentalSessions)
    .values({
      outletId,
      rentalUnitId: input.rentalUnitId,
      customerId: input.customerId,
      customerName: input.customerName,
      plannedMinutes,
      ratePerHour,
      status: "running",
      promoId: input.promoId,
      bookingId: input.bookingId,
      staffUserId: input.staffUserId,
      shiftId: input.shiftId,
      gameName: input.gameName || null,
    })
    .returning();

  await db.update(rentalUnits).set({ status: "occupied" }).where(eq(rentalUnits.id, input.rentalUnitId));

  if (unit.deviceId) {
    const [device] = await db.select().from(devices).where(eq(devices.id, unit.deviceId)).limit(1);
    if (device) {
      try {
        await turnDeviceOn(device as any);
      } catch (err) {
        console.error(`Gagal menyalakan device untuk unit ${unit.name}:`, err);
      }
    }
  }

  if (input.bookingId) {
    await db.update(bookings).set({ status: "checked_in", rentalSessionId: session.id }).where(eq(bookings.id, input.bookingId));
  }

  // Open the single unified bill for this session right away — F&B items get
  // appended to it throughout the session (see addItemsToBill) instead of
  // spawning separate invoices, and stopRentalSession finalizes this same
  // bill rather than creating a new one.
  const bill = await openBillForSession({
    outletId,
    customerId: input.customerId,
    rentalSessionId: session.id,
    staffUserId: input.staffUserId,
    shiftId: input.shiftId,
  });

  let prepayment: Awaited<ReturnType<typeof recordDeposit>> | null = null;
  if (input.prepay && input.prepay.amount > 0) {
    // Raise the bill's total to the prepaid amount first (via the same
    // itemType:"rental" line stopRentalSession will later update in place)
    // purely so the bill/UI shows a sensible total in the meantime — this
    // does NOT gate the deposit itself (recordDeposit has no remaining-
    // balance check).
    await upsertRentalLineItem(bill.id, {
      description: `DP Sewa ${unit.name} (dibayar di muka)`,
      amount: input.prepay.amount,
    });
    prepayment = await recordDeposit({
      orderId: bill.id,
      amount: input.prepay.amount,
      method: input.prepay.method as any,
      description: `DP sewa ${unit.name} dibayar di muka`,
    });
    if (input.prepay.method === "cash") {
      prepayment = (await confirmDeposit(prepayment.id)) ?? prepayment;
    }
    // qris (and anything else) stays "pending" — the cashier confirms it via
    // the QR/"Tandai Diterima" flow once the customer actually pays.
  }

  return { session, rate, unit, bill, prepayment };
}

export async function pauseRentalSession(sessionId: string) {
  const [session] = await db.select().from(rentalSessions).where(eq(rentalSessions.id, sessionId)).limit(1);
  if (!session) throw new Error("Sesi tidak ditemukan.");
  if (session.status !== "running") throw new Error("Sesi tidak sedang berjalan.");

  const [updated] = await db
    .update(rentalSessions)
    .set({ status: "paused", pausedAt: new Date().toISOString() })
    .where(eq(rentalSessions.id, sessionId))
    .returning();
  return updated;
}

export async function resumeRentalSession(sessionId: string) {
  const [session] = await db.select().from(rentalSessions).where(eq(rentalSessions.id, sessionId)).limit(1);
  if (!session) throw new Error("Sesi tidak ditemukan.");
  if (session.status !== "paused" || !session.pausedAt) throw new Error("Sesi tidak sedang dijeda.");

  const pauseDurationMs = Date.now() - new Date(session.pausedAt).getTime();

  const [updated] = await db
    .update(rentalSessions)
    .set({
      status: "running",
      pausedAt: null,
      accumulatedPauseMs: session.accumulatedPauseMs + pauseDurationMs,
    })
    .where(eq(rentalSessions.id, sessionId))
    .returning();
  return updated;
}

export async function extendRentalSession(sessionId: string, additionalMinutes: number) {
  const [session] = await db.select().from(rentalSessions).where(eq(rentalSessions.id, sessionId)).limit(1);
  if (!session) throw new Error("Sesi tidak ditemukan.");

  const [updated] = await db
    .update(rentalSessions)
    .set({ extendedMinutes: session.extendedMinutes + additionalMinutes })
    .where(eq(rentalSessions.id, sessionId))
    .returning();
  return updated;
}

/**
 * Stop a session: computes the final bill (package + rounded overtime, or
 * plain rounded hourly), frees the unit + powers off its TV/console, and
 * finalizes the SAME unified bill that was opened back when the session
 * started (openBillForSession) — inserting/updating its "Rental: ..." line
 * item — rather than creating a new order. Any F&B added during the session
 * is already sitting on that bill, so this just adds the rental charge
 * alongside it. The kasir applies discount/voucher/tax at checkout via
 * updateBillCheckoutOptions(), then takes payment against this one order.
 */
export async function stopRentalSession(sessionId: string) {
  const [session] = await db.select().from(rentalSessions).where(eq(rentalSessions.id, sessionId)).limit(1);
  if (!session) throw new Error("Sesi tidak ditemukan.");
  if (session.status === "finished" || session.status === "cancelled") throw new Error("Sesi sudah selesai.");

  const [unit] = await db.select().from(rentalUnits).where(eq(rentalUnits.id, session.rentalUnitId)).limit(1);
  const [outlet] = await db.select().from(outlets).where(eq(outlets.id, session.outletId)).limit(1);
  const roundingMinutes = outlet?.billingRoundingMinutes ?? 15;

  const now = Date.now();
  let accumulatedPauseMs = session.accumulatedPauseMs;
  if (session.status === "paused" && session.pausedAt) {
    accumulatedPauseMs += now - new Date(session.pausedAt).getTime();
  }

  const startedAtMs = new Date(session.startedAt).getTime();
  const elapsedMinutesRaw = Math.max(0, (now - startedAtMs - accumulatedPauseMs) / 60000);

  let subtotal: number;
  let billingNote: string;

  if (session.promoId) {
    const [promo] = await db.select().from(promos).where(eq(promos.id, session.promoId)).limit(1);
    const allowedMinutes = (promo?.durationMinutes ?? session.plannedMinutes ?? 0) + session.extendedMinutes;
    const overtimeMinutesRaw = Math.max(0, elapsedMinutesRaw - allowedMinutes);
    const overtimeRounded = roundUpMinutes(overtimeMinutesRaw, roundingMinutes);
    const overtimeCost = Math.round((overtimeRounded / 60) * session.ratePerHour);
    subtotal = (promo?.packagePrice ?? 0) + overtimeCost;
    billingNote = `Paket ${promo?.name ?? ""} (${allowedMinutes} menit)${overtimeRounded > 0 ? ` + overtime ${overtimeRounded} menit` : ""}`;
  } else {
    const roundedMinutes = roundUpMinutes(elapsedMinutesRaw, roundingMinutes);
    subtotal = Math.round((roundedMinutes / 60) * session.ratePerHour);
    billingNote = `${roundedMinutes} menit (dibulatkan dari ${Math.ceil(elapsedMinutesRaw)} menit)`;
  }

  const total = Math.max(0, subtotal - session.discountAmount);

  const [updatedSession] = await db
    .update(rentalSessions)
    .set({
      status: "finished",
      endedAt: new Date(now).toISOString(),
      accumulatedPauseMs,
      totalAmount: total,
    })
    .where(eq(rentalSessions.id, sessionId))
    .returning();

  if (unit) {
    await db.update(rentalUnits).set({ status: "available" }).where(eq(rentalUnits.id, unit.id));
    if (unit.deviceId) {
      const [device] = await db.select().from(devices).where(eq(devices.id, unit.deviceId)).limit(1);
      if (device) {
        try {
          await turnDeviceOff(device as any);
        } catch (err) {
          console.error(`Gagal mematikan device untuk unit ${unit.name}:`, err);
        }
      }
    }
  }

  let bill = await getOpenBillForSession(session.id);
  if (!bill) {
    // Defensive fallback: sessions started before this bill-at-start model
    // existed (or if openBillForSession somehow failed at start) won't have
    // an open bill yet — open one now so stopping still works.
    bill = await openBillForSession({
      outletId: session.outletId,
      customerId: session.customerId,
      rentalSessionId: session.id,
      staffUserId: session.staffUserId,
      shiftId: session.shiftId,
    });
  }

  if (session.discountAmount > 0) {
    await db.update(orders).set({ discount: session.discountAmount }).where(eq(orders.id, bill.id));
  }

  let order = await upsertRentalLineItem(bill.id, {
    description: `Rental: ${unit?.name ?? "Unit"} (${unit?.consoleType?.toUpperCase() ?? ""}) — ${billingNote}`,
    amount: subtotal,
  });

  const accessoryTotal = await finalizeAccessoryCharges(session.id, bill.id, now);
  if (accessoryTotal > 0) {
    const [refreshedOrder] = await db.select().from(orders).where(eq(orders.id, bill.id)).limit(1);
    order = refreshedOrder ?? order;
  }

  // Now that the bill's total is the REAL final amount (not the placeholder
  // estimate from an optional "bayar di muka" deposit), re-evaluate
  // settlement for the first time against it. No-ops harmlessly if nothing's
  // been paid yet (the normal, no-prepay case — settlement still happens the
  // usual way once the cashier takes payment at checkout). If a deposit
  // already fully covers this real total, this is where the "paid" status
  // and journal posting actually happen — with the correct final numbers.
  await settleOrderAfterPayment(bill.id, "");
  const [settledOrder] = await db.select().from(orders).where(eq(orders.id, bill.id)).limit(1);
  order = settledOrder ?? order;

  return { session: updatedSession, order, elapsedMinutesRaw, billingNote };
}

/**
 * Move a still-active session (customer + open bill + F&B already ordered)
 * to a different PS unit — e.g. the original unit needs maintenance mid-play.
 * Frees the old unit (+ powers its device off), occupies the new one (+ powers
 * it on), and re-locks the rate to whatever the new unit charges going forward.
 * Simplification: the whole session's elapsed time bills at the new unit's
 * rate rather than blending old-rate-before/new-rate-after — acceptable for a
 * same-tier swap (the common case, e.g. broken controller), but the cashier
 * should apply a manual discount at checkout if the units differ meaningfully
 * in price. The timer itself (startedAt/accumulatedPauseMs) is untouched, so
 * the customer doesn't lose their elapsed playtime.
 */
export async function transferRentalSession(sessionId: string, newRentalUnitId: string, staffUserId?: string) {
  const [session] = await db.select().from(rentalSessions).where(eq(rentalSessions.id, sessionId)).limit(1);
  if (!session) throw new Error("Sesi tidak ditemukan.");
  if (session.status !== "running" && session.status !== "paused") throw new Error("Sesi tidak sedang aktif.");
  if (session.rentalUnitId === newRentalUnitId) throw new Error("Unit tujuan sama dengan unit saat ini.");

  const [oldUnit] = await db.select().from(rentalUnits).where(eq(rentalUnits.id, session.rentalUnitId)).limit(1);
  const [newUnit] = await db.select().from(rentalUnits).where(eq(rentalUnits.id, newRentalUnitId)).limit(1);
  if (!newUnit) throw new Error("Unit tujuan tidak ditemukan.");
  if (newUnit.outletId !== session.outletId) throw new Error("Unit tujuan tidak ditemukan."); // different tenant — same 404-style message, don't confirm it exists
  if (newUnit.status !== "available") throw new Error("Unit tujuan sedang tidak tersedia.");

  const rate = await computeEffectiveHourlyRate(newUnit.outletId, newRentalUnitId, session.customerId ?? undefined);

  const [updated] = await db
    .update(rentalSessions)
    .set({ rentalUnitId: newRentalUnitId, ratePerHour: rate.finalRate })
    .where(eq(rentalSessions.id, sessionId))
    .returning();

  if (oldUnit) {
    await db.update(rentalUnits).set({ status: "available" }).where(eq(rentalUnits.id, oldUnit.id));
    if (oldUnit.deviceId) {
      const [device] = await db.select().from(devices).where(eq(devices.id, oldUnit.deviceId)).limit(1);
      if (device) {
        try {
          await turnDeviceOff(device as any);
        } catch (err) {
          console.error(`Gagal mematikan device untuk unit ${oldUnit.name}:`, err);
        }
      }
    }
  }

  await db.update(rentalUnits).set({ status: "occupied" }).where(eq(rentalUnits.id, newRentalUnitId));
  if (newUnit.deviceId) {
    const [device] = await db.select().from(devices).where(eq(devices.id, newUnit.deviceId)).limit(1);
    if (device) {
      try {
        await turnDeviceOn(device as any);
      } catch (err) {
        console.error(`Gagal menyalakan device untuk unit ${newUnit.name}:`, err);
      }
    }
  }

  return { session: updated, oldUnit, newUnit, rate };
}

/** Change the customer attached to a still-open bill/session — updates both the session (for the live billing board) and the linked order. */
export async function changeSessionCustomer(sessionId: string, params: { customerId?: string | null; customerName?: string | null }) {
  const [session] = await db.select().from(rentalSessions).where(eq(rentalSessions.id, sessionId)).limit(1);
  if (!session) throw new Error("Sesi tidak ditemukan.");
  if (session.status === "finished" || session.status === "cancelled") {
    throw new Error("Sesi sudah selesai — ubah customer lewat halaman bill/order, bukan sesi.");
  }

  const [updated] = await db
    .update(rentalSessions)
    .set({ customerId: params.customerId ?? null, customerName: params.customerName ?? null })
    .where(eq(rentalSessions.id, sessionId))
    .returning();

  const bill = await getOpenBillForSession(sessionId);
  if (bill) {
    await db.update(orders).set({ customerId: params.customerId ?? null }).where(eq(orders.id, bill.id));
  }

  return { session: updated, orderId: bill?.id ?? null };
}
