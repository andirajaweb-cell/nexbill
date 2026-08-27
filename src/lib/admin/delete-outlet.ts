import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { outlets, staffUsers, billingGroups, subscriptions, outletMemberships } from "@/db/schema";
import { eq, inArray, and, ne } from "drizzle-orm";
import { listAllTables, tablesWithOutletIdColumn, computeDeleteOrder, scopeCondition, DERIVED_SCOPE_RULES, type Executor } from "./full-reset";

/**
 * Permanently deletes an outlet and every row scoped to it — unlike resetAllData() (which wipes
 * an outlet's DATA but keeps the outlet + its superuser/owner accounts alive), this removes the
 * outlets row itself, EVERY staff account whose home outlet is this one, and the outlet no
 * longer exists at all afterward. Built so a merchant can go from "several test/demo outlets"
 * down to just the one real "starter" outlet themselves — this sandbox has no network path to
 * the user's live Supabase database, so this has to be a self-service UI action they run in
 * their own environment (see /dashboard/semua-outlet).
 *
 * Reuses the same FK-catalog-driven table clearing engine as resetAllData() (see full-reset.ts)
 * for every outlet-scoped/derived table — the only two things that engine doesn't already cover,
 * handled explicitly below, are the two places multi-outlet membership (added this session)
 * introduces a cross-outlet dependency on a staff_users row that's about to be deleted:
 *
 *  1. outlet_memberships — a staff account whose HOME outlet is the one being deleted might
 *     also hold membership access into a DIFFERENT, surviving outlet (a multi-branch owner). The
 *     generic per-outlet-id clearing only deletes membership rows where outlet_id = this outlet,
 *     not rows for this outlet's own staff pointing at other outlets — cleared explicitly by
 *     staff_user_id first so the later staff_users delete never hits a leftover FK.
 *  2. billing_groups — if a staff account being deleted OWNS a shared billing group that a
 *     SURVIVING outlet's subscription still belongs to, deleting that staff row would either
 *     break that other outlet's billing (if we forced it) or fail with an opaque FK error (if we
 *     didn't check). Guarded explicitly with a clear Indonesian error instead.
 *
 * Every other table (products, orders, accounting, bookings, inventory, membership, home rental,
 * subscriptions, etc.) is scoped purely through an `outlet_id` column (confirmed by grepping
 * every `references(() => outlets.id)` in schema.ts — there are no exceptions), so the same
 * generic engine that already proved correct for resetAllData() covers all of it here too.
 *
 * Runs inside a single db.transaction() — if anything unexpected breaks (e.g. a future schema
 * change adds a new cross-outlet dependency this function doesn't know about), Postgres's real
 * FK constraints reject the offending statement and the whole transaction rolls back. Nothing is
 * ever left half-deleted.
 */
export async function deleteOutletPermanently(outletId: string): Promise<{ deletedOutletName: string; tablesCleared: string[] }> {
  if (!outletId) throw new Error("deleteOutletPermanently requires an outletId.");

  const [target] = await db.select().from(outlets).where(eq(outlets.id, outletId)).limit(1);
  if (!target) throw new Error("Outlet tidak ditemukan.");

  const totalOutlets = await db.select({ id: outlets.id }).from(outlets);
  if (totalOutlets.length <= 1) {
    throw new Error("Tidak bisa menghapus outlet terakhir — minimal harus ada 1 outlet supaya aplikasi masih bisa dipakai (belum ada alur setup/onboarding dari nol).");
  }

  // Guard: a staff account being deleted (home outlet = this one) can't be left owning a shared
  // billing group that a surviving outlet's subscription still depends on.
  const staffToDelete = await db.select({ id: staffUsers.id }).from(staffUsers).where(eq(staffUsers.outletId, outletId));
  const staffIds = staffToDelete.map((s) => s.id);
  let ownedGroupIds: string[] = [];
  if (staffIds.length > 0) {
    const ownedGroups = await db.select().from(billingGroups).where(inArray(billingGroups.ownerStaffUserId, staffIds));
    for (const g of ownedGroups) {
      const otherSubs = await db
        .select({ id: subscriptions.id })
        .from(subscriptions)
        .where(and(eq(subscriptions.billingGroupId, g.id), ne(subscriptions.outletId, outletId)));
      if (otherSubs.length > 0) {
        throw new Error(
          `Tidak bisa dihapus: staff di outlet ini ("${g.name}") memiliki billing gabungan yang masih dipakai outlet lain. Pisahkan billing gabungan itu dulu di Purchase Order/Langganan sebelum menghapus outlet ini.`
        );
      }
    }
    ownedGroupIds = ownedGroups.map((g) => g.id);
  }

  const cleared = await db.transaction(async (tx) => {
    const executor: Executor = tx;

    // Cross-outlet membership rows for staff being deleted — see doc comment above.
    if (staffIds.length > 0) {
      await tx.delete(outletMemberships).where(inArray(outletMemberships.staffUserId, staffIds));
    }
    // Billing groups owned by this outlet's staff that only ever served this outlet (guard above
    // already proved no surviving outlet depends on them).
    if (ownedGroupIds.length > 0) {
      await tx.delete(billingGroups).where(inArray(billingGroups.id, ownedGroupIds));
    }

    const allTables = await listAllTables(executor);
    const outletScoped = await tablesWithOutletIdColumn(executor);
    // Unlike resetAllData, nothing is preserved here except the `outlets` table itself, which is
    // handled as an explicit final delete-by-id below (it has no outlet_id column pointing at
    // itself, so it can't go through the generic per-table loop).
    const directTables = allTables.filter((t) => t !== "outlets" && outletScoped.has(t));
    const derivedTables = Object.keys(DERIVED_SCOPE_RULES).filter((t) => allTables.includes(t));
    const targetTables = [...new Set([...directTables, ...derivedTables])];
    const deleteOrder = await computeDeleteOrder(executor, targetTables);

    const clearedTables: string[] = [];
    for (const table of deleteOrder) {
      const condition = scopeCondition(table, outletId, outletScoped);
      await tx.execute(sql`delete from ${sql.raw(`"${table}"`)} where ${condition}`);
      clearedTables.push(table);
    }

    await tx.delete(outlets).where(eq(outlets.id, outletId));

    return clearedTables;
  });

  return { deletedOutletName: target.name, tablesCleared: cleared };
}
