import { db } from "@/db/client";
import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { accountingPeriods, approvalRequests, journalEntries, orderItems, orders, products, receivables } from "@/db/schema";
import { computeTrialBalance } from "../reports";
import { outletDateYmd } from "@/lib/time/outlet-time";

/*
 * Pemeriksaan KEHATI-HATIAN (prudence) — hal yang membuat laporan terlihat lebih baik daripada
 * kenyataannya: aset yang dicatat melebihi nilai wajarnya, beban/kerugian yang belum diakui, saldo
 * yang mustahil secara akuntansi. Sejalan dengan SAK EMKM (pengukuran biaya historis, persediaan
 * tidak boleh melebihi biaya perolehannya, pos beban pajak di Laba Rugi). Semua hanya MEMBACA.
 */

export interface ContraBalance {
  code: string;
  name: string;
  type: string;
  balance: number;
}

/** Asset/liability/equity accounts sitting on the wrong side (e.g. Kas minus, Utang bersaldo debit) — impossible in reality, always an input or posting error. */
export async function findContraBalances(outletId: string): Promise<ContraBalance[]> {
  const tb = await computeTrialBalance(outletId);
  return tb
    .filter((r) => r.isPostingAllowed && ["asset", "liability", "equity"].includes(r.type) && r.balance < -0.5)
    .map((r) => ({ code: r.code, name: r.name, type: r.type, balance: r.balance }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

export interface InventoryValuation {
  bookValue: number; // Persediaan (116x) in the ledger
  stockValue: number; // Σ on-hand qty × harga modal
  difference: number; // book − stock
  negativeStock: { name: string; stockQty: number }[];
}

/**
 * Persediaan di buku vs nilai stok yang benar-benar ada (qty × harga modal rata-rata). SAK EMKM
 * mengukur persediaan pada biaya perolehannya — buku yang lebih besar dari stok berarti ada barang
 * hilang/rusak yang belum diakui sebagai beban; lebih kecil biasanya stok awal yang tidak pernah
 * dijurnal. Stok minus (terjual melebihi yang tercatat) didaftar terpisah.
 */
export async function checkInventoryValuation(outletId: string): Promise<InventoryValuation> {
  const tb = await computeTrialBalance(outletId);
  const bookValue = tb.filter((r) => r.isPostingAllowed && r.type === "asset" && r.code.startsWith("116")).reduce((s, r) => s + r.balance, 0);
  const rows = await db
    .select({ name: products.name, stockQty: products.stockQty, costPrice: products.costPrice, category: products.category })
    .from(products)
    .where(eq(products.outletId, outletId));
  const stockValue = rows.filter((p) => p.category !== "device_rental" && p.stockQty > 0).reduce((s, p) => s + p.stockQty * (p.costPrice ?? 0), 0);
  const negativeStock = rows.filter((p) => p.stockQty < 0).map((p) => ({ name: p.name, stockQty: p.stockQty }));
  const round = (n: number) => Math.round(n * 100) / 100;
  return { bookValue: round(bookValue), stockValue: round(stockValue), difference: round(bookValue - stockValue), negativeStock };
}

export interface AgedReceivable {
  id: string;
  orderId: string | null;
  outstanding: number;
  ageDays: number;
}

/** Piutang terbuka lebih dari `days` hari — kehati-hatian: pertimbangkan penyisihan/penghapusan, jangan dibiarkan seolah pasti tertagih. */
export async function findAgedReceivables(outletId: string, days = 60): Promise<AgedReceivable[]> {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  const rows = await db
    .select()
    .from(receivables)
    .where(and(eq(receivables.outletId, outletId), inArray(receivables.status, ["open", "partial"]), lt(receivables.createdAt, cutoff)));
  return rows
    .map((r) => ({ id: r.id, orderId: r.orderId, outstanding: Math.round((r.amount - r.paidAmount) * 100) / 100, ageDays: Math.floor((Date.now() - new Date(r.createdAt).getTime()) / 86400000) }))
    .filter((r) => r.outstanding > 0.5);
}

/** Active products sold in the last 90 days whose harga modal is still 0 — each such sale books HPP Rp0 and overstates laba kotor. */
export async function findProductsSoldWithoutCost(outletId: string): Promise<{ name: string; qtySold: number }[]> {
  const since = new Date(Date.now() - 90 * 86400000).toISOString();
  const rows = await db
    .select({ name: products.name, qty: sql<number>`sum(${orderItems.qty})::float` })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(
      and(
        eq(orders.outletId, outletId),
        inArray(orders.status, ["paid", "partial"]),
        gte(orders.createdAt, since),
        sql`coalesce(${products.costPrice}, 0) = 0`,
        sql`${products.category} <> 'device_rental'`,
        eq(orderItems.itemType, "product")
      )
    )
    .groupBy(products.name);
  return rows.map((r) => ({ name: r.name, qtySold: Number(r.qty) }));
}

export async function countPendingShiftReviews(outletId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(approvalRequests)
    .where(and(eq(approvalRequests.outletId, outletId), eq(approvalRequests.type, "shift_close_review"), eq(approvalRequests.status, "pending")));
  return Number(row?.n ?? 0);
}

/** Past months (before the current one) that have journals but were never closed via Tutup Periode — their numbers can still be changed after reporting. */
export async function findUnclosedPastPeriods(outletId: string): Promise<string[]> {
  const months = (await db.execute(sql`
    SELECT DISTINCT substr(entry_date, 1, 7) AS period FROM journal_entries WHERE outlet_id = ${outletId} ORDER BY 1
  `)) as unknown as { period: string }[];
  const closed = new Set(
    (await db.select({ period: accountingPeriods.period }).from(accountingPeriods).where(and(eq(accountingPeriods.outletId, outletId), eq(accountingPeriods.status, "closed")))).map((r) => r.period)
  );
  const current = outletDateYmd(new Date()).slice(0, 7);
  return months.map((m) => m.period).filter((p) => p < current && !closed.has(p));
}

export interface IncomeTaxCheck {
  year: string;
  grossRevenue: number; // peredaran bruto (pendapatan usaha, sebelum diskon) tahun berjalan
  taxExpensePosted: number; // 8500 Beban Pajak Penghasilan yang sudah dijurnal
  pphFinalEstimate: number; // 0,5% × peredaran bruto (PP 55/2022) — estimasi, bukan kewajiban pasti
}

/**
 * SAK EMKM: Laporan Laba Rugi memuat pos beban pajak. Untuk UMKM yang memakai PPh Final (PP 55/2022,
 * 0,5% dari peredaran bruto), ini estimasinya dibanding yang sudah dijurnal. Hanya pengingat:
 * kewajiban sebenarnya bergantung pada status wajib pajak (mis. WP orang pribadi tidak dikenai atas
 * peredaran bruto s.d. Rp500 juta setahun) — tidak pernah diposting otomatis.
 */
export async function checkIncomeTax(outletId: string): Promise<IncomeTaxCheck> {
  const year = outletDateYmd(new Date()).slice(0, 4);
  const tb = await computeTrialBalance(outletId, `${year}-01-01`, `${year}-12-31T23:59:59.999Z`);
  const operatingRevenue = tb.filter((r) => r.isPostingAllowed && r.type === "revenue" && /^4/.test(r.code) && !r.code.startsWith("49"));
  const grossRevenue = operatingRevenue.reduce((s, r) => s + r.balance, 0);
  const taxExpensePosted = tb.filter((r) => r.code === "8500").reduce((s, r) => s + r.balance, 0);
  const round = (n: number) => Math.round(n);
  return { year, grossRevenue: round(grossRevenue), taxExpensePosted: round(taxExpensePosted), pphFinalEstimate: round(grossRevenue * 0.005) };
}

/** Last journal date, for the "data terakhir" note. */
export async function lastJournalDate(outletId: string): Promise<string | null> {
  const [row] = await db.select({ d: sql<string>`max(${journalEntries.entryDate})` }).from(journalEntries).where(eq(journalEntries.outletId, outletId));
  return row?.d ?? null;
}
