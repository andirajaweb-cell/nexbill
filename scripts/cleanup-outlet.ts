/**
 * One-off maintenance script: safely inspect and, if truly unused, delete a
 * duplicate/empty outlet row.
 *
 * Several tables get auto-populated the moment an outlet is ever resolved as
 * "current outlet" or its settings pages are ever opened — none of it real
 * business data, all confirmed by reading the code that creates each one:
 *   - accounts / account_mappings: seedChartOfAccounts / ensureDefaultAccountMappings,
 *     called from /api/outlets/default and POST /api/outlets.
 *   - agent_settings: get-or-create default row, created the first time
 *     Settings > WhatsApp & AI is opened for that outlet (src/app/api/settings/agent/route.ts).
 *   - ppob_price_rules: ensurePpobPriceRules() auto-seeds Fastpay's published
 *     starter price list the first time the PPOB price-rules panel loads for
 *     that outlet (src/lib/ppob/price-rules.ts) — exactly 11 rows, untouched.
 *   - cash_bank_accounts: lazily created wrapper rows (no balance of their own —
 *     balance lives in journal_entries against the linked account) the first
 *     time a payment method needs routing for that outlet (getCashBankAccountIdForPaymentMethod
 *     in src/lib/accounting/account-mapping.ts).
 * An outlet that was never actually used for real business still accumulates
 * all of the above. That's what was blocking a plain DELETE via the Admin
 * panel (FOREIGN KEY constraint failed), even with zero real operational data.
 *
 * This script checks EVERY table that references outlet_id. If every table
 * OTHER than the four auto-seeded ones above is empty for the given outlet,
 * it's safe to delete (auto-seeded rows first, then the outlet itself). If
 * anything else has rows — including a single `shifts` row, since opening a
 * shift is always an explicit staff action, never auto-created — it aborts
 * and tells you exactly which table. Nothing is ever deleted without every
 * check passing.
 *
 * Usage:
 *   npx tsx scripts/cleanup-outlet.ts <outletId> [<outletId> ...]              # dry run, report only
 *   npx tsx scripts/cleanup-outlet.ts <outletId> [<outletId> ...] --apply      # actually delete
 */
import { db } from "../src/db/client";
import {
  outlets, staffUsers, devices, rentalUnits, customers, promos, rentalSessions, products, orders,
  agentSettings, accounts, accountMappings, journalEntries, cashBankAccounts, ppobTransactions,
  ppobPriceRules, cashMovements, receivables, costCenters, expenses, otherIncomes,
  recurringExpenseTemplates, fixedAssets, suppliers, purchaseOrders, purchaseInvoices, purchaseReturns,
  warehouses, stockOpnames, membershipTiers, vouchers, bookings, pricingRules, shifts, approvalRequests,
  auditLogs,
} from "../src/db/schema";
import { eq, sql } from "drizzle-orm";
import type { PgTable, AnyPgColumn } from "drizzle-orm/pg-core";

// Tables that are expected/allowed to have rows for an unused outlet (auto-seeded,
// confirmed by reading the code that creates each one — see header comment) —
// deleted automatically as part of cleanup, never block it. Order matters: listed
// child-first so FK constraints (cash_bank_accounts.account_id / account_mappings.account_id
// -> accounts.id) are satisfied during delete.
const SEEDED_TABLES = [
  { name: "agent_settings", table: agentSettings },
  { name: "ppob_price_rules", table: ppobPriceRules },
  { name: "cash_bank_accounts", table: cashBankAccounts },
  { name: "account_mappings", table: accountMappings },
  { name: "accounts", table: accounts },
] as const;

// Every other outlet-scoped table — if ANY of these has a row, that outlet has real
// business data and cleanup aborts.
const GUARD_TABLES = [
  { name: "staff_users", table: staffUsers },
  { name: "devices", table: devices },
  { name: "rental_units", table: rentalUnits },
  { name: "customers", table: customers },
  { name: "promos", table: promos },
  { name: "rental_sessions", table: rentalSessions },
  { name: "products", table: products },
  { name: "orders", table: orders },
  { name: "journal_entries", table: journalEntries },
  { name: "ppob_transactions", table: ppobTransactions },
  { name: "cash_movements", table: cashMovements },
  { name: "receivables", table: receivables },
  { name: "cost_centers", table: costCenters },
  { name: "expenses", table: expenses },
  { name: "other_incomes", table: otherIncomes },
  { name: "recurring_expense_templates", table: recurringExpenseTemplates },
  { name: "fixed_assets", table: fixedAssets },
  { name: "suppliers", table: suppliers },
  { name: "purchase_orders", table: purchaseOrders },
  { name: "purchase_invoices", table: purchaseInvoices },
  { name: "purchase_returns", table: purchaseReturns },
  { name: "warehouses", table: warehouses },
  { name: "stock_opnames", table: stockOpnames },
  { name: "membership_tiers", table: membershipTiers },
  { name: "vouchers", table: vouchers },
  { name: "bookings", table: bookings },
  { name: "pricing_rules", table: pricingRules },
  { name: "shifts", table: shifts },
  { name: "approval_requests", table: approvalRequests },
  { name: "audit_logs", table: auditLogs },
] as const;

async function countFor(table: PgTable & { outletId: AnyPgColumn }, outletId: string): Promise<number> {
  const [row] = (await db.select({ n: sql<number>`count(*)` }).from(table).where(eq(table.outletId, outletId))) as { n: number }[];
  return Number(row?.n ?? 0);
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const outletIds = args.filter((a) => a !== "--apply");

  if (outletIds.length === 0) {
    console.log("Pemakaian: npx tsx scripts/cleanup-outlet.ts <outletId> [<outletId> ...] [--apply]");
    process.exit(1);
  }

  for (const outletId of outletIds) {
    const [outlet] = await db.select().from(outlets).where(eq(outlets.id, outletId)).limit(1);
    if (!outlet) {
      console.log(`\n=== ${outletId} === TIDAK DITEMUKAN, dilewati.`);
      continue;
    }
    console.log(`\n=== ${outlet.name} (${outletId}) ===`);

    let blocked = false;
    for (const g of GUARD_TABLES) {
      const n = await countFor(g.table, outletId);
      if (n > 0) {
        console.log(`  ⚠️  ${g.name}: ${n} baris — outlet ini PUNYA DATA ASLI, tidak akan dihapus.`);
        blocked = true;
      }
    }
    let seededCounts = "";
    for (const s of SEEDED_TABLES) {
      const n = await countFor(s.table, outletId);
      seededCounts += ` ${s.name}=${n}`;
    }
    console.log(`  (data seeding otomatis, aman dihapus:${seededCounts})`);

    if (blocked) {
      console.log(`  => DILEWATI (ada data asli di atas).`);
      continue;
    }

    if (!apply) {
      console.log(`  => AMAN dihapus. Jalankan ulang dengan --apply untuk benar-benar menghapus.`);
      continue;
    }

    console.log(`  Menghapus...`);
    for (const s of SEEDED_TABLES) {
      await db.delete(s.table).where(eq(s.table.outletId, outletId));
    }
    await db.delete(outlets).where(eq(outlets.id, outletId));
    console.log(`  ✅ Outlet "${outlet.name}" (${outletId}) dan seluruh data seeding-nya sudah dihapus.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Gagal:", err);
    process.exit(1);
  });
