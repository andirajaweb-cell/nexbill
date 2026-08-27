import { db } from "@/db/client";
import { accountMappings, accounts, cashBankAccounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAccountIdByCode } from "./coa";
import { PAYMENT_METHOD_LABEL as SHARED_PAYMENT_METHOD_LABEL } from "@/lib/payments/labels";

/**
 * "⚙️ ACCOUNT MAPPING" — Module → Transaction → Default Account routing, so
 * cashiers/other modules never pick a COA code manually. Every posting
 * function that used to hardcode an account code (rental by console type,
 * F&B by product category, PPOB by category, expense by category, asset/
 * depreciation by asset category) now calls getMappedAccountId() instead.
 *
 * Resolution order: an active accountMappings row for
 * (outletId, module, transactionKey) wins; if none exists, falls back to
 * fallbackCode (one of the DEFAULT_COA codes) so an outlet with zero mapping
 * rows still posts correctly — mappings only need to be touched when an
 * owner wants to override where something lands.
 */
export type MappingModule =
  | "rental"
  | "addon"
  | "fnb"
  | "fnb_cogs"
  | "product_sale"
  | "product_sale_cogs"
  | "ppob"
  | "expense"
  | "asset"
  | "asset_accum_depr"
  | "depreciation"
  | "payment"
  | "product"
  | "other"
  | "other_income"
  | "home_rental"
  | "membership_fee";

const mappingCache = new Map<string, Map<string, string>>(); // outletId -> `${module}:${key}` -> accountId

export function invalidateMappingCache(outletId: string) {
  mappingCache.delete(outletId);
}

export async function getMappedAccountId(outletId: string, module: MappingModule, transactionKey: string, fallbackCode: string): Promise<string> {
  const cacheKey = `${module}:${transactionKey.toLowerCase()}`;
  let outletCache = mappingCache.get(outletId);
  if (!outletCache) {
    outletCache = new Map();
    mappingCache.set(outletId, outletCache);
  }
  if (outletCache.has(cacheKey)) return outletCache.get(cacheKey)!;

  const [row] = await db
    .select()
    .from(accountMappings)
    .where(
      and(
        eq(accountMappings.outletId, outletId),
        eq(accountMappings.module, module),
        eq(accountMappings.transactionKey, transactionKey.toLowerCase()),
        eq(accountMappings.isActive, true)
      )
    )
    .limit(1);

  const accountId = row ? row.accountId : await getAccountIdByCode(outletId, fallbackCode);
  outletCache.set(cacheKey, accountId);
  return accountId;
}

export interface DefaultMappingSeed {
  module: MappingModule;
  transactionKey: string;
  accountCode: string;
  label: string;
}

/** Mirrors the example table from the COA spec (Rental/PS5→4120, F&B/Food→4210, PPOB/Pulsa→4410, dst) so the Account Mapping screen shows real, editable rows out of the box instead of an empty table backed only by code-level fallbacks. */
export const DEFAULT_MAPPING_SEED: DefaultMappingSeed[] = [
  { module: "rental", transactionKey: "ps4", accountCode: "4110", label: "Rental PS4" },
  { module: "rental", transactionKey: "ps5", accountCode: "4120", label: "Rental PS5" },
  { module: "rental", transactionKey: "other", accountCode: "4170", label: "Rental Konsol Lain" },
  // Session-scoped: any rental session whose linked customer has an active membership
  // tier posts here instead of the console-based row above, regardless of console type
  // — see isMemberCustomer() in postings.ts. Simple two-way split (member/non-member),
  // no further breakdown by tier/console/weekend/overnight.
  { module: "rental", transactionKey: "member", accountCode: "4180", label: "Rental PS — Member" },
  { module: "fnb", transactionKey: "food", accountCode: "4210", label: "F&B — Food" },
  { module: "fnb", transactionKey: "drink", accountCode: "4220", label: "F&B — Beverage" },
  { module: "fnb", transactionKey: "coffee", accountCode: "4230", label: "F&B — Coffee" },
  { module: "fnb", transactionKey: "snack", accountCode: "4240", label: "F&B — Snack" },
  { module: "fnb", transactionKey: "dessert", accountCode: "4250", label: "F&B — Dessert" },
  // Same "member/non-member two-way split" pattern as rental/member (4180) above — a member
  // customer's F&B purchase (any category) lands here instead of its usual food/drink/coffee/
  // snack/dessert account. See isMemberCustomer() + revenueAccountIdForItem() in postings.ts.
  { module: "fnb", transactionKey: "member", accountCode: "4510", label: "F&B — Member" },
  { module: "fnb_cogs", transactionKey: "food", accountCode: "5110", label: "HPP Food" },
  { module: "fnb_cogs", transactionKey: "drink", accountCode: "5120", label: "HPP Beverage" },
  { module: "fnb_cogs", transactionKey: "coffee", accountCode: "5130", label: "HPP Coffee" },
  { module: "fnb_cogs", transactionKey: "snack", accountCode: "5140", label: "HPP Snack" },
  { module: "fnb_cogs", transactionKey: "dessert", accountCode: "5160", label: "HPP Dessert" },
  // Retail sale of physical goods (products.category = merchandise/accessory, itemType
  // "product") — distinct from "addon" below, which is a per-hour RENTAL of similar-sounding
  // items (controller/headset/VR) tied to an active PS session, not an outright sale.
  { module: "product_sale", transactionKey: "merchandise", accountCode: "4310", label: "Produk — Merchandise" },
  { module: "product_sale", transactionKey: "accessory", accountCode: "4320", label: "Produk — Gaming Accessories" },
  { module: "product_sale", transactionKey: "member", accountCode: "4520", label: "Produk — Member" },
  { module: "product_sale_cogs", transactionKey: "merchandise", accountCode: "5210", label: "HPP Merchandise" },
  { module: "product_sale_cogs", transactionKey: "accessory", accountCode: "5220", label: "HPP Gaming Accessories" },
  // Extra controller/headset/VR rented alongside an active session (sessionAccessories),
  // keyed off the accessory's name text — see addonMappingKey() in postings.ts.
  { module: "addon", transactionKey: "controller", accountCode: "4351", label: "Add-on — Extra Controller" },
  { module: "addon", transactionKey: "headset", accountCode: "4352", label: "Add-on — Headset" },
  { module: "addon", transactionKey: "vr", accountCode: "4353", label: "Add-on — VR" },
  { module: "addon", transactionKey: "other", accountCode: "4354", label: "Add-on — Lainnya" },
  { module: "addon", transactionKey: "member", accountCode: "4530", label: "Add-on — Member" },
  { module: "product", transactionKey: "inventory", accountCode: "1161", label: "Inventory F&B" },
  { module: "ppob", transactionKey: "pulsa", accountCode: "4410", label: "PPOB Pulsa" },
  { module: "ppob", transactionKey: "token_listrik", accountCode: "4430", label: "PPOB Token Listrik (PLN)" },
  { module: "ppob", transactionKey: "ewallet_topup", accountCode: "4460", label: "PPOB Top-up E-Wallet" },
  { module: "ppob", transactionKey: "transfer", accountCode: "4480", label: "PPOB Transfer" },
  { module: "ppob", transactionKey: "tarik_tunai", accountCode: "4480", label: "PPOB Tarik Tunai" },
  { module: "ppob", transactionKey: "lainnya", accountCode: "4480", label: "PPOB Lainnya" },
  { module: "ppob", transactionKey: "provider_fee", accountCode: "6570", label: "Beban Biaya Provider PPOB" },
  { module: "expense", transactionKey: "listrik", accountCode: "6220", label: "Expense — Listrik" },
  { module: "expense", transactionKey: "internet", accountCode: "6240", label: "Expense — Internet" },
  { module: "expense", transactionKey: "gaji", accountCode: "6110", label: "Expense — Gaji" },
  { module: "expense", transactionKey: "staf", accountCode: "6110", label: "Expense — Staf" },
  { module: "expense", transactionKey: "sewa", accountCode: "6210", label: "Expense — Sewa" },
  { module: "expense", transactionKey: "payment_gateway", accountCode: "6540", label: "Expense — Payment Gateway" },
  { module: "expense", transactionKey: "penyusutan", accountCode: "6850", label: "Expense — Penyusutan (Umum)" },
  { module: "expense", transactionKey: "operasional", accountCode: "6900", label: "Expense — Operasional (Umum)" },
  { module: "asset", transactionKey: "playstation", accountCode: "1214", label: "Asset — PlayStation" },
  { module: "asset", transactionKey: "tv", accountCode: "1221", label: "Asset — TV" },
  { module: "asset", transactionKey: "controller", accountCode: "1231", label: "Asset — Controller" },
  { module: "asset", transactionKey: "furniture", accountCode: "1241", label: "Asset — Furniture" },
  { module: "asset", transactionKey: "vehicle", accountCode: "1245", label: "Asset — Vehicle" },
  { module: "asset", transactionKey: "other", accountCode: "1244", label: "Asset — Lainnya" },
  { module: "asset_accum_depr", transactionKey: "playstation", accountCode: "1291", label: "Akumulasi Penyusutan — PS" },
  { module: "asset_accum_depr", transactionKey: "tv", accountCode: "1292", label: "Akumulasi Penyusutan — TV" },
  { module: "asset_accum_depr", transactionKey: "controller", accountCode: "1293", label: "Akumulasi Penyusutan — Equipment (Controller)" },
  { module: "asset_accum_depr", transactionKey: "furniture", accountCode: "1293", label: "Akumulasi Penyusutan — Equipment (Furniture)" },
  { module: "asset_accum_depr", transactionKey: "vehicle", accountCode: "1293", label: "Akumulasi Penyusutan — Equipment (Vehicle)" },
  { module: "asset_accum_depr", transactionKey: "other", accountCode: "1294", label: "Akumulasi Penyusutan — IT/Lainnya" },
  { module: "depreciation", transactionKey: "playstation", accountCode: "6810", label: "Beban Penyusutan — PS" },
  { module: "depreciation", transactionKey: "tv", accountCode: "6820", label: "Beban Penyusutan — TV" },
  { module: "depreciation", transactionKey: "controller", accountCode: "6830", label: "Beban Penyusutan — Equipment (Controller)" },
  { module: "depreciation", transactionKey: "furniture", accountCode: "6830", label: "Beban Penyusutan — Equipment (Furniture)" },
  { module: "depreciation", transactionKey: "vehicle", accountCode: "6830", label: "Beban Penyusutan — Equipment (Vehicle)" },
  { module: "depreciation", transactionKey: "other", accountCode: "6840", label: "Beban Penyusutan — IT/Lainnya" },
  // Every value in payments.method has its own row here — this is what makes each digital
  // channel (GoPay/DANA/BukuPay/Fastpay/QRIS/Card/Transfer) land in its own GL account
  // instead of everything non-cash getting lumped into one generic "Bank" bucket, which is
  // what makes real per-channel shift-closing reconciliation possible (see shift/shift.ts).
  { module: "payment", transactionKey: "cash", accountCode: "1112", label: "Payment — Cash" },
  { module: "payment", transactionKey: "qris", accountCode: "1131", label: "Payment — QRIS" },
  { module: "payment", transactionKey: "gopay", accountCode: "1132", label: "Payment — GoPay" },
  { module: "payment", transactionKey: "dana", accountCode: "1134", label: "Payment — DANA" },
  { module: "payment", transactionKey: "bukupay", accountCode: "1136", label: "Payment — BukuPay" },
  { module: "payment", transactionKey: "card", accountCode: "1125", label: "Payment — Kartu (EDC)" },
  { module: "payment", transactionKey: "transfer", accountCode: "1121", label: "Payment — Bank Transfer" },
  { module: "payment", transactionKey: "fastpay_h2h", accountCode: "1137", label: "Payment — Fastpay Gateway" },
  { module: "other", transactionKey: "service_charge_tax", accountCode: "4650", label: "Service Charge & Pajak" },
  { module: "other_income", transactionKey: "vendor_commission", accountCode: "4710", label: "Pendapatan Lain — Komisi Vendor" },
  { module: "other_income", transactionKey: "asset_rental", accountCode: "4720", label: "Pendapatan Lain — Sewa Tempat/Aset" },
  { module: "other_income", transactionKey: "asset_sale", accountCode: "4730", label: "Pendapatan Lain — Penjualan Aset Bekas" },
  { module: "other_income", transactionKey: "sponsorship", accountCode: "4740", label: "Pendapatan Lain — Sponsorship" },
  { module: "other_income", transactionKey: "penalty_compensation", accountCode: "4750", label: "Pendapatan Lain — Denda/Ganti Rugi" },
  { module: "other_income", transactionKey: "bank_interest_cashback", accountCode: "4760", label: "Pendapatan Lain — Bunga/Cashback" },
  { module: "other_income", transactionKey: "other", accountCode: "4770", label: "Pendapatan Lain — Umum" },
  { module: "membership_fee", transactionKey: "signup", accountCode: "4645", label: "Iuran Keanggotaan" },
  { module: "home_rental", transactionKey: "ps3", accountCode: "4810", label: "Home Rental — PS3" },
  { module: "home_rental", transactionKey: "ps4", accountCode: "4820", label: "Home Rental — PS4" },
  { module: "home_rental", transactionKey: "ps5", accountCode: "4830", label: "Home Rental — PS5" },
  { module: "home_rental", transactionKey: "playbook", accountCode: "4840", label: "Home Rental — PlayBook" },
  { module: "home_rental", transactionKey: "tv32", accountCode: "4850", label: "Home Rental — TV 32\"" },
  { module: "home_rental", transactionKey: "tv40", accountCode: "4850", label: "Home Rental — TV 40\"" },
  { module: "home_rental", transactionKey: "tv43", accountCode: "4850", label: "Home Rental — TV 43\"" },
  { module: "home_rental", transactionKey: "accessory", accountCode: "4860", label: "Home Rental — Accessory" },
  { module: "home_rental", transactionKey: "package", accountCode: "4870", label: "Home Rental — Package" },
  { module: "home_rental", transactionKey: "delivery_fee", accountCode: "4880", label: "Home Rental — Delivery/Pickup Fee" },
  { module: "home_rental", transactionKey: "late_fee", accountCode: "4890", label: "Home Rental — Late Fee" },
  { module: "home_rental", transactionKey: "damage_fee", accountCode: "4895", label: "Home Rental — Penggantian Kerusakan" },
  { module: "home_rental", transactionKey: "deposit", accountCode: "2135", label: "Home Rental — Security Deposit" },
];

/** Seeds the default mapping rows above for an outlet — only inserts rows that don't already exist (by module+transactionKey), so re-running after an owner has edited/deleted rows never resurrects what they removed. Call after seedChartOfAccounts (needs the accounts to exist first). */
export async function ensureDefaultAccountMappings(outletId: string) {
  const existing = await db.select().from(accountMappings).where(eq(accountMappings.outletId, outletId));
  const existingKeys = new Set(existing.map((m) => `${m.module}:${m.transactionKey}`));

  for (const seed of DEFAULT_MAPPING_SEED) {
    const key = `${seed.module}:${seed.transactionKey}`;
    if (existingKeys.has(key)) continue;
    const [account] = await db.select().from(accounts).where(and(eq(accounts.outletId, outletId), eq(accounts.code, seed.accountCode))).limit(1);
    if (!account) continue; // shouldn't happen once seedChartOfAccounts has run, but don't blow up if it does
    await db
      .insert(accountMappings)
      .values({
        outletId,
        module: seed.module,
        transactionKey: seed.transactionKey,
        accountId: account.id,
        label: seed.label,
        isActive: true,
      })
      .onConflictDoNothing({ target: [accountMappings.outletId, accountMappings.module, accountMappings.transactionKey] });
  }
}

/** Sane fallback if a payment.method somehow has no "payment" mapping row and no seed entry matches (e.g. a free-text method string coming from a non-order flow like supplier purchase payments, which only really uses "cash" or "bank"-ish strings). */
const PAYMENT_METHOD_FALLBACK_CODE: Record<string, string> = {
  cash: "1112",
  qris: "1131",
  gopay: "1132",
  dana: "1134",
  bukupay: "1136",
  card: "1125",
  transfer: "1121",
  bank: "1121", // legacy/free-text alias still used by some non-order payment flows
  fastpay_h2h: "1137",
};

// Reuses the same canonical app-name labels the billing checkout picker and shift-closing
// balance-check UI use (src/lib/payments/labels.ts), so a cashBankAccounts row auto-created
// here (e.g. "GoPay") is named identically to what shows up everywhere else in the app —
// plus the "bank" legacy free-text alias some non-order payment flows still pass in.
const PAYMENT_METHOD_LABEL: Record<string, string> = { ...SHARED_PAYMENT_METHOD_LABEL, bank: "Transfer Bank" };

/**
 * Resolves the cashBankAccounts row a payment of a given method should settle
 * into, routing through the "payment" mapping module so every channel
 * (cash/qris/gopay/dana/bukupay/card/transfer/fastpay_h2h) lands in its own
 * dedicated GL account instead of every non-cash method being lumped into one
 * generic "Bank" bucket. This is what makes true per-channel shift-closing
 * reconciliation possible — without it, GoPay/DANA/BukuPay/Fastpay income all
 * commingle and can't be individually verified against the app balance.
 *
 * Lazily finds-or-creates the wrapping cashBankAccounts row for whatever GL
 * account the mapping resolves to (mirrors how the Fastpay PPOB saldo account
 * used to be looked-up/created ad hoc, just generalized to every channel) —
 * so this works correctly on day one for a brand-new outlet with zero
 * cashBankAccounts rows, and self-heals for an existing outlet that predates
 * this per-channel routing (its historical payments already posted to the
 * old lumped Bank account and are not retroactively migrated; only new
 * payments from now on route to the correct channel).
 */
export async function getCashBankAccountIdForPaymentMethod(outletId: string, method: string): Promise<string> {
  const key = method.toLowerCase();
  const fallbackCode = PAYMENT_METHOD_FALLBACK_CODE[key] ?? "1121";
  const accountId = await getMappedAccountId(outletId, "payment", key, fallbackCode);

  const [existing] = await db
    .select()
    .from(cashBankAccounts)
    .where(and(eq(cashBankAccounts.outletId, outletId), eq(cashBankAccounts.accountId, accountId)))
    .limit(1);
  if (existing) return existing.id;

  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
  const [inserted] = await db
    .insert(cashBankAccounts)
    .values({
      outletId,
      name: PAYMENT_METHOD_LABEL[key] ?? account?.name ?? "Channel Pembayaran",
      type: key === "cash" ? "cash" : "bank",
      accountId,
    })
    .returning();
  return inserted.id;
}
