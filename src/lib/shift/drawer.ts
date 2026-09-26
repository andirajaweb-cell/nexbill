import { db, type DbOrTx } from "@/db/client";
import { shifts, payments, orders } from "@/db/schema";
import { and, eq, inArray, isNull, or, type SQL } from "drizzle-orm";

/**
 * Which open shift (= which drawer) money handled by this staff member belongs to, resolved on
 * the SERVER at the moment the money moves — never taken from the client.
 *
 *  1. The staff member's own open shift, if they have one.
 *  2. Otherwise, if the outlet has exactly ONE open shift, that one — e.g. a supervisor taking a
 *     payment at the counter while the cashier's shift is running: the cash goes into that
 *     cashier's drawer, so it must count toward that shift's expected cash.
 *  3. Otherwise null (no shift open, or several drawers open and this person owns none of them).
 *
 * BUG YANG DIPERBAIKI DI SINI (2026-09-26): Kasir dan Rental tidak pernah mengirim shiftId, dan
 * server tidak mencarinya sendiri, sehingga penjualan tunai (dan expense tunai) tidak pernah masuk
 * Ekspektasi Kas — selisih kas shift tidak bisa dipakai untuk mendeteksi uang yang hilang.
 */
export async function resolveDrawerShiftId(outletId: string, staffUserId: string | null | undefined, dbc: DbOrTx = db): Promise<string | null> {
  if (staffUserId) {
    const [own] = await dbc
      .select({ id: shifts.id })
      .from(shifts)
      .where(and(eq(shifts.outletId, outletId), eq(shifts.staffUserId, staffUserId), eq(shifts.status, "open")))
      .limit(1);
    if (own) return own.id;
  }
  const open = await dbc
    .select({ id: shifts.id })
    .from(shifts)
    .where(and(eq(shifts.outletId, outletId), eq(shifts.status, "open")))
    .limit(2);
  return open.length === 1 ? open[0].id : null;
}

/**
 * Payments that belong to a shift: those stamped with it (payments.shiftId, since migrasi 0018),
 * plus — for rows from before 0018 — payments with no shift of their own whose ORDER carries this
 * shift. `extra` narrows further (method/status).
 */
export async function selectShiftPayments(shiftId: string, extra: SQL[] = []) {
  const legacyOrders = await db.select({ id: orders.id }).from(orders).where(eq(orders.shiftId, shiftId));
  const legacyIds = legacyOrders.map((o) => o.id);
  const belongs = legacyIds.length
    ? or(eq(payments.shiftId, shiftId), and(isNull(payments.shiftId), inArray(payments.orderId, legacyIds)))!
    : eq(payments.shiftId, shiftId);
  return db.select().from(payments).where(and(belongs, ...extra));
}
