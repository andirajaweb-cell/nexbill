import { db } from "@/db/client";
import { accounts, cashBankAccounts, depositBalanceChannels } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { type AccountType, type CoaDef, DEFAULT_COA } from "./coa-data";

// AccountType, CoaDef, and DEFAULT_COA now live in ./coa-data (a module with zero server-only
// imports, safe to import directly from "use client" pages) — re-exported here so every existing
// server-side caller of `@/lib/accounting/coa` keeps working unchanged. coaAccountName() (the
// display-time i18n helper) moved there too; import it from "@/lib/accounting/coa-data" instead
// of from here in any client component. See coa-data.ts for the full rationale — importing ANY
// export from this file also pulls in this file's top-level `@/db/client` (-> "postgres" ->
// fs/net/tls/perf_hooks) import into whatever bundle references it, which breaks the Turbopack
// production build if that bundle is a client one.
export type { AccountType, CoaDef };
export { DEFAULT_COA };

/**
 * Renumbers accounts seeded under the OLD flat 26-account COA (pre-hierarchy)
 * to their new hierarchical home — by UPDATE on the existing row (same id),
 * never delete+recreate, so every historical journal_line (which references
 * accountId, not code) stays perfectly intact and just displays the new
 * code/name from now on.
 *
 * IMPORTANT: several old flat-COA codes ("1000", "4000", "5000", "6100", ...)
 * numerically collide with codes that mean something completely different in
 * the new hierarchical tree (e.g. new "1000" is the ASSETS header, new "5000"
 * is the COGS header) — matching on code alone would, on the SECOND call to
 * seedChartOfAccounts for an outlet that has already been fully migrated (or
 * was seeded fresh and never had legacy codes at all), find that header row
 * sitting at code "1000" and incorrectly "migrate" it into "1112 Cashier
 * Cash", colliding with the real 1112 row. So every migration is guarded by
 * matching the row's CURRENT NAME against the known old name too — only a row
 * that is both at the old code AND still carries the old name is a genuine
 * unmigrated legacy row; anything else (already migrated, or a same-numbered
 * new-scheme row) is left untouched. This is what makes the whole function
 * safe to call on every request, not just once.
 *
 * Codes that used to be a single lumped bucket across what are now several
 * finer categories (e.g. old "4000" covered PS4 AND PS5 rental in one line)
 * migrate to a new "Other/Historis" catch-all instead of an arbitrarily chosen
 * specific leaf, so historical reports don't silently mislabel old data.
 */
const LEGACY_CODE_MIGRATIONS: Record<string, { oldName: string; code: string; name: string; isPostingAllowed?: boolean }> = {
  "1000": { oldName: "Kas", code: "1112", name: "Cashier Cash" },
  "1010": { oldName: "Bank", code: "1121", name: "Bank Utama" },
  "1050": { oldName: "Saldo Deposit Fastpay (PPOB)", code: "1151", name: "PPOB Provider Balance" },
  "1100": { oldName: "Piutang Usaha", code: "1141", name: "Customer Receivable" },
  "1200": { oldName: "Persediaan Barang & Bahan Baku", code: "1161", name: "F&B Inventory" },
  "1500": { oldName: "Peralatan (PS/TV/Controller)", code: "1270", name: "Aset Tetap Lainnya (Historis)" },
  "1510": { oldName: "Akumulasi Penyusutan Peralatan", code: "1295", name: "Akumulasi Penyusutan Lainnya (Historis)" },
  "2000": { oldName: "Hutang Usaha (Supplier)", code: "2111", name: "Supplier Payable" },
  "2100": { oldName: "Hutang Lain-lain", code: "2163", name: "Other Accrued Expense" },
  "2200": { oldName: "Uang Muka Booking (DP) Diterima", code: "2132", name: "Booking Deposit" },
  "3000": { oldName: "Modal Pemilik", code: "3110", name: "Owner Capital" },
  "3900": { oldName: "Laba Ditahan", code: "3200", name: "Retained Earnings" },
  "4000": { oldName: "Pendapatan Rental PS", code: "4170", name: "Other Rental" },
  "4100": { oldName: "Pendapatan F&B", code: "4260", name: "Other F&B" },
  "4200": { oldName: "Pendapatan Lain-lain (WiFi/Sewa Alat/Service Charge)", code: "4650", name: "Other Revenue" },
  "4300": { oldName: "Pendapatan PPOB (Fee Admin)", code: "4480", name: "PPOB Service Fee" },
  "4900": { oldName: "Diskon & Potongan Penjualan", code: "4910", name: "Sales Discount" },
  "5000": { oldName: "HPP F&B", code: "5160", name: "Other F&B COGS" },
  // Same code, rename only — these three were dead scaffolding (never mapped/posted to) from an
  // earlier draft that assumed a paid membership fee product; repurposed to member-tagged
  // F&B/product/add-on revenue instead of deleting the accounts outright (safer for any outlet
  // that already has these codes seeded, even though nothing has ever posted to them).
  "4500": { oldName: "MEMBERSHIP REVENUE", code: "4500", name: "MEMBER-TAGGED REVENUE (Non-Rental)", isPostingAllowed: false },
  "4510": { oldName: "Membership Fee", code: "4510", name: "Member F&B Revenue" },
  "4520": { oldName: "Membership Package", code: "4520", name: "Member Product Revenue" },
  "4530": { oldName: "Membership Renewal", code: "4530", name: "Member Add-on Rental Revenue" },
  "6000": { oldName: "Beban Operasional", code: "6000", name: "OPERATING EXPENSES", isPostingAllowed: false }, // same code, flips to header
  "6100": { oldName: "Beban Gaji & Staf", code: "6110", name: "Salary" },
  "6200": { oldName: "Beban Listrik & Internet", code: "6270", name: "Other Utilities" },
  "6300": { oldName: "Beban Biaya Payment Gateway", code: "6540", name: "Payment Gateway Fees" },
  "6350": { oldName: "Beban Biaya Layanan PPOB (Fastpay)", code: "6570", name: "Beban Biaya Layanan PPOB (Fastpay)" },
  "6400": { oldName: "Beban Penyusutan", code: "6850", name: "Other Depreciation" },
  "6500": { oldName: "Beban Sewa", code: "6210", name: "Rent Expense" },
  "6600": { oldName: "Beban Maintenance", code: "6310", name: "PlayStation Maintenance" },
  "6900": { oldName: "Beban Lain-lain", code: "6900", name: "Other Operating Expense" }, // same code, rename + reparent only
};

/** Accounts Payable used for expenses recorded as hutang (unpaid at creation) — distinct from 2111 (Supplier Payable), which purchasing.ts owns. */
export const EXPENSE_PAYABLE_ACCOUNT_CODE = "2163";

export const FASTPAY_SALDO_ACCOUNT_NAME = "Saldo Deposit Fastpay (PPOB)";

function normalBalanceFor(type: AccountType): "debit" | "credit" {
  return type === "asset" || type === "expense" ? "debit" : "credit";
}

/** Idempotent — safe to call repeatedly. Migrates any old flat-COA codes, inserts every missing account from DEFAULT_COA, then wires parentId for the whole tree. */
export async function seedChartOfAccounts(outletId: string) {
  const existing = await db.select().from(accounts).where(eq(accounts.outletId, outletId));
  const existingByCode = new Map(existing.map((a) => [a.code, a]));

  // 1) Renumber legacy rows in place (preserves id, so journal history is untouched).
  for (const [oldCode, target] of Object.entries(LEGACY_CODE_MIGRATIONS)) {
    const row = existingByCode.get(oldCode);
    if (!row) continue; // no row at this code for this outlet
    if (row.name !== target.oldName) continue; // not a genuine legacy row (already migrated, or a same-numbered new-scheme row like the "5000" COGS header) — leave it alone
    await db
      .update(accounts)
      .set({ code: target.code, name: target.name, isPostingAllowed: target.isPostingAllowed ?? true, updatedAt: new Date().toISOString() })
      .where(eq(accounts.id, row.id));
    existingByCode.delete(oldCode);
    existingByCode.set(target.code, { ...row, code: target.code, name: target.name });
  }

  // 2) Insert every DEFAULT_COA account that doesn't exist yet (by code) — ONE bulk insert instead
  // of ~220 individual sequential inserts. That per-row version (each one its own awaited
  // round-trip to Supabase) was the main reason a brand-new signup could take 20+ seconds and time
  // out client-side even though the outlet's rows kept landing fine in the database in the
  // background — see the "pendaftaran timeout" investigation. onConflictDoNothing still guards the
  // same concurrent-caller race (two requests seeding the same outlet at once); a single re-SELECT
  // afterward (not a per-row fallback SELECT) refreshes existingByCode with real ids regardless of
  // whether a row was inserted just now or already existed from a concurrent caller.
  const missingDefs = DEFAULT_COA.filter((def) => !existingByCode.has(def.code));
  if (missingDefs.length > 0) {
    await db
      .insert(accounts)
      .values(
        missingDefs.map((def) => ({
          outletId,
          code: def.code,
          name: def.name,
          type: def.type,
          normalBalance: normalBalanceFor(def.type),
          isSystemAccount: true,
          isPostingAllowed: def.isPostingAllowed ?? true,
        }))
      )
      .onConflictDoNothing({ target: [accounts.outletId, accounts.code] });

    const refreshed = await db.select().from(accounts).where(eq(accounts.outletId, outletId));
    existingByCode.clear();
    for (const row of refreshed) existingByCode.set(row.code, row);
  }

  // 3) Wire parentId for the whole tree — grouped by parent so this is one UPDATE per DISTINCT
  // parent (~40 queries) instead of one UPDATE per child row (~200 queries), same perf reasoning
  // as step 2 above.
  const codeToId = new Map<string, string>();
  for (const [code, row] of existingByCode) codeToId.set(code, row.id);
  const childIdsByParentId = new Map<string, string[]>();
  for (const def of DEFAULT_COA) {
    if (!def.parentCode) continue;
    const row = existingByCode.get(def.code);
    const parentId = codeToId.get(def.parentCode);
    if (!row || !parentId || row.parentId === parentId) continue;
    const list = childIdsByParentId.get(parentId) ?? [];
    list.push(row.id);
    childIdsByParentId.set(parentId, list);
  }
  for (const [parentId, childIds] of childIdsByParentId) {
    await db.update(accounts).set({ parentId }).where(inArray(accounts.id, childIds));
  }

  // Default cash/bank accounts linked to the GL, only if none exist yet.
  const existingCashBank = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.outletId, outletId));
  if (existingCashBank.length === 0) {
    const kasAccount = existingByCode.get("1112");
    const bankAccount = existingByCode.get("1121");
    if (kasAccount) {
      await db.insert(cashBankAccounts).values({ outletId, name: "Kas Utama", type: "cash", accountId: kasAccount.id, isDefault: true });
    }
    if (bankAccount) {
      await db.insert(cashBankAccounts).values({ outletId, name: "Rekening Bank Utama", type: "bank", accountId: bankAccount.id });
    }
  }

  // Fastpay PPOB deposit balance — checked independently of the block above since it was
  // introduced later and existing outlets already had cash/bank rows by then (the
  // "existingCashBank.length === 0" gate above would otherwise skip them forever).
  const existingFastpay = await db.select().from(cashBankAccounts).where(and(eq(cashBankAccounts.outletId, outletId), eq(cashBankAccounts.name, FASTPAY_SALDO_ACCOUNT_NAME)));
  if (existingFastpay.length === 0) {
    const saldoAccount = existingByCode.get("1151");
    if (saldoAccount) {
      await db.insert(cashBankAccounts).values({ outletId, name: FASTPAY_SALDO_ACCOUNT_NAME, type: "bank", accountId: saldoAccount.id });
    }
  }
}

/**
 * The Fastpay PPOB deposit-saldo channel used to be a single hardcoded line
 * bolted onto every shift close (see shift.ts). It's now the first row of the
 * owner-editable depositBalanceChannels list — this seeds that row once per
 * outlet, reusing the account 1151 + cashBankAccounts row seedChartOfAccounts
 * already provisions above, so no duplicate account gets created for outlets
 * that already had it. Must run AFTER seedChartOfAccounts.
 */
export async function ensureDepositBalanceChannelsSeeded(outletId: string) {
  const [existing] = await db
    .select()
    .from(depositBalanceChannels)
    .where(and(eq(depositBalanceChannels.outletId, outletId), eq(depositBalanceChannels.channelKey, "ppob_fastpay_saldo")))
    .limit(1);
  if (existing) return;

  const [account] = await db.select().from(accounts).where(and(eq(accounts.outletId, outletId), eq(accounts.code, "1151"))).limit(1);
  const [cba] = await db
    .select()
    .from(cashBankAccounts)
    .where(and(eq(cashBankAccounts.outletId, outletId), eq(cashBankAccounts.name, FASTPAY_SALDO_ACCOUNT_NAME)))
    .limit(1);
  if (!account || !cba) return; // COA not seeded yet for this outlet — caller runs seedChartOfAccounts first

  await db
    .insert(depositBalanceChannels)
    .values({
      outletId,
      channelKey: "ppob_fastpay_saldo",
      label: FASTPAY_SALDO_ACCOUNT_NAME,
      accountId: account.id,
      cashBankAccountId: cba.id,
      isSystem: true,
      sortOrder: 0,
    })
    .onConflictDoNothing({ target: [depositBalanceChannels.outletId, depositBalanceChannels.channelKey] });
}

/**
 * Finds the next free COA code for a new custom deposit-balance channel,
 * under the same "1150 PPOB Receivable" family as the built-in Fastpay saldo
 * account (1151/1152) — 1153-1179 first, falling back past 1180 ("Other
 * Current Assets" in DEFAULT_COA) in the near-impossible case an outlet has
 * manually filled the whole 115x block.
 */
export async function allocateDepositChannelAccountCode(outletId: string): Promise<string> {
  const existing = await db.select({ code: accounts.code }).from(accounts).where(eq(accounts.outletId, outletId));
  const used = new Set(existing.map((a) => a.code));
  for (let n = 1153; n <= 1179; n++) {
    if (!used.has(String(n))) return String(n);
  }
  let n = 1181;
  while (used.has(String(n))) n++;
  return String(n);
}

const codeCache = new Map<string, Map<string, string>>(); // outletId -> code -> accountId

export function invalidateAccountCache(outletId: string) {
  codeCache.delete(outletId);
}

export async function getAccountIdByCode(outletId: string, code: string): Promise<string> {
  let outletCache = codeCache.get(outletId);
  if (!outletCache) {
    outletCache = new Map();
    codeCache.set(outletId, outletCache);
  }
  if (outletCache.has(code)) return outletCache.get(code)!;

  const [row] = await db.select().from(accounts).where(and(eq(accounts.outletId, outletId), eq(accounts.code, code))).limit(1);
  if (!row) throw new Error(`Akun COA dengan kode ${code} tidak ditemukan untuk outlet ${outletId}. Jalankan seedChartOfAccounts dulu.`);
  if (!row.isPostingAllowed) throw new Error(`Akun "${row.name}" (${code}) adalah akun Header — tidak bisa menerima jurnal langsung. Gunakan salah satu akun turunannya.`);
  outletCache.set(code, row.id);
  return row.id;
}

/** Bulk header-posting guard used by postJournal for lines that resolve via a raw accountId (bypassing getAccountIdByCode's own check above). */
export async function assertPostableAccountIds(accountIds: string[]) {
  const uniqueIds = [...new Set(accountIds)];
  if (uniqueIds.length === 0) return;
  const rows = await db.select().from(accounts).where(inArray(accounts.id, uniqueIds));
  for (const row of rows) {
    if (!row.isPostingAllowed) throw new Error(`Akun "${row.name}" (${row.code}) adalah akun Header — tidak bisa menerima jurnal langsung.`);
  }
}

// Note: the old binary cash/bank resolver that used to live here (getDefaultCashBankAccountId)
// was replaced by getCashBankAccountIdForPaymentMethod() in ./account-mapping.ts, which routes
// each payment.method to its own dedicated GL account via the "payment" mapping module instead
// of lumping every non-cash method into one generic Bank account. See that file for details.
