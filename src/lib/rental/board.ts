import { db } from "@/db/client";
import { rentalSessions, rentalUnits, customers } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getOpenBillForSession, getBillBreakdown } from "@/lib/pos/bill";
import { listSessionAccessories, estimateAccessoryCharge } from "@/lib/rental/accessories";

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
 * One-screen live view for cashiers: every currently running/paused rental session
 * with its unit, customer, elapsed-based rental estimate, F&B subtotal/count from the
 * session's open bill, and a running grand total. Mirrors the exact "no rounding, no
 * overtime" estimate formula already shown on the Rental page cards
 * (elapsedHours * ratePerHour) so both views stay consistent for the cashier.
 */
export async function getLiveBillingBoard(outletId: string): Promise<LiveBillingBoardRow[]> {
  const sessions = await db
    .select()
    .from(rentalSessions)
    .where(and(eq(rentalSessions.outletId, outletId), inArray(rentalSessions.status, ["running", "paused"])));

  if (sessions.length === 0) return [];

  const unitIds = [...new Set(sessions.map((s) => s.rentalUnitId))];
  const units = await db.select().from(rentalUnits).where(inArray(rentalUnits.id, unitIds));
  const unitById = new Map(units.map((u) => [u.id, u]));

  const customerIds = [...new Set(sessions.map((s) => s.customerId).filter((id): id is string => !!id))];
  const customerRows = customerIds.length ? await db.select().from(customers).where(inArray(customers.id, customerIds)) : [];
  const customerById = new Map(customerRows.map((c) => [c.id, c]));

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
    const elapsedHours = Math.max(0, (now - new Date(session.startedAt).getTime() - effectivePauseMs) / 3600000);
    const rentalEstimate = Math.round(elapsedHours * session.ratePerHour);

    const bill = await getOpenBillForSession(session.id);
    const breakdown = bill ? await getBillBreakdown(bill.id) : null;
    const fnbSubtotal = breakdown?.fnbSubtotal ?? 0;
    const fnbItemCount = breakdown?.fnbItemCount ?? 0;

    const sessionAccessories = await listSessionAccessories(session.id);
    const activeAccessories = sessionAccessories.filter((a) => !a.removedAt);
    const accessoryEstimate = activeAccessories.reduce((s, a) => s + estimateAccessoryCharge(a, now), 0);

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
