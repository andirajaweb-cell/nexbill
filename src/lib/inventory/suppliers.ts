import { db, type DbOrTx } from "@/db/client";
import {
  assetPurchases,
  expenses,
  fixedAssets,
  products,
  purchaseInvoices,
  purchaseOrders,
  purchaseReturns,
  recurringExpenseTemplates,
  suppliers,
} from "@/db/schema";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import { logAudit } from "@/lib/audit/log";

/**
 * Master data supplier: tambah, edit, arsipkan, pulihkan, hapus.
 *
 * Aturan hapus vs arsip: supplier yang sudah dipakai di transaksi apa pun (faktur, PO, retur,
 * expense, template expense rutin, aset, pembelian aset) TIDAK boleh dihapus — riwayat itu harus
 * tetap menunjuk ke supplier yang benar. Untuk itu ada Arsipkan: supplier hilang dari pilihan
 * transaksi baru, tapi riwayatnya utuh dan bisa dipulihkan kapan saja. Hanya supplier yang belum
 * pernah dipakai yang bisa dihapus permanen.
 *
 * Setiap operasi dibatasi ke outlet pemanggil — supplier outlet lain dianggap tidak ada.
 */

export interface SupplierInput {
  name?: string;
  phone?: string | null;
  address?: string | null;
  paymentTermsDays?: number | null;
  notes?: string | null;
}

export interface SupplierUsage {
  purchaseInvoices: number;
  purchaseOrders: number;
  purchaseReturns: number;
  expenses: number;
  recurringExpenses: number;
  fixedAssets: number;
  assetPurchases: number;
  products: number;
  total: number;
}

const clean = (v: string | null | undefined) => {
  const s = (v ?? "").trim();
  return s ? s : null;
};

function normalize(input: SupplierInput, partial: boolean) {
  const out: Partial<typeof suppliers.$inferInsert> = {};
  if (!partial || input.name !== undefined) {
    const name = (input.name ?? "").trim().replace(/\s+/g, " ");
    if (!name) throw new Error("Nama supplier wajib diisi.");
    if (name.length > 120) throw new Error("Nama supplier maksimal 120 karakter.");
    out.name = name;
  }
  if (!partial || input.phone !== undefined) out.phone = clean(input.phone);
  if (!partial || input.address !== undefined) out.address = clean(input.address);
  if (!partial || input.notes !== undefined) out.notes = clean(input.notes);
  if (!partial || input.paymentTermsDays !== undefined) {
    const days = Number(input.paymentTermsDays ?? 0) || 0;
    if (!Number.isInteger(days) || days < 0 || days > 365) throw new Error("Termin pembayaran harus 0–365 hari.");
    out.paymentTermsDays = days;
  }
  return out;
}

/** Nama supplier aktif harus unik per outlet (tanpa beda huruf besar/kecil) — mencegah "Shopee Seller" dobel. */
async function assertUniqueName(outletId: string, name: string, exceptId?: string) {
  const conds = [eq(suppliers.outletId, outletId), isNull(suppliers.archivedAt), sql`lower(${suppliers.name}) = lower(${name})`];
  if (exceptId) conds.push(ne(suppliers.id, exceptId));
  const [dup] = await db.select({ id: suppliers.id }).from(suppliers).where(and(...conds)).limit(1);
  if (dup) throw new Error(`Supplier "${name}" sudah ada. Gunakan supplier itu, atau beri nama yang berbeda.`);
}

async function requireSupplier(outletId: string, id: string, dbc: DbOrTx = db) {
  const [row] = await dbc.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
  if (!row || row.outletId !== outletId) throw new Error("Supplier tidak ditemukan.");
  return row;
}

/**
 * Dipanggil jalur pembuatan transaksi yang memilih supplier: supplier harus milik outlet ini, dan
 * (kecuali `allowArchived`, mis. retur atas faktur lama) belum diarsipkan.
 */
export async function assertSupplierUsable(outletId: string, supplierId: string | null | undefined, dbc: DbOrTx = db, opts: { allowArchived?: boolean } = {}) {
  if (!supplierId) return;
  const row = await requireSupplier(outletId, supplierId, dbc);
  if (row.archivedAt && !opts.allowArchived) throw new Error(`Supplier "${row.name}" sudah diarsipkan. Pulihkan dulu di Inventory → Supplier bila masih dipakai.`);
}

export async function getSupplierUsage(supplierId: string): Promise<SupplierUsage> {
  const count = async (table: PgTable, col: AnyPgColumn) => {
    const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(table).where(eq(col, supplierId));
    return r?.n ?? 0;
  };
  const [pi, po, pr, ex, rt, fa, ap, pd] = await Promise.all([
    count(purchaseInvoices, purchaseInvoices.supplierId),
    count(purchaseOrders, purchaseOrders.supplierId),
    count(purchaseReturns, purchaseReturns.supplierId),
    count(expenses, expenses.supplierId),
    count(recurringExpenseTemplates, recurringExpenseTemplates.supplierId),
    count(fixedAssets, fixedAssets.supplierId),
    count(assetPurchases, assetPurchases.supplierId),
    count(products, products.preferredSupplierId),
  ]);
  return { purchaseInvoices: pi, purchaseOrders: po, purchaseReturns: pr, expenses: ex, recurringExpenses: rt, fixedAssets: fa, assetPurchases: ap, products: pd, total: pi + po + pr + ex + rt + fa + ap + pd };
}

export function describeUsage(u: SupplierUsage): string {
  const parts: string[] = [];
  if (u.purchaseInvoices) parts.push(`${u.purchaseInvoices} faktur pembelian`);
  if (u.purchaseOrders) parts.push(`${u.purchaseOrders} purchase order`);
  if (u.purchaseReturns) parts.push(`${u.purchaseReturns} retur`);
  if (u.expenses) parts.push(`${u.expenses} expense`);
  if (u.recurringExpenses) parts.push(`${u.recurringExpenses} expense rutin`);
  if (u.fixedAssets) parts.push(`${u.fixedAssets} aset`);
  if (u.assetPurchases) parts.push(`${u.assetPurchases} pembelian aset`);
  if (u.products) parts.push(`${u.products} produk (supplier utama)`);
  return parts.join(", ");
}

export async function createSupplier(outletId: string, input: SupplierInput, staffUserId?: string) {
  const values = normalize(input, false);
  await assertUniqueName(outletId, values.name!);
  const [row] = await db.insert(suppliers).values({ ...values, name: values.name!, outletId }).returning();
  await logAudit({ outletId, staffUserId, action: "create_supplier", entityType: "supplier", entityId: row.id, after: values });
  return row;
}

export async function updateSupplier(outletId: string, id: string, input: SupplierInput, staffUserId?: string) {
  const before = await requireSupplier(outletId, id);
  const patch = normalize(input, true);
  if (patch.name && patch.name.toLowerCase() !== before.name.toLowerCase() && !before.archivedAt) await assertUniqueName(outletId, patch.name, id);
  const [row] = await db.update(suppliers).set({ ...patch, updatedAt: new Date().toISOString() }).where(eq(suppliers.id, id)).returning();
  await logAudit({ outletId, staffUserId, action: "update_supplier", entityType: "supplier", entityId: id, before: { name: before.name, phone: before.phone, address: before.address, paymentTermsDays: before.paymentTermsDays, notes: before.notes }, after: patch });
  return row;
}

export async function setSupplierArchived(outletId: string, id: string, archived: boolean, staffUserId?: string) {
  const before = await requireSupplier(outletId, id);
  if (!archived && before.archivedAt) await assertUniqueName(outletId, before.name, id);
  const [row] = await db
    .update(suppliers)
    .set({ archivedAt: archived ? before.archivedAt ?? new Date().toISOString() : null, updatedAt: new Date().toISOString() })
    .where(eq(suppliers.id, id))
    .returning();
  await logAudit({ outletId, staffUserId, action: archived ? "archive_supplier" : "unarchive_supplier", entityType: "supplier", entityId: id, before: { name: before.name } });
  return row;
}

/** Hapus permanen — hanya bila supplier belum pernah dipakai di mana pun. */
export async function deleteSupplier(outletId: string, id: string, staffUserId?: string) {
  const before = await requireSupplier(outletId, id);
  const usage = await getSupplierUsage(id);
  if (usage.total > 0) {
    throw new Error(`Supplier "${before.name}" tidak bisa dihapus karena sudah dipakai di ${describeUsage(usage)}. Arsipkan saja — riwayatnya tetap utuh dan supplier tidak muncul lagi di pilihan.`);
  }
  await db.delete(suppliers).where(and(eq(suppliers.id, id), eq(suppliers.outletId, outletId)));
  await logAudit({ outletId, staffUserId, action: "delete_supplier", entityType: "supplier", entityId: id, before: { name: before.name, phone: before.phone, address: before.address } });
  return { ok: true };
}

/** Daftar supplier outlet + jumlah pemakaian (satu query agregat per tabel, bukan per supplier). */
export async function listSuppliersWithUsage(outletId: string) {
  const rows = await db.select().from(suppliers).where(eq(suppliers.outletId, outletId)).orderBy(suppliers.name);
  if (!rows.length) return [];
  const grouped = async (table: PgTable, col: AnyPgColumn, outletCol: AnyPgColumn) => {
    const r = (await db
      .select({ id: col, n: sql<number>`count(*)::int` })
      .from(table)
      .where(eq(outletCol, outletId))
      .groupBy(col)) as { id: string | null; n: number }[];
    return new Map(r.filter((x) => x.id).map((x) => [x.id as string, x.n]));
  };
  const maps = await Promise.all([
    grouped(purchaseInvoices, purchaseInvoices.supplierId, purchaseInvoices.outletId),
    grouped(purchaseOrders, purchaseOrders.supplierId, purchaseOrders.outletId),
    grouped(purchaseReturns, purchaseReturns.supplierId, purchaseReturns.outletId),
    grouped(expenses, expenses.supplierId, expenses.outletId),
    grouped(recurringExpenseTemplates, recurringExpenseTemplates.supplierId, recurringExpenseTemplates.outletId),
    grouped(fixedAssets, fixedAssets.supplierId, fixedAssets.outletId),
    grouped(assetPurchases, assetPurchases.supplierId, assetPurchases.outletId),
    grouped(products, products.preferredSupplierId, products.outletId),
  ]);
  return rows.map((s) => ({ ...s, usageCount: maps.reduce((sum, m) => sum + (m.get(s.id) ?? 0), 0) }));
}
