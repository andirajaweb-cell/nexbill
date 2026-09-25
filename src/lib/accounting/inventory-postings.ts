import { db, type DbOrTx } from "@/db/client";
import { stockMovements } from "@/db/schema";
import { getMappedAccountId } from "./account-mapping";
import { postJournal } from "./journal";
import { computeItemCogs } from "./postings";

/**
 * Journals for stock changes that are NOT purchases or sales: Stock Opname differences, the
 * "Penyesuaian Barang" tool on the Produk tab, and a new product's Stok Awal. Before this module
 * those only moved products.stockQty — Persediaan (1161) on the balance sheet never followed, so a
 * physical count that found 20 missing bottles changed the stock number but booked no loss, and
 * opening stock that was later sold credited a Persediaan balance that had never been debited.
 *
 * Every line is valued at the product's current harga modal (computeItemCogs — the same cost a sale
 * would use, recipe-aware), so a unit adjusted here and a unit sold leave Persediaan consistent.
 */

export type InventoryAdjustmentReason = "opname" | "damaged" | "adjustment" | "opening";

// Contra account per reason, as (mapping key, fallback COA code) — outlets can override each in
// Account Mapping (module "product"). Stock gains credit the same account they'd debit on a loss,
// so a count that finds surplus simply reduces that period's selisih expense.
const CONTRA: Record<InventoryAdjustmentReason, { key: string; code: string; label: string }> = {
  opname: { key: "opname_difference", code: "5310", label: "Selisih stock opname" },
  damaged: { key: "damaged", code: "5320", label: "Barang rusak / waste" },
  adjustment: { key: "adjustment", code: "5340", label: "Penyesuaian stok manual" },
  opening: { key: "opening_stock", code: "3400", label: "Stok awal produk" },
};

export interface InventoryAdjustmentLine {
  productId: string;
  /** Signed quantity change: positive = stock added, negative = stock removed. */
  qtyDelta: number;
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Pure: net Persediaan change (Rp) from per-line qty deltas and unit costs. */
export function netInventoryValue(lines: { qtyDelta: number; unitCost: number }[]): number {
  return round(lines.reduce((s, l) => s + l.qtyDelta * l.unitCost, 0));
}

/**
 * Posts one balanced journal for a batch of stock adjustments. Returns the journal id, or null when
 * the net value is zero (no cost on file, or gains and losses cancel out) — nothing to book.
 * Pass the caller's `tx` so the journal commits or rolls back together with the stock change.
 */
export async function postInventoryAdjustmentJournal(
  input: {
    outletId: string;
    reason: InventoryAdjustmentReason;
    lines: InventoryAdjustmentLine[];
    reference: string;
    description: string;
    sourceId?: string;
    staffUserId?: string;
  },
  dbc: DbOrTx = db
): Promise<string | null> {
  const valued = [];
  for (const l of input.lines) {
    if (!l.qtyDelta) continue;
    valued.push({ qtyDelta: l.qtyDelta, unitCost: await computeItemCogs(l.productId, 1, dbc) });
  }
  const net = netInventoryValue(valued);
  if (Math.abs(net) < 0.01) return null;

  const contra = CONTRA[input.reason];
  const inventoryAccountId = await getMappedAccountId(input.outletId, "product", "inventory", "1161", dbc);
  const contraAccountId = await getMappedAccountId(input.outletId, "product", contra.key, contra.code, dbc);
  const amount = Math.abs(net);
  const gain = net > 0;

  return postJournal(
    {
      outletId: input.outletId,
      reference: input.reference,
      description: input.description,
      sourceType: "inventory_adjustment",
      sourceId: input.sourceId,
      staffUserId: input.staffUserId,
      lines: [
        { accountId: gain ? inventoryAccountId : contraAccountId, debit: amount, credit: 0, description: gain ? "Persediaan bertambah" : contra.label },
        { accountId: gain ? contraAccountId : inventoryAccountId, debit: 0, credit: amount, description: gain ? contra.label : "Persediaan berkurang" },
      ],
    },
    dbc
  );
}

/**
 * Stok Awal for newly created products (Produk form or Excel import): writes the "Stok awal" stock
 * movement the product never had, and books its value as Dr Persediaan / Cr Opening Balance Equity
 * (3400) — goods the outlet already owned before NEXBILL, not a purchase or income. Without this,
 * selling that opening stock credited Persediaan for value that was never debited, pushing the
 * account negative. Products with no stock (or no harga modal) produce no journal.
 */
export async function recordOpeningStock(
  outletId: string,
  created: { id: string; name: string; stockQty: number }[],
  staffUserId: string | undefined,
  dbc: DbOrTx = db
): Promise<string | null> {
  const withStock = created.filter((p) => p.stockQty > 0);
  if (withStock.length === 0) return null;

  await dbc.insert(stockMovements).values(
    withStock.map((p) => ({ productId: p.id, type: "adjustment" as const, qty: p.stockQty, note: "Stok awal", staffUserId }))
  );

  return postInventoryAdjustmentJournal(
    {
      outletId,
      reason: "opening",
      lines: withStock.map((p) => ({ productId: p.id, qtyDelta: p.stockQty })),
      reference: `STOK-AWAL-${withStock[0].id.slice(0, 8)}`,
      description: withStock.length === 1 ? `Stok awal — ${withStock[0].name}` : `Stok awal ${withStock.length} produk (import)`,
      sourceId: withStock.length === 1 ? withStock[0].id : undefined,
      staffUserId,
    },
    dbc
  );
}
