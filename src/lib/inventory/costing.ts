import { db, type DbOrTx } from "@/db/client";
import { inventoryCostLayers, outlets, products, recipes, stockMovements } from "@/db/schema";
import { and, asc, eq, gt, inArray, isNotNull } from "drizzle-orm";
import { lockEntity } from "@/lib/accounting/journal";
import { logAudit } from "@/lib/audit/log";

/**
 * Metode penilaian persediaan per outlet: rata-rata tertimbang ("average", default) atau FIFO.
 *
 * AVERAGE — perilaku lama, tidak berubah: setiap pembelian mencampur harga baru ke
 * products.costPrice secara tertimbang (receiveStockForItem), dan HPP = qty × costPrice.
 *
 * FIFO — setiap barang masuk menjadi satu LAPISAN (inventory_cost_layers: qty + harga per unit).
 * Barang keluar (penjualan, bahan resep, opname kurang, rusak, retur) menghabiskan lapisan TERTUA
 * lebih dulu, dan harga lapisan yang terpakai itulah HPP-nya — dicatat di stock_movements.unit_cost
 * baris sale_out-nya, lalu dibaca postSalesJournal (computeItemCogs dengan orderId). Dengan begitu
 * saldo Persediaan di buku besar selalu sama dengan jumlah nilai lapisan yang tersisa.
 * products.costPrice ("Harga Modal" di tab Produk) = nilai lapisan tersisa ÷ qty tersisa.
 *
 * LIFO sengaja tidak ada: dilarang SAK EMKM/PSAK 14 dan UU PPh Pasal 10 ayat (6).
 *
 * Semua fungsi onStock* adalah no-op untuk outlet "average", jadi pemanggil cukup memanggilnya
 * tanpa memeriksa metode sendiri. Panggil SEBELUM stockQty produk diubah (kecuali disebut lain).
 */

export type CostMethod = "average" | "fifo";
export const COST_METHOD_LABEL: Record<CostMethod, string> = { average: "Rata-rata tertimbang", fifo: "FIFO (masuk pertama, keluar pertama)" };

const round2 = (n: number) => Math.round(n * 100) / 100;
const EPS = 1e-9;

export interface LayerLike {
  id: string;
  qtyRemaining: number;
  unitCost: number;
}

/**
 * Murni: rencana pengambilan `qty` unit dari lapisan (sudah terurut tertua dulu). Unit yang tidak
 * tertutup lapisan (stok minus / lapisan belum lengkap) dihargai `fallbackUnitCost`.
 */
export function planFifoIssue(layers: LayerLike[], qty: number, fallbackUnitCost: number) {
  let need = Math.max(0, qty);
  let cost = 0;
  const takes: { id: string; qty: number; unitCost: number }[] = [];
  for (const l of layers) {
    if (need <= EPS) break;
    if (l.qtyRemaining <= EPS) continue;
    const take = Math.min(need, l.qtyRemaining);
    takes.push({ id: l.id, qty: take, unitCost: l.unitCost });
    cost += take * l.unitCost;
    need -= take;
  }
  const shortfall = need > EPS ? need : 0;
  cost += shortfall * fallbackUnitCost;
  return { takes, cost: round2(cost), shortfall, unitCost: qty > 0 ? cost / qty : 0 };
}

/** Murni: qty, nilai, dan harga rata-rata lapisan yang tersisa. */
export function summarizeLayers(layers: Pick<LayerLike, "qtyRemaining" | "unitCost">[]) {
  const live = layers.filter((l) => l.qtyRemaining > EPS);
  const qty = live.reduce((s, l) => s + l.qtyRemaining, 0);
  const value = live.reduce((s, l) => s + l.qtyRemaining * l.unitCost, 0);
  return { qty, value: round2(value), unitCost: qty > EPS ? value / qty : 0 };
}

export async function getCostMethod(outletId: string, dbc: DbOrTx = db): Promise<CostMethod> {
  const [row] = await dbc.select({ m: outlets.inventoryCostMethod }).from(outlets).where(eq(outlets.id, outletId)).limit(1);
  return row?.m === "fifo" ? "fifo" : "average";
}

async function inTx<T>(dbc: DbOrTx, fn: (tx: DbOrTx) => Promise<T>): Promise<T> {
  return dbc === db ? db.transaction((tx) => fn(tx)) : fn(dbc);
}

async function loadFifoProduct(dbc: DbOrTx, productId: string) {
  const [p] = await dbc
    .select({ id: products.id, outletId: products.outletId, stockQty: products.stockQty, costPrice: products.costPrice })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  if (!p) return null;
  return (await getCostMethod(p.outletId, dbc)) === "fifo" ? p : null;
}

async function liveLayers(dbc: DbOrTx, productId: string) {
  return dbc
    .select()
    .from(inventoryCostLayers)
    .where(and(eq(inventoryCostLayers.productId, productId), gt(inventoryCostLayers.qtyRemaining, 0)))
    .orderBy(asc(inventoryCostLayers.receivedAt), asc(inventoryCostLayers.createdAt));
}

/** products.costPrice ← rata-rata lapisan tersisa (dibiarkan bila lapisan habis: harga terakhir tetap jadi acuan). */
async function refreshCostPrice(dbc: DbOrTx, productId: string) {
  const s = summarizeLayers(await liveLayers(dbc, productId));
  if (s.qty > EPS) await dbc.update(products).set({ costPrice: round2(s.unitCost) }).where(eq(products.id, productId));
}

/**
 * Barang masuk (FIFO): tambah satu lapisan. `stockBefore` = stok SEBELUM barang ini masuk; bila
 * minus, unit yang menutup stok minus itu sudah dijual (dan dihargai) sebelumnya, jadi tidak ikut
 * menjadi lapisan. `unitCost` kosong = harga modal saat ini.
 */
export async function onStockIn(
  dbc: DbOrTx,
  input: { productId: string; qty: number; unitCost?: number | null; source: "purchase" | "opening" | "adjustment" | "restock"; refId?: string | null; stockBefore?: number }
): Promise<{ unitCost: number } | null> {
  if (!(input.qty > 0)) return null;
  // Cheap check first: rata-rata outlets (the default) never open a transaction here.
  if (!(await loadFifoProduct(dbc, input.productId))) return null;
  return inTx(dbc, async (tx) => {
    await lockEntity(tx, `product_cost:${input.productId}`);
    const p = await loadFifoProduct(tx, input.productId);
    if (!p) return null;
    const before = input.stockBefore ?? p.stockQty;
    const layerQty = input.qty - Math.max(0, -before);
    const unitCost = input.unitCost != null && input.unitCost >= 0 ? input.unitCost : p.costPrice ?? 0;
    if (layerQty > EPS) {
      await tx.insert(inventoryCostLayers).values({
        outletId: p.outletId,
        productId: p.id,
        qtyInitial: layerQty,
        qtyRemaining: layerQty,
        unitCost,
        source: input.source,
        refId: input.refId ?? null,
      });
    }
    await refreshCostPrice(tx, p.id);
    return { unitCost };
  });
}

/**
 * Barang keluar (FIFO): habiskan lapisan tertua. Mengembalikan total harga pokok unit yang keluar
 * (atau null untuk outlet "average"). `preferRefId` = habiskan lapisan dari dokumen itu dulu (mis.
 * retur/pembatalan faktur pembelian mengeluarkan barang dari faktur itu sendiri).
 */
export async function onStockOut(dbc: DbOrTx, input: { productId: string; qty: number; preferRefId?: string | null }): Promise<{ cost: number; unitCost: number } | null> {
  if (!(input.qty > 0)) return null;
  if (!(await loadFifoProduct(dbc, input.productId))) return null;
  return inTx(dbc, async (tx) => {
    await lockEntity(tx, `product_cost:${input.productId}`);
    const p = await loadFifoProduct(tx, input.productId);
    if (!p) return null;
    let layers = await liveLayers(tx, p.id);
    if (input.preferRefId) layers = [...layers.filter((l) => l.refId === input.preferRefId), ...layers.filter((l) => l.refId !== input.preferRefId)];
    const plan = planFifoIssue(layers, input.qty, p.costPrice ?? 0);
    const now = new Date().toISOString();
    for (const t of plan.takes) {
      const layer = layers.find((l) => l.id === t.id)!;
      await tx
        .update(inventoryCostLayers)
        .set({ qtyRemaining: Math.max(0, round6(layer.qtyRemaining - t.qty)), updatedAt: now })
        .where(eq(inventoryCostLayers.id, t.id));
    }
    await refreshCostPrice(tx, p.id);
    return { cost: plan.cost, unitCost: plan.unitCost };
  });
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/**
 * Harga pokok per unit sebuah produk di satu order (FIFO): rata-rata unit_cost baris sale_out
 * order itu, yang dicatat saat stok dikurangi. null bila tidak ada catatan (outlet "average",
 * atau order lama sebelum FIFO) — pemanggil lalu memakai harga modal biasa.
 */
export async function orderUnitCost(dbc: DbOrTx, orderId: string, productId: string): Promise<number | null> {
  const rows = await dbc
    .select({ qty: stockMovements.qty, unitCost: stockMovements.unitCost })
    .from(stockMovements)
    .where(and(eq(stockMovements.refOrderId, orderId), eq(stockMovements.productId, productId), eq(stockMovements.type, "sale_out"), isNotNull(stockMovements.unitCost)));
  const qty = rows.reduce((s, r) => s + Math.abs(r.qty), 0);
  if (qty <= EPS) return null;
  return rows.reduce((s, r) => s + Math.abs(r.qty) * (r.unitCost ?? 0), 0) / qty;
}

/** Lapisan FIFO yang masih bersisa untuk seluruh produk outlet — ditampilkan di tab Produk. */
export async function listOutletLayers(outletId: string) {
  return db
    .select({ productId: inventoryCostLayers.productId, receivedAt: inventoryCostLayers.receivedAt, qtyRemaining: inventoryCostLayers.qtyRemaining, unitCost: inventoryCostLayers.unitCost, source: inventoryCostLayers.source })
    .from(inventoryCostLayers)
    .where(and(eq(inventoryCostLayers.outletId, outletId), gt(inventoryCostLayers.qtyRemaining, 0)))
    .orderBy(asc(inventoryCostLayers.receivedAt), asc(inventoryCostLayers.createdAt));
}

/**
 * Ganti metode penilaian outlet.
 *  - ke FIFO: stok yang ada saat ini menjadi SATU lapisan pembuka per produk, sebesar stok × harga
 *    modal sekarang. Nilai Persediaan tidak berubah sedikit pun (tidak ada jurnal), hanya cara
 *    menghitung HPP barang keluar berikutnya.
 *  - ke rata-rata: harga modal sekarang (= rata-rata lapisan tersisa) menjadi titik awal rata-rata.
 *    Lapisan lama dibiarkan (tidak dipakai lagi) dan dibangun ulang bila kembali ke FIFO.
 */
export async function switchCostMethod(outletId: string, method: CostMethod, staffUserId?: string) {
  if (method !== "average" && method !== "fifo") throw new Error("Metode tidak dikenal. Pilih rata-rata tertimbang atau FIFO.");
  const result = await db.transaction(async (tx) => {
    await lockEntity(tx, `inventory_cost_method:${outletId}`);
    const current = await getCostMethod(outletId, tx);
    if (current === method) return { changed: false, from: current, layers: 0 };
    let layers = 0;
    if (method === "fifo") {
      const rows = await tx
        .select({ id: products.id, stockQty: products.stockQty, costPrice: products.costPrice })
        .from(products)
        .where(and(eq(products.outletId, outletId), eq(products.isActive, true), gt(products.stockQty, 0)));
      const recipeProductIds = new Set(
        rows.length ? (await tx.select({ productId: recipes.productId }).from(recipes).where(inArray(recipes.productId, rows.map((r) => r.id)))).map((r) => r.productId) : []
      );
      await tx.delete(inventoryCostLayers).where(eq(inventoryCostLayers.outletId, outletId));
      const values = rows
        .filter((r) => !recipeProductIds.has(r.id))
        .map((r) => ({ outletId, productId: r.id, qtyInitial: r.stockQty, qtyRemaining: r.stockQty, unitCost: r.costPrice ?? 0, source: "switch" as const, refId: null }));
      if (values.length) await tx.insert(inventoryCostLayers).values(values);
      layers = values.length;
    }
    await tx.update(outlets).set({ inventoryCostMethod: method, inventoryCostMethodSince: new Date().toISOString() }).where(eq(outlets.id, outletId));
    return { changed: true, from: current, layers };
  });
  if (result.changed) {
    await logAudit({ outletId, staffUserId, action: "change_inventory_cost_method", entityType: "outlet", entityId: outletId, before: { method: result.from }, after: { method, openingLayers: result.layers } });
  }
  return result;
}

/**
 * Pemeriksaan FIFO untuk tab Audit: produk yang qty lapisannya tidak sama dengan stok (mis. stok
 * diubah lewat jalur yang tidak tercatat). Lapisan lebih banyak dari stok tidak berbahaya bagi
 * HPP berikutnya kecuali selisihnya besar; lapisan kurang berarti sebagian unit dihargai harga
 * modal terakhir.
 */
export async function findLayerDrift(outletId: string) {
  if ((await getCostMethod(outletId)) !== "fifo") return [];
  const [prods, layers] = await Promise.all([
    db.select({ id: products.id, name: products.name, stockQty: products.stockQty }).from(products).where(and(eq(products.outletId, outletId), eq(products.isActive, true))),
    listOutletLayers(outletId),
  ]);
  const recipeIds = new Set(
    prods.length ? (await db.select({ productId: recipes.productId }).from(recipes).where(inArray(recipes.productId, prods.map((p) => p.id)))).map((r) => r.productId) : []
  );
  const byProduct = new Map<string, number>();
  for (const l of layers) byProduct.set(l.productId, (byProduct.get(l.productId) ?? 0) + l.qtyRemaining);
  return prods
    .filter((p) => !recipeIds.has(p.id))
    .map((p) => ({ ...p, layerQty: round2(byProduct.get(p.id) ?? 0) }))
    .filter((p) => Math.abs(Math.max(0, p.stockQty) - p.layerQty) > 0.01);
}

/** Menyamakan qty lapisan dengan stok: kelebihan lapisan dihabiskan dari yang tertua, kekurangan ditambah pada harga modal saat ini. */
export async function reconcileLayers(outletId: string) {
  const drift = await findLayerDrift(outletId);
  for (const d of drift) {
    const target = Math.max(0, d.stockQty);
    if (d.layerQty > target) await onStockOut(db, { productId: d.id, qty: d.layerQty - target });
    else await onStockIn(db, { productId: d.id, qty: target - d.layerQty, source: "adjustment", stockBefore: 0 });
  }
  return drift.length;
}
