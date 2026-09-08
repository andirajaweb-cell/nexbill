import { db, type DbOrTx } from "@/db/client";
import { ppobTransactions, cashBankAccounts, journalEntries, journalLines } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { postJournal, voidJournal, JournalLineInput } from "@/lib/accounting/journal";
import { computeTrialBalance } from "@/lib/accounting/reports";
import { getMappedAccountId } from "@/lib/accounting/account-mapping";
import { logAudit } from "@/lib/audit/log";
import { isFeatureEnabled } from "@/lib/home-rental/feature-flags";

/** Which PPOB revenue account a category's ADMIN FEE/MARGIN lands in — mirrors the "ppob" mapping module's defaults (see account-mapping.ts DEFAULT_MAPPING_SEED). Only feeAdmin ever posts here now — see buildPpobCollectionLines. */
const PPOB_REVENUE_FALLBACK_CODE: Record<PpobCategory, string> = {
  pulsa: "4410",
  token_listrik: "4430",
  ewallet_topup: "4460",
  transfer: "4480",
  tarik_tunai: "4480",
  lainnya: "4480",
};

const round = (n: number) => Math.round(n * 100) / 100;

export type PpobCategory = "ewallet_topup" | "token_listrik" | "pulsa" | "transfer" | "tarik_tunai" | "lainnya";

export interface CreatePpobInput {
  outletId: string;
  category: PpobCategory;
  product: string;
  serviceRef?: string | null;
  providerRef?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  nominal: number;
  modal: number;
  providerFee: number;
  feeAdmin: number; // Admin Fee / margin — shop's own profit, the ONLY component that is NexBill revenue
  fundingCashBankAccountId: string;
  receivingCashBankAccountId: string;
  staffUserId?: string | null;
  shiftId?: string | null;
  notes?: string | null;
  /** Client-generated dedup key (see postPpobTransaction's doc comment) — a retry/double-submit with the same key returns the already-posted transaction instead of creating a duplicate. */
  idempotencyKey?: string | null;
}

/**
 * Pure arithmetic — no DB access — so it's unit-testable and is the single place that defines the
 * pass-through split: principal (modal + providerFee, owed to the provider, never revenue) vs
 * feeAdmin (NexBill's own margin, the only revenue). uangMasuk (what the customer actually pays)
 * is derived FROM these two, not the other way around, so it can never drift out of reconciliation
 * with them — see reconcilePpobAmounts below for the invariant this guarantees.
 */
export function computePpobAmounts(modal: number, providerFee: number, feeAdmin: number): { principal: number; feeAdmin: number; uangMasuk: number } {
  const principal = round(round(modal) + round(providerFee));
  const roundedFeeAdmin = round(feeAdmin);
  const uangMasuk = round(principal + roundedFeeAdmin);
  return { principal, feeAdmin: roundedFeeAdmin, uangMasuk };
}

/** Reconciliation guard (same pattern as reconcileSales in lib/reports/transactions.ts): principal + feeAdmin must equal uangMasuk exactly, for any set of PPOB figures — whether freshly computed or read back from a stored row. Used both as a runtime assertion and as a unit-tested contract. */
export function reconcilePpobAmounts(principal: number, feeAdmin: number, uangMasuk: number): boolean {
  return Math.abs(uangMasuk - (principal + feeAdmin)) < 0.01;
}

/** Snapshot of which payment channel actually received the customer's money, stored on the row at posting time — see the `paymentMethod` column's doc comment in db/schema.ts for why this is snapshotted rather than joined live. */
function paymentMethodSnapshot(receiving: { name: string }): string {
  return receiving.name;
}

/**
 * Builds the COLLECTION journal — the only journal posted at the moment a PPOB transaction is
 * recorded. Implements the pass-through/third-party accounting principle: the customer's payment
 * (uangMasuk) is split into principal (money that belongs to the provider — booked as a LIABILITY,
 * PPOB Provider Payable, never revenue and never an expense) and feeAdmin (NexBill's own margin —
 * the only piece that is revenue). This deliberately does NOT gross providerFee into revenue and
 * then expense it back out (the old buildPpobJournalLines did) — that inflated both Revenue and
 * Expense by the same amount for no net effect on profit, while still double-counting Revenue on
 * any report that reads gross revenue instead of net profit (exactly what this fix removes).
 *
 *   Dr [receiving account]         uangMasuk (= principal + feeAdmin)
 *   Cr PPOB Provider Payable (2121) principal   — liability, settled separately (see below)
 *   Cr [category revenue account]   feeAdmin     — the ONLY revenue this transaction produces
 */
async function buildPpobCollectionLines(
  outletId: string,
  category: PpobCategory,
  label: string,
  principal: number,
  feeAdmin: number,
  uangMasuk: number,
  receiving: { id: string; accountId: string },
  dbc: DbOrTx = db
): Promise<JournalLineInput[]> {
  const lines: JournalLineInput[] = [];
  if (uangMasuk !== 0) lines.push({ accountId: receiving.accountId, debit: uangMasuk, credit: 0, description: `Uang masuk (customer) ${label}` });
  if (principal !== 0) {
    const payableAccountId = await getMappedAccountId(outletId, "ppob", "payable", "2121", dbc);
    lines.push({ accountId: payableAccountId, debit: 0, credit: principal, description: `PPOB Provider Payable (dana pihak ketiga, belum disetorkan) ${label}` });
  }
  if (feeAdmin !== 0) {
    const revenueAccountId = await getMappedAccountId(outletId, "ppob", category, PPOB_REVENUE_FALLBACK_CODE[category], dbc);
    lines.push({ accountId: revenueAccountId, debit: 0, credit: feeAdmin, description: `Admin Fee/Margin PPOB (revenue NexBill) ${label}` });
  }
  return lines;
}

/**
 * Builds the SETTLEMENT journal — paying the provider what's owed for `principal`, clearing the
 * liability booked at collection. Today this always runs immediately after collection (see
 * postPpobTransaction) since this app has no deferred/batched provider settlement cycle yet, but
 * it's kept as its own function (and postPpobSettlementJournal below as its own idempotent, callable
 * operation) so a future webhook/batch-settlement flow can post this separately, potentially much
 * later than collection, without touching buildPpobCollectionLines at all.
 *
 *   Dr PPOB Provider Payable (2121)  principal
 *   Cr [funding/settlement account]  principal
 */
async function buildPpobSettlementLines(
  outletId: string,
  label: string,
  principal: number,
  funding: { id: string; accountId: string; name: string },
  dbc: DbOrTx = db
): Promise<JournalLineInput[]> {
  if (principal === 0) return [];
  const payableAccountId = await getMappedAccountId(outletId, "ppob", "payable", "2121", dbc);
  return [
    { accountId: payableAccountId, debit: principal, credit: 0, description: `Pelunasan PPOB Provider Payable ${label}` },
    { accountId: funding.accountId, debit: 0, credit: principal, description: `Settlement ke provider via ${funding.name} ${label}` },
  ];
}

/**
 * Records one PPOB transaction (top-up e-wallet, token listrik, pulsa, transfer,
 * tarik tunai, dst.) and posts its accounting in one shot. This module doesn't
 * call any real Fastpay API — the cashier executes the actual top-up/token/
 * transfer over at Fastpay themselves; this only books what happened.
 *
 * THIRD-PARTY / PASS-THROUGH ACCOUNTING (see buildPpobCollectionLines/
 * buildPpobSettlementLines above for the journal shapes): the customer's
 * payment is split into
 *   principal = modal (N) + providerFee (F) — money that belongs to the
 *     provider. This is NEVER revenue and NEVER an expense; it's a pass-through
 *     liability (PPOB Provider Payable, COA 2121) from the moment it's collected
 *     until it's settled.
 *   feeAdmin (M) — NexBill's own margin, the ONLY component that is revenue.
 *   uangMasuk (U) = principal + feeAdmin — what the customer actually pays.
 *
 * Two journals are posted, atomically, in this order:
 *   1. Collection:  Dr [receiving] U  /  Cr PPOB Payable principal  /  Cr Revenue feeAdmin
 *   2. Settlement:  Dr PPOB Payable principal  /  Cr [funding] principal
 * They run back-to-back here (not deferred) because this app has no batched/
 * webhook-driven provider settlement cycle yet — `funding` (the account the
 * cashier already picks, e.g. Saldo Fastpay) IS the settlement account, known
 * up front. The transaction's `settlementStatus` still ends up "settled" with
 * both journal ids recorded, so a future deferred-settlement flow (see
 * postPpobSettlementJournal) is a drop-in: it would just leave settlement
 * "pending" here instead and let that function run later.
 *
 * IDEMPOTENCY: if `input.idempotencyKey` is provided and a transaction with
 * that key already exists for this outlet, this returns the EXISTING row
 * untouched — no new row, no new journal — so a retried webhook or a double
 * form-submit can never create a duplicate. The unique index on
 * ppobTransactions.idempotencyKey is the actual backstop (catches the race
 * where two concurrent identical requests both pass the pre-check).
 */
export async function postPpobTransaction(input: CreatePpobInput) {
  // Module master switch — see Settings > Feature Management. Checked here (not just hidden in
  // the sidebar/page) so a superuser turning PPOB OFF actually blocks new transactions from any
  // caller, not just the one that happens to render the nav link.
  if (!(await isFeatureEnabled(input.outletId, "PPOB_ENABLED"))) {
    throw new Error("Modul PPOB sedang dinonaktifkan untuk outlet ini. Aktifkan lagi di Settings > Feature Management.");
  }

  if (input.idempotencyKey) {
    const [existing] = await db
      .select()
      .from(ppobTransactions)
      .where(and(eq(ppobTransactions.outletId, input.outletId), eq(ppobTransactions.idempotencyKey, input.idempotencyKey)))
      .limit(1);
    if (existing) return existing; // retry/double-submit of an already-processed transaction — no-op
  }

  const { principal, feeAdmin, uangMasuk } = computePpobAmounts(input.modal, input.providerFee, input.feeAdmin);
  const modal = round(input.modal);
  const providerFee = round(input.providerFee);
  if (!reconcilePpobAmounts(principal, feeAdmin, uangMasuk) && process.env.NODE_ENV !== "production") {
    // Tripwire only — uangMasuk is derived FROM principal+feeAdmin in computePpobAmounts, so this
    // should be unreachable; a failure here means someone changed that function's own arithmetic.
    console.error("[ppob] principal/feeAdmin/uangMasuk reconciliation failed", { principal, feeAdmin, uangMasuk });
  }

  const [funding] = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.id, input.fundingCashBankAccountId)).limit(1);
  const [receiving] = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.id, input.receivingCashBankAccountId)).limit(1);
  if (!funding) throw new Error("Akun settlement/sumber modal tidak ditemukan.");
  if (!receiving) throw new Error("Akun penerima uang masuk tidak ditemukan.");

  const label = `PPOB ${input.product}${input.serviceRef ? " - " + input.serviceRef : ""}`;

  const result = await db.transaction(async (tx) => {
    let row: typeof ppobTransactions.$inferSelect;
    try {
      [row] = await tx
        .insert(ppobTransactions)
        .values({
          outletId: input.outletId,
          category: input.category,
          product: input.product,
          serviceRef: input.serviceRef ?? null,
          providerRef: input.providerRef ?? null,
          customerId: input.customerId ?? null,
          customerName: input.customerName ?? null,
          nominal: input.nominal,
          modal,
          providerFee,
          feeAdmin,
          principal,
          uangMasuk,
          paymentMethod: paymentMethodSnapshot(receiving),
          fundingCashBankAccountId: input.fundingCashBankAccountId,
          receivingCashBankAccountId: input.receivingCashBankAccountId,
          staffUserId: input.staffUserId ?? null,
          shiftId: input.shiftId ?? null,
          notes: input.notes ?? null,
          status: "success",
          idempotencyKey: input.idempotencyKey ?? null,
        })
        .returning();
    } catch (err) {
      // Unique-violation race on idempotencyKey: two concurrent identical retries both passed the
      // pre-check above before either committed. Re-select and return the winner instead of failing
      // the retry outright — same "idempotent no-op" outcome as the pre-check, just race-safe.
      if (input.idempotencyKey && String((err as { code?: string })?.code) === "23505") {
        const [existing] = await tx
          .select()
          .from(ppobTransactions)
          .where(and(eq(ppobTransactions.outletId, input.outletId), eq(ppobTransactions.idempotencyKey, input.idempotencyKey)))
          .limit(1);
        if (existing) return existing;
      }
      throw err;
    }

    const collectionLines = await buildPpobCollectionLines(input.outletId, input.category, label, principal, feeAdmin, uangMasuk, receiving, tx);
    let collectionJournalId: string | null = null;
    if (collectionLines.length > 0) {
      collectionJournalId = await postJournal(
        { outletId: input.outletId, description: `Transaksi ${label} (${input.category})`, sourceType: "ppob", sourceId: row.id, staffUserId: input.staffUserId ?? undefined, lines: collectionLines },
        tx
      );
    }

    let settlementJournalId: string | null = null;
    let settledAt: string | null = null;
    if (principal !== 0) {
      const settlementLines = await buildPpobSettlementLines(input.outletId, label, principal, funding, tx);
      settlementJournalId = await postJournal(
        { outletId: input.outletId, description: `Settlement ${label} ke provider`, sourceType: "ppob", sourceId: row.id, staffUserId: input.staffUserId ?? undefined, lines: settlementLines },
        tx
      );
      settledAt = new Date().toISOString();
    }

    const [updated] = await tx
      .update(ppobTransactions)
      .set({
        journalEntryId: collectionJournalId,
        settlementJournalEntryId: settlementJournalId,
        settlementStatus: "settled", // always true today — see doc comment above (no deferred settlement cycle yet)
        settlementAmount: principal,
        settledAt,
      })
      .where(eq(ppobTransactions.id, row.id))
      .returning();

    return updated;
  });

  await logAudit({
    outletId: input.outletId,
    staffUserId: input.staffUserId ?? undefined,
    action: "create_ppob_transaction",
    entityType: "ppob_transaction",
    entityId: result.id,
    after: { product: input.product, category: input.category, nominal: input.nominal, modal, providerFee, feeAdmin, principal, uangMasuk },
  });

  return result;
}

/**
 * Idempotent, standalone settlement operation — pays down the PPOB Provider Payable liability for
 * one transaction. Not used by postPpobTransaction above today (it auto-settles inline in the same
 * DB transaction as collection, since the settlement account is already known up front), but kept
 * as its own callable operation for a future deferred/batched/webhook-driven settlement flow, and
 * as a manual repair path for any row that somehow ended up "pending" (e.g. a historical import).
 * Safe to call repeatedly: a transaction already settled is a no-op that returns its existing
 * settlement journal id rather than posting a second one.
 */
export async function postPpobSettlementJournal(ppobTxId: string, staffUserId?: string): Promise<string | null> {
  const [row] = await db.select().from(ppobTransactions).where(eq(ppobTransactions.id, ppobTxId)).limit(1);
  if (!row) throw new Error("Transaksi PPOB tidak ditemukan.");
  if (row.settlementStatus === "settled") return row.settlementJournalEntryId; // idempotent no-op

  if (row.principal === 0) {
    await db.update(ppobTransactions).set({ settlementStatus: "settled", settlementAmount: 0, settledAt: new Date().toISOString() }).where(eq(ppobTransactions.id, ppobTxId));
    return null;
  }

  const [funding] = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.id, row.fundingCashBankAccountId)).limit(1);
  if (!funding) throw new Error("Akun settlement/sumber modal tidak ditemukan.");

  const label = `PPOB ${row.product}${row.serviceRef ? " - " + row.serviceRef : ""}`;

  return db.transaction(async (tx) => {
    const lines = await buildPpobSettlementLines(row.outletId, label, row.principal, funding, tx);
    const journalId = await postJournal(
      { outletId: row.outletId, description: `Settlement ${label} ke provider`, sourceType: "ppob", sourceId: row.id, staffUserId, lines },
      tx
    );
    await tx
      .update(ppobTransactions)
      .set({ settlementJournalEntryId: journalId, settlementStatus: "settled", settlementAmount: row.principal, settledAt: new Date().toISOString() })
      .where(eq(ppobTransactions.id, ppobTxId));
    return journalId;
  });
}

/** Reverses a PPOB transaction: voids BOTH posted journals — collection and settlement, if present (exact reverse entries, history preserved) — and flips status to "reversed". Never hard-deletes, same convention as refund/void elsewhere in this app. Voiding only the collection journal would leave the settlement's Dr Payable/Cr Cash-Bank standing uncancelled against a liability that no longer has an offsetting credit, a real phantom-balance risk — so both are always voided together. */
export async function voidPpobTransaction(id: string, reason: string, staffUserId?: string) {
  const [row] = await db.select().from(ppobTransactions).where(eq(ppobTransactions.id, id)).limit(1);
  if (!row) throw new Error("Transaksi PPOB tidak ditemukan.");
  if (row.status === "reversed") throw new Error("Transaksi ini sudah dibatalkan/reversed sebelumnya.");

  await db.transaction(async (tx) => {
    if (row.settlementJournalEntryId) await voidJournal(row.settlementJournalEntryId, reason, tx);
    if (row.journalEntryId) await voidJournal(row.journalEntryId, reason, tx);
    await tx
      .update(ppobTransactions)
      .set({ status: "reversed", reversedReason: reason, reversedAt: new Date().toISOString() })
      .where(eq(ppobTransactions.id, id));
  });

  const [updated] = await db.select().from(ppobTransactions).where(eq(ppobTransactions.id, id)).limit(1);
  await logAudit({ outletId: row.outletId, staffUserId, action: "void_ppob_transaction", entityType: "ppob_transaction", entityId: id, before: { status: row.status }, after: { status: "reversed", reason } });
  return updated;
}

export interface EditPpobInput {
  category?: PpobCategory;
  product?: string;
  serviceRef?: string | null;
  providerRef?: string | null;
  customerName?: string | null;
  nominal?: number;
  modal?: number;
  providerFee?: number;
  feeAdmin?: number;
  fundingCashBankAccountId?: string;
  receivingCashBankAccountId?: string;
  notes?: string | null;
}

/**
 * Corrects a PPOB transaction's figures after the fact — reserved for Owner
 * (enforced in the API route, not here). Rather than mutating the row's
 * money fields while leaving the already-posted journals stale, this voids
 * BOTH the original collection and settlement journal entries (preserved for
 * audit, same as elsewhere) and posts fresh ones off the corrected numbers —
 * re-running the exact same collect-then-settle sequence postPpobTransaction
 * uses — then updates the row itself so PPOB reports/lists show the corrected
 * figures going forward.
 */
export async function editPpobTransaction(id: string, input: EditPpobInput, staffUserId?: string) {
  const [row] = await db.select().from(ppobTransactions).where(eq(ppobTransactions.id, id)).limit(1);
  if (!row) throw new Error("Transaksi PPOB tidak ditemukan.");
  if (row.status === "reversed") throw new Error("Transaksi yang sudah dibatalkan tidak bisa diedit — buat transaksi baru kalau perlu koreksi.");

  const category = input.category ?? (row.category as PpobCategory);
  const product = input.product ?? row.product;
  const serviceRef = input.serviceRef !== undefined ? input.serviceRef : row.serviceRef;
  const providerRef = input.providerRef !== undefined ? input.providerRef : row.providerRef;
  const customerName = input.customerName !== undefined ? input.customerName : row.customerName;
  const nominal = input.nominal ?? row.nominal;
  const modal = round(input.modal ?? row.modal);
  const providerFee = round(input.providerFee ?? row.providerFee);
  const fundingCashBankAccountId = input.fundingCashBankAccountId ?? row.fundingCashBankAccountId;
  const receivingCashBankAccountId = input.receivingCashBankAccountId ?? row.receivingCashBankAccountId;
  const notes = input.notes !== undefined ? input.notes : row.notes;
  const { principal, feeAdmin, uangMasuk } = computePpobAmounts(modal, providerFee, input.feeAdmin ?? row.feeAdmin);

  const [funding] = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.id, fundingCashBankAccountId)).limit(1);
  const [receiving] = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.id, receivingCashBankAccountId)).limit(1);
  if (!funding) throw new Error("Akun settlement/sumber modal tidak ditemukan.");
  if (!receiving) throw new Error("Akun penerima uang masuk tidak ditemukan.");

  const label = `PPOB ${product}${serviceRef ? " - " + serviceRef : ""}`;

  const updated = await db.transaction(async (tx) => {
    if (row.settlementJournalEntryId) await voidJournal(row.settlementJournalEntryId, "Dikoreksi (edit transaksi PPOB oleh Owner)", tx);
    if (row.journalEntryId) await voidJournal(row.journalEntryId, "Dikoreksi (edit transaksi PPOB oleh Owner)", tx);

    const collectionLines = await buildPpobCollectionLines(row.outletId, category, label, principal, feeAdmin, uangMasuk, receiving, tx);
    let journalId: string | null = null;
    if (collectionLines.length > 0) {
      journalId = await postJournal(
        { outletId: row.outletId, description: `Transaksi ${label} (${category}) — dikoreksi`, sourceType: "ppob", sourceId: row.id, staffUserId, lines: collectionLines },
        tx
      );
    }

    let settlementJournalId: string | null = null;
    let settledAt: string | null = null;
    if (principal !== 0) {
      const settlementLines = await buildPpobSettlementLines(row.outletId, label, principal, funding, tx);
      settlementJournalId = await postJournal(
        { outletId: row.outletId, description: `Settlement ${label} ke provider — dikoreksi`, sourceType: "ppob", sourceId: row.id, staffUserId, lines: settlementLines },
        tx
      );
      settledAt = new Date().toISOString();
    }

    const [savedRow] = await tx
      .update(ppobTransactions)
      .set({
        category, product, serviceRef, providerRef, customerName, nominal, modal, providerFee, feeAdmin, principal, uangMasuk,
        fundingCashBankAccountId, receivingCashBankAccountId, notes,
        journalEntryId: journalId, settlementJournalEntryId: settlementJournalId, settlementStatus: "settled", settlementAmount: principal, settledAt,
        status: "success",
      })
      .where(eq(ppobTransactions.id, id))
      .returning();
    return savedRow;
  });

  await logAudit({ outletId: row.outletId, staffUserId, action: "edit_ppob_transaction", entityType: "ppob_transaction", entityId: id, before: row, after: updated });
  return updated;
}

/**
 * Genuinely deletes a PPOB transaction and every journal entry ever posted
 * for it — reserved for Owner (enforced in the API route). Unlike
 * voidPpobTransaction (reverses and keeps the row for audit trail), this
 * removes it completely.
 *
 * Deliberately does NOT limit cleanup to row.journalEntryId — that column
 * only ever points at the transaction's CURRENT entry. A transaction that
 * was voided (voidJournal posts a separate reversing entry but never
 * updates journalEntryId to point at it) or edited (editPpobTransaction
 * voids the old entry and swaps journalEntryId to the new one) leaves
 * earlier entries behind, orphaned but still fully live in the trial
 * balance since nothing else references them. Deleting only the current
 * entry — the previous behavior — could delete one half of an already-
 * balanced void pair while leaving its reversal standing alone, uncancelled:
 * exactly the "transaksi sudah dihapus tapi masih ada nilai yang tercantum"
 * bug (a deleted PPOB transaction leaving a phantom balance behind).
 * Every entry this transaction ever produced shares sourceType "ppob" +
 * sourceId = this row's id (see postJournal calls in voidJournal/
 * editPpobTransaction above), so querying by that pair catches all of them.
 */
export async function hardDeletePpobTransaction(id: string, staffUserId?: string) {
  const [row] = await db.select().from(ppobTransactions).where(eq(ppobTransactions.id, id)).limit(1);
  if (!row) throw new Error("Transaksi PPOB tidak ditemukan.");

  const relatedEntries = await db
    .select({ id: journalEntries.id })
    .from(journalEntries)
    .where(and(eq(journalEntries.sourceType, "ppob"), eq(journalEntries.sourceId, id)));
  const relatedEntryIds = relatedEntries.map((e) => e.id);

  if (relatedEntryIds.length > 0) {
    await db.delete(journalLines).where(inArray(journalLines.journalEntryId, relatedEntryIds));
    await db.delete(journalEntries).where(inArray(journalEntries.id, relatedEntryIds));
  } else if (row.journalEntryId) {
    // Fallback for the unlikely case sourceId wasn't set consistently on some legacy row.
    await db.delete(journalLines).where(eq(journalLines.journalEntryId, row.journalEntryId));
    await db.delete(journalEntries).where(eq(journalEntries.id, row.journalEntryId));
  }
  await db.delete(ppobTransactions).where(eq(ppobTransactions.id, id));

  await logAudit({ outletId: row.outletId, staffUserId, action: "delete_ppob_transaction", entityType: "ppob_transaction", entityId: id, before: row });
  return { id };
}

/** Current balance of the Fastpay PPOB deposit account (COA 1151), computed the same way as every other balance in this app — via the trial balance, which already nets out voided entries correctly. */
export async function getFastpaySaldoBalance(outletId: string): Promise<number> {
  const tb = await computeTrialBalance(outletId);
  return tb.find((r) => r.code === "1151")?.balance ?? 0;
}
