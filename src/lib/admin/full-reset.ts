import { db } from "@/db/client";
import { sql, type SQL } from "drizzle-orm";

/**
 * Tables that must survive a full data reset so the app doesn't brick itself:
 *  - outlets: virtually every other table FKs to outletId. Deleting it breaks
 *    every page's initial fetch (`/api/outlets/default`) with no UI path to
 *    recreate one — there's no onboarding/setup wizard, just login.
 *  - staff_users: handled specially in resetAllData() below (only staff whose role is
 *    NOT superuser/owner are deleted). There is no self-service signup flow in this app —
 *    staff accounts can only be created by an already-logged-in superuser/owner/manager
 *    — so wiping every account, including the superuser/owner running this reset,
 *    would permanently lock everyone out with no way back in except direct
 *    database editing.
 */
const PRESERVE_TABLES = new Set(["outlets", "staff_users"]);

/**
 * Detail/child tables that hold outlet-scoped data but have NO direct outlet_id column of
 * their own — they're only reachable by walking a FK column up to a parent (which may itself
 * be another entry here, e.g. recipe_ingredients -> recipes -> products, resolved recursively
 * by scopeCondition() below so multi-hop chains work without extra code).
 *
 * This list exists because Postgres has no ON DELETE CASCADE configured anywhere in this
 * schema (see src/db/schema.ts — every `.references()` is a plain NO ACTION FK). Previously,
 * resetAllData() only ever touched tables with a direct outlet_id column, so e.g. deleting
 * `orders` while `order_items`/`payments` rows still pointed at it threw a foreign-key
 * violation and aborted the reset partway through — some tables cleared, others (including
 * whatever it choked on) left with real, non-zero data, i.e. exactly the "hapus semua data
 * tapi tidak kembali nihil" bug. Every table below was found by walking every `.references()`
 * call in schema.ts and checking whether it (transitively) leads to an outlet-scoped table.
 */
export const DERIVED_SCOPE_RULES: Record<string, { column: string; parentTable: string }> = {
  session_accessories: { column: "rental_session_id", parentTable: "rental_sessions" },
  order_items: { column: "order_id", parentTable: "orders" },
  payments: { column: "order_id", parentTable: "orders" },
  stock_movements: { column: "product_id", parentTable: "products" },
  journal_lines: { column: "journal_entry_id", parentTable: "journal_entries" },
  asset_depreciation_entries: { column: "fixed_asset_id", parentTable: "fixed_assets" },
  asset_maintenance_logs: { column: "fixed_asset_id", parentTable: "fixed_assets" },
  purchase_order_items: { column: "purchase_order_id", parentTable: "purchase_orders" },
  purchase_payments: { column: "purchase_invoice_id", parentTable: "purchase_invoices" },
  stock_opname_items: { column: "stock_opname_id", parentTable: "stock_opnames" },
  recipes: { column: "product_id", parentTable: "products" },
  recipe_ingredients: { column: "recipe_id", parentTable: "recipes" },
  loyalty_transactions: { column: "customer_id", parentTable: "customers" },
  shift_cash_counts: { column: "shift_id", parentTable: "shifts" },
  shift_balance_checks: { column: "shift_id", parentTable: "shifts" },
  home_rental_package_items: { column: "package_id", parentTable: "home_rental_packages" },
  home_rental_rental_items: { column: "rental_id", parentTable: "home_rental_rentals" },
  home_rental_rental_assets: { column: "rental_id", parentTable: "home_rental_rentals" },
  support_messages: { column: "thread_id", parentTable: "support_threads" },
};

/** Structural subset of `db`/a transaction handle that every helper below needs — lets the
 * same functions run either standalone or inside db.transaction()'s callback. */
export type Executor = { execute: (query: SQL) => Promise<unknown> };

/** Normalizes db.execute()'s result to a plain row array regardless of driver shape. */
function rowsOf<T = Record<string, unknown>>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const maybeRows = (result as { rows?: T[] } | undefined)?.rows;
  return maybeRows ?? [];
}

/**
 * Postgres (Supabase) has no app-triggerable "copy the database file" the way
 * SQLite did — there's no single file to snapshot from Node. Supabase takes
 * its own automated backups (daily backups / point-in-time recovery,
 * depending on plan) independent of anything this app does. This function is
 * kept as a named step — its return value still surfaces in the API response
 * and the `[FULL RESET]` server log — so the reset flow keeps a clear
 * "here's where to find the backup" checkpoint, even though it no longer
 * performs a physical file copy itself.
 */
function backupCheckpointNote(outletId: string): string {
  return `Supabase-managed backup — see Supabase Dashboard > Database > Backups (reset for outlet ${outletId} at ${new Date().toISOString()})`;
}

export async function listAllTables(executor: Executor): Promise<string[]> {
  const result = await executor.execute(sql`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
  `);
  return rowsOf<{ table_name: string }>(result).map((r) => r.table_name);
}

/** Tables (in `public`) that have a direct `outlet_id` column, fetched in a single query —
 *  used to decide whether a scoped reset can safely touch a table without affecting other tenants. */
export async function tablesWithOutletIdColumn(executor: Executor): Promise<Set<string>> {
  const result = await executor.execute(sql`
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'outlet_id'
  `);
  return new Set(rowsOf<{ table_name: string }>(result).map((r) => r.table_name));
}

/**
 * Computes a safe DELETE order for `tables`: children (tables holding a FK to
 * another table in the set) before the tables they reference. Postgres
 * enforces FK constraints on every statement, so unlike the old SQLite
 * version this can't just toggle a session-wide "foreign_keys off" pragma —
 * Supabase's default connection role may not even have privilege to disable
 * FK/trigger enforcement (`session_replication_role` needs elevated
 * privilege). Instead we read the real dependency graph straight out of
 * Postgres's own FK catalog and delete in exactly that order. Since `tables`
 * now includes both directly outlet-scoped tables AND the DERIVED_SCOPE_RULES
 * detail tables, this naturally places e.g. recipe_ingredients before recipes
 * before products, and asset_maintenance_logs before BOTH fixed_assets and
 * expenses (it has FKs to both) — no manual ordering needed beyond what's
 * already in the live FK catalog.
 */
export async function computeDeleteOrder(executor: Executor, tables: string[]): Promise<string[]> {
  const result = await executor.execute(sql`
    select distinct tc.table_name as child_table, ccu.table_name as parent_table
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on tc.constraint_name = ccu.constraint_name and tc.table_schema = ccu.table_schema
    where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'
  `);
  const edges = rowsOf<{ child_table: string; parent_table: string }>(result);

  const tableSet = new Set(tables);
  const dependsOn = new Map<string, Set<string>>();
  for (const t of tables) dependsOn.set(t, new Set());
  for (const e of edges) {
    if (e.child_table === e.parent_table) continue; // self-referencing FK — ignore
    if (!tableSet.has(e.child_table) || !tableSet.has(e.parent_table)) continue; // only order within our target set
    dependsOn.get(e.child_table)!.add(e.parent_table);
  }

  // Kahn's algorithm: a table becomes "ready" once every table it depends on
  // (references via FK) has already been placed. That yields a valid INSERT
  // order (parents before children) — reversing it gives a valid DELETE
  // order (children before parents).
  const remaining = new Set(tables);
  const insertOrder: string[] = [];
  while (remaining.size > 0) {
    const ready = [...remaining].filter((t) => [...dependsOn.get(t)!].every((dep) => !remaining.has(dep)));
    const batch = ready.length > 0 ? ready : [...remaining]; // shouldn't happen (would mean a real FK cycle), but never loop forever
    for (const t of batch) {
      insertOrder.push(t);
      remaining.delete(t);
    }
  }
  return insertOrder.reverse();
}

/** Builds the WHERE condition that selects exactly this outlet's rows in `table` — a direct
 * `outlet_id = X` for outlet-scoped tables, or (recursively) a subquery through the owning FK
 * column for a DERIVED_SCOPE_RULES detail table, e.g. for recipe_ingredients:
 * `"recipe_id" in (select "id" from "recipes" where "product_id" in (select "id" from "products" where outlet_id = X))`. */
export function scopeCondition(table: string, outletId: string, outletScoped: Set<string>): SQL {
  if (outletScoped.has(table)) {
    return sql`outlet_id = ${outletId}`;
  }
  const rule = DERIVED_SCOPE_RULES[table];
  if (!rule) {
    // Deliberately refuse to guess — a table reaching here has no outlet_id column and no
    // curated rule, so we don't know how to scope a delete on it safely. Add an entry to
    // DERIVED_SCOPE_RULES above instead of loosening this check.
    throw new Error(`resetAllData: no outlet-scoping rule for table "${table}" — add it to DERIVED_SCOPE_RULES in full-reset.ts.`);
  }
  const parentCondition = scopeCondition(rule.parentTable, outletId, outletScoped);
  return sql`${sql.raw(`"${rule.column}"`)} in (select "id" from ${sql.raw(`"${rule.parentTable}"`)} where ${parentCondition})`;
}

/**
 * Full factory reset, scoped to exactly one outlet — wipes that outlet's own
 * business/transactional/master data (products, orders, accounting journals,
 * bookings, inventory, membership, home rental, settings values) back to
 * empty, including every detail/line-item table underneath them (order
 * items, payments, journal lines, purchase items, shift counts, etc. — see
 * DERIVED_SCOPE_RULES above).
 *
 * SECURITY: this used to run completely unscoped — a single outlet's superuser
 * hitting "reset" wiped literally every tenant's data in the shared database.
 * Every table is now only touched if it has an outlet_id column matching the
 * caller's own outlet, OR is a known detail table scoped transitively through
 * a parent FK (DERIVED_SCOPE_RULES) — anything else is left untouched rather
 * than guessing.
 *
 * Runs inside a single db.transaction(): if any statement fails (e.g. a future
 * schema change adds a new child table this function doesn't know about yet),
 * the whole reset rolls back instead of leaving the outlet half-wiped.
 *
 * What survives, deliberately (see PRESERVE_TABLES above for why):
 *  - the outlet record itself
 *  - staff accounts with role "superuser" or "owner" in this outlet (every other staff
 *    account belonging to this outlet is deleted)
 *
 * Everything else scoped to this outlet — including feature flags, payment
 * methods, units, chart of accounts, all customers/products/orders/bookings —
 * comes back only once the app's own idempotent "ensure" seed functions
 * re-create defaults on next read.
 */
export async function resetAllData(outletId: string): Promise<{ backupPath: string; tablesCleared: string[] }> {
  if (!outletId) throw new Error("resetAllData requires an outletId — unscoped full-database wipes are no longer allowed.");
  const backupPath = backupCheckpointNote(outletId);

  const cleared = await db.transaction(async (tx) => {
    const allTables = await listAllTables(tx);
    const outletScoped = await tablesWithOutletIdColumn(tx);
    const directTables = allTables.filter((t) => !PRESERVE_TABLES.has(t) && outletScoped.has(t));
    const derivedTables = Object.keys(DERIVED_SCOPE_RULES).filter((t) => allTables.includes(t) && !PRESERVE_TABLES.has(t));
    const targetTables = [...new Set([...directTables, ...derivedTables])];
    const deleteOrder = await computeDeleteOrder(tx, targetTables);

    const clearedTables: string[] = [];
    for (const table of deleteOrder) {
      // sql.raw for the identifier is safe here — `table` always comes from our
      // own information_schema introspection above, never from user input.
      const condition = scopeCondition(table, outletId, outletScoped);
      await tx.execute(sql`delete from ${sql.raw(`"${table}"`)} where ${condition}`);
      clearedTables.push(table);
    }
    // Keep this outlet's Superuser/Owner account(s), but wipe every other staff account
    // belonging to this outlet only — other tenants' staff are untouched. Safe to run last:
    // every table with a FK to staff_users is itself either outlet-scoped directly or a
    // DERIVED_SCOPE_RULES detail table, and was already cleared for this outlet above.
    await tx.execute(sql`delete from staff_users where role not in ('superuser', 'owner') and outlet_id = ${outletId}`);

    return clearedTables;
  });

  return { backupPath, tablesCleared: cleared };
}
