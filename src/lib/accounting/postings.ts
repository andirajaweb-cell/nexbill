import { db, type DbOrTx } from "@/db/client";
import {
  orders,
  orderItems,
  payments,
  products,
  recipes,
  recipeIngredients,
  expenses,
  purchaseInvoices,
  purchasePayments,
  purchaseReturns,
  cashBankAccounts,
  journalEntries,
  receivables,
  rentalSessions,
  rentalUnits,
  customers,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { postJournal, JournalLineInput } from "./journal";
import { getMappedAccountId, getCashBankAccountIdForPaymentMethod } from "./account-mapping";

const round = (n: number) => Math.round(n);

/** Map a free-text expense category to a COA code, with a safe fallback — kept only as a
 * category->COA-code suggestion helper for the Expense module's UI (see note near the bottom
 * of this file); mirrors the "expense" module rows seeded into account-mapping.ts. */
const EXPENSE_CATEGORY_TO_ACCOUNT: Record<string, string> = {
  gaji: "6110",
  staf: "6110",
  listrik: "6220",
  internet: "6240",
  wifi: "6240",
  sewa: "6210",
  payment_gateway: "6540",
  penyusutan: "6850",
  operasional: "6900",
};

function expenseAccountCode(category: string): string {
  const key = category.toLowerCase().replace(/\s+/g, "_");
  return EXPENSE_CATEGORY_TO_ACCOUNT[key] ?? "6900";
}

/** ps3 -> "ps3", ps4/ps4_pro -> "ps4", ps5/ps5_slim -> "ps5", ps6 -> "ps6", ps2/anything else ->
 * "other" (mapping module "rental"). ps2 intentionally stays lumped into "other" (4170) — it
 * wasn't asked to get its own account and is rare/legacy hardware. Only used for non-member
 * sessions — see isMemberCustomer(). */
function rentalMappingKey(consoleType?: string | null): string {
  if (consoleType === "ps3") return "ps3";
  if (consoleType === "ps4" || consoleType === "ps4_pro") return "ps4";
  if (consoleType === "ps5" || consoleType === "ps5_slim") return "ps5";
  if (consoleType === "ps6") return "ps6";
  return "other";
}

/** A session's customer counts as "member" the same way computeEffectiveHourlyRate (src/lib/rental/pricing.ts)
 * decides member pricing: any non-null customers.membershipTierId, no active/expiry check. Kept in sync with
 * that function deliberately — if a session got the member rate, its revenue should land in the member account. */
async function isMemberCustomer(customerId?: string | null, dbc: DbOrTx = db): Promise<boolean> {
  if (!customerId) return false;
  const [customer] = await dbc.select().from(customers).where(eq(customers.id, customerId)).limit(1);
  return !!customer?.membershipTierId;
}

/**
 * The single canonical list of product categories that count as F&B for accounting purposes —
 * exported so every other place in the app that needs "is this product category F&B" (the owner
 * dashboard's revenue breakdown, Transaction Center's summary) imports this instead of keeping
 * its own hand-copied list. Two other copies of this exact list used to exist independently
 * (app/api/dashboard/owner/route.ts, lib/reports/transactions.ts) — one of them had silently
 * drifted to omit "coffee"/"dessert", so a coffee or dessert sale (a real 4230/4250 F&B revenue
 * account) showed up as generic "Produk" on the Transaction Center page instead of "F&B", not
 * matching what Accounting actually recorded it as.
 */
export const FNB_CATEGORIES = new Set(["food", "drink", "coffee", "snack", "dessert"]);

/** food/drink/coffee/snack/dessert -> matching F&B revenue+COGS mapping keys (module "fnb"/"fnb_cogs"). */
function fnbMappingKey(category?: string): string | null {
  return category && FNB_CATEGORIES.has(category) ? category : null;
}

/** merchandise/accessory -> retail-sale mapping keys (module "product_sale"/"product_sale_cogs") — a physical
 * item SOLD outright, as opposed to the per-hour rental "addon" flow below (same-sounding items, different flow). */
function merchMappingKey(category?: string): string | null {
  if (category === "merchandise" || category === "accessory") return category;
  return null;
}

/**
 * Every accessory-rental order item (itemType "accessory" — controller/headset/VR/anything else
 * rented per-hour alongside a session) now routes to ONE default add-on revenue account (module
 * "addon", key "other" -> 4354) instead of being split across 4351-4354 by keyword-sniffing the
 * item's description. Simpler, and still fully captured under ADD-ON RENTAL REVENUE in Laba Rugi
 * either way; outlets that still want a per-accessory-type breakdown can add their own Account
 * Mapping override rows (module "addon", key "controller"/"headset"/"vr") pointing at 4351-4353,
 * which still exist in the COA for that purpose. Kept as a function (not an inline constant) so
 * that override point is obvious and easy to extend later without touching every call site.
 */
function addonMappingKey(_description: string): string {
  return "other";
}

async function getCashBankGlAccountId(cashBankAccountId: string, dbc: DbOrTx = db): Promise<string> {
  const [row] = await dbc.select().from(cashBankAccounts).where(eq(cashBankAccounts.id, cashBankAccountId)).limit(1);
  if (!row) throw new Error(`Cash/bank account ${cashBankAccountId} tidak ditemukan.`);
  return row.accountId;
}

export async function computeItemCogs(productId: string | null, qty: number, dbc: DbOrTx = db): Promise<number> {
  if (!productId) return 0;
  const [product] = await dbc.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) return 0;

  const [recipe] = await dbc.select().from(recipes).where(eq(recipes.productId, productId)).limit(1);
  if (recipe) {
    const ingredients = await dbc.select().from(recipeIngredients).where(eq(recipeIngredients.recipeId, recipe.id));
    let costPerYield = 0;
    for (const ing of ingredients) {
      const [ingredientProduct] = await dbc.select().from(products).where(eq(products.id, ing.ingredientProductId)).limit(1);
      costPerYield += (ingredientProduct?.costPrice ?? 0) * ing.qtyPerYield;
    }
    return (costPerYield / Math.max(1, recipe.yieldQty)) * qty;
  }

  return (product.costPrice ?? 0) * qty;
}

const FNB_REVENUE_FALLBACK: Record<string, string> = { food: "4210", drink: "4220", coffee: "4230", snack: "4240", dessert: "4250" };
const FNB_COGS_FALLBACK: Record<string, string> = { food: "5110", drink: "5120", coffee: "5130", snack: "5140", dessert: "5160" };
const MERCH_REVENUE_FALLBACK: Record<string, string> = { merchandise: "4310", accessory: "4320" };
const MERCH_COGS_FALLBACK: Record<string, string> = { merchandise: "5210", accessory: "5220" };
const ADDON_REVENUE_FALLBACK: Record<string, string> = { controller: "4351", headset: "4352", vr: "4353", other: "4354" };
const RENTAL_REVENUE_FALLBACK: Record<string, string> = { ps3: "4105", ps4: "4110", ps5: "4120", ps6: "4125" };

/**
 * Resolves the revenue account (as an accountId, ready to drop straight into a JournalLineInput)
 * for one order item, routed by itemType first (rental / accessory / product / misc) rather than
 * sniffing the description text — itemType is the authoritative flag set at item-creation time
 * (see src/lib/pos/bill.ts upsertRentalLineItem and src/lib/rental/accessories.ts).
 *   - "rental": the base PS session time charge -> member account (4180) if the customer has a
 *     membership tier, else console-type routing (PS3/PS4/PS5/PS6 each get their own account,
 *     PS2/unknown fall back to the Other Rental catch-all — see rentalMappingKey()).
 *   - "accessory": a per-hour add-on rental (extra controller/headset/VR) attached to the
 *     session -> member account (4530) if the customer has a membership tier, else the single
 *     default add-on account (4354) — see addonMappingKey().
 *   - "product": a real product sold via POS/F&B -> member account (4510 F&B / 4520 retail) if
 *     the customer has a membership tier, else F&B (4200 series) or retail Product Sale (4300
 *     series) depending on products.category. Same "two-way split, no further breakdown"
 *     simplification as rental/member — a member's F&B spend all lands in one 4510 bucket
 *     regardless of food/drink/coffee/snack/dessert, same for 4520 vs merchandise/accessory.
 *   - anything else (e.g. "misc"): falls through to the generic Lain-lain bucket, unchanged.
 */
async function revenueAccountIdForItem(
  outletId: string,
  itemType: string,
  description: string,
  category: string | undefined,
  rentalConsoleType: string | null,
  isMember: boolean,
  dbc: DbOrTx = db
): Promise<string> {
  if (itemType === "rental") {
    if (isMember) return getMappedAccountId(outletId, "rental", "member", "4180", dbc);
    const key = rentalMappingKey(rentalConsoleType);
    const fallbackCode = RENTAL_REVENUE_FALLBACK[key] ?? "4170";
    return getMappedAccountId(outletId, "rental", key, fallbackCode, dbc);
  }
  if (itemType === "accessory") {
    if (isMember) return getMappedAccountId(outletId, "addon", "member", "4530", dbc);
    const key = addonMappingKey(description);
    return getMappedAccountId(outletId, "addon", key, ADDON_REVENUE_FALLBACK[key], dbc);
  }
  if (itemType === "product") {
    const fnbKey = fnbMappingKey(category);
    if (fnbKey) {
      if (isMember) return getMappedAccountId(outletId, "fnb", "member", "4510", dbc);
      return getMappedAccountId(outletId, "fnb", fnbKey, FNB_REVENUE_FALLBACK[fnbKey], dbc);
    }
    const merchKey = merchMappingKey(category);
    if (merchKey) {
      if (isMember) return getMappedAccountId(outletId, "product_sale", "member", "4520", dbc);
      return getMappedAccountId(outletId, "product_sale", merchKey, MERCH_REVENUE_FALLBACK[merchKey], dbc);
    }
  }
  return getMappedAccountId(outletId, "other", "service_charge_tax", "4650", dbc);
}

/** Resolves the COGS expense account for one product category — F&B (module "fnb_cogs") or retail
 * merchandise/accessory (module "product_sale_cogs"). Returns null for categories with no COGS
 * account concept (device_rental/raw_material/other), same as the old fnbMappingKey-only gate. */
async function cogsAccountIdForCategory(outletId: string, category: string, dbc: DbOrTx = db): Promise<string | null> {
  const fnbKey = fnbMappingKey(category);
  if (fnbKey) return getMappedAccountId(outletId, "fnb_cogs", fnbKey, FNB_COGS_FALLBACK[fnbKey], dbc);
  const merchKey = merchMappingKey(category);
  if (merchKey) return getMappedAccountId(outletId, "product_sale_cogs", merchKey, MERCH_COGS_FALLBACK[merchKey], dbc);
  return null;
}

/**
 * Post the sales journal recognizing an order's revenue — called the first
 * time ANY payment succeeds against the order, whether that payment covers
 * the full total (the common instant-payment case) or only part of it. Splits
 * revenue into Rental / F&B / Lain-lain, records the payment-gateway fee as
 * an expense, nets the discount against revenue, and posts COGS for any F&B
 * items that have a recipe/BOM (or a plain cost price) attached.
 *
 * Revenue is recognized in full at this point (accrual, not cash basis) even
 * if the order isn't fully paid yet: whatever's still owed after the
 * payment(s) collected so far is booked as a Dr Piutang Usaha (1100) line
 * instead of Kas, and a `receivables` row is created to track it — see
 * `postReceivableSettlement` below for how later payments against that
 * shortfall get journaled (Dr Kas / Cr Piutang, not a second revenue entry).
 *
 * Aggregates cash across every successful payment against the order — so a
 * split payment (e.g. half cash + half QRIS) posts one balanced journal with
 * one cash-received line per payment. Idempotent: if a journal already exists
 * for this order (reference `ORDER-{id8}`), this is a no-op, so calling it
 * again after a stray extra payment success (retry, duplicate webhook) never
 * double-posts revenue/COGS/receivables. See `settleOrderAfterPayment` in
 * `src/lib/payments/index.ts` for when this vs. `postReceivableSettlement` fires.
 *
 * Atomicity (Task #61): everything below — the idempotency check, every payment's
 * cashBankAccountId update, the sales journal, the receivable insert (if any), and the COGS
 * journal (if any) — runs inside one `db.transaction()`. Before this, a crash or thrown error
 * partway through (e.g. after the sales journal posted but before the COGS journal did) could
 * leave revenue recognized with its COGS silently missing, or a receivable never created for a
 * shortfall that the journal already assumed existed — exactly the "setengah berhasil" state the
 * requested architecture calls out. Now either all of it lands, or none of it does.
 */
export async function postSalesJournal(orderId: string) {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) throw new Error("Order tidak ditemukan untuk posting jurnal.");

    const reference = `ORDER-${order.id.slice(0, 8)}`;
    const [existingEntry] = await tx
      .select()
      .from(journalEntries)
      .where(and(eq(journalEntries.sourceId, order.id), eq(journalEntries.reference, reference)))
      .limit(1);
    if (existingEntry) return; // already posted for this order — idempotency guard

    const successPayments = await tx.select().from(payments).where(and(eq(payments.orderId, orderId), eq(payments.status, "success")));
    if (successPayments.length === 0) return; // nothing paid yet, nothing to post

    // Exclude voided/cancelled items — recomputeBillTotals already excludes them from
    // order.subtotal/total, so including them here would revenue-count more than the
    // cash actually collected and throw off postJournal's balance check.
    const items = (await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId))).filter(
      (i) => i.kitchenStatus !== "cancelled"
    );

    // Resolve the console type + member status once (one order = one customer, whether that's via
    // a linked rental session or a customer picked directly on a POS/F&B-only order) so every item
    // on this bill — rental, accessory, or product — routes to the member-tagged account
    // consistently. Checks the rental session's customer first (matches the member rate the
    // session itself was billed at), falling back to order.customerId for orders with no session
    // at all — a pure F&B/product sale rung up against a member customer should still be tagged.
    let rentalConsoleType: string | null = null;
    let isMember = false;
    if (order.rentalSessionId) {
      const [session] = await tx.select().from(rentalSessions).where(eq(rentalSessions.id, order.rentalSessionId)).limit(1);
      if (session) {
        const [unit] = await tx.select().from(rentalUnits).where(eq(rentalUnits.id, session.rentalUnitId)).limit(1);
        rentalConsoleType = unit?.consoleType ?? null;
        isMember = await isMemberCustomer(session.customerId, tx);
      }
    }
    if (!isMember && order.customerId) {
      isMember = await isMemberCustomer(order.customerId, tx);
    }

    const revenueByAccount: Record<string, number> = {};
    const cogsByAccount: Record<string, number> = {};
    let cogsTotal = 0;

    for (const item of items) {
      let category: string | undefined;
      if (item.productId) {
        const [product] = await tx.select().from(products).where(eq(products.id, item.productId)).limit(1);
        category = product?.category;
      }
      const accountId = await revenueAccountIdForItem(order.outletId, item.itemType, item.description, category, rentalConsoleType, isMember, tx);
      revenueByAccount[accountId] = (revenueByAccount[accountId] ?? 0) + item.lineTotal;

      if (item.itemType === "product") {
        const cogsAccountId = await cogsAccountIdForCategory(order.outletId, category ?? "", tx);
        if (cogsAccountId) {
          const itemCogs = await computeItemCogs(item.productId, item.qty, tx);
          if (itemCogs > 0) {
            cogsByAccount[cogsAccountId] = (cogsByAccount[cogsAccountId] ?? 0) + itemCogs;
            cogsTotal += itemCogs;
          }
        }
      }
    }

    // Service charge + tax land in "Lain-lain" revenue (phase 1 simplification —
    // no separate PPN/VAT liability account since most single-outlet rental PS
    // businesses aren't PKP-registered; revisit if the outlet needs VAT reporting).
    const otherRevenue = (order.serviceCharge ?? 0) + (order.tax ?? 0);
    if (otherRevenue > 0) {
      const otherAccountId = await getMappedAccountId(order.outletId, "other", "service_charge_tax", "4650", tx);
      revenueByAccount[otherAccountId] = (revenueByAccount[otherAccountId] ?? 0) + otherRevenue;
    }

    // "cashLines" mixes two kinds of debit lines that both represent money already in
    // hand for this order: ordinary Kas/Bank lines for ordinary payments, and — for a payment
    // that was collected earlier as a rental "bayar di muka" deposit (kind === "deposit") — a
    // debit to the Customer Deposit liability account instead. That deposit's cash was already
    // journaled (Dr Kas / Cr Customer Deposit Liability) at collection time by postDepositJournal
    // below; re-booking Dr Kas here a second time would double-count cash that was only ever
    // received once. Debiting the liability here instead just reclassifies it: the money stops
    // being "owed back/held" and becomes recognized revenue, which is exactly what should happen
    // once the session/order it was held against is actually completed and billed.
    const cashLines: JournalLineInput[] = [];
    let totalFee = 0;
    let paidTotal = 0;
    for (const payment of successPayments) {
      paidTotal += payment.amount;

      if (payment.kind === "deposit" && payment.depositJournalEntryId) {
        const depositLiabilityAccountId = await getMappedAccountId(order.outletId, "deposit", "customer_deposit", "2131", tx);
        cashLines.push({
          accountId: depositLiabilityAccountId,
          debit: round(payment.amount),
          credit: 0,
          description: `Pemakaian uang muka (DP) — ${payment.method}`,
        });
        continue; // fee (if any) for this payment was already booked in postDepositJournal — don't book it twice
      }

      const cashBankAccountId = await getCashBankAccountIdForPaymentMethod(order.outletId, payment.method, tx);
      const cashBankGlAccountId = await getCashBankGlAccountId(cashBankAccountId, tx);
      await tx.update(payments).set({ cashBankAccountId }).where(eq(payments.id, payment.id));

      const feeAmount = payment.feeAmount ?? 0;
      totalFee += feeAmount;
      const netCash = payment.amount - feeAmount;
      cashLines.push({ accountId: cashBankGlAccountId, debit: round(netCash), credit: 0, description: `Kas/Bank diterima (${payment.method})` });
    }

    // The reverse can also happen — most commonly a rental session's "bayar di
    // muka" deposit collected as an estimate at start time turning out larger
    // than the actual final bill (session stopped earlier than planned). Cap
    // what's recognized (cash lines + consumed deposit liability) at order.total
    // so the entry still balances; the true excess is change handed back to the
    // customer at checkout, same as any ordinary cash-basis overpayment — it was
    // never meant to be booked as revenue here (and if it came from a deposit,
    // the un-consumed part of the liability is deliberately left on the books,
    // still owed back to the customer, rather than force-cleared to zero).
    const grossCash = cashLines.reduce((s, l) => s + (l.debit ?? 0), 0);
    const cashExcess = Math.max(0, round(grossCash - order.total));
    if (cashExcess > 0 && cashLines.length > 0) {
      const last = cashLines[cashLines.length - 1];
      last.debit = Math.max(0, round((last.debit ?? 0) - cashExcess));
    }

    // Whatever the collected payments don't cover yet is a receivable, not lost
    // revenue — the customer still owes it, so book it to Piutang Usaha (1100)
    // rather than deferring recognition until they eventually pay in full.
    const shortfall = Math.max(0, round(order.total - paidTotal));

    const journalLines: JournalLineInput[] = [
      ...cashLines,
      ...(shortfall > 0 ? [{ accountCode: "1141", debit: shortfall, credit: 0, description: "Piutang usaha (belum lunas)" }] : []),
      ...(totalFee > 0 ? [{ accountCode: "6540", debit: round(totalFee), credit: 0, description: "Biaya payment gateway" }] : []),
      ...(order.discount > 0 ? [{ accountCode: "4910", debit: round(order.discount), credit: 0, description: "Diskon penjualan" }] : []),
      ...Object.entries(revenueByAccount).map(([accountId, amount]) => ({
        accountId,
        debit: 0,
        credit: round(amount),
        description: "Pendapatan penjualan",
      })),
    ];

    const methodsLabel = [...new Set(successPayments.map((p) => p.method))].join("+");
    const journalId = await postJournal(
      {
        outletId: order.outletId,
        reference,
        description: `Penjualan order ${order.id.slice(0, 8)} (${methodsLabel})${shortfall > 0 ? " — sebagian piutang" : ""}`,
        sourceType: order.rentalSessionId ? "rental" : "pos",
        sourceId: order.id,
        staffUserId: order.staffUserId ?? undefined,
        lines: journalLines,
      },
      tx
    );

    if (shortfall > 0) {
      await tx.insert(receivables).values({
        outletId: order.outletId,
        customerId: order.customerId,
        orderId: order.id,
        amount: shortfall,
        paidAmount: 0,
        status: "open",
        journalEntryId: journalId,
      });
    }

    if (cogsTotal > 0) {
      const inventoryAccountId = await getMappedAccountId(order.outletId, "product", "inventory", "1161", tx);
      await postJournal(
        {
          outletId: order.outletId,
          reference: `ORDER-${order.id.slice(0, 8)}-COGS`,
          description: `HPP F&B/Produk untuk order ${order.id.slice(0, 8)}`,
          sourceType: "pos",
          sourceId: order.id,
          staffUserId: order.staffUserId ?? undefined,
          lines: [
            ...Object.entries(cogsByAccount).map(([accountId, amount]) => ({
              accountId,
              debit: round(amount),
              credit: 0,
              description: "HPP F&B/Produk",
            })),
            { accountId: inventoryAccountId, debit: 0, credit: round(cogsTotal), description: "Pengurangan persediaan" },
          ],
        },
        tx
      );
    }
  });
}

/**
 * Posts the journal for a rental "bayar di muka" (DP/prepay) deposit at the moment it's
 * collected — Dr Kas/Bank (net of any gateway fee) + Dr Biaya Payment Gateway (if any) /
 * Cr Customer Deposit (2131, liability). This intentionally does NOT touch any revenue
 * account: the customer hasn't consumed the rental time yet, so recognizing revenue here
 * would be booking income for a service not yet rendered. The liability sits on the books
 * until postSalesJournal (above) recognizes the session's real revenue and consumes it via
 * a debit to the same 2131 account — see the "kind === 'deposit'" branch in that function's
 * payment loop. Idempotent via payment.depositJournalEntryId: once set, calling this again
 * for the same payment (e.g. a retried webhook/confirm call) is a no-op that just returns
 * the existing journal id, exactly like postSalesJournal's own reference-based guard. Atomic
 * (Task #61): the cashBankAccountId update, the journal itself, and stamping
 * depositJournalEntryId back onto the payment all run in one `db.transaction()` — a journal
 * posted without that stamp landing would defeat the idempotency guard above on the very next
 * retry (posting a second, duplicate DP journal for the same cash).
 */
export async function postDepositJournal(paymentId: string): Promise<string | undefined> {
  return db.transaction(async (tx) => {
    const [payment] = await tx.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
    if (!payment) throw new Error("Payment tidak ditemukan untuk posting jurnal deposit.");
    if (payment.depositJournalEntryId) return payment.depositJournalEntryId; // idempotency guard
    if (payment.status !== "success") return undefined; // nothing collected yet, nothing to post

    const [order] = await tx
      .select({ outletId: orders.outletId, staffUserId: orders.staffUserId })
      .from(orders)
      .where(eq(orders.id, payment.orderId))
      .limit(1);
    if (!order) throw new Error("Order tidak ditemukan untuk posting jurnal deposit.");

    const cashBankAccountId = await getCashBankAccountIdForPaymentMethod(order.outletId, payment.method, tx);
    const cashBankGlAccountId = await getCashBankGlAccountId(cashBankAccountId, tx);
    await tx.update(payments).set({ cashBankAccountId }).where(eq(payments.id, paymentId));

    const feeAmount = payment.feeAmount ?? 0;
    const netCash = payment.amount - feeAmount;
    const depositLiabilityAccountId = await getMappedAccountId(order.outletId, "deposit", "customer_deposit", "2131", tx);

    const lines: JournalLineInput[] = [
      { accountId: cashBankGlAccountId, debit: round(netCash), credit: 0, description: `Kas/Bank DP diterima (${payment.method})` },
      ...(feeAmount > 0 ? [{ accountCode: "6540", debit: round(feeAmount), credit: 0, description: "Biaya payment gateway" }] : []),
      { accountId: depositLiabilityAccountId, debit: 0, credit: round(payment.amount), description: "Uang muka pelanggan (liability)" },
    ];

    const journalId = await postJournal(
      {
        outletId: order.outletId,
        reference: `DEP-${paymentId.slice(0, 8)}`,
        description: `DP diterima untuk order ${payment.orderId.slice(0, 8)} (${payment.method})`,
        sourceType: "rental",
        sourceId: payment.orderId,
        staffUserId: order.staffUserId ?? undefined,
        lines,
      },
      tx
    );

    await tx.update(payments).set({ depositJournalEntryId: journalId }).where(eq(payments.id, paymentId));
    return journalId;
  });
}

/**
 * Posts the journal for a payment that settles (fully or partially) an
 * existing receivable — Dr Kas/Bank (net of any gateway fee) + Dr Biaya
 * Payment Gateway (if any) / Cr Piutang Usaha (1100). Revenue was already
 * recognized when the receivable was created in postSalesJournal above, so
 * this never touches revenue accounts again — it only moves the balance from
 * "owed" to "collected". Updates the receivable's paidAmount/status (flips to
 * "paid" once fully settled, "partial" otherwise). Atomic (Task #61): the payment's
 * cashBankAccountId update, the journal, and the receivable's paidAmount/status update all run
 * in one `db.transaction()` — otherwise a crash between the journal posting and the receivable
 * update could leave a receivable stuck "open" for cash that's already been journaled as
 * collected, corrupting the AR aging report.
 */
export async function postReceivableSettlement(receivableId: string, payment: typeof payments.$inferSelect) {
  return db.transaction(async (tx) => {
    const [receivable] = await tx.select().from(receivables).where(eq(receivables.id, receivableId)).limit(1);
    if (!receivable) throw new Error("Piutang tidak ditemukan.");
    if (receivable.status === "paid" || receivable.status === "written_off") return; // nothing left to settle

    let staffUserId: string | undefined;
    if (receivable.orderId) {
      const [order] = await tx.select({ staffUserId: orders.staffUserId }).from(orders).where(eq(orders.id, receivable.orderId)).limit(1);
      staffUserId = order?.staffUserId ?? undefined;
    }

    const cashBankAccountId = await getCashBankAccountIdForPaymentMethod(receivable.outletId, payment.method, tx);
    const cashBankGlAccountId = await getCashBankGlAccountId(cashBankAccountId, tx);
    await tx.update(payments).set({ cashBankAccountId }).where(eq(payments.id, payment.id));

    const feeAmount = payment.feeAmount ?? 0;
    const netCash = payment.amount - feeAmount;

    const lines: JournalLineInput[] = [
      { accountId: cashBankGlAccountId, debit: round(netCash), credit: 0, description: `Pelunasan piutang (${payment.method})` },
      ...(feeAmount > 0 ? [{ accountCode: "6540", debit: round(feeAmount), credit: 0, description: "Biaya payment gateway" }] : []),
      { accountCode: "1141", debit: 0, credit: round(payment.amount), description: "Pengurangan piutang usaha" },
    ];

    const journalId = await postJournal(
      {
        outletId: receivable.outletId,
        reference: `AR-${receivable.id.slice(0, 8)}-${payment.id.slice(0, 8)}`,
        description: `Pelunasan piutang${receivable.orderId ? ` order ${receivable.orderId.slice(0, 8)}` : ""}`,
        sourceType: "receivable_payment",
        sourceId: receivable.id,
        staffUserId,
        lines,
      },
      tx
    );

    const newPaidAmount = round(receivable.paidAmount + payment.amount);
    const newStatus = newPaidAmount >= receivable.amount - 0.5 ? "paid" : "partial";
    await tx.update(receivables).set({ paidAmount: newPaidAmount, status: newStatus }).where(eq(receivables.id, receivable.id));

    return journalId;
  });
}

// NOTE: the old one-shot postExpenseJournal() (immediate Dr expense/Cr cash-bank,
// no status/approval/AP support) has been superseded by the full Expense
// Management engine in src/lib/accounting/expense.ts (createExpense +
// submitExpense/approveExpense/payExpense) — that's the only path that should
// post expense journals now. Kept EXPENSE_CATEGORY_TO_ACCOUNT/expenseAccountCode
// below only as a category->COA-code suggestion helper for the new module's UI.

/** Atomic (Task #61): the journal and the invoice's journalEntryId stamp are one transaction. */
export async function postPurchaseInvoiceJournal(purchaseInvoiceId: string) {
  return db.transaction(async (tx) => {
    const [invoice] = await tx.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, purchaseInvoiceId)).limit(1);
    if (!invoice) throw new Error("Purchase invoice tidak ditemukan.");

    const journalId = await postJournal(
      {
        outletId: invoice.outletId,
        reference: invoice.invoiceNumber ?? `PINV-${invoice.id.slice(0, 8)}`,
        description: `Pembelian dari supplier — invoice ${invoice.invoiceNumber ?? invoice.id.slice(0, 8)}`,
        sourceType: "purchase_invoice",
        sourceId: invoice.id,
        lines: [
          { accountId: await getMappedAccountId(invoice.outletId, "product", "inventory", "1161", tx), debit: round(invoice.amount), credit: 0, description: "Persediaan masuk" },
          { accountCode: "2111", debit: 0, credit: round(invoice.amount), description: "Hutang ke supplier" },
        ],
      },
      tx
    );

    await tx.update(purchaseInvoices).set({ journalEntryId: journalId }).where(eq(purchaseInvoices.id, purchaseInvoiceId));
    return journalId;
  });
}

/** Atomic (Task #61): the journal and the payment's journalEntryId stamp are one transaction. */
export async function postPurchasePaymentJournal(purchasePaymentId: string) {
  return db.transaction(async (tx) => {
    const [payment] = await tx.select().from(purchasePayments).where(eq(purchasePayments.id, purchasePaymentId)).limit(1);
    if (!payment) throw new Error("Purchase payment tidak ditemukan.");
    const [invoice] = await tx.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, payment.purchaseInvoiceId)).limit(1);
    if (!invoice) throw new Error("Purchase invoice terkait tidak ditemukan.");

    const cashBankGlAccountId = await getCashBankGlAccountId(payment.cashBankAccountId, tx);

    const journalId = await postJournal(
      {
        outletId: invoice.outletId,
        reference: `PPAY-${payment.id.slice(0, 8)}`,
        description: `Pembayaran hutang supplier — invoice ${invoice.invoiceNumber ?? invoice.id.slice(0, 8)}`,
        sourceType: "purchase_payment",
        sourceId: payment.id,
        staffUserId: payment.staffUserId ?? undefined,
        lines: [
          { accountCode: "2111", debit: round(payment.amount), credit: 0, description: "Pelunasan hutang" },
          { accountId: cashBankGlAccountId, debit: 0, credit: round(payment.amount) },
        ],
      },
      tx
    );

    await tx.update(purchasePayments).set({ journalEntryId: journalId }).where(eq(purchasePayments.id, purchasePaymentId));
    return journalId;
  });
}

/** Atomic (Task #61): the journal and the return's journalEntryId stamp are one transaction. */
export async function postPurchaseReturnJournal(purchaseReturnId: string) {
  return db.transaction(async (tx) => {
    const [ret] = await tx.select().from(purchaseReturns).where(eq(purchaseReturns.id, purchaseReturnId)).limit(1);
    if (!ret) throw new Error("Purchase return tidak ditemukan.");
    const amount = ret.qty * ret.unitCost;

    const journalId = await postJournal(
      {
        outletId: ret.outletId,
        reference: `PRET-${ret.id.slice(0, 8)}`,
        description: `Retur pembelian — ${ret.reason ?? "tanpa keterangan"}`,
        sourceType: "purchase_return",
        sourceId: ret.id,
        lines: [
          { accountCode: "2111", debit: round(amount), credit: 0, description: "Pengurangan hutang" },
          { accountId: await getMappedAccountId(ret.outletId, "product", "inventory", "1161", tx), debit: 0, credit: round(amount), description: "Pengurangan persediaan" },
        ],
      },
      tx
    );

    await tx.update(purchaseReturns).set({ journalEntryId: journalId }).where(eq(purchaseReturns.id, purchaseReturnId));
    return journalId;
  });
}
