import { db, type DbOrTx } from "@/db/client";
import {
  assetDepreciationEntries,
  assetPurchaseItems,
  assetPurchasePayments,
  assetPurchases,
  cashBankAccounts,
  fixedAssets,
  rentalUnits,
  suppliers,
} from "@/db/schema";
import { and, eq, inArray, like, ne, sql } from "drizzle-orm";
import { lockEntity, postJournal, voidJournal, type JournalLineInput } from "./journal";
import { getMappedAccountId } from "./account-mapping";
import { EXPENSE_PAYABLE_ACCOUNT_CODE } from "./coa";
import { prorateLandedCosts } from "@/lib/inventory/purchasing";
import { resolveDrawerShiftId } from "@/lib/shift/drawer";
import { outletDateYmd } from "@/lib/time/outlet-time";
import { logAudit } from "@/lib/audit/log";
import { assertSupplierUsable } from "@/lib/inventory/suppliers";

/**
 * Pembelian Aset Tetap — satu dokumen pembelian yang bisa berisi beberapa baris barang.
 *
 * Perlakuan akuntansi (SAK EMKM, aset tetap dicatat sebesar biaya perolehan):
 *  - Harga perolehan = harga beli + bagian ongkos kirim/pemasangan (dibagi proporsional ke tiap
 *    baris dengan prorateLandedCosts, fungsi yang sama dengan Belanja Supplier). Ongkos itu
 *    dikapitalisasi, BUKAN dibebankan.
 *  - Setiap unit menjadi satu baris fixed_assets (qty 3 → 3 aset), sehingga tab Daftar Aset dan
 *    Penyusutan langsung bekerja per unit tanpa perubahan apa pun, dan tiap unit bisa dilepas
 *    sendiri-sendiri.
 *  - SATU jurnal per pembelian (sumber "asset_purchase", sourceId = id pembelian):
 *      Dr Aset per kategori (Account Mapping modul "asset")
 *        Cr Kas/Bank          — bagian yang dibayar saat itu
 *        Cr Utang Pembelian Aset (Account Mapping other/asset_purchase_payable, bawaan 2163)
 *                             — sisanya, kalau dicatat sebagai utang / DP
 *        Cr Ekuitas Saldo Awal (3400) — untuk aset yang sudah dimiliki sebelum memakai NEXBILL
 *  - Pelunasan utang: satu jurnal per pembayaran (sumber "asset_purchase_payment"),
 *    Dr Utang Pembelian Aset / Cr Kas-Bank. Utangnya tampil di Accounting → tab Utang.
 *  - Pembatalan: hanya bila belum ada satu pun unit yang disusutkan atau dilepas. Semua jurnal
 *    (pembelian + pembayaran) dibalik dengan voidJournal, asetnya ditandai "disposed" dengan
 *    alasan pembatalan. Tidak ada baris yang dihapus.
 *
 * Isolasi outlet: supplier, akun kas/bank, dan unit rental wajib milik outlet yang sama (dicek di
 * sini), dan postJournal menolak akun COA outlet lain (assertPostableAccountIds + trigger 0019).
 */

export type AssetCategory = "playstation" | "tv" | "controller" | "furniture" | "vehicle" | "other";
const CATEGORIES: AssetCategory[] = ["playstation", "tv", "controller", "furniture", "vehicle", "other"];
const ASSET_FALLBACK: Record<AssetCategory, string> = { playstation: "1214", tv: "1221", controller: "1231", furniture: "1241", vehicle: "1245", other: "1244" };
export const OPENING_BALANCE_EQUITY_CODE = "3400";

const round = (n: number) => Math.round(n);

export type AssetPurchaseFunding = "paid" | "payable" | "partial" | "opening_balance";

export interface AssetPurchaseItemInput {
  name: string;
  category: AssetCategory;
  qty: number;
  unitCost: number;
  usefulLifeMonths: number;
  salvageValue?: number;
  rentalUnitId?: string | null;
}

export interface CreateAssetPurchaseInput {
  outletId: string;
  staffUserId?: string;
  supplierId?: string | null;
  invoiceNumber?: string | null;
  /** YYYY-MM-DD (tanggal outlet) atau ISO. Kosong = sekarang. */
  purchaseDate?: string | null;
  dueDate?: string | null;
  items: AssetPurchaseItemInput[];
  /** Ongkos kirim/pemasangan/instalasi — dikapitalisasi ke harga perolehan. */
  additionalCost?: number;
  funding: AssetPurchaseFunding;
  /** Wajib untuk "paid" dan "partial". */
  cashBankAccountId?: string | null;
  paymentMethod?: string | null;
  /** Nominal yang dibayar sekarang — hanya untuk "partial" (DP). */
  paidNow?: number;
  notes?: string | null;
}

async function assetAccountId(outletId: string, category: AssetCategory, dbc: DbOrTx) {
  return getMappedAccountId(outletId, "asset", category, ASSET_FALLBACK[category] ?? "1244", dbc);
}
export async function assetPurchasePayableAccountId(outletId: string, dbc: DbOrTx = db) {
  return getMappedAccountId(outletId, "other", "asset_purchase_payable", EXPENSE_PAYABLE_ACCOUNT_CODE, dbc);
}

/** Tanggal input → ISO. Tanggal hari ini memakai jam sekarang; tanggal lain dipatok 12.00 WIB supaya tidak bergeser hari. */
function toEntryDate(value: string | null | undefined): string {
  if (!value) return new Date().toISOString();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    if (value === outletDateYmd(new Date())) return new Date().toISOString();
    return new Date(`${value}T12:00:00+07:00`).toISOString();
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error("Tanggal pembelian tidak valid.");
  return d.toISOString();
}

async function requireCashBank(outletId: string, cashBankAccountId: string, dbc: DbOrTx) {
  const [row] = await dbc.select().from(cashBankAccounts).where(eq(cashBankAccounts.id, cashBankAccountId)).limit(1);
  if (!row || row.outletId !== outletId) throw new Error("Akun kas/bank tidak ditemukan di outlet ini.");
  return row;
}

async function nextPurchaseNumber(outletId: string, entryDate: string, tx: DbOrTx) {
  const ymd = outletDateYmd(new Date(entryDate)).replace(/-/g, "");
  const prefix = `PA-${ymd}-`;
  const [row] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(assetPurchases)
    .where(and(eq(assetPurchases.outletId, outletId), like(assetPurchases.purchaseNumber, `${prefix}%`)));
  return `${prefix}${String((row?.n ?? 0) + 1).padStart(3, "0")}`;
}

function validateItems(items: AssetPurchaseItemInput[]) {
  if (!Array.isArray(items) || items.length === 0) throw new Error("Pembelian aset harus punya minimal 1 barang.");
  for (const [i, it] of items.entries()) {
    const row = `Baris ${i + 1}`;
    if (!it.name?.trim()) throw new Error(`${row}: nama aset wajib diisi.`);
    if (!CATEGORIES.includes(it.category)) throw new Error(`${row}: kategori aset tidak dikenal.`);
    if (!Number.isInteger(Number(it.qty)) || Number(it.qty) <= 0) throw new Error(`${row}: qty harus bilangan bulat lebih dari 0.`);
    if (Number(it.qty) > 100) throw new Error(`${row}: qty maksimal 100 unit per baris.`);
    if (!(Number(it.unitCost) > 0)) throw new Error(`${row}: harga satuan harus lebih dari 0.`);
    if (!Number.isInteger(Number(it.usefulLifeMonths)) || Number(it.usefulLifeMonths) <= 0) throw new Error(`${row}: umur ekonomis (bulan) harus lebih dari 0.`);
    if ((Number(it.salvageValue) || 0) < 0) throw new Error(`${row}: nilai sisa tidak boleh negatif.`);
    if (it.rentalUnitId && Number(it.qty) !== 1) throw new Error(`${row}: unit PS terkait hanya bisa dipilih untuk qty 1.`);
  }
}

/**
 * Pure cost plan for a purchase: ongkos prorated into each line (prorateLandedCosts), then one
 * acquisition cost per UNIT in whole rupiah. The rounding residual goes to the last unit, so the
 * units always sum to exactly `total` — the journal's debit side — and the purchase journal can
 * never be off by a rupiah against the asset register.
 */
export function planAssetPurchase(inputItems: AssetPurchaseItemInput[], additionalCostInput?: number) {
  validateItems(inputItems);
  const items = inputItems.map((it) => ({
    ...it,
    name: it.name.trim(),
    qty: Number(it.qty),
    unitCost: Number(it.unitCost),
    usefulLifeMonths: Number(it.usefulLifeMonths),
    salvageValue: Number(it.salvageValue) || 0,
    rentalUnitId: it.rentalUnitId || null,
  }));
  const additionalCost = Math.max(0, Number(additionalCostInput) || 0);
  const { itemsSubtotal, lineBreakdown } = prorateLandedCosts(items, additionalCost);

  const units: { line: (typeof lineBreakdown)[number]; cost: number }[] = [];
  for (const line of lineBreakdown) for (let u = 0; u < line.qty; u++) units.push({ line, cost: round(line.landedUnitCost) });
  const total = round(itemsSubtotal + additionalCost);
  units[units.length - 1].cost += total - units.reduce((s, u) => s + u.cost, 0);
  for (const u of units) {
    if (u.cost <= 0) throw new Error("Harga perolehan per unit harus lebih dari 0.");
    if (u.line.salvageValue >= u.cost) throw new Error(`Nilai sisa "${u.line.name}" harus lebih kecil dari harga perolehannya.`);
  }
  return { itemsSubtotal, additionalCost, total, lineBreakdown, units };
}

export async function createAssetPurchase(input: CreateAssetPurchaseInput) {
  const { itemsSubtotal, additionalCost, total, lineBreakdown, units } = planAssetPurchase(input.items, input.additionalCost);
  const items = lineBreakdown;

  const funding = input.funding;
  if (!["paid", "payable", "partial", "opening_balance"].includes(funding)) throw new Error("Cara pembayaran tidak dikenal.");
  let paidNow = 0;
  if (funding === "paid") paidNow = total;
  if (funding === "partial") {
    paidNow = round(Number(input.paidNow) || 0);
    if (paidNow <= 0 || paidNow >= total) throw new Error("Uang muka (DP) harus lebih dari 0 dan kurang dari total pembelian.");
  }
  if (paidNow > 0 && !input.cashBankAccountId) throw new Error("Pilih akun kas/bank sumber pembayaran.");
  const entryDate = toEntryDate(input.purchaseDate);

  const result = await db.transaction(async (tx) => {
    await lockEntity(tx, `asset_purchase_seq:${input.outletId}`);

    // Outlet isolation for every referenced row.
    await assertSupplierUsable(input.outletId, input.supplierId, tx);
    const unitIds = items.map((i) => i.rentalUnitId).filter((v): v is string => Boolean(v));
    if (new Set(unitIds).size !== unitIds.length) throw new Error("Satu unit PS tidak bisa ditautkan ke dua aset.");
    if (unitIds.length) {
      const rows = await tx.select({ id: rentalUnits.id, outletId: rentalUnits.outletId }).from(rentalUnits).where(inArray(rentalUnits.id, unitIds));
      if (rows.length !== unitIds.length || rows.some((r) => r.outletId !== input.outletId)) throw new Error("Unit PS terkait tidak ditemukan di outlet ini.");
      const taken = await tx
        .select({ name: fixedAssets.name })
        .from(fixedAssets)
        .where(and(inArray(fixedAssets.rentalUnitId, unitIds), ne(fixedAssets.status, "disposed")))
        .limit(1);
      if (taken.length) throw new Error(`Unit PS itu sudah ditautkan ke aset "${taken[0].name}". Lepas aset lama dulu atau kosongkan pilihan unit.`);
    }
    const cashBank = paidNow > 0 ? await requireCashBank(input.outletId, input.cashBankAccountId!, tx) : null;
    const shiftId = cashBank ? await resolveDrawerShiftId(input.outletId, input.staffUserId, tx) : null;

    const purchaseNumber = await nextPurchaseNumber(input.outletId, entryDate, tx);
    const status = funding === "paid" || funding === "opening_balance" ? "paid" : paidNow > 0 ? "partial" : "unpaid";
    const [purchase] = await tx
      .insert(assetPurchases)
      .values({
        outletId: input.outletId,
        purchaseNumber,
        supplierId: input.supplierId || null,
        invoiceNumber: input.invoiceNumber?.trim() || null,
        purchaseDate: entryDate,
        dueDate: funding === "payable" || funding === "partial" ? input.dueDate || null : null,
        subtotal: round(itemsSubtotal),
        additionalCost: round(additionalCost),
        total,
        // "opening_balance" is not a debt — treat it as settled so it never shows in Utang.
        paidAmount: funding === "opening_balance" ? total : paidNow,
        status,
        paymentMethod: funding === "opening_balance" ? "opening_balance" : paidNow > 0 ? input.paymentMethod || cashBank?.type || "cash" : null,
        cashBankAccountId: cashBank?.id ?? null,
        shiftId,
        notes: input.notes?.trim() || null,
        staffUserId: input.staffUserId,
      })
      .returning();

    const itemRows = await tx
      .insert(assetPurchaseItems)
      .values(
        lineBreakdown.map((l) => ({
          assetPurchaseId: purchase.id,
          name: l.name,
          category: l.category,
          qty: l.qty,
          unitCost: l.unitCost,
          landedUnitCost: Math.round(l.landedUnitCost * 100) / 100,
          usefulLifeMonths: l.usefulLifeMonths,
          salvageValue: l.salvageValue,
          rentalUnitId: l.rentalUnitId,
        }))
      )
      .returning();

    // One fixed asset per unit.
    const assetRows = await tx
      .insert(fixedAssets)
      .values(
        units.map((u) => {
          const seq = u.line.qty > 1 ? ` #${units.filter((x) => x.line === u.line).indexOf(u) + 1}` : "";
          return {
            outletId: input.outletId,
            name: `${u.line.name}${seq}`,
            category: u.line.category,
            rentalUnitId: u.line.rentalUnitId,
            acquisitionDate: entryDate,
            acquisitionCost: u.cost,
            salvageValue: u.line.salvageValue,
            usefulLifeMonths: u.line.usefulLifeMonths,
            supplierId: input.supplierId || null,
            notes: `Pembelian ${purchaseNumber}${input.notes?.trim() ? ` — ${input.notes.trim()}` : ""}`,
            staffUserId: input.staffUserId,
            purchaseId: purchase.id,
          };
        })
      )
      .returning();

    // Journal: debit per asset account (grouped by category), credits per funding source.
    const debitByCategory = new Map<AssetCategory, number>();
    for (const u of units) debitByCategory.set(u.line.category, (debitByCategory.get(u.line.category) ?? 0) + u.cost);
    const lines: JournalLineInput[] = [];
    for (const [category, amount] of debitByCategory) {
      const names = [...new Set(units.filter((u) => u.line.category === category).map((u) => u.line.name))].join(", ");
      lines.push({ accountId: await assetAccountId(input.outletId, category, tx), debit: amount, credit: 0, description: names });
    }
    if (funding === "opening_balance") {
      lines.push({ accountCode: OPENING_BALANCE_EQUITY_CODE, debit: 0, credit: total, description: "Aset saldo awal (sudah dimiliki)" });
    } else {
      if (paidNow > 0) lines.push({ accountId: cashBank!.accountId, debit: 0, credit: paidNow, description: `Pembayaran ${purchaseNumber} (${cashBank!.name})` });
      if (total - paidNow > 0) {
        lines.push({ accountId: await assetPurchasePayableAccountId(input.outletId, tx), debit: 0, credit: total - paidNow, description: `Utang pembelian aset ${purchaseNumber}` });
      }
    }
    const supplierLabel = input.supplierId ? (await tx.select({ name: suppliers.name }).from(suppliers).where(eq(suppliers.id, input.supplierId)).limit(1))[0]?.name : null;
    const journalId = await postJournal(
      {
        outletId: input.outletId,
        entryDate,
        reference: purchaseNumber,
        description: `Pembelian aset ${purchaseNumber}${supplierLabel ? ` — ${supplierLabel}` : ""}${funding === "opening_balance" ? " (saldo awal)" : ""}`,
        sourceType: "asset_purchase",
        sourceId: purchase.id,
        staffUserId: input.staffUserId,
        lines,
      },
      tx
    );

    await tx.update(assetPurchases).set({ journalEntryId: journalId }).where(eq(assetPurchases.id, purchase.id));
    await tx.update(fixedAssets).set({ journalEntryId: journalId }).where(eq(fixedAssets.purchaseId, purchase.id));
    return { purchase: { ...purchase, journalEntryId: journalId }, items: itemRows, assets: assetRows };
  });

  await logAudit({
    outletId: input.outletId,
    staffUserId: input.staffUserId,
    action: "create_asset_purchase",
    entityType: "asset_purchase",
    entityId: result.purchase.id,
    after: { purchaseNumber: result.purchase.purchaseNumber, total, funding, paidNow, assets: result.assets.length },
  });
  return result;
}

/** Pembayaran (pelunasan/cicilan) utang pembelian aset — Dr Utang Pembelian Aset / Cr Kas-Bank. */
export async function payAssetPurchase(input: { outletId: string; purchaseId: string; amount: number; cashBankAccountId: string; method?: string | null; staffUserId?: string }) {
  const amount = round(Number(input.amount));
  if (!(amount > 0)) throw new Error("Nominal pembayaran harus lebih dari 0.");
  const result = await db.transaction(async (tx) => {
    await lockEntity(tx, `asset_purchase:${input.purchaseId}`);
    const [purchase] = await tx.select().from(assetPurchases).where(eq(assetPurchases.id, input.purchaseId)).limit(1);
    if (!purchase || purchase.outletId !== input.outletId) throw new Error("Pembelian aset tidak ditemukan.");
    if (purchase.status === "cancelled") throw new Error("Pembelian aset ini sudah dibatalkan.");
    const remaining = round(purchase.total - purchase.paidAmount);
    if (remaining <= 0) throw new Error("Pembelian aset ini sudah lunas.");
    if (amount > remaining) throw new Error(`Pembayaran melebihi sisa utang (sisa Rp${remaining.toLocaleString("id-ID")}).`);
    const cashBank = await requireCashBank(input.outletId, input.cashBankAccountId, tx);
    const shiftId = await resolveDrawerShiftId(input.outletId, input.staffUserId, tx);

    const [payment] = await tx
      .insert(assetPurchasePayments)
      .values({ assetPurchaseId: purchase.id, amount, method: input.method || cashBank.type || "cash", cashBankAccountId: cashBank.id, shiftId, staffUserId: input.staffUserId })
      .returning();
    const journalId = await postJournal(
      {
        outletId: input.outletId,
        reference: `${purchase.purchaseNumber}-PAY`,
        description: `Pembayaran utang pembelian aset ${purchase.purchaseNumber}`,
        sourceType: "asset_purchase_payment",
        sourceId: payment.id,
        staffUserId: input.staffUserId,
        lines: [
          { accountId: await assetPurchasePayableAccountId(input.outletId, tx), debit: amount, credit: 0, description: `Pelunasan ${purchase.purchaseNumber}` },
          { accountId: cashBank.accountId, debit: 0, credit: amount, description: `Pembayaran ${purchase.purchaseNumber} (${cashBank.name})` },
        ],
      },
      tx
    );
    await tx.update(assetPurchasePayments).set({ journalEntryId: journalId }).where(eq(assetPurchasePayments.id, payment.id));
    const paidAmount = purchase.paidAmount + amount;
    await tx
      .update(assetPurchases)
      .set({ paidAmount, status: paidAmount >= purchase.total - 1 ? "paid" : "partial", updatedAt: new Date().toISOString() })
      .where(eq(assetPurchases.id, purchase.id));
    return { ...payment, journalEntryId: journalId, remaining: remaining - amount };
  });
  await logAudit({ outletId: input.outletId, staffUserId: input.staffUserId, action: "pay_asset_purchase", entityType: "asset_purchase", entityId: input.purchaseId, after: { amount, remaining: result.remaining } });
  return result;
}

/**
 * Membatalkan pembelian aset yang salah input. Ditolak bila ada unit yang sudah disusutkan atau
 * dilepas — pada titik itu aset sudah punya riwayat pembukuan sendiri; perbaikannya lewat Lepas Aset.
 */
export async function cancelAssetPurchase(input: { outletId: string; purchaseId: string; reason: string; staffUserId?: string }) {
  const reason = input.reason?.trim();
  if (!reason) throw new Error("Alasan pembatalan wajib diisi.");
  const summary = await db.transaction(async (tx) => {
    await lockEntity(tx, `asset_purchase:${input.purchaseId}`);
    const [purchase] = await tx.select().from(assetPurchases).where(eq(assetPurchases.id, input.purchaseId)).limit(1);
    if (!purchase || purchase.outletId !== input.outletId) throw new Error("Pembelian aset tidak ditemukan.");
    if (purchase.status === "cancelled") throw new Error("Pembelian aset ini sudah dibatalkan.");

    const assets = await tx.select().from(fixedAssets).where(eq(fixedAssets.purchaseId, purchase.id));
    for (const a of assets) await lockEntity(tx, `fixed_asset:${a.id}`);
    const assetIds = assets.map((a) => a.id);
    const [dep] = assetIds.length
      ? await tx.select({ n: sql<number>`count(*)::int` }).from(assetDepreciationEntries).where(inArray(assetDepreciationEntries.fixedAssetId, assetIds))
      : [{ n: 0 }];
    if ((dep?.n ?? 0) > 0 || assets.some((a) => a.accumulatedDepreciation > 0)) {
      throw new Error("Tidak bisa dibatalkan: sebagian aset dari pembelian ini sudah disusutkan. Gunakan Lepas Aset untuk unit yang bersangkutan.");
    }
    if (assets.some((a) => a.status === "disposed" || a.disposalJournalEntryId)) {
      throw new Error("Tidak bisa dibatalkan: sebagian aset dari pembelian ini sudah dilepas.");
    }

    const payments = await tx.select().from(assetPurchasePayments).where(and(eq(assetPurchasePayments.assetPurchaseId, purchase.id), eq(assetPurchasePayments.status, "posted")));
    for (const p of payments) {
      if (p.journalEntryId) await voidJournal(p.journalEntryId, `Batal pembelian aset ${purchase.purchaseNumber}: ${reason}`, tx);
      await tx.update(assetPurchasePayments).set({ status: "voided" }).where(eq(assetPurchasePayments.id, p.id));
    }
    if (purchase.journalEntryId) await voidJournal(purchase.journalEntryId, `Batal pembelian aset ${purchase.purchaseNumber}: ${reason}`, tx);

    const now = new Date().toISOString();
    if (assetIds.length) {
      await tx
        .update(fixedAssets)
        .set({ status: "disposed", disposalDate: now, disposalAmount: 0, disposalReason: `Pembelian ${purchase.purchaseNumber} dibatalkan: ${reason}`, rentalUnitId: null, updatedAt: now })
        .where(inArray(fixedAssets.id, assetIds));
    }
    await tx.update(assetPurchases).set({ status: "cancelled", cancelReason: reason, cancelledAt: now, updatedAt: now }).where(eq(assetPurchases.id, purchase.id));
    return { purchaseNumber: purchase.purchaseNumber, total: purchase.total, assets: assetIds.length, payments: payments.length };
  });
  await logAudit({ outletId: input.outletId, staffUserId: input.staffUserId, action: "cancel_asset_purchase", entityType: "asset_purchase", entityId: input.purchaseId, after: { ...summary, reason } });
  return summary;
}

/** Daftar pembelian aset outlet beserta baris barang, pembayaran, dan asetnya. */
export async function listAssetPurchases(outletId: string) {
  const purchases = await db.select().from(assetPurchases).where(eq(assetPurchases.outletId, outletId)).orderBy(sql`${assetPurchases.purchaseDate} desc`);
  const ids = purchases.map((p) => p.id);
  if (!ids.length) return [];
  const [items, payments, assets, supplierRows, cashBank] = await Promise.all([
    db.select().from(assetPurchaseItems).where(inArray(assetPurchaseItems.assetPurchaseId, ids)),
    db.select().from(assetPurchasePayments).where(inArray(assetPurchasePayments.assetPurchaseId, ids)),
    db
      .select({ id: fixedAssets.id, name: fixedAssets.name, status: fixedAssets.status, acquisitionCost: fixedAssets.acquisitionCost, accumulatedDepreciation: fixedAssets.accumulatedDepreciation, purchaseId: fixedAssets.purchaseId })
      .from(fixedAssets)
      .where(and(eq(fixedAssets.outletId, outletId), inArray(fixedAssets.purchaseId, ids))),
    db.select({ id: suppliers.id, name: suppliers.name }).from(suppliers).where(eq(suppliers.outletId, outletId)),
    db.select({ id: cashBankAccounts.id, name: cashBankAccounts.name }).from(cashBankAccounts).where(eq(cashBankAccounts.outletId, outletId)),
  ]);
  const supplierName = new Map(supplierRows.map((s) => [s.id, s.name]));
  const cashBankName = new Map(cashBank.map((c) => [c.id, c.name]));
  return purchases.map((p) => ({
    ...p,
    supplierName: p.supplierId ? supplierName.get(p.supplierId) ?? null : null,
    cashBankName: p.cashBankAccountId ? cashBankName.get(p.cashBankAccountId) ?? null : null,
    outstanding: p.status === "cancelled" ? 0 : Math.max(0, round(p.total - p.paidAmount)),
    items: items.filter((i) => i.assetPurchaseId === p.id),
    payments: payments.filter((x) => x.assetPurchaseId === p.id).map((x) => ({ ...x, cashBankName: cashBankName.get(x.cashBankAccountId) ?? null })),
    assets: assets.filter((a) => a.purchaseId === p.id),
  }));
}
