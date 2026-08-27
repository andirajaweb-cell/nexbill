import { db } from "@/db/client";
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

/** ps4/ps4_pro -> "ps4", ps5/ps5_slim -> "ps5", ps2/ps3 -> "other" (mapping module "rental"). Only used for non-member sessions — see isMemberCustomer(). */
function rentalMappingKey(consoleType?: string | null): string {
  if (consoleType === "ps4" || consoleType === "ps4_pro") return "ps4";
  if (consoleType === "ps5" || consoleType === "ps5_slim") return "ps5";
  return "other";
}

/** A session's customer counts as "member" the same way computeEffectiveHourlyRate (src/lib/rental/pricing.ts)
 * decides member pricing: any non-null customers.membershipTierId, no active/expiry check. Kept in sync with
 * that function deliberately — if a session got the member rate, its revenue should land in the member account. */
async function isMemberCustomer(customerId?: string | null): Promise<boolean> {
  if (!customerId) return false;
  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
  return !!customer?.membershipTierId;
}

/** food/drink/coffee/snack/dessert -> matching F&B revenue+COGS mapping keys (module "fnb"/"fnb_cogs"). */
function fnbMappingKey(category?: string): string | null {
  if (category === "food" || category === "drink" || category === "coffee" || category === "snack" || category === "dessert") return category;
  return null;
}

/** merchandise/accessory -> retail-sale mapping keys (module "product_sale"/"product_sale_cogs") — a physical
 * item SOLD outright, as opposed to the per-hour rental "addon" flow below (same-sounding items, different flow). */
function merchMappingKey(category?: string): string | null {
  if (category === "merchandise" || category === "accessory") return category;
  return null;
}

/** Classifies an accessory-rental order item (itemType "accessory", description like "Rental: Kacamata VR x1
 * (2.00 jam)") by keyword so it routes to its own add-on account (module "addon") instead of lumping into
 * whichever console's rental account the base session charge uses. Falls back to "other" (4354) for any
 * custom accessory name staff types in that doesn't match a known preset. */
function addonMappingKey(description: string): string {
  const d = description.toLowerCase();
  if (d.includes("controller") || d.includes("stick")) return "controller";
  if (d.includes("headset")) return "headset";
  if (d.includes("vr") || d.includes("kacamata")) return "vr";
  return "other";
}

async function getCashBankGlAccountId(cashBankAccountId: string): Promise<string> {
  const [row] = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.id, cashBankAccountId)).limit(1);
  if (!row) throw new Error(`Cash/bank account ${cashBankAccountId} tidak ditemukan.`);
  return row.accountId;
}

export async function computeItemCogs(productId: string | null, qty: number): Promise<number> {
  if (!productId) return 0;
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) return 0;

  const [recipe] = await db.select().from(recipes).where(eq(recipes.productId, productId)).limit(1);
  if (recipe) {
    const ingredients = await db.select().from(recipeIngredients).where(eq(recipeIngredients.recipeId, recipe.id));
    let costPerYield = 0;
    for (const ing of ingredients) {
      const [ingredientProduct] = await db.select().from(products).where(eq(products.id, ing.ingredientProductId)).limit(1);
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

/**
 * Resolves the revenue account (as an accountId, ready to drop straight into a JournalLineInput)
 * for one order item, routed by itemType first (rental / accessory / product / misc) rather than
 * sniffing the description text — itemType is the authoritative flag set at item-creation time
 * (see src/lib/pos/bill.ts upsertRentalLineItem and src/lib/rental/accessories.ts).
 *   - "rental": the base PS session time charge -> member account (4180) if the customer has a
 *     membership tier, else the existing console-type routing (PS4/PS5/Other).
 *   - "accessory": a per-hour add-on rental (extra controller/headset/VR) attached to the
 *     session -> member account (4530) if the customer has a membership tier, else its own
 *     4351-4354 account keyed off the item's name text.
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
  isMember: boolean
): Promise<string> {
  if (itemType === "rental") {
    if (isMember) return getMappedAccountId(outletId, "rental", "member", "4180");
    const key = rentalMappingKey(rentalConsoleType);
    const fallbackCode = key === "ps4" ? "4110" : key === "ps5" ? "4120" : "4170";
    return getMappedAccountId(outletId, "rental", key, fallbackCode);
  }
  if (itemType === "accessory") {
    if (isMember) return getMappedAccountId(outletId, "addon", "member", "4530");
    const key = addonMappingKey(description);
    return getMappedAccountId(outletId, "addon", key, ADDON_REVENUE_FALLBACK[key]);
  }
  if (itemType === "product") {
    const fnbKey = fnbMappingKey(category);
    if (fnbKey) {
      if (isMember) return getMappedAccountId(outletId, "fnb", "member", "4510");
      return getMappedAccountId(outletId, "fnb", fnbKey, FNB_REVENUE_FALLBACK[fnbKey]);
    }
    const merchKey = merchMappingKey(category);
    if (merchKey) {
      if (isMember) return getMappedAccountId(outletId, "product_sale", "member", "4520");
      return getMappedAccountId(outletId, "product_sale", merchKey, MERCH_REVENUE_FALLBACK[merchKey]);
    }
  }
  return getMappedAccountId(outletId, "other", "service_charge_tax", "4650");
}

/** Resolves the COGS expense account for one product category — F&B (module "fnb_cogs") or retail
 * merchandise/accessory (module "product_sale_cogs"). Returns null for categories with no COGS
 * account concept (device_rental/raw_material/other), same as the old fnbMappingKey-only gate. */
async function cogsAccountIdForCategory(outletId: string, category: string): Promise<string | null> {
  const fnbKey = fnbMappingKey(category);
  if (fnbKey) return getMappedAccountId(outletId, "fnb_cogs", fnbKey, FNB_COGS_FALLBACK[fnbKey]);
  const merchKey = merchMappingKey(category);
  if (merchKey) return getMappedAccountId(outletId, "product_sale_cogs", merchKey, MERCH_COGS_FALLBACK[merchKey]);
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
 */
export async function postSalesJournal(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw new Error("Order tidak ditemukan untuk posting jurnal.");

  const reference = `ORDER-${order.id.slice(0, 8)}`;
  const [existingEntry] = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.sourceId, order.id), eq(journalEntries.reference, reference)))
    .limit(1);
  if (existingEntry) return; // already posted for this order — idempotency guard

  const successPayments = await db.select().from(payments).where(and(eq(payments.orderId, orderId), eq(payments.status, "success")));
  if (successPayments.length === 0) return; // nothing paid yet, nothing to post

  // Exclude voided/cancelled items — recomputeBillTotals already excludes them from
  // order.subtotal/total, so including them here would revenue-count more than the
  // cash actually collected and throw off postJournal's balance check.
  const items = (await db.select().from(orderItems).where(eq(orderItems.orderId, orderId))).filter(
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
    const [session] = await db.select().from(rentalSessions).where(eq(rentalSessions.id, order.rentalSessionId)).limit(1);
    if (session) {
      const [unit] = await db.select().from(rentalUnits).where(eq(rentalUnits.id, session.rentalUnitId)).limit(1);
      rentalConsoleType = unit?.consoleType ?? null;
      isMember = await isMemberCustomer(session.customerId);
    }
  }
  if (!isMember && order.customerId) {
    isMember = await isMemberCustomer(order.customerId);
  }

  const revenueByAccount: Record<string, number> = {};
  const cogsByAccount: Record<string, number> = {};
  let cogsTotal = 0;

  for (const item of items) {
    let category: string | undefined;
    if (item.productId) {
      const [product] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
      category = product?.category;
    }
    const accountId = await revenueAccountIdForItem(order.outletId, item.itemType, item.description, category, rentalConsoleType, isMember);
    revenueByAccount[accountId] = (revenueByAccount[accountId] ?? 0) + item.lineTotal;

    if (item.itemType === "product") {
      const cogsAccountId = await cogsAccountIdForCategory(order.outletId, category ?? "");
      if (cogsAccountId) {
        const itemCogs = await computeItemCogs(item.productId, item.qty);
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
    const otherAccountId = await getMappedAccountId(order.outletId, "other", "service_charge_tax", "4650");
    revenueByAccount[otherAccountId] = (revenueByAccount[otherAccountId] ?? 0) + otherRevenue;
  }

  const cashLines: JournalLineInput[] = [];
  let totalFee = 0;
  let paidTotal = 0;
  for (const payment of successPayments) {
    const cashBankAccountId = await getCashBankAccountIdForPaymentMethod(order.outletId, payment.method);
    const cashBankGlAccountId = await getCashBankGlAccountId(cashBankAccountId);
    await db.update(payments).set({ cashBankAccountId }).where(eq(payments.id, payment.id));

    const feeAmount = payment.feeAmount ?? 0;
    totalFee += feeAmount;
    paidTotal += payment.amount;
    const netCash = payment.amount - feeAmount;
    cashLines.push({ accountId: cashBankGlAccountId, debit: round(netCash), credit: 0, description: `Kas/Bank diterima (${payment.method})` });
  }

  // The reverse can also happen — most commonly a rental session's "bayar di
  // muka" deposit collected as an estimate at start time turning out larger
  // than the actual final bill (session stopped earlier than planned). Cap
  // what's recognized as cash in the journal at order.total so the entry
  // still balances; the true excess is change handed back to the customer
  // at checkout, same as any ordinary cash-basis overpayment — it was never
  // meant to be booked as revenue or held as a liability here.
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
  const journalId = await postJournal({
    outletId: order.outletId,
    reference,
    description: `Penjualan order ${order.id.slice(0, 8)} (${methodsLabel})${shortfall > 0 ? " — sebagian piutang" : ""}`,
    sourceType: order.rentalSessionId ? "rental" : "pos",
    sourceId: order.id,
    staffUserId: order.staffUserId ?? undefined,
    lines: journalLines,
  });

  if (shortfall > 0) {
    await db.insert(receivables).values({
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
    const inventoryAccountId = await getMappedAccountId(order.outletId, "product", "inventory", "1161");
    await postJournal({
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
    });
  }
}

/**
 * Posts the journal for a payment that settles (fully or partially) an
 * existing receivable — Dr Kas/Bank (net of any gateway fee) + Dr Biaya
 * Payment Gateway (if any) / Cr Piutang Usaha (1100). Revenue was already
 * recognized when the receivable was created in postSalesJournal above, so
 * this never touches revenue accounts again — it only moves the balance from
 * "owed" to "collected". Updates the receivable's paidAmount/status (flips to
 * "paid" once fully settled, "partial" otherwise).
 */
export async function postReceivableSettlement(receivableId: string, payment: typeof payments.$inferSelect) {
  const [receivable] = await db.select().from(receivables).where(eq(receivables.id, receivableId)).limit(1);
  if (!receivable) throw new Error("Piutang tidak ditemukan.");
  if (receivable.status === "paid" || receivable.status === "written_off") return; // nothing left to settle

  let staffUserId: string | undefined;
  if (receivable.orderId) {
    const [order] = await db.select({ staffUserId: orders.staffUserId }).from(orders).where(eq(orders.id, receivable.orderId)).limit(1);
    staffUserId = order?.staffUserId ?? undefined;
  }

  const cashBankAccountId = await getCashBankAccountIdForPaymentMethod(receivable.outletId, payment.method);
  const cashBankGlAccountId = await getCashBankGlAccountId(cashBankAccountId);
  await db.update(payments).set({ cashBankAccountId }).where(eq(payments.id, payment.id));

  const feeAmount = payment.feeAmount ?? 0;
  const netCash = payment.amount - feeAmount;

  const lines: JournalLineInput[] = [
    { accountId: cashBankGlAccountId, debit: round(netCash), credit: 0, description: `Pelunasan piutang (${payment.method})` },
    ...(feeAmount > 0 ? [{ accountCode: "6540", debit: round(feeAmount), credit: 0, description: "Biaya payment gateway" }] : []),
    { accountCode: "1141", debit: 0, credit: round(payment.amount), description: "Pengurangan piutang usaha" },
  ];

  const journalId = await postJournal({
    outletId: receivable.outletId,
    reference: `AR-${receivable.id.slice(0, 8)}-${payment.id.slice(0, 8)}`,
    description: `Pelunasan piutang${receivable.orderId ? ` order ${receivable.orderId.slice(0, 8)}` : ""}`,
    sourceType: "receivable_payment",
    sourceId: receivable.id,
    staffUserId,
    lines,
  });

  const newPaidAmount = round(receivable.paidAmount + payment.amount);
  const newStatus = newPaidAmount >= receivable.amount - 0.5 ? "paid" : "partial";
  await db.update(receivables).set({ paidAmount: newPaidAmount, status: newStatus }).where(eq(receivables.id, receivable.id));

  return journalId;
}

// NOTE: the old one-shot postExpenseJournal() (immediate Dr expense/Cr cash-bank,
// no status/approval/AP support) has been superseded by the full Expense
// Management engine in src/lib/accounting/expense.ts (createExpense +
// submitExpense/approveExpense/payExpense) — that's the only path that should
// post expense journals now. Kept EXPENSE_CATEGORY_TO_ACCOUNT/expenseAccountCode
// below only as a category->COA-code suggestion helper for the new module's UI.

export async function postPurchaseInvoiceJournal(purchaseInvoiceId: string) {
  const [invoice] = await db.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, purchaseInvoiceId)).limit(1);
  if (!invoice) throw new Error("Purchase invoice tidak ditemukan.");

  const journalId = await postJournal({
    outletId: invoice.outletId,
    reference: invoice.invoiceNumber ?? `PINV-${invoice.id.slice(0, 8)}`,
    description: `Pembelian dari supplier — invoice ${invoice.invoiceNumber ?? invoice.id.slice(0, 8)}`,
    sourceType: "purchase_invoice",
    sourceId: invoice.id,
    lines: [
      { accountId: await getMappedAccountId(invoice.outletId, "product", "inventory", "1161"), debit: round(invoice.amount), credit: 0, description: "Persediaan masuk" },
      { accountCode: "2111", debit: 0, credit: round(invoice.amount), description: "Hutang ke supplier" },
    ],
  });

  await db.update(purchaseInvoices).set({ journalEntryId: journalId }).where(eq(purchaseInvoices.id, purchaseInvoiceId));
  return journalId;
}

export async function postPurchasePaymentJournal(purchasePaymentId: string) {
  const [payment] = await db.select().from(purchasePayments).where(eq(purchasePayments.id, purchasePaymentId)).limit(1);
  if (!payment) throw new Error("Purchase payment tidak ditemukan.");
  const [invoice] = await db.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, payment.purchaseInvoiceId)).limit(1);
  if (!invoice) throw new Error("Purchase invoice terkait tidak ditemukan.");

  const cashBankGlAccountId = await getCashBankGlAccountId(payment.cashBankAccountId);

  const journalId = await postJournal({
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
  });

  await db.update(purchasePayments).set({ journalEntryId: journalId }).where(eq(purchasePayments.id, purchasePaymentId));
  return journalId;
}

export async function postPurchaseReturnJournal(purchaseReturnId: string) {
  const [ret] = await db.select().from(purchaseReturns).where(eq(purchaseReturns.id, purchaseReturnId)).limit(1);
  if (!ret) throw new Error("Purchase return tidak ditemukan.");
  const amount = ret.qty * ret.unitCost;

  const journalId = await postJournal({
    outletId: ret.outletId,
    reference: `PRET-${ret.id.slice(0, 8)}`,
    description: `Retur pembelian — ${ret.reason ?? "tanpa keterangan"}`,
    sourceType: "purchase_return",
    sourceId: ret.id,
    lines: [
      { accountCode: "2111", debit: round(amount), credit: 0, description: "Pengurangan hutang" },
      { accountId: await getMappedAccountId(ret.outletId, "product", "inventory", "1161"), debit: 0, credit: round(amount), description: "Pengurangan persediaan" },
    ],
  });

  await db.update(purchaseReturns).set({ journalEntryId: journalId }).where(eq(purchaseReturns.id, purchaseReturnId));
  return journalId;
}
