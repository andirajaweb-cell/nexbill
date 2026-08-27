import { db } from "@/db/client";
import { fixedAssets, assetDepreciationEntries, assetMaintenanceLogs, cashBankAccounts } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { postJournal, JournalLineInput } from "./journal";
import { EXPENSE_PAYABLE_ACCOUNT_CODE } from "./coa";
import { getMappedAccountId } from "./account-mapping";
import { logAudit } from "@/lib/audit/log";
import { createExpense, submitExpense } from "./expense";
import { describeError } from "@/lib/api/error";

/**
 * Fixed Asset register + straight-line depreciation engine. Mirrors the
 * expense engine's pay-now-vs-payable pattern for acquisition, posts a
 * balanced Dr Beban Penyusutan / Cr Akumulasi Penyusutan journal per
 * depreciation run (idempotent per period), and a balanced gain/loss journal
 * on disposal that fully removes the asset from the books. No approval
 * workflow here (unlike Expense) — asset purchases are infrequent enough that
 * owner/manager/accountant creating them directly is the practical default;
 * revisit if that stops being true.
 *
 * Every account here is resolved per fixedAssets.category through the Account
 * Mapping table (module "asset" / "asset_accum_depr" / "depreciation") instead
 * of one hardcoded code, so a PS4 rig, a TV and a delivery motorbike each land
 * on their own asset/accumulated-depreciation/depreciation-expense accounts —
 * see account-mapping.ts's DEFAULT_MAPPING_SEED for the fallback codes.
 */

const round = (n: number) => Math.round(n);

async function assetAccountId(outletId: string, category: string): Promise<string> {
  const fallback: Record<string, string> = { playstation: "1214", tv: "1221", controller: "1231", furniture: "1241", vehicle: "1245", other: "1244" };
  return getMappedAccountId(outletId, "asset", category, fallback[category] ?? "1244");
}
async function accumDeprAccountId(outletId: string, category: string): Promise<string> {
  const fallback: Record<string, string> = { playstation: "1291", tv: "1292", controller: "1293", furniture: "1293", vehicle: "1293", other: "1294" };
  return getMappedAccountId(outletId, "asset_accum_depr", category, fallback[category] ?? "1294");
}
async function deprExpenseAccountId(outletId: string, category: string): Promise<string> {
  const fallback: Record<string, string> = { playstation: "6810", tv: "6820", controller: "6830", furniture: "6830", vehicle: "6830", other: "6840" };
  return getMappedAccountId(outletId, "depreciation", category, fallback[category] ?? "6840");
}

async function getCashBankGlAccountId(cashBankAccountId: string): Promise<string> {
  const [row] = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.id, cashBankAccountId)).limit(1);
  if (!row) throw new Error(`Akun kas/bank ${cashBankAccountId} tidak ditemukan.`);
  return row.accountId;
}

export interface CreateFixedAssetInput {
  outletId: string;
  name: string;
  category: "playstation" | "tv" | "controller" | "furniture" | "vehicle" | "other";
  rentalUnitId?: string;
  acquisitionDate?: string;
  acquisitionCost: number;
  salvageValue?: number;
  usefulLifeMonths: number;
  supplierId?: string;
  notes?: string;
  staffUserId?: string;
  recordAsPayable?: boolean;
  paymentMethod?: "cash" | "bank" | "transfer" | "qris";
  cashBankAccountId?: string;
}

/** Registers the asset and posts its acquisition journal — Dr 1500 Peralatan / Cr Kas-Bank (paid now) or Cr Hutang (recorded as payable). */
export async function createFixedAsset(input: CreateFixedAssetInput) {
  if (input.acquisitionCost <= 0) throw new Error("Harga perolehan harus lebih dari 0.");
  if (input.usefulLifeMonths <= 0) throw new Error("Umur ekonomis (bulan) harus lebih dari 0.");
  if (!input.recordAsPayable && !input.cashBankAccountId) {
    throw new Error("Pilih akun kas/bank untuk pembayaran, atau centang 'Catat sebagai hutang'.");
  }

  const [asset] = await db
    .insert(fixedAssets)
    .values({
      outletId: input.outletId,
      name: input.name,
      category: input.category,
      rentalUnitId: input.rentalUnitId,
      acquisitionDate: input.acquisitionDate ?? new Date().toISOString(),
      acquisitionCost: input.acquisitionCost,
      salvageValue: input.salvageValue ?? 0,
      usefulLifeMonths: input.usefulLifeMonths,
      supplierId: input.supplierId,
      notes: input.notes,
      staffUserId: input.staffUserId,
    })
    .returning();

  const assetGlAccountId = await assetAccountId(input.outletId, input.category);

  let journalId: string;
  if (input.recordAsPayable) {
    journalId = await postJournal({
      outletId: input.outletId,
      reference: `ASSET-${asset.id.slice(0, 8)}`,
      description: `Perolehan aset — ${input.name} (hutang)`,
      sourceType: "asset_purchase",
      sourceId: asset.id,
      staffUserId: input.staffUserId,
      lines: [
        { accountId: assetGlAccountId, debit: round(input.acquisitionCost), credit: 0, description: input.name },
        { accountCode: EXPENSE_PAYABLE_ACCOUNT_CODE, debit: 0, credit: round(input.acquisitionCost), description: "Hutang pembelian aset" },
      ],
    });
  } else {
    const cashBankGlAccountId = await getCashBankGlAccountId(input.cashBankAccountId!);
    journalId = await postJournal({
      outletId: input.outletId,
      reference: `ASSET-${asset.id.slice(0, 8)}`,
      description: `Perolehan aset — ${input.name}`,
      sourceType: "asset_purchase",
      sourceId: asset.id,
      staffUserId: input.staffUserId,
      lines: [
        { accountId: assetGlAccountId, debit: round(input.acquisitionCost), credit: 0, description: input.name },
        { accountId: cashBankGlAccountId, debit: 0, credit: round(input.acquisitionCost), description: `Pembayaran (${input.paymentMethod ?? "cash"})` },
      ],
    });
  }

  const [updated] = await db.update(fixedAssets).set({ journalEntryId: journalId }).where(eq(fixedAssets.id, asset.id)).returning();
  await logAudit({ outletId: input.outletId, staffUserId: input.staffUserId, action: "create_fixed_asset", entityType: "fixed_asset", entityId: asset.id, after: { name: input.name, acquisitionCost: input.acquisitionCost } });
  return updated;
}

/** Runs one depreciation period for one asset — straight-line, capped so accumulated depreciation never exceeds (cost - salvage). Idempotent: throws if this period was already run. */
export async function runDepreciation(fixedAssetId: string, period: string, staffUserId?: string) {
  const [asset] = await db.select().from(fixedAssets).where(eq(fixedAssets.id, fixedAssetId)).limit(1);
  if (!asset) throw new Error("Aset tidak ditemukan.");
  if (asset.status === "disposed") throw new Error("Aset sudah dilepas (disposed) — tidak bisa didepresiasi lagi.");

  const [existing] = await db
    .select()
    .from(assetDepreciationEntries)
    .where(and(eq(assetDepreciationEntries.fixedAssetId, fixedAssetId), eq(assetDepreciationEntries.period, period)))
    .limit(1);
  if (existing) throw new Error(`Depresiasi periode ${period} untuk aset ini sudah pernah dijalankan.`);

  const depreciableBase = asset.acquisitionCost - asset.salvageValue;
  const monthlyAmount = depreciableBase / asset.usefulLifeMonths;
  const remaining = depreciableBase - asset.accumulatedDepreciation;
  if (remaining <= 0) throw new Error("Aset sudah terdepresiasi penuh (fully depreciated).");
  const amount = round(Math.min(monthlyAmount, remaining));
  if (amount <= 0) throw new Error("Nilai depresiasi periode ini nol — tidak ada jurnal yang diposting.");

  const journalId = await postJournal({
    outletId: asset.outletId,
    reference: `DEP-${asset.id.slice(0, 8)}-${period}`,
    description: `Penyusutan ${asset.name} — periode ${period}`,
    sourceType: "depreciation",
    sourceId: asset.id,
    staffUserId,
    lines: [
      { accountId: await deprExpenseAccountId(asset.outletId, asset.category), debit: amount, credit: 0, description: asset.name },
      { accountId: await accumDeprAccountId(asset.outletId, asset.category), debit: 0, credit: amount, description: "Akumulasi penyusutan" },
    ],
  });

  await db.insert(assetDepreciationEntries).values({ fixedAssetId, period, amount, journalEntryId: journalId });
  await db.update(fixedAssets).set({ accumulatedDepreciation: asset.accumulatedDepreciation + amount }).where(eq(fixedAssets.id, fixedAssetId));
  await logAudit({ outletId: asset.outletId, staffUserId, action: "run_depreciation", entityType: "fixed_asset", entityId: fixedAssetId, after: { period, amount } });
  return { journalId, amount };
}

/** Runs depreciation for every active asset in the outlet for one period — skips (records the error, doesn't abort) assets already run or fully depreciated. */
export async function runDepreciationForAllAssets(outletId: string, period: string, staffUserId?: string) {
  const assets = await db.select().from(fixedAssets).where(and(eq(fixedAssets.outletId, outletId), eq(fixedAssets.status, "active")));
  const results: { fixedAssetId: string; name: string; amount: number | null; error?: string }[] = [];
  for (const asset of assets) {
    try {
      const r = await runDepreciation(asset.id, period, staffUserId);
      results.push({ fixedAssetId: asset.id, name: asset.name, amount: r.amount });
    } catch (err: unknown) {
      results.push({ fixedAssetId: asset.id, name: asset.name, amount: null, error: describeError(err) });
    }
  }
  return results;
}

/**
 * Disposes an asset — posts a balanced journal that removes the full
 * acquisition cost and accumulated depreciation from the books, records any
 * cash received, and plugs the difference as a gain (credit 4200) or loss
 * (debit 8300 Loss on Asset Disposal) so debits always equal credits
 * regardless of sale price vs book value.
 */
export async function disposeAsset(fixedAssetId: string, disposalAmount: number, reason: string, staffUserId: string, cashBankAccountId?: string) {
  const [asset] = await db.select().from(fixedAssets).where(eq(fixedAssets.id, fixedAssetId)).limit(1);
  if (!asset) throw new Error("Aset tidak ditemukan.");
  if (asset.status === "disposed") throw new Error("Aset sudah dilepas sebelumnya.");
  if (disposalAmount > 0 && !cashBankAccountId) throw new Error("Pilih akun kas/bank untuk menerima hasil pelepasan aset.");

  const bookValue = asset.acquisitionCost - asset.accumulatedDepreciation;
  const gainLoss = disposalAmount - bookValue; // positive = gain (credit 7200), negative = loss (debit 8300)

  const lines: JournalLineInput[] = [
    { accountId: await accumDeprAccountId(asset.outletId, asset.category), debit: round(asset.accumulatedDepreciation), credit: 0, description: "Hapus akumulasi penyusutan" },
  ];
  if (disposalAmount > 0) {
    const cashBankGlAccountId = await getCashBankGlAccountId(cashBankAccountId!);
    lines.push({ accountId: cashBankGlAccountId, debit: round(disposalAmount), credit: 0, description: "Hasil pelepasan aset" });
  }
  if (gainLoss < 0) {
    lines.push({ accountCode: "8300", debit: round(-gainLoss), credit: 0, description: "Rugi pelepasan aset" });
  } else if (gainLoss > 0) {
    lines.push({ accountCode: "7200", debit: 0, credit: round(gainLoss), description: "Untung pelepasan aset" });
  }
  lines.push({ accountId: await assetAccountId(asset.outletId, asset.category), debit: 0, credit: round(asset.acquisitionCost), description: "Hapus nilai perolehan aset" });

  const journalId = await postJournal({
    outletId: asset.outletId,
    reference: `DISPOSE-${asset.id.slice(0, 8)}`,
    description: `Pelepasan aset — ${asset.name} (${reason})`,
    sourceType: "asset_disposal",
    sourceId: asset.id,
    staffUserId,
    lines,
  });

  const [updated] = await db
    .update(fixedAssets)
    .set({ status: "disposed", disposalDate: new Date().toISOString(), disposalAmount, disposalReason: reason, disposalJournalEntryId: journalId })
    .where(eq(fixedAssets.id, fixedAssetId))
    .returning();

  await logAudit({ outletId: asset.outletId, staffUserId, action: "dispose_asset", entityType: "fixed_asset", entityId: fixedAssetId, after: { disposalAmount, reason, gainLoss } });
  return updated;
}

export interface LogMaintenanceInput {
  fixedAssetId: string;
  description: string;
  cost?: number;
  staffUserId?: string;
  /** When true and cost > 0, also creates + submits a real Expense (ties Asset > Maintenance into the Expense Management module). */
  createExpenseFor?: boolean;
  accountId?: string;
  cashBankAccountId?: string;
  paymentMethod?: "cash" | "bank" | "transfer" | "qris";
}

export async function logMaintenance(input: LogMaintenanceInput) {
  const [asset] = await db.select().from(fixedAssets).where(eq(fixedAssets.id, input.fixedAssetId)).limit(1);
  if (!asset) throw new Error("Aset tidak ditemukan.");

  let expenseId: string | undefined;
  if (input.createExpenseFor && (input.cost ?? 0) > 0) {
    if (!input.accountId) throw new Error("Pilih akun beban untuk membuat expense maintenance.");
    const expense = await createExpense({
      outletId: asset.outletId,
      accountId: input.accountId,
      category: "Maintenance",
      description: `Maintenance ${asset.name} — ${input.description}`,
      amount: input.cost!,
      paymentMethod: input.paymentMethod,
      cashBankAccountId: input.cashBankAccountId,
      recordAsPayable: !input.cashBankAccountId,
      rentalUnitId: asset.rentalUnitId ?? undefined,
      staffUserId: input.staffUserId,
    });
    await submitExpense(expense.id, input.staffUserId);
    expenseId = expense.id;
  }

  const [log] = await db
    .insert(assetMaintenanceLogs)
    .values({ fixedAssetId: input.fixedAssetId, status: "queued", description: input.description, cost: input.cost ?? 0, expenseId, staffUserId: input.staffUserId })
    .returning();

  await syncAssetMaintenanceStatus(input.fixedAssetId);
  await logAudit({ outletId: asset.outletId, staffUserId: input.staffUserId, action: "log_asset_maintenance", entityType: "fixed_asset", entityId: input.fixedAssetId, after: { description: input.description, cost: input.cost } });
  return log;
}

/**
 * Re-derives fixedAssets.status from its maintenance tickets: "under_maintenance" while any
 * ticket is still queued/in_progress, back to "active" the moment none are. Called after every
 * ticket create/status-change/delete so the asset row always reflects reality without the caller
 * having to remember to flip it manually. Never touches a "disposed" asset either direction —
 * disposal is a terminal state that maintenance activity shouldn't be able to resurrect from.
 */
async function syncAssetMaintenanceStatus(fixedAssetId: string): Promise<void> {
  const [asset] = await db.select().from(fixedAssets).where(eq(fixedAssets.id, fixedAssetId)).limit(1);
  if (!asset || asset.status === "disposed") return;
  const openTickets = await db
    .select({ id: assetMaintenanceLogs.id })
    .from(assetMaintenanceLogs)
    .where(and(eq(assetMaintenanceLogs.fixedAssetId, fixedAssetId), ne(assetMaintenanceLogs.status, "done")));
  const shouldBeUnderMaintenance = openTickets.length > 0;
  const nextStatus = shouldBeUnderMaintenance ? "under_maintenance" : "active";
  if (asset.status !== nextStatus) {
    await db.update(fixedAssets).set({ status: nextStatus }).where(eq(fixedAssets.id, fixedAssetId));
  }
}

/**
 * Moves a maintenance ticket through the repair workflow: queued ("Masuk Maintenance") ->
 * in_progress ("Proses") -> done ("Selesai"). Stamps startedAt/completedAt on the way past each
 * stage (idempotent — re-entering a stage doesn't overwrite an already-set timestamp), then
 * re-syncs the parent asset's status. Allows queued -> done directly too (some repairs are
 * finished in one visit with no separate "in progress" window worth recording).
 */
export async function updateMaintenanceStatus(logId: string, nextStatus: "queued" | "in_progress" | "done", staffUserId?: string) {
  const [log] = await db.select().from(assetMaintenanceLogs).where(eq(assetMaintenanceLogs.id, logId)).limit(1);
  if (!log) throw new Error("Tiket maintenance tidak ditemukan.");
  const patch: Record<string, unknown> = { status: nextStatus };
  const nowIsoStr = new Date().toISOString();
  if (nextStatus === "in_progress" && !log.startedAt) patch.startedAt = nowIsoStr;
  if (nextStatus === "done" && !log.completedAt) patch.completedAt = nowIsoStr;
  await db.update(assetMaintenanceLogs).set(patch).where(eq(assetMaintenanceLogs.id, logId));
  await syncAssetMaintenanceStatus(log.fixedAssetId);
  const [asset] = await db.select({ outletId: fixedAssets.outletId }).from(fixedAssets).where(eq(fixedAssets.id, log.fixedAssetId)).limit(1);
  if (asset) {
    await logAudit({ outletId: asset.outletId, staffUserId, action: "update_maintenance_status", entityType: "asset_maintenance_log", entityId: logId, before: { status: log.status }, after: { status: nextStatus } });
  }
  const [updated] = await db.select().from(assetMaintenanceLogs).where(eq(assetMaintenanceLogs.id, logId)).limit(1);
  return updated;
}

/**
 * Edits a ticket's description/cost. Cost is locked once an Expense has already been posted for
 * it (expenseId set) — changing the number here would silently desync from the real accounting
 * entry, so that case just returns an error pointing at the Expense page instead of half-fixing
 * one side of a two-sided record.
 */
export async function updateMaintenanceLog(logId: string, patch: { description?: string; cost?: number }) {
  const [log] = await db.select().from(assetMaintenanceLogs).where(eq(assetMaintenanceLogs.id, logId)).limit(1);
  if (!log) throw new Error("Tiket maintenance tidak ditemukan.");
  const next: Record<string, unknown> = {};
  if (patch.description !== undefined) {
    if (!patch.description.trim()) throw new Error("Deskripsi tidak boleh kosong.");
    next.description = patch.description;
  }
  if (patch.cost !== undefined && patch.cost !== log.cost) {
    if (log.expenseId) throw new Error("Biaya tiket ini sudah tercatat sebagai Expense — ubah nominalnya lewat halaman Expense, bukan dari sini.");
    next.cost = patch.cost;
  }
  if (Object.keys(next).length === 0) return log;
  const [updated] = await db.update(assetMaintenanceLogs).set(next).where(eq(assetMaintenanceLogs.id, logId)).returning();
  return updated;
}

/**
 * Deletes a maintenance ticket outright — blocked if an Expense was already posted for it, to
 * protect the accounting trail (that Expense would be left pointing at a deleted log with no
 * clean way to reconcile it). Re-syncs the parent asset's status afterward, since deleting the
 * last open ticket for an asset should bring it back to "active".
 */
export async function deleteMaintenanceLog(logId: string): Promise<{ fixedAssetId: string }> {
  const [log] = await db.select().from(assetMaintenanceLogs).where(eq(assetMaintenanceLogs.id, logId)).limit(1);
  if (!log) throw new Error("Tiket maintenance tidak ditemukan.");
  if (log.expenseId) throw new Error("Tidak bisa dihapus: tiket ini sudah tercatat sebagai Expense. Batalkan/void Expense-nya dulu di halaman Expense.");
  await db.delete(assetMaintenanceLogs).where(eq(assetMaintenanceLogs.id, logId));
  await syncAssetMaintenanceStatus(log.fixedAssetId);
  return { fixedAssetId: log.fixedAssetId };
}
