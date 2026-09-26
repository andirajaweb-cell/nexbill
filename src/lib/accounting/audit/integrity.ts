import { db } from "@/db/client";
import { and, eq, inArray, isNull, notLike, sql } from "drizzle-orm";
import {
  accounts,
  cashBankAccounts,
  cashDeposits,
  cashTransfers,
  expenses,
  homeRentalRentals,
  journalEntries,
  journalLines,
  membershipPayments,
  orders,
  otherIncomes,
  payments,
  ppobTransactions,
  receivables,
} from "@/db/schema";

/*
 * Pemeriksaan INTEGRITAS pembukuan satu outlet — "apakah setiap angka di buku berasal dari
 * transaksi yang nyata, sekali saja, dan seimbang". Semua fungsi di sini hanya MEMBACA; perbaikan
 * ada di ./fixes.ts. Dipakai oleh tab Audit di Accounting dan oleh scripts/audit-*.ts.
 */

const near = (a: number, b: number) => Math.abs(a - b) <= 1;

// ---------------------------------------------------------------- A. Jurnal ganda

export interface DuplicateGroup {
  key: string;
  sourceType: string;
  reference: string | null;
  description: string;
  total: number;
  count: number;
  /** Entries to void (everything except the keeper). */
  extraIds: string[];
  extraValue: number;
  keepsNone: boolean;
}

interface DupRow {
  id: string;
  source_type: string;
  source_id: string;
  reference: string | null;
  description: string;
  created_at: string;
  total: number;
  canonical_id: string | null;
  source_cancelled: boolean;
  sales_created_at: string | null;
  dup_key: string;
}

/**
 * One journal should exist per event (expense approval/payment, receivable settlement, depreciation
 * period, asset disposal, cash transfer, an order's sales/HPP journal) — more than one live copy
 * double-counts. Keeper: the one the source row points at (else earliest); for an order's sales/HPP
 * journal the newest (it matches the order as corrected); none when the source is cancelled or the
 * HPP belongs to a superseded version of the order.
 */
export async function findDuplicateJournals(outletId: string): Promise<DuplicateGroup[]> {
  const rows = (await db.execute(sql`
    WITH candidates AS (
      SELECT je.*,
             CASE WHEN je.source_type = 'cash_transfer' THEN je.source_id ELSE je.source_id || '::' || je.reference END AS dup_key
      FROM journal_entries je
      WHERE je.outlet_id = ${outletId}
        AND je.status = 'posted'
        AND je.source_id IS NOT NULL
        AND je.reversal_of_entry_id IS NULL
        AND je.description NOT LIKE '[VOID]%'
        AND (
              (je.source_type = 'expense'            AND je.reference ~ '^EXP-[0-9]+(-PAY)?$')
           OR (je.source_type = 'receivable_payment' AND je.reference LIKE 'AR-%')
           OR (je.source_type = 'depreciation'       AND je.reference LIKE 'DEP-%')
           OR (je.source_type = 'asset_disposal'     AND je.reference LIKE 'DISPOSE-%')
           OR (je.source_type = 'cash_transfer')
           OR (je.source_type IN ('rental', 'pos') AND je.reference ~ '^ORDER-[0-9a-f]{8}(-COGS)?$')
        )
    ),
    dup_keys AS (SELECT dup_key FROM candidates GROUP BY dup_key HAVING COUNT(*) > 1)
    SELECT c.id, c.source_type, c.source_id, c.reference, c.description, c.created_at,
           (SELECT COALESCE(SUM(jl.debit), 0)::float FROM journal_lines jl WHERE jl.journal_entry_id = c.id) AS total,
           CASE
             WHEN c.source_type = 'expense' AND c.reference LIKE '%-PAY' THEN (SELECT e.payment_journal_entry_id FROM expenses e WHERE e.id = c.source_id)
             WHEN c.source_type = 'expense'        THEN (SELECT e.journal_entry_id FROM expenses e WHERE e.id = c.source_id)
             WHEN c.source_type = 'cash_transfer'  THEN (SELECT t.journal_entry_id FROM cash_transfers t WHERE t.id = c.source_id)
             WHEN c.source_type = 'asset_disposal' THEN (SELECT a.disposal_journal_entry_id FROM fixed_assets a WHERE a.id = c.source_id)
             ELSE NULL
           END AS canonical_id,
           CASE
             WHEN c.source_type = 'expense'       THEN EXISTS (SELECT 1 FROM expenses e WHERE e.id = c.source_id AND e.status = 'cancelled')
             WHEN c.source_type = 'cash_transfer' THEN EXISTS (SELECT 1 FROM cash_transfers t WHERE t.id = c.source_id AND t.status = 'void')
             ELSE false
           END AS source_cancelled,
           CASE WHEN c.reference LIKE '%-COGS' THEN (
             SELECT MAX(s.created_at) FROM journal_entries s
             WHERE s.source_id = c.source_id AND s.reference = replace(c.reference, '-COGS', '') AND s.status = 'posted'
           ) END AS sales_created_at,
           c.dup_key
    FROM candidates c
    WHERE c.dup_key IN (SELECT dup_key FROM dup_keys)
    ORDER BY c.dup_key, c.created_at ASC
  `)) as unknown as DupRow[];

  const groups = new Map<string, DupRow[]>();
  for (const r of rows) {
    if (!groups.has(r.dup_key)) groups.set(r.dup_key, []);
    groups.get(r.dup_key)!.push(r);
  }
  const out: DuplicateGroup[] = [];
  for (const [key, group] of groups) {
    const g0 = group[0];
    let keep: DupRow | null;
    if (g0.source_cancelled) keep = null;
    else if (g0.reference?.startsWith("ORDER-")) {
      const newest = group[group.length - 1];
      keep = g0.reference.endsWith("-COGS") && (!newest.sales_created_at || newest.created_at < newest.sales_created_at) ? null : newest;
    } else keep = group.find((g) => g.id === g0.canonical_id) ?? g0;
    const extras = group.filter((g) => g.id !== keep?.id);
    out.push({
      key,
      sourceType: g0.source_type,
      reference: g0.reference,
      description: g0.description,
      total: Number(g0.total),
      count: group.length,
      extraIds: extras.map((e) => e.id),
      extraValue: extras.reduce((s, e) => s + Number(e.total), 0),
      keepsNone: !keep,
    });
  }
  return out;
}

// ---------------------------------------------------------------- B. Jurnal tidak seimbang

export interface UnbalancedJournal {
  id: string;
  reference: string | null;
  description: string;
  status: string;
  debit: number;
  credit: number;
  diff: number;
}

export async function findUnbalancedJournals(outletId: string): Promise<UnbalancedJournal[]> {
  const rows = (await db.execute(sql`
    SELECT je.id, je.reference, je.description, je.status,
           ROUND(SUM(jl.debit)::numeric, 2)::float AS debit, ROUND(SUM(jl.credit)::numeric, 2)::float AS credit
    FROM journal_entries je JOIN journal_lines jl ON jl.journal_entry_id = je.id
    WHERE je.outlet_id = ${outletId}
    GROUP BY je.id
    HAVING ABS(SUM(jl.debit) - SUM(jl.credit)) >= 0.005
    ORDER BY je.entry_date
  `)) as unknown as Omit<UnbalancedJournal, "diff">[];
  return rows.map((r) => ({ ...r, debit: Number(r.debit), credit: Number(r.credit), diff: Math.round((Number(r.debit) - Number(r.credit)) * 100) / 100 }));
}

// ---------------------------------------------------------------- D. Pembalik lama tanpa tautan

interface LinkRow {
  id: string;
  source_type: string;
  source_id: string | null;
  description: string;
  status: string;
  created_at: string;
  reversal_of_entry_id: string | null;
  debit: number;
  credit: number;
}

/** Reversals posted before reversal_of_entry_id existed, matched to their original by description, source and mirrored totals. */
export async function planReversalLinks(outletId: string): Promise<{ links: { reversalId: string; originalId: string }[]; unmatched: number }> {
  const rows = (await db.execute(sql`
    SELECT je.id, je.source_type, je.source_id, je.description, je.status, je.created_at, je.reversal_of_entry_id,
           COALESCE(SUM(jl.debit), 0)::float AS debit, COALESCE(SUM(jl.credit), 0)::float AS credit
    FROM journal_entries je LEFT JOIN journal_lines jl ON jl.journal_entry_id = je.id
    WHERE je.outlet_id = ${outletId} AND (je.status = 'void' OR (je.description LIKE '[VOID] %' AND je.reversal_of_entry_id IS NULL))
    GROUP BY je.id
    ORDER BY je.created_at ASC
  `)) as unknown as LinkRow[];
  const alreadyLinked = new Set(
    ((await db.execute(sql`SELECT reversal_of_entry_id AS id FROM journal_entries WHERE outlet_id = ${outletId} AND reversal_of_entry_id IS NOT NULL`)) as unknown as { id: string }[]).map((r) => r.id)
  );
  const key = (r: { source_type: string; source_id: string | null }, desc: string) => `${r.source_type}|${r.source_id ?? ""}|${desc}`;
  const originals = new Map<string, LinkRow[]>();
  for (const r of rows) {
    if (r.status !== "void" || alreadyLinked.has(r.id)) continue;
    const k = key(r, r.description);
    if (!originals.has(k)) originals.set(k, []);
    originals.get(k)!.push(r);
  }
  const used = new Set<string>();
  const links: { reversalId: string; originalId: string }[] = [];
  let unmatched = 0;
  for (const r of rows) {
    if (!r.description.startsWith("[VOID] ") || r.reversal_of_entry_id) continue;
    const rest = r.description.slice("[VOID] ".length);
    const cuts: number[] = [];
    for (let i = rest.indexOf(" — "); i !== -1; i = rest.indexOf(" — ", i + 1)) cuts.push(i);
    let match: LinkRow | undefined;
    for (const cut of cuts.reverse()) {
      match = originals
        .get(key(r, rest.slice(0, cut)))
        ?.find((o) => !used.has(o.id) && o.created_at <= r.created_at && Math.abs(o.debit - r.credit) < 0.02 && Math.abs(o.credit - r.debit) < 0.02);
      if (match) break;
    }
    if (!match) {
      unmatched++;
      continue;
    }
    used.add(match.id);
    links.push({ reversalId: r.id, originalId: match.id });
  }
  return { links, unmatched };
}

// ---------------------------------------------------------------- E. Piutang pada order lunas/batal

export interface ReceivableGap {
  orderId: string;
  status: string;
  total: number;
  paid: number;
  gap: number;
  /** true = order fully paid or cancelled, so the gap is an error (fixable by resync). */
  stale: boolean;
}

export async function findReceivableGaps(outletId: string): Promise<ReceivableGap[]> {
  const rows = (await db.execute(sql`
    WITH gap AS (
      SELECT o.id AS order_id, COALESCE(SUM(jl.debit - jl.credit), 0)::float AS gap
      FROM orders o
      JOIN journal_entries je ON je.status = 'posted' AND je.reversal_of_entry_id IS NULL AND (
             (je.source_id = o.id AND je.source_type IN ('rental', 'pos'))
          OR (je.source_type = 'receivable_payment' AND je.source_id IN (SELECT r.id FROM receivables r WHERE r.order_id = o.id)))
      JOIN journal_lines jl ON jl.journal_entry_id = je.id
      JOIN accounts a ON a.id = jl.account_id AND a.code = '1141'
      WHERE o.outlet_id = ${outletId}
      GROUP BY o.id
      HAVING ABS(COALESCE(SUM(jl.debit - jl.credit), 0)) > 0.5
    )
    SELECT o.id, o.status, o.total::float AS total, g.gap,
           (SELECT COALESCE(SUM(p.amount), 0)::float FROM payments p WHERE p.order_id = o.id AND p.status = 'success') AS paid
    FROM gap g JOIN orders o ON o.id = g.order_id
    ORDER BY o.created_at
  `)) as unknown as { id: string; status: string; total: number; gap: number; paid: number }[];
  return rows.map((r) => ({
    orderId: r.id,
    status: r.status,
    total: Number(r.total),
    paid: Number(r.paid),
    gap: Number(r.gap),
    stale: r.status === "cancelled" || Number(r.paid) >= Number(r.total) - 0.5,
  }));
}

// ---------------------------------------------------------------- F. Pembatalan terhidupkan lagi

export interface RevivedChain {
  rootId: string;
  tailId: string;
  sourceType: string;
  reference: string | null;
  description: string;
  entryDate: string;
  total: number;
  /** A replacement journal of the same kind exists for the same order — safe to restore the cancellation. */
  superseded: boolean;
}

export async function findRevivedChains(outletId: string): Promise<RevivedChain[]> {
  const rows = (await db.execute(sql`
    WITH RECURSIVE chain (root, id, depth) AS (
      SELECT e.id, e.id, 0 FROM journal_entries e
      WHERE e.outlet_id = ${outletId} AND e.reversal_of_entry_id IS NULL
        AND EXISTS (SELECT 1 FROM journal_entries x WHERE x.reversal_of_entry_id = e.id)
      UNION ALL
      SELECT chain.root, r.id, chain.depth + 1 FROM chain JOIN journal_entries r ON r.reversal_of_entry_id = chain.id
    ),
    roots AS (SELECT root, MAX(depth) AS max_depth FROM chain GROUP BY root HAVING MAX(depth) % 2 = 0)
    SELECT o.id AS root_id, o.source_type, o.reference, o.description, o.entry_date,
           (SELECT COALESCE(SUM(jl.debit), 0)::float FROM journal_lines jl WHERE jl.journal_entry_id = o.id) AS total,
           (SELECT c.id FROM chain c WHERE c.root = o.id ORDER BY c.depth DESC LIMIT 1) AS tail_id,
           CASE WHEN o.source_type IN ('rental', 'pos') THEN EXISTS (
             SELECT 1 FROM journal_entries l
             WHERE l.source_id = o.source_id AND l.id <> o.id AND l.status = 'posted'
               AND l.reversal_of_entry_id IS NULL AND l.description NOT LIKE '[VOID]%'
               AND (l.reference LIKE '%-COGS') = (o.reference LIKE '%-COGS')
           ) ELSE false END AS superseded
    FROM roots JOIN journal_entries o ON o.id = roots.root
    ORDER BY o.entry_date
  `)) as unknown as { root_id: string; tail_id: string; source_type: string; reference: string | null; description: string; entry_date: string; total: number; superseded: boolean }[];
  return rows.map((r) => ({
    rootId: r.root_id,
    tailId: r.tail_id,
    sourceType: r.source_type,
    reference: r.reference,
    description: r.description,
    entryDate: r.entry_date,
    total: Number(r.total),
    superseded: !!r.superseded,
  }));
}

// ---------------------------------------------------------------- G. Sumber posting kas

export type CashVerdict =
  | { kind: "valid" }
  | { kind: "orphan"; reason: string }
  | { kind: "mismatch"; reason: string; orderId: string }
  | { kind: "manual"; reason: string }
  | { kind: "check"; reason: string };

export interface CashPosting {
  entryId: string;
  sourceType: string;
  sourceId: string | null;
  reference: string | null;
  description: string;
  entryDate: string;
  cashNet: number;
  verdict: CashVerdict;
}

/**
 * Every live journal touching a CASH account (cash_bank_accounts type "cash", or one COA code) must
 * trace to a real, still-valid source record — and cash taken for an order must have a sales journal.
 * See the verdict rules inline; nothing is changed here.
 */
export async function auditCashPostings(outletId: string, accountCode?: string): Promise<{ postings: CashPosting[]; paidWithoutJournal: { orderId: string; amount: number }[] }> {
  const cashBankRows = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.outletId, outletId));
  const glRows = await db.select().from(accounts).where(eq(accounts.outletId, outletId));
  const cashGlIds = new Set(accountCode ? glRows.filter((a) => a.code === accountCode).map((a) => a.id) : cashBankRows.filter((c) => c.type === "cash").map((c) => c.accountId));
  if (cashGlIds.size === 0) return { postings: [], paidWithoutJournal: [] };
  const glOfCashBank = new Map(cashBankRows.map((c) => [c.id, c.accountId]));

  const lineRows = await db
    .select({
      entryId: journalEntries.id,
      sourceType: journalEntries.sourceType,
      sourceId: journalEntries.sourceId,
      reference: journalEntries.reference,
      description: journalEntries.description,
      entryDate: journalEntries.entryDate,
      debit: journalLines.debit,
      credit: journalLines.credit,
    })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
    .where(
      and(
        eq(journalEntries.outletId, outletId),
        inArray(journalLines.accountId, [...cashGlIds]),
        eq(journalEntries.status, "posted"),
        isNull(journalEntries.reversalOfEntryId),
        notLike(journalEntries.description, "[VOID]%")
      )
    );
  const entries = new Map<string, Omit<CashPosting, "verdict">>();
  for (const r of lineRows) {
    const e = entries.get(r.entryId) ?? { entryId: r.entryId, sourceType: r.sourceType, sourceId: r.sourceId, reference: r.reference, description: r.description, entryDate: r.entryDate, cashNet: 0 };
    e.cashNet += (r.debit ?? 0) - (r.credit ?? 0);
    entries.set(r.entryId, e);
  }
  const list = [...entries.values()];
  const idsOf = (type: string) => [...new Set(list.filter((e) => e.sourceType === type && e.sourceId).map((e) => e.sourceId!))];
  const mapById = async <T extends { id: string }>(ids: string[], load: (ids: string[]) => Promise<T[]>) => (ids.length ? new Map((await load(ids)).map((r) => [r.id, r])) : new Map<string, T>());

  const orderIds = [...idsOf("rental"), ...idsOf("pos")];
  const orderMap = await mapById(orderIds, (ids) => db.select().from(orders).where(inArray(orders.id, ids)));
  const orderPayments = orderIds.length ? await db.select().from(payments).where(inArray(payments.orderId, orderIds)) : [];
  const recMap = await mapById(idsOf("receivable_payment"), (ids) => db.select().from(receivables).where(inArray(receivables.id, ids)));
  const recOrderIds = [...recMap.values()].map((r) => r.orderId).filter(Boolean) as string[];
  const recPayments = recOrderIds.length ? await db.select().from(payments).where(inArray(payments.orderId, recOrderIds)) : [];
  const ppobMap = await mapById(idsOf("ppob"), (ids) => db.select().from(ppobTransactions).where(inArray(ppobTransactions.id, ids)));
  const expMap = await mapById(idsOf("expense"), (ids) => db.select().from(expenses).where(inArray(expenses.id, ids)));
  const oiMap = await mapById(idsOf("other_income"), (ids) => db.select().from(otherIncomes).where(inArray(otherIncomes.id, ids)));
  const mbMap = await mapById(idsOf("membership_fee"), (ids) => db.select().from(membershipPayments).where(inArray(membershipPayments.id, ids)));
  const cdMap = await mapById(idsOf("cash_deposit"), (ids) => db.select().from(cashDeposits).where(inArray(cashDeposits.id, ids)));
  const ctMap = await mapById(idsOf("cash_transfer"), (ids) => db.select().from(cashTransfers).where(inArray(cashTransfers.id, ids)));
  const hrMap = await mapById(idsOf("home_rental"), (ids) => db.select().from(homeRentalRentals).where(inArray(homeRentalRentals.id, ids)));

  const arPay8 = new Set(list.filter((e) => e.sourceType === "receivable_payment" && e.reference?.startsWith("AR-")).map((e) => e.reference!.split("-")[2]));

  const verdictOf = (e: Omit<CashPosting, "verdict">): CashVerdict => {
    const st = e.sourceType;
    if (st === "manual" || st === "opening_balance") return { kind: "manual", reason: st === "manual" ? "Jurnal manual" : "Saldo awal" };
    if (!e.sourceId) return { kind: "manual", reason: "Jurnal tanpa sumber (impor/historis)" };

    if (st === "rental" || st === "pos") {
      const order = orderMap.get(e.sourceId);
      if (!order) return { kind: "orphan", reason: "Order sumbernya sudah tidak ada" };
      const ops = orderPayments.filter((p) => p.orderId === order.id);
      if (e.reference?.startsWith("DEP-")) {
        const pay = ops.find((p) => p.id.startsWith(e.reference!.slice(4)));
        if (!pay) return { kind: "orphan", reason: "Pembayaran DP-nya tidak ditemukan" };
        if (pay.status !== "success") return { kind: "orphan", reason: `Pembayaran DP berstatus "${pay.status}"` };
        if (!near(e.cashNet, pay.amount - (pay.feeAmount ?? 0))) return { kind: "check", reason: "Nominal DP di jurnal berbeda dengan pembayarannya" };
        return { kind: "valid" };
      }
      if (order.status === "cancelled") return { kind: "orphan", reason: "Order sudah dibatalkan tapi jurnal penjualannya masih berlaku" };
      const expected = ops
        .filter((p) => p.status === "success" && p.kind !== "deposit" && !arPay8.has(p.id.slice(0, 8)))
        .filter((p) => p.cashBankAccountId && cashGlIds.has(glOfCashBank.get(p.cashBankAccountId) ?? ""))
        .reduce((s, p) => s + p.amount - (p.feeAmount ?? 0), 0);
      const paidAll = ops.filter((p) => p.status === "success").reduce((s, p) => s + p.amount, 0);
      const overpay = Math.max(0, paidAll - order.total);
      if (!near(e.cashNet, expected) && !near(e.cashNet, expected - overpay)) {
        return { kind: "mismatch", orderId: order.id, reason: `Kas di jurnal Rp${Math.round(e.cashNet).toLocaleString("id-ID")} ≠ pembayaran sukses Rp${Math.round(expected).toLocaleString("id-ID")}` };
      }
      return { kind: "valid" };
    }
    if (st === "receivable_payment") {
      const rec = recMap.get(e.sourceId);
      if (!rec) return { kind: "orphan", reason: "Piutang sumbernya sudah tidak ada" };
      const pay8 = e.reference?.split("-")[2];
      const pay = pay8 ? recPayments.find((p) => p.orderId === rec.orderId && p.id.startsWith(pay8)) : undefined;
      if (!pay) return { kind: "orphan", reason: "Pembayaran pelunasannya tidak ditemukan" };
      if (pay.status !== "success") return { kind: "orphan", reason: `Pembayaran pelunasan berstatus "${pay.status}"` };
      return { kind: "valid" };
    }
    if (st === "ppob") {
      const tx = ppobMap.get(e.sourceId);
      if (!tx) return { kind: "orphan", reason: "Transaksi PPOB sumbernya sudah tidak ada" };
      if (tx.status === "reversed") return { kind: "orphan", reason: "Transaksi PPOB sudah dibatalkan tapi jurnalnya masih berlaku" };
      if (e.entryId !== tx.journalEntryId && e.entryId !== tx.settlementJournalEntryId) return { kind: "orphan", reason: "Bukan jurnal yang ditautkan di transaksi PPOB (sisa edit/duplikat)" };
      return { kind: "valid" };
    }
    if (st === "expense") {
      const x = expMap.get(e.sourceId);
      if (!x) return { kind: "orphan", reason: "Expense sumbernya sudah tidak ada" };
      if (!["approved", "paid"].includes(x.status)) return { kind: "orphan", reason: `Expense berstatus "${x.status}" tapi jurnalnya masih berlaku` };
      if (e.entryId !== x.journalEntryId && e.entryId !== x.paymentJournalEntryId) return { kind: "orphan", reason: "Bukan jurnal yang ditautkan di expense (duplikat)" };
      return { kind: "valid" };
    }
    const linked = (m: Map<string, { status: string; journalEntryId: string | null }>, label: string): CashVerdict => {
      const row = m.get(e.sourceId!);
      if (!row) return { kind: "orphan", reason: `${label} sumbernya sudah tidak ada` };
      if (row.status !== "posted") return { kind: "orphan", reason: `${label} berstatus "${row.status}" tapi jurnalnya masih berlaku` };
      if (row.journalEntryId && row.journalEntryId !== e.entryId) return { kind: "orphan", reason: `Bukan jurnal yang ditautkan di ${label} (duplikat)` };
      return { kind: "valid" };
    };
    if (st === "other_income") return linked(oiMap, "Pendapatan lain");
    if (st === "membership_fee") return linked(mbMap, "Pembayaran membership");
    if (st === "cash_deposit") return linked(cdMap, "Setoran kas");
    if (st === "cash_transfer") return linked(ctMap, "Pindah kas");
    if (st === "home_rental") return hrMap.has(e.sourceId) ? { kind: "valid" } : { kind: "orphan", reason: "Data Home Rental sumbernya sudah tidak ada" };
    return { kind: "check", reason: `Jenis sumber "${st}" tidak dicek otomatis` };
  };
  const postings: CashPosting[] = list.map((e) => ({ ...e, verdict: verdictOf(e) }));

  // Cash actually taken (success, cash method) for a paid order with NO live sales journal at all.
  const liveSales = new Set(
    (
      await db
        .select({ sourceId: journalEntries.sourceId })
        .from(journalEntries)
        .where(and(eq(journalEntries.outletId, outletId), eq(journalEntries.status, "posted"), isNull(journalEntries.reversalOfEntryId), sql`${journalEntries.reference} ~ '^ORDER-[0-9a-f]{8}$'`))
    ).map((r) => r.sourceId)
  );
  const paidCash = await db
    .select({ orderId: payments.orderId, amount: payments.amount, kind: payments.kind, status: orders.status })
    .from(payments)
    .innerJoin(orders, eq(payments.orderId, orders.id))
    .where(and(eq(orders.outletId, outletId), eq(payments.status, "success"), eq(payments.method, "cash")));
  const noJournal = new Map<string, number>();
  for (const p of paidCash) {
    if (p.kind === "deposit" || !(p.status === "paid" || p.status === "partial") || liveSales.has(p.orderId)) continue;
    noJournal.set(p.orderId, (noJournal.get(p.orderId) ?? 0) + p.amount);
  }
  return { postings, paidWithoutJournal: [...noJournal].map(([orderId, amount]) => ({ orderId, amount })) };
}

// ---------------------------------------------------------------- C. Kelebihan bayar supplier

export async function findOverpaidPurchaseInvoices(outletId: string) {
  return (await db.execute(sql`
    SELECT pi.id, pi.invoice_number, pi.amount::float AS amount,
           (SELECT COALESCE(SUM(pp.amount), 0)::float FROM purchase_payments pp WHERE pp.purchase_invoice_id = pi.id) AS paid,
           (SELECT COUNT(*)::int FROM purchase_payments pp WHERE pp.purchase_invoice_id = pi.id) AS payment_count
    FROM purchase_invoices pi
    WHERE pi.outlet_id = ${outletId} AND pi.status <> 'cancelled'
      AND (SELECT COALESCE(SUM(pp.amount), 0) FROM purchase_payments pp WHERE pp.purchase_invoice_id = pi.id) > pi.amount + 1
  `)) as unknown as { id: string; invoice_number: string | null; amount: number; paid: number; payment_count: number }[];
}

// ---------------------------------------------------------------- H. Isolasi antar-outlet

export interface IsolationBreach {
  kind: "journal_line" | "cash_bank" | "mapping";
  label: string;
  detail: string;
  amount?: number;
}

/**
 * Anything linking THIS outlet's books to another outlet's accounts, in either direction: journal
 * lines of this outlet posted to a foreign account, other outlets' journal lines hitting this
 * outlet's accounts, and cash/bank rows or mappings pointing at a foreign COA account. Must be zero —
 * new writes are refused by the app (assertPostableAccountIds) and the DB (migrasi 0019).
 */
export async function findIsolationBreaches(outletId: string): Promise<IsolationBreach[]> {
  const lines = (await db.execute(sql`
    SELECT je.reference, je.description, je.outlet_id AS entry_outlet, a.outlet_id AS account_outlet, a.code, a.name,
           (jl.debit - jl.credit)::float AS net
    FROM journal_lines jl
    JOIN journal_entries je ON je.id = jl.journal_entry_id
    JOIN accounts a ON a.id = jl.account_id
    WHERE a.outlet_id <> je.outlet_id AND (je.outlet_id = ${outletId} OR a.outlet_id = ${outletId})
    LIMIT 200
  `)) as unknown as { reference: string | null; description: string; entry_outlet: string; account_outlet: string; code: string; name: string; net: number }[];
  const cashBank = (await db.execute(sql`
    SELECT c.name, a.code, a.name AS account_name FROM cash_bank_accounts c JOIN accounts a ON a.id = c.account_id
    WHERE c.outlet_id = ${outletId} AND a.outlet_id <> c.outlet_id
  `)) as unknown as { name: string; code: string; account_name: string }[];
  const mappings = (await db.execute(sql`
    SELECT m.module, m.transaction_key, a.code, a.name FROM account_mappings m JOIN accounts a ON a.id = m.account_id
    WHERE m.outlet_id = ${outletId} AND a.outlet_id <> m.outlet_id
  `)) as unknown as { module: string; transaction_key: string; code: string; name: string }[];

  return [
    ...lines.map((l) => ({
      kind: "journal_line" as const,
      label: `${l.reference ?? "-"} — ${l.description}`,
      detail: l.entry_outlet === outletId ? `Jurnal outlet ini memakai akun outlet lain (${l.code} ${l.name})` : `Jurnal outlet lain memakai akun outlet ini (${l.code} ${l.name})`,
      amount: Number(l.net),
    })),
    ...cashBank.map((c) => ({ kind: "cash_bank" as const, label: `Kas/bank "${c.name}"`, detail: `Tertaut ke akun outlet lain (${c.code} ${c.account_name})` })),
    ...mappings.map((m) => ({ kind: "mapping" as const, label: `Mapping ${m.module}/${m.transaction_key}`, detail: `Menunjuk akun outlet lain (${m.code} ${m.name})` })),
  ];
}
