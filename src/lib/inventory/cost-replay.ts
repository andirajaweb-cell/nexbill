import { db, type DbOrTx } from "@/db/client";
import { products, stockMovements } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface ReplayableMovement {
  /** Signed: positive for an inflow (purchase_in or a positive adjustment), negative for an outflow. */
  qty: number;
  /** Landed unit cost this movement blended into products.costPrice at the time — null for legacy rows or non-purchase movements. */
  unitCost: number | null;
  createdAt: string;
}

/**
 * Pure function: replays a product's full movement history in chronological order and returns
 * the qty/costPrice that would result — the same weighted-average blend receiveStockForItem does
 * incrementally, just recomputed from scratch. Used to correctly recompute products.costPrice
 * after a purchase invoice is voided or edited, since the single rolling average in
 * products.costPrice cannot be un-blended after the fact (the old blend inputs are gone the
 * moment a later purchase overwrites it) — replaying from qty=0/cost=0 with the offending
 * invoice's movements excluded is the only mathematically correct way to get "what the cost
 * would be if this purchase had never happened."
 *
 * - An inflow (qty > 0) blends in at its own unitCost, weighted by qty, same as
 *   receiveStockForItem. A legacy/unknown unitCost (null) blends in at the running average
 *   instead of assuming 0 — a neutral, non-corrupting assumption for movements that predate the
 *   unitCost column.
 * - An outflow (qty < 0) only reduces qty; it never changes the cost basis of what remains —
 *   standard weighted-average-cost treatment (a sale consumes units at the current average, it
 *   doesn't retroactively change that average).
 * - qty is floored at 0 (a product should never go net-negative across its full history; if it
 *   does due to data issues, we don't let it drag the average calculation negative).
 */
export function replayCostPrice(movements: ReplayableMovement[]): { qty: number; costPrice: number } {
  const sorted = [...movements].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  let qty = 0;
  let costPrice = 0;

  for (const m of sorted) {
    if (m.qty > 0) {
      const incomingCost = m.unitCost ?? costPrice;
      const existingValue = qty * costPrice;
      const incomingValue = m.qty * incomingCost;
      const newQty = qty + m.qty;
      costPrice = newQty > 0 ? (existingValue + incomingValue) / newQty : incomingCost;
      qty = newQty;
    } else if (m.qty < 0) {
      qty = Math.max(0, qty + m.qty);
      // cost basis (costPrice) intentionally unchanged on an outflow.
    }
  }

  return { qty, costPrice: Math.round(costPrice * 100) / 100 };
}

/**
 * Recomputes and persists products.costPrice for one product by replaying every stockMovements
 * row EXCEPT the ones tied to `excludeRefOrderId` — used when reversing a purchase invoice, where
 * both the invoice's original purchase_in movements AND the offsetting reversal adjustment share
 * that same refOrderId (see reverseInvoiceEffects in purchase-invoice-correction.ts) and should be
 * excluded together, so the recomputed cost is "as if this invoice's purchase never happened" —
 * not merely "net qty zero but the average still permanently skewed by it."
 *
 * Does NOT touch products.stockQty — that's maintained separately via the normal +/- increments
 * on each movement (a simple running sum needs no replay; only the blended average does).
 */
export async function recomputeCostPriceExcludingRef(productId: string, excludeRefOrderId: string, dbc: DbOrTx = db) {
  const rows = await dbc
    .select({ qty: stockMovements.qty, unitCost: stockMovements.unitCost, createdAt: stockMovements.createdAt, refOrderId: stockMovements.refOrderId })
    .from(stockMovements)
    .where(eq(stockMovements.productId, productId));

  const filtered = rows.filter((r) => r.refOrderId !== excludeRefOrderId);
  const result = replayCostPrice(filtered);

  await dbc.update(products).set({ costPrice: result.costPrice }).where(eq(products.id, productId));

  return result;
}
