import { db } from "@/db/client";
import { accounts, journalLines, journalEntries, products } from "@/db/schema";
import { eq, and, gte, lte, sql, inArray, desc } from "drizzle-orm";

export interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  type: string;
  normalBalance: "debit" | "credit";
  parentId: string | null;
  isPostingAllowed: boolean;
  debit: number;
  credit: number;
  balance: number; // signed per normal balance
}

/**
 * Sum journal lines per account within [from, to] (inclusive, ISO date strings).
 *
 * IMPORTANT: this intentionally includes entries with status "void", not just
 * "posted". voidJournal() never deletes or excludes the original entry from
 * history (audit trail requirement) — it posts a *separate offsetting
 * reversal entry* and then marks the original as "void" purely as a status
 * label. If this query excluded status="void" entries, the original entry's
 * debits/credits would vanish from the sums while the reversal's debits/
 * credits would still count, leaving a lopsided balance instead of a clean
 * net-zero cancellation. Both entries must be summed together so they cancel
 * out exactly, which is what makes the reversal pattern correct.
 */
export async function computeTrialBalance(outletId: string, from?: string, to?: string): Promise<TrialBalanceRow[]> {
  const allAccounts = await db.select().from(accounts).where(eq(accounts.outletId, outletId));

  const conditions = [eq(journalEntries.outletId, outletId)];
  if (from) conditions.push(gte(journalEntries.entryDate, from));
  if (to) conditions.push(lte(journalEntries.entryDate, to));

  const rows = await db
    .select({
      accountId: journalLines.accountId,
      debit: sql<number>`sum(${journalLines.debit})`,
      credit: sql<number>`sum(${journalLines.credit})`,
    })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
    .where(and(...conditions))
    .groupBy(journalLines.accountId);

  const sums = new Map(rows.map((r) => [r.accountId, { debit: r.debit ?? 0, credit: r.credit ?? 0 }]));

  return allAccounts.map((acc) => {
    const sum = sums.get(acc.id) ?? { debit: 0, credit: 0 };
    const balance = acc.normalBalance === "debit" ? sum.debit - sum.credit : sum.credit - sum.debit;
    return {
      accountId: acc.id,
      code: acc.code,
      name: acc.name,
      type: acc.type,
      normalBalance: acc.normalBalance as "debit" | "credit",
      parentId: acc.parentId,
      isPostingAllowed: acc.isPostingAllowed,
      debit: sum.debit,
      credit: sum.credit,
      balance,
    };
  });
}

export interface TrialBalanceTreeRow extends TrialBalanceRow {
  depth: number;
  debit: number; // recomputed: for Header rows this is the recursive sum of postable descendants
  credit: number;
  balance: number;
}

/**
 * Rebuilds the same parent/child tree + recursive-subtotal logic the Trial
 * Balance UI uses client-side (Header rows show the sum of their postable
 * descendants), as a flat, depth-ordered list — so the xlsx/pdf export can
 * render the exact hierarchy the user sees on screen. When showZero is
 * false, rows (and their now-empty parents) whose recursive debit+credit
 * are both zero are dropped, matching "jika nol tampilan" (zero-balance
 * accounts hidden by default, shown when toggled).
 */
export function flattenTrialBalanceTree(rows: TrialBalanceRow[], showZero: boolean): TrialBalanceTreeRow[] {
  const byId = new Map(rows.map((r) => [r.accountId, r]));
  const childrenOf = new Map<string, TrialBalanceRow[]>();
  for (const r of rows) {
    const key = r.parentId ?? "__root__";
    if (!childrenOf.has(key)) childrenOf.set(key, []);
    childrenOf.get(key)!.push(r);
  }
  for (const list of childrenOf.values()) list.sort((a, b) => a.code.localeCompare(b.code));

  const amountsCache = new Map<string, { debit: number; credit: number; balance: number }>();
  const computeAmounts = (id: string): { debit: number; credit: number; balance: number } => {
    if (amountsCache.has(id)) return amountsCache.get(id)!;
    const row = byId.get(id);
    let result: { debit: number; credit: number; balance: number };
    if (row?.isPostingAllowed) {
      result = { debit: row.debit, credit: row.credit, balance: row.balance };
    } else {
      const kids = childrenOf.get(id) ?? [];
      result = kids.reduce(
        (acc, k) => {
          const a = computeAmounts(k.accountId);
          return { debit: acc.debit + a.debit, credit: acc.credit + a.credit, balance: acc.balance + a.balance };
        },
        { debit: 0, credit: 0, balance: 0 }
      );
    }
    amountsCache.set(id, result);
    return result;
  };

  const out: TrialBalanceTreeRow[] = [];
  const visit = (r: TrialBalanceRow, depth: number) => {
    const amounts = computeAmounts(r.accountId);
    const isZero = amounts.debit === 0 && amounts.credit === 0;
    if (isZero && !showZero) return;
    out.push({ ...r, depth, debit: amounts.debit, credit: amounts.credit, balance: amounts.balance });
    for (const k of childrenOf.get(r.accountId) ?? []) visit(k, depth + 1);
  };
  for (const r of childrenOf.get("__root__") ?? []) visit(r, 0);
  return out;
}

export async function computeProfitLoss(outletId: string, from?: string, to?: string) {
  const trialBalance = await computeTrialBalance(outletId, from, to);

  // Sorted by code (not raw DB/select order) so the line-item order always matches the Chart of
  // Accounts' own numbering — previously this came back in whatever order the accounts table
  // query happened to return, so e.g. "4170 Other Rental" could print before "4210 Food Sales"
  // in one outlet and after in another, looking inconsistent with the COA tree.
  const revenue = trialBalance.filter((r) => r.type === "revenue").sort((a, b) => a.code.localeCompare(b.code));
  const expense = trialBalance.filter((r) => r.type === "expense").sort((a, b) => a.code.localeCompare(b.code));

  // Hierarchical view mirroring the exact same Header→child grouping the Chart of Accounts tree
  // and Trial Balance already use (flattenTrialBalanceTree), so the P&L visually groups accounts
  // under their real COA parent categories (e.g. "RENTAL REVENUE" > "PS4 Rental") instead of a
  // flat, ungrouped list that looks disconnected from the Chart of Accounts.
  const revenueTree = flattenTrialBalanceTree(revenue, false);
  const expenseTree = flattenTrialBalanceTree(expense, false);

  const totalRevenue = revenue.reduce((s, r) => s + r.balance, 0);
  const totalExpense = expense.reduce((s, r) => s + r.balance, 0);

  // Gross Sales -> Discount -> Net Sales waterfall: 4910-4950 (CONTRA REVENUE, under header
  // 4900) are revenue-type accounts but always post as debits (see postSalesJournal's "Diskon
  // penjualan" line), so their `balance` (credit-normal: credit-debit) comes out negative —
  // totalRevenue above already nets them in automatically. Pull them out separately here so
  // the report can show Gross -> Discount -> Net instead of one flat net number.
  const contraRevenue = revenue.filter((r) => r.code.startsWith("49") && r.code !== "4900" && r.isPostingAllowed);
  const totalDiscount = contraRevenue.reduce((s, r) => s + Math.abs(r.balance), 0);
  const grossRevenue = totalRevenue + totalDiscount;
  const netRevenue = totalRevenue;

  // COGS now spans the whole 5xxx family (5110 Food COGS, 5120 Beverage COGS, ...)
  // instead of one lumped "5000" code — sum every account under that top-level digit.
  const totalCogs = expense.filter((r) => r.code.startsWith("5")).reduce((s, r) => s + r.balance, 0);
  const grossProfit = totalRevenue - totalCogs;
  const netProfit = totalRevenue - totalExpense;

  /*
   * Peringatan "HPP tidak terdeteksi".
   *
   * postSalesJournal hanya memposting jurnal HPP kalau `cogsTotal > 0` (postings.ts), dan
   * computeItemCogs menghitungnya dari `products.costPrice` — kolom yang default-nya 0 dan yang
   * form produknya sendiri menyebut "opsional, bisa otomatis dari Belanja Supplier". Jadi outlet
   * yang menambahkan produk secara manual tanpa mengisi Harga Modal akan menjual barang dengan HPP
   * nol, sepenuhnya diam-diam.
   *
   * Akibatnya bukan sekadar satu angka kosong: bagian Beban jadi melompong, Laba Kotor menjadi
   * SAMA PERSIS dengan Total Pendapatan, dan laporan ini menyatakan margin 100% atas barang yang
   * jelas-jelas ada modalnya. Pemilik yang mengambil keputusan harga atau belanja dari angka itu
   * akan mengambil keputusan yang salah — dan tidak ada apa pun di layar yang memberi tahu bahwa
   * angkanya belum lengkap. Laporan yang salah tapi terlihat normal lebih berbahaya daripada
   * laporan yang jelas-jelas kosong.
   *
   * Karena itu di sini dideteksi kondisinya — ada pendapatan dari barang (F&B 42xx / Penjualan
   * Produk 43xx) tapi HPP nol — lalu dihitung berapa produk aktif yang Harga Modal-nya masih
   * kosong, supaya pesannya bisa langsung menyebut angka dan pemilik tahu persis apa yang harus
   * diperbaiki. Sengaja TIDAK mengarang estimasi HPP: menebak modal barang lebih buruk daripada
   * mengakui belum tahu.
   */
  const goodsRevenue = revenue
    .filter((r) => r.isPostingAllowed && (r.code.startsWith("42") || r.code.startsWith("43")))
    .reduce((s, r) => s + r.balance, 0);

  let cogsWarning: { goodsRevenue: number; productsWithoutCostPrice: number } | null = null;
  if (goodsRevenue > 0 && totalCogs === 0) {
    const [row] = await db
      .select({ n: sql<number>`count(*)` })
      .from(products)
      .where(and(eq(products.outletId, outletId), eq(products.isActive, true), sql`coalesce(${products.costPrice}, 0) = 0`));
    cogsWarning = { goodsRevenue, productsWithoutCostPrice: Number(row?.n ?? 0) };
  }

  return {
    from,
    to,
    cogsWarning,
    revenue,
    expense,
    revenueTree,
    expenseTree,
    totalRevenue,
    totalExpense,
    grossRevenue,
    totalDiscount,
    netRevenue,
    contraRevenue,
    grossProfit,
    netProfit,
  };
}

export async function computeBalanceSheet(outletId: string, asOf?: string) {
  const trialBalance = await computeTrialBalance(outletId, undefined, asOf);

  // Sorted by code (see the same note in computeProfitLoss) so line order always matches the COA.
  const assets = trialBalance.filter((r) => r.type === "asset").sort((a, b) => a.code.localeCompare(b.code));
  const liabilities = trialBalance.filter((r) => r.type === "liability").sort((a, b) => a.code.localeCompare(b.code));
  const equity = trialBalance.filter((r) => r.type === "equity").sort((a, b) => a.code.localeCompare(b.code));

  // Same Header→child grouping as the COA tree / Trial Balance / P&L (see computeProfitLoss).
  const assetsTree = flattenTrialBalanceTree(assets, false);
  const liabilitiesTree = flattenTrialBalanceTree(liabilities, false);
  const equityTree = flattenTrialBalanceTree(equity, false);

  // Retained earnings = cumulative net profit not yet closed to equity (computed live, not requiring period-close).
  const pl = await computeProfitLoss(outletId, undefined, asOf);

  const totalAssets = assets.reduce((s, r) => s + r.balance, 0);
  const totalLiabilities = liabilities.reduce((s, r) => s + r.balance, 0);
  const totalEquityBooked = equity.reduce((s, r) => s + r.balance, 0);
  const totalEquityWithRetainedEarnings = totalEquityBooked + pl.netProfit;

  return {
    asOf,
    assets,
    liabilities,
    equity,
    assetsTree,
    liabilitiesTree,
    equityTree,
    totalAssets,
    totalLiabilities,
    totalEquityBooked,
    currentPeriodNetProfit: pl.netProfit,
    totalEquityWithRetainedEarnings,
    balances: Math.abs(totalAssets - (totalLiabilities + totalEquityWithRetainedEarnings)) < 1,
  };
}

export interface AccountLedgerDetailLine {
  journalEntryId: string;
  entryDate: string;
  reference: string | null;
  description: string;
  sourceType: string;
  sourceId: string | null;
  status: "posted" | "void";
  voidReason: string | null;
  lineDescription: string | null;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  /** Signed per THIS LINE's own account normalBalance — so summing `amount` across every returned
   * line reproduces the exact same P&L balance the owner clicked in from, even when a Header
   * account (e.g. "PENDAPATAN RENTAL") was clicked and its descendants are a mix of individually
   * postable accounts. */
  amount: number;
}

/**
 * Drill-down for the P&L (and Trial Balance) "audit" need: given the SAME accountId the owner
 * clicked in the P&L tree, returns every individual journal line that rolled up into that
 * account's balance for the same period — so a total like "Rental PS 3: Rp593.750" can be traced
 * back to the exact orders/journal entries that produced it, instead of the owner having to trust
 * an opaque aggregate number.
 *
 * If accountId is a Header (isPostingAllowed: false, e.g. "PENDAPATAN RENTAL" grouping "Rental
 * PS 3"/"Rental PS4"/"Rental Lainnya"), this recurses into every postable descendant and returns
 * their combined lines — matching flattenTrialBalanceTree's own recursive-subtotal behavior, so
 * the returned lines' total reconciles exactly with the Header's own displayed balance.
 *
 * Deliberately includes "void" entries (see computeTrialBalance's own doc comment on why: voiding
 * never deletes the original entry, it posts a separate offsetting reversal and marks the original
 * "void" as a status label only) — filtering them out here would both break reconciliation against
 * the P&L total AND hide exactly the corrections (void+repost from correctPayment/
 * correctRentalCharge/deleteOrderItem) an owner auditing the books most needs to see. The UI is
 * expected to visually de-emphasize/label voided entries rather than this function hiding them.
 */
export async function getAccountLedgerDetail(outletId: string, accountId: string, from?: string, to?: string): Promise<AccountLedgerDetailLine[]> {
  const allAccounts = await db.select().from(accounts).where(eq(accounts.outletId, outletId));
  const byId = new Map(allAccounts.map((a) => [a.id, a]));
  const target = byId.get(accountId);
  if (!target) return [];

  const childrenOf = new Map<string, typeof allAccounts>();
  for (const a of allAccounts) {
    const key = a.parentId ?? "__root__";
    if (!childrenOf.has(key)) childrenOf.set(key, []);
    childrenOf.get(key)!.push(a);
  }

  const postableIds: string[] = [];
  const collectPostable = (id: string) => {
    const acc = byId.get(id);
    if (!acc) return;
    if (acc.isPostingAllowed) {
      postableIds.push(id);
      return;
    }
    for (const child of childrenOf.get(id) ?? []) collectPostable(child.id);
  };
  collectPostable(accountId);
  if (postableIds.length === 0) return [];

  const conditions = [eq(journalEntries.outletId, outletId), inArray(journalLines.accountId, postableIds)];
  if (from) conditions.push(gte(journalEntries.entryDate, from));
  if (to) conditions.push(lte(journalEntries.entryDate, to));

  const rows = await db
    .select({
      journalEntryId: journalEntries.id,
      entryDate: journalEntries.entryDate,
      reference: journalEntries.reference,
      description: journalEntries.description,
      sourceType: journalEntries.sourceType,
      sourceId: journalEntries.sourceId,
      status: journalEntries.status,
      voidReason: journalEntries.voidReason,
      lineDescription: journalLines.description,
      accountId: journalLines.accountId,
      debit: journalLines.debit,
      credit: journalLines.credit,
    })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
    .where(and(...conditions))
    .orderBy(desc(journalEntries.entryDate));

  return rows.map((r) => {
    const acc = byId.get(r.accountId)!;
    const amount = acc.normalBalance === "debit" ? r.debit - r.credit : r.credit - r.debit;
    return {
      journalEntryId: r.journalEntryId,
      entryDate: r.entryDate,
      reference: r.reference,
      description: r.description,
      sourceType: r.sourceType,
      sourceId: r.sourceId,
      status: r.status as "posted" | "void",
      voidReason: r.voidReason,
      lineDescription: r.lineDescription,
      accountId: r.accountId,
      accountCode: acc.code,
      accountName: acc.name,
      debit: r.debit,
      credit: r.credit,
      amount,
    };
  });
}
