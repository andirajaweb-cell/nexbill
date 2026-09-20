import { db } from "@/db/client";
import { sessionAccessories, orderItems, outlets, rentalSessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { recomputeBillTotals } from "@/lib/pos/bill";

import type { AccessoryBillingMode } from "./charge";

// estimateAccessoryCharge and AccessoryBillingMode live in ./charge, which has no DB imports, so
// the Rental page can call the SAME function instead of keeping its own hand-written copy (it did,
// until 2026-09-19). Re-exported from here so every existing server-side importer of
// "@/lib/rental/accessories" keeps working unchanged.
export { estimateAccessoryCharge } from "./charge";
export type { AccessoryBillingMode } from "./charge";

/** Looks up the outlet's accessory pricing policy (Settings > Pajak & Billing > "Kebijakan Tarif
 * Aksesoris") via the rental session's outlet — shared by the live estimate and the final billing
 * so both always agree. Defaults to "per_hour" (the original, only-ever behavior) if anything's
 * missing, so this never throws for an outlet that predates the column. */
async function getAccessoryBillingMode(rentalSessionId: string): Promise<AccessoryBillingMode> {
  const [session] = await db.select({ outletId: rentalSessions.outletId }).from(rentalSessions).where(eq(rentalSessions.id, rentalSessionId)).limit(1);
  if (!session) return "per_hour";
  const [outlet] = await db.select({ accessoryBillingMode: outlets.accessoryBillingMode }).from(outlets).where(eq(outlets.id, session.outletId)).limit(1);
  return (outlet?.accessoryBillingMode as AccessoryBillingMode) ?? "per_hour";
}

export interface AddAccessoryInput {
  rentalSessionId: string;
  name: string;
  qty: number;
  ratePerHour: number;
  staffUserId?: string | null;
}

/** Start the billing clock for an extra controller/accessory attached to an active session — the
 * stored `ratePerHour` is interpreted as either an hourly rate or a flat per-use price depending
 * on the outlet's accessoryBillingMode setting at finalize/estimate time (see
 * getAccessoryBillingMode above); this function itself is agnostic to that policy. */
export async function addAccessory(input: AddAccessoryInput) {
  if (input.qty <= 0) throw new Error("Jumlah aksesoris harus lebih dari 0.");
  if (input.ratePerHour < 0) throw new Error("Tarif aksesoris tidak boleh negatif.");
  const [row] = await db
    .insert(sessionAccessories)
    .values({
      rentalSessionId: input.rentalSessionId,
      name: input.name,
      qty: input.qty,
      ratePerHour: input.ratePerHour,
      staffUserId: input.staffUserId ?? null,
    })
    .returning();
  return row;
}

export async function listSessionAccessories(rentalSessionId: string) {
  return db.select().from(sessionAccessories).where(eq(sessionAccessories.rentalSessionId, rentalSessionId));
}

/** Stop the per-hour clock early (customer returns the accessory before the session ends) — the charge itself is only finalized into the bill at session stop, same as the main rental charge. */
export async function removeAccessory(accessoryId: string) {
  const [existing] = await db.select().from(sessionAccessories).where(eq(sessionAccessories.id, accessoryId)).limit(1);
  if (!existing) throw new Error("Aksesoris tidak ditemukan.");
  if (existing.removedAt) throw new Error("Aksesoris sudah dikembalikan.");
  const [row] = await db
    .update(sessionAccessories)
    .set({ removedAt: new Date().toISOString() })
    .where(eq(sessionAccessories.id, accessoryId))
    .returning();
  return row;
}

/** Live (unrounded) estimate for the running bill / billing board — pure computation, writes
 * nothing. Note: unlike the main PS rental clock, this doesn't pause when the session pauses —
 * kept simple since a customer typically returns accessories rather than pausing them
 * independently. mode defaults to "per_hour" (the only behavior that ever existed) so any caller
 * that hasn't been updated to pass the outlet's policy keeps working exactly as before. In
 * "per_use" mode, ratePerHour is charged once per qty regardless of elapsed time. */

/**
 * Finalize every accessory rental on a session into the bill as one orderItems
 * line each (itemType "accessory", description prefixed "Rental:" so it lands
 * in the same 4000 Pendapatan Rental PS account as the main PS charge) —
 * called once from stopRentalSession, right alongside upsertRentalLineItem.
 * An accessory still active at stop time (no removedAt) bills through to the
 * session's actual stop timestamp; one already returned mid-session bills only
 * for the time it was genuinely out.
 *
 * Branches on the outlet's accessoryBillingMode (Settings > Pajak & Billing > "Kebijakan Tarif
 * Aksesoris" — see getAccessoryBillingMode above): "per_hour" (default) bills ratePerHour * hours
 * held, same as always; "per_use" bills ratePerHour once per qty, flat, regardless of duration —
 * the description drops the "(X jam)" suffix in that mode since duration no longer affects price.
 */
export async function finalizeAccessoryCharges(rentalSessionId: string, orderId: string, stopTimeMs: number) {
  const accessories = await listSessionAccessories(rentalSessionId);
  if (accessories.length === 0) return 0;
  const mode = await getAccessoryBillingMode(rentalSessionId);
  let total = 0;
  for (const acc of accessories) {
    const endMs = acc.removedAt ? new Date(acc.removedAt).getTime() : stopTimeMs;
    const hours = Math.max(0, (endMs - new Date(acc.addedAt).getTime()) / 3600000);
    const amount = mode === "per_use" ? Math.round(acc.qty * acc.ratePerHour) : Math.round(acc.qty * acc.ratePerHour * hours);
    if (amount <= 0) continue;
    total += amount;
    const description = mode === "per_use" ? `Rental: ${acc.name} x${acc.qty} (per pemakaian)` : `Rental: ${acc.name} x${acc.qty} (${hours.toFixed(2)} jam)`;
    await db.insert(orderItems).values({
      orderId,
      productId: null,
      description,
      qty: 1,
      unitPrice: amount,
      lineTotal: amount,
      itemType: "accessory",
      kitchenStatus: "served",
    });
  }
  if (total > 0) await recomputeBillTotals(orderId);
  return total;
}
