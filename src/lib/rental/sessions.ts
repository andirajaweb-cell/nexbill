import { db } from "@/db/client";
import { rentalSessions, rentalUnits, devices, promos, promoBundleItems, products, outlets, bookings, orders } from "@/db/schema";
import { eq, and, inArray, lte, gt, ne } from "drizzle-orm";
import { turnDeviceOn, turnDeviceOff, getDeviceState } from "@/lib/devices";
import { describeError } from "@/lib/api/error";

/**
 * Turns a device on/off as part of starting/stopping/transferring a session, tolerating failure
 * (a device that's offline/unreachable must never stop the session itself from
 * starting/stopping/transferring — that's the whole reason this is try/catch'd instead of letting
 * the error propagate).
 *
 * NOTE: this used to be wrapped in Next.js's after() to defer the call until after the HTTP
 * response was sent, so a slow device (Tuya's shared cloud API, or Android TV via Relay Agent —
 * hub + WebSocket + a live `adb` command round-trip, sometimes several seconds) couldn't block
 * "End Session & Bayar" from returning to the cashier. That made the button feel instant, but
 * broke the actual on/off command in production — most likely this deployment's runtime freezes
 * the function shortly after the response is flushed, before after()'s callback (and the device
 * fetch inside it) ever got to finish, so the command silently never arrived. Reverted to a plain
 * awaited call so automatic on/off is reliable again; see turnOff/turnOn's own adapters (e.g.
 * android-tv-relay.ts) for the real fix for slowness — a bounded timeout on the underlying network
 * call, so a slow/offline device fails fast instead of hanging, without needing to background
 * anything.
 *
 * Returns the error message on failure (or null on success) instead of only console.error'ing it —
 * a silent server-side-only log was undiagnosable for a cashier watching "Mulai Sesi"/"End
 * Session" appear to work while the TV just never turned on/off (e.g. the unit isn't actually
 * linked to a device on the Kontrol Perangkat page, or the device itself is unreachable). Callers
 * surface this as a non-blocking "session succeeded, but device failed" warning instead of the
 * session action ever actually failing because of it.
 */
async function runDeviceCommand(promise: Promise<unknown>, errorLabel: string): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (err) {
    console.error(errorLabel, err);
    return `${errorLabel} ${describeError(err)}`;
  }
}

/**
 * Turn-on-specific variant that double-checks the device's own reported state after the command
 * returns success — reported production symptom: clicking "Mulai Sesi" never turns the TV on
 * (the smart plug itself doesn't even react — no click, no LED), the manual toggle on Kontrol
 * Perangkat for the exact same device works every time, and NO warning ever surfaced even after
 * runDeviceCommand started returning error messages. That combination only makes sense if the
 * underlying API call is reporting success without the command actually reaching the physical
 * device — a known Tuya Cloud quirk: the "issue command" endpoint returns `success: true` as soon
 * as Tuya's cloud accepts the request, NOT once the device confirms it applied it, so a device
 * that's momentarily offline/reconnecting to WiFi at that exact instant can silently swallow an
 * "on" command while the API still reports success. Turning OFF doesn't appear to hit this in
 * practice (cutting power seems to deliver more reliably than restoring it), so this extra
 * round-trip is only spent on the flakier "turn on" direction rather than slowing down the
 * already-reliable stop path too.
 *
 * Waits briefly before reading state back — Tuya's own status endpoint can lag a moment behind
 * a command it just accepted, so checking instantly risks a false "still off" read on a command
 * that actually did land.
 */
async function runDeviceOnCommand(device: Parameters<typeof turnDeviceOn>[0], errorLabel: string): Promise<string | null> {
  const failure = await runDeviceCommand(turnDeviceOn(device), errorLabel);
  if (failure) return failure;
  try {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const state = await getDeviceState(device);
    if (state === "off") {
      return `${errorLabel} Perintah nyala terkirim tanpa error, tapi device masih melaporkan status mati — kemungkinan device sedang offline/putus WiFi saat itu. Coba nyalakan manual dari Kontrol Perangkat, dan cek koneksi WiFi device tersebut.`;
    }
    // "unknown" isn't treated as a failure — some protocols (e.g. generic HTTP with no status URL
    // configured) simply can't report state at all, which shouldn't turn a real success into a
    // false warning.
  } catch {
    // The state-check call itself failing (network hiccup on the GET, not the original command)
    // shouldn't retroactively turn a reported success into a warning.
  }
  return null;
}
import { computeEffectiveHourlyRate, roundUpMinutes } from "./pricing";
import { openBillForSession, getOpenBillForSession, upsertRentalLineItem, addItemsToBill } from "@/lib/pos/bill";
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
  // Cheap, non-atomic fast-fail — the real guard against a race is the atomic claim further down,
  // right before the session is inserted. This one just avoids wasting a rate lookup/booking-
  // conflict query on a request that's obviously going to fail anyway.
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

  // Bundled F&B items (e.g. "Paket Hemat: 2 Jam PS4 + 1 Kentang Goreng + 1 Es Teh") — fetched here
  // (before the unit's atomic claim below) so a bad bundle row can't leave the unit half-claimed;
  // actually appended to the bill further down, once the bill itself exists.
  let bundleItems: { productId: string; description: string; qty: number }[] = [];
  if (input.promoId) {
    const [promo] = await db.select().from(promos).where(eq(promos.id, input.promoId)).limit(1);
    if (promo?.durationMinutes) plannedMinutes = promo.durationMinutes;
    if (promo) {
      const rows = await db
        .select({ productId: promoBundleItems.productId, qty: promoBundleItems.qty, name: products.name })
        .from(promoBundleItems)
        .innerJoin(products, eq(products.id, promoBundleItems.productId))
        .where(eq(promoBundleItems.promoId, promo.id));
      bundleItems = rows.map((r) => ({ productId: r.productId, description: r.name, qty: r.qty }));
    }
  }

  // Atomic claim — this, not the early check above, is what actually prevents two sessions
  // landing on the same unit. A plain read-then-write left a race window: two "Mulai Sesi"
  // clicks fired close enough together (a double-click, an impatient retry on a slow network, two
  // staff opening the same unit's panel at once) could both read status="available" before either
  // finished, both pass, and both insert a session row for the same unit — which is exactly what
  // produced two simultaneously-running sessions (and two identical cards on the Live Billing
  // Board, one physical TV showing as two) reported in production. Postgres only lets one
  // concurrent UPDATE...WHERE win against the same row; the loser gets 0 rows back here and
  // throws instead of silently also succeeding.
  const [claimed] = await db
    .update(rentalUnits)
    .set({ status: "occupied" })
    .where(and(eq(rentalUnits.id, input.rentalUnitId), ne(rentalUnits.status, "occupied")))
    .returning();
  if (!claimed) throw new Error("Unit sedang dipakai.");

  let session: typeof rentalSessions.$inferSelect;
  try {
    [session] = await db
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
  } catch (err) {
    // Insert failed after the claim above already flipped the unit to "occupied" — release it
    // back to its pre-claim state so the unit doesn't get stuck permanently "occupied" with no
    // session behind it.
    await db.update(rentalUnits).set({ status: unit.status }).where(eq(rentalUnits.id, input.rentalUnitId));
    throw err;
  }

  // deviceWarning surfaces back to the API response (and from there, a non-blocking toast in the
  // UI) whenever the session itself starts fine but the TV/console didn't actually turn on — either
  // because this unit was never linked to a device on the Kontrol Perangkat page (previously this
  // silently did nothing, which was undiagnosable from the cashier's side) or because the linked
  // device's own command failed (offline, wrong credentials, etc — see runDeviceCommand above).
  let deviceWarning: string | null = null;
  if (unit.deviceId) {
    const [device] = await db.select().from(devices).where(eq(devices.id, unit.deviceId)).limit(1);
    if (device) {
      deviceWarning = await runDeviceOnCommand(device as any, `Gagal menyalakan device untuk unit ${unit.name}:`);
    } else {
      deviceWarning = `Unit ${unit.name} terhubung ke device yang sudah tidak ada (mungkin terhapus) — atur ulang di halaman Kontrol Perangkat.`;
    }
  } else {
    deviceWarning = `Unit ${unit.name} belum terhubung ke smart plug/TV — sesi tetap dimulai, tapi device tidak otomatis menyala. Atur di halaman Kontrol Perangkat.`;
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

  // Add the promo's bundled F&B items to the fresh bill at unitPrice 0 — the customer already
  // paid for these as part of packagePrice, so they show on the receipt/kitchen ticket (stock
  // still deducts, kitchen still gets notified) but add no extra charge. A bundle item that's
  // gone out of stock/been deleted since the promo was set up shouldn't block the session itself
  // from starting, so this tolerates failure the same way device-on-command does above — the
  // cashier can always add it manually if this silently fails.
  if (bundleItems.length) {
    try {
      await addItemsToBill(
        bill.id,
        bundleItems.map((b) => ({ productId: b.productId, description: `${b.description} (Paket Promo)`, qty: b.qty, unitPrice: 0 })),
        input.staffUserId ?? undefined
      );
    } catch (err) {
      console.error(`Gagal menambahkan item bundel promo ke bill sesi ${session.id}:`, err);
    }
  }

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

  return { session, rate, unit, bill, prepayment, deviceWarning };
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

  let deviceWarning: string | null = null;
  if (unit) {
    // Accumulate real elapsed play-time (raw, not billing-rounded) toward this unit's predictive-
    // maintenance counter — see lib/rental/maintenance.ts. Simplification consistent with
    // transferRentalSession below: if the session was transferred mid-play, the whole elapsed
    // duration is attributed to whichever unit it finishes on, not split across units.
    await db.update(rentalUnits).set({ status: "available", totalUsageMinutes: unit.totalUsageMinutes + elapsedMinutesRaw }).where(eq(rentalUnits.id, unit.id));
    if (unit.deviceId) {
      const [device] = await db.select().from(devices).where(eq(devices.id, unit.deviceId)).limit(1);
      if (device) {
        deviceWarning = await runDeviceCommand(turnDeviceOff(device as any), `Gagal mematikan device untuk unit ${unit.name}:`);
      } else {
        deviceWarning = `Unit ${unit.name} terhubung ke device yang sudah tidak ada (mungkin terhapus) — atur ulang di halaman Kontrol Perangkat.`;
      }
    }
    // Deliberately no warning when unit.deviceId is unset — plenty of outlets run units with no
    // smart plug at all (manual on/off by staff), so that's an expected, silent no-op here, unlike
    // startRentalSession's warning which exists specifically to catch a unit that WAS meant to be
    // automated but never got linked.
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

  return { session: updatedSession, order, elapsedMinutesRaw, billingNote, deviceWarning };
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

  const deviceWarnings: string[] = [];

  if (oldUnit) {
    await db.update(rentalUnits).set({ status: "available" }).where(eq(rentalUnits.id, oldUnit.id));
    if (oldUnit.deviceId) {
      const [device] = await db.select().from(devices).where(eq(devices.id, oldUnit.deviceId)).limit(1);
      if (device) {
        const warning = await runDeviceCommand(turnDeviceOff(device as any), `Gagal mematikan device untuk unit ${oldUnit.name}:`);
        if (warning) deviceWarnings.push(warning);
      }
    }
  }

  await db.update(rentalUnits).set({ status: "occupied" }).where(eq(rentalUnits.id, newRentalUnitId));
  if (newUnit.deviceId) {
    const [device] = await db.select().from(devices).where(eq(devices.id, newUnit.deviceId)).limit(1);
    if (device) {
      const warning = await runDeviceOnCommand(device as any, `Gagal menyalakan device untuk unit ${newUnit.name}:`);
      if (warning) deviceWarnings.push(warning);
    } else {
      deviceWarnings.push(`Unit ${newUnit.name} terhubung ke device yang sudah tidak ada (mungkin terhapus) — atur ulang di halaman Kontrol Perangkat.`);
    }
  } else {
    deviceWarnings.push(`Unit ${newUnit.name} belum terhubung ke smart plug/TV — sesi tetap dipindah, tapi device tidak otomatis menyala. Atur di halaman Kontrol Perangkat.`);
  }

  return { session: updated, oldUnit, newUnit, rate, deviceWarning: deviceWarnings.length ? deviceWarnings.join(" ") : null };
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
