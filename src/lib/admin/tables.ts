import type { PgTable } from "drizzle-orm/pg-core";
import {
  products, customers, suppliers, staffUsers, promos, membershipTiers,
  rentalUnits, outlets, devices, warehouses, recipes,
  pricingRules, vouchers, cashBankAccounts, accounts, agentSettings,
  loyaltyPlayPointRates,
} from "@/db/schema";

/**
 * Registry for the generic Admin Data panel (superuser only). Only
 * master/reference tables are exposed here — anything transactional or
 * historical (orders, payments, journalEntries, stockMovements, auditLogs,
 * etc.) is deliberately left out, since free-form edit/delete on those would
 * corrupt accounting integrity or the audit trail. See conversation history
 * for the full reasoning on which tables were excluded and why.
 */
export interface AdminTableDef {
  table: PgTable;
  label: string;
  /** extra columns to hide beyond id/createdAt/updatedAt (e.g. password hashes) */
  hiddenExtra?: string[];
  /** if set, DELETE flips this boolean column to false instead of a hard SQL DELETE */
  softDeleteColumn?: string;
  /** creation has its own dedicated, safer flow elsewhere (e.g. staff needs password hashing) */
  disableCreate?: boolean;
}

// outletId is always hidden from the generic edit form too — it's resolved server-side from
// the caller's session (see /api/admin/[table] routes), never from client-submitted values,
// so a row can never be created for, or reassigned to, another tenant's outlet through here.
const ALWAYS_HIDDEN = ["id", "createdAt", "updatedAt", "outletId"];

export const ADMIN_TABLES: Record<string, AdminTableDef> = {
  products: { table: products, label: "Produk", softDeleteColumn: "isActive" },
  // memberNumber is permanent (auto-generated, never editable) — hidden here the same way
  // staff.passwordHash is, so it can't be created/edited through the generic panel at all.
  customers: { table: customers, label: "Customer", hiddenExtra: ["memberNumber"] },
  suppliers: { table: suppliers, label: "Supplier" },
  staff: { table: staffUsers, label: "Staff", hiddenExtra: ["passwordHash"], softDeleteColumn: "isActive", disableCreate: true },
  promos: { table: promos, label: "Promo", softDeleteColumn: "isActive" },
  "membership-tiers": { table: membershipTiers, label: "Membership Tier" },
  // No dedicated UI for this one — rates are rarely tuned, so the generic panel is enough. See
  // lib/membership/play-points.ts for the fallback defaults used when a console type has no row.
  "loyalty-play-point-rates": { table: loyaltyPlayPointRates, label: "Rate Poin Main (per Konsol)" },
  "rental-units": { table: rentalUnits, label: "Unit PS", softDeleteColumn: "isActive" },
  // Not a normal outletId-scoped master table — it IS the tenant boundary itself, so creation
  // is disabled here (a real new tenant/branch must go through proper onboarding, not this
  // generic panel) and the API route special-cases it to only ever show the caller's own row.
  outlets: { table: outlets, label: "Outlet", disableCreate: true },
  devices: { table: devices, label: "Device" },
  warehouses: { table: warehouses, label: "Gudang" },
  // No outletId column of its own — scoped indirectly via recipes.productId -> products.outletId,
  // handled specially in the API routes.
  recipes: { table: recipes, label: "Resep" },
  "pricing-rules": { table: pricingRules, label: "Aturan Harga", softDeleteColumn: "isActive" },
  vouchers: { table: vouchers, label: "Voucher", softDeleteColumn: "isActive" },
  "cash-bank-accounts": { table: cashBankAccounts, label: "Akun Kas/Bank" },
  accounts: { table: accounts, label: "Chart of Accounts", softDeleteColumn: "isActive" },
  "agent-settings": { table: agentSettings, label: "Pengaturan AI Agent" },
};

export function hiddenColumnsFor(key: string): string[] {
  const def = ADMIN_TABLES[key];
  return [...ALWAYS_HIDDEN, ...(def?.hiddenExtra ?? [])];
}
