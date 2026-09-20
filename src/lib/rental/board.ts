import { db } from "@/db/client";
import { rentalSessions, rentalUnits, customers, orders, orderItems, sessionAccessories, outlets, promos } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { estimateAccessoryCharge, type AccessoryBillingMode } from "@/lib/rental/accessories";
import { computeSessionCharge } from "@/lib/rental/pricing";

export interface LiveBillingBoardRow {
  sessionId: string;
  unitId: string;
  unitName: string;
  consoleType: string;
  status: "running" | "paused";
  customerName: string;
  gameName: string | null;
  startedAt: string;
  accumulatedPauseMs: number;
  extendedMinutes: number;
  ratePerHour: number;
  rentalEstimate: number;
  fnbSubtotal: number;
  fnbItemCount: number;
  accessoryEstimate: number;
  accessoryCount: number;
  runningTotal: number;
  billId: string | null;
  billStatus: string | null;
}

/**
 * One-screen live view for cashiers: every currently running/paused rental session with its unit,
 * customer, rental estimate, F&B subtotal/count from the session's open bill, and a running grand
 * total.
 *
 * The estimate goes through computeSessionCharge — the SAME function stopRentalSession bills with.
 * Until 2026-09-19 this computed `elapsedHours * ratePerHour` by hand, which was wrong in two
 * ways: it ignored the outlet's rounding increment on open-ended sessions (so the total jumped at
 * closing time), and it billed elapsed time on fixed-duration sessions whose price was agreed up
 * front (a 60-minute session 10 minutes in showed Rp833 against a Rp5.000 bill). What the cashier
 * sees now matches the receipt from the first second of the session.
 *
 * PERF: this used to fetch each session's open bill (getOpenBillForSession), that bill's
 * item/payment breakdown (getBillBreakdown), and its accessories (listSessionAccessories) inside
 * a `for` loop with `await` — 5 sequential DB round-trips per active session, none of them
 * parallelized. The billing-board page polls this every 3s, so with a busful of active PS units
 * that added up to dozens of serial queries per poll, slow enough that polls started overlapping
 * (the next 3s tick firing before the previous one finished) — the visible "loads forever / keeps
 * reloading" symptom. Rewritten to batch-fetch open bills, their items, and accessories for ALL
 * sessions in one query each (like units/customers already were), then join in memory — a fixed
 * handful of queries regardless of how many sessions are active.
 */
export async function getLiveBillingBoard(outletId: string): Promise<LiveBillingBoardRow[]> {
  const sessions = await db
    .select()
    .from(rentalSessions)
    .where(and(eq(rentalSessions.outletId, outletId), inArray(rentalSessions.status, ["running", "paused"])));

  if (sessions.length === 0) return [];

  // One extra lookup for the whole board, fetching both settings that decide what a session costs:
  // accessoryBillingMode (the "Kebijakan Tarif Aksesoris" that finalizeAccessoryCharges reads at
  // session-stop time) and billingRoundingMinutes (what stopRentalSession rounds with). Both are
  // read here so the live estimate can never disagree with what actually gets billed.
  const [outletRow] = await db
    .select({ accessoryBillingMode: outlets.accessoryBillingMode, billingRoundingMinutes: outlets.billingRoundingMinutes })
    .from(outlets)
    .where(eq(outlets.id, outletId))
    .limit(1);
  const accessoryBillingMode: AccessoryBillingMode = (outletRow?.accessoryBillingMode as AccessoryBillingMode) ?? "per_hour";
  const roundingMinutes = outletRow?.billingRoundingMinutes ?? 1;

  const sessionIds = sessions.map((s) => s.id);
  const unitIds = [...new Set(sessions.map((s) => s.rentalUnitId))];
  const customerIds = [...new Set(sessions.map((s) => s.customerId).filter((id): id is string => !!id))];
  // Batched like every other lookup here rather than queried per session — see the PERF note above.
  const promoIds = [...new Set(sessions.map((s) => s.promoId).filter((id): id is string => !!id))];

  const [units, customerRows, openOrders, accessoryRows, promoRows] = await Promise.all([
    db.select().from(rentalUnits).where(inArray(rentalUnits.id, unitIds)),
    customerIds.length ? db.select().from(customers).where(inArray(customers.id, customerIds)) : Promise.resolve([]),
    db.select().from(orders).where(and(inArray(orders.rentalSessionId, sessionIds), eq(orders.status, "open"))),
    db.select().from(sessionAccessories).where(inArray(sessionAccessories.rentalSessionId, sessionIds)),
    promoIds.length ? db.select().from(promos).where(inArray(promos.id, promoIds)) : Promise.resolve([]),
  ]);

  const unitById = new Map(units.map((u) => [u.id, u]));
  const customerById = new Map(customerRows.map((c) => [c.id, c]));
  const promoById = new Map(promoRows.map((p) => [p.id, p]));
  const openOrderBySessionId = new Map(openOrders.map((o) => [o.rentalSessionId as string, o]));

  const orderIds = openOrders.map((o) => o.id);
  const orderItemRows = orderIds.length ? await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)) : [];
  const itemsByOrderId = new Map<string, typeof orderItemRows>();
  for (const item of orderItemRows) {
    const bucket = itemsByOrderId.get(item.orderId);
    if (bucket) bucket.push(item);
    else itemsByOrderId.set(item.orderId, [item]);
  }

  const accessoriesBySessionId = new Map<string, typeof accessoryRows>();
  for (const acc of accessoryRows) {
    const bucket = accessoriesBySessionId.get(acc.rentalSessionId);
    if (bucket) bucket.push(acc);
    else accessoriesBySessionId.set(acc.rentalSessionId, [acc]);
  }

  const rows: LiveBillingBoardRow[] = [];
  const now = Date.now();

  for (const session of sessions) {
    const unit = unitById.get(session.rentalUnitId);
    // While paused, session.accumulatedPauseMs only gets credited on resume — add the
    // still-ongoing pause duration here so the estimate correctly freezes at pause time
    // instead of continuing to climb on every poll (mirrors stopRentalSession's math).
    let effectivePauseMs = session.accumulatedPauseMs;
    if (session.status === "paused" && session.pausedAt) {
      effectivePauseMs += now - new Date(session.pausedAt).getTime();
    }
    const elapsedMinutes = Math.max(0, (now - new Date(session.startedAt).getTime() - effectivePauseMs) / 60000);
    const promoRow = session.promoId ? promoById.get(session.promoId) : undefined;
    const rentalEstimate = computeSessionCharge({
      // Same resolution order stopRentalSession uses: values frozen on the session row win over
      // the promo's current ones, since a promo can be edited mid-session.
      promo: session.promoId
        ? {
            name: promoRow?.name ?? null,
            packagePrice: session.promoPackagePrice ?? promoRow?.packagePrice ?? 0,
            durationMinutes: promoRow?.durationMinutes ?? 0,
          }
        : null,
      plannedMinutes: session.plannedMinutes,
      extendedMinutes: session.extendedMinutes,
      ratePerHour: session.ratePerHour,
      elapsedMinutes,
      roundingMinutes,
    }).subtotal;

    const bill = openOrderBySessionId.get(session.id) ?? null;
    const items = bill ? itemsByOrderId.get(bill.id) ?? [] : [];
    const activeFnbItems = items.filter((i) => i.kitchenStatus !== "cancelled" && i.itemType === "product");
    const fnbSubtotal = activeFnbItems.reduce((s, i) => s + i.lineTotal, 0);
    const fnbItemCount = activeFnbItems.length;

    const sessionAccessoryRows = accessoriesBySessionId.get(session.id) ?? [];
    const activeAccessories = sessionAccessoryRows.filter((a) => !a.removedAt);
    const accessoryEstimate = activeAccessories.reduce((s, a) => s + estimateAccessoryCharge(a, now, accessoryBillingMode), 0);

    rows.push({
      sessionId: session.id,
      unitId: session.rentalUnitId,
      unitName: unit?.name ?? "Unit tidak dikenal",
      consoleType: unit?.consoleType ?? "",
      status: session.status as "running" | "paused",
      customerName: session.customerId ? customerById.get(session.customerId)?.name ?? session.customerName ?? "Tanpa nama" : session.customerName ?? "Tanpa nama",
      gameName: session.gameName,
      startedAt: session.startedAt,
      accumulatedPauseMs: session.accumulatedPauseMs,
      extendedMinutes: session.extendedMinutes,
      ratePerHour: session.ratePerHour,
      rentalEstimate,
      fnbSubtotal,
      fnbItemCount,
      accessoryEstimate,
      accessoryCount: activeAccessories.length,
      runningTotal: rentalEstimate + fnbSubtotal + accessoryEstimate,
      billId: bill?.id ?? null,
      billStatus: bill?.status ?? null,
    });
  }

  rows.sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
  return rows;
}
