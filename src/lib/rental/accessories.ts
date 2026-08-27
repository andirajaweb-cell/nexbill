import { db } from "@/db/client";
import { sessionAccessories, orderItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { recomputeBillTotals } from "@/lib/pos/bill";

export interface AddAccessoryInput {
  rentalSessionId: string;
  name: string;
  qty: number;
  ratePerHour: number;
  staffUserId?: string | null;
}

/** Start the per-hour clock for an extra controller/accessory attached to an active session. */
export async function addAccessory(input: AddAccessoryInput) {
  if (input.qty <= 0) throw new Error("Jumlah aksesoris harus lebih dari 0.");
  if (input.ratePerHour < 0) throw new Error("Tarif per jam tidak boleh negatif.");
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

/** Live (unrounded) estimate for the running bill / billing board — pure computation, writes nothing. Note: unlike the main PS rental clock, this doesn't pause when the session pauses — kept simple since a customer typically returns accessories rather than pausing them independently. */
export function estimateAccessoryCharge(accessory: { qty: number; ratePerHour: number; addedAt: string; removedAt: string | null }, now = Date.now()) {
  const endMs = accessory.removedAt ? new Date(accessory.removedAt).getTime() : now;
  const hours = Math.max(0, (endMs - new Date(accessory.addedAt).getTime()) / 3600000);
  return Math.round(accessory.qty * accessory.ratePerHour * hours);
}

/**
 * Finalize every accessory rental on a session into the bill as one orderItems
 * line each (itemType "accessory", description prefixed "Rental:" so it lands
 * in the same 4000 Pendapatan Rental PS account as the main PS charge) —
 * called once from stopRentalSession, right alongside upsertRentalLineItem.
 * An accessory still active at stop time (no removedAt) bills through to the
 * session's actual stop timestamp; one already returned mid-session bills only
 * for the time it was genuinely out.
 */
export async function finalizeAccessoryCharges(rentalSessionId: string, orderId: string, stopTimeMs: number) {
  const accessories = await listSessionAccessories(rentalSessionId);
  let total = 0;
  for (const acc of accessories) {
    const endMs = acc.removedAt ? new Date(acc.removedAt).getTime() : stopTimeMs;
    const hours = Math.max(0, (endMs - new Date(acc.addedAt).getTime()) / 3600000);
    const amount = Math.round(acc.qty * acc.ratePerHour * hours);
    if (amount <= 0) continue;
    total += amount;
    await db.insert(orderItems).values({
      orderId,
      productId: null,
      description: `Rental: ${acc.name} x${acc.qty} (${hours.toFixed(2)} jam)`,
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
