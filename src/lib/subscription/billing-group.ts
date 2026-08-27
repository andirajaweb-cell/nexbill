import { db } from "@/db/client";
import { billingGroups, outlets, subscriptions, subscriptionPlans } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { canAccessOutlet } from "@/lib/outlets/membership";

/**
 * Billing-group management — grouping several outlets under one owner so they get ONE
 * combined renewal invoice (see billingGroups/subscriptions.billingGroupId in schema.ts, and
 * the group-aware invoice generation in service.ts). Deliberately kept in its own file rather
 * than folded into service.ts: this is about WHICH outlets are billed together, not about the
 * invoice/lifecycle mechanics themselves.
 */

export interface BillingGroupMember {
  outletId: string;
  outletName: string;
  subscriptionStatus: string;
  planName: string | null;
  planPrice: number | null;
}

export interface BillingGroupSummary {
  id: string;
  name: string;
  members: BillingGroupMember[];
  totalMonthly: number;
}

/** The billing group `staffUserId` owns (created by them), or null if they haven't created one. */
export async function getOwnedBillingGroup(staffUserId: string): Promise<BillingGroupSummary | null> {
  const [group] = await db.select().from(billingGroups).where(eq(billingGroups.ownerStaffUserId, staffUserId)).limit(1);
  if (!group) return null;
  return loadBillingGroupSummary(group.id);
}

async function loadBillingGroupSummary(billingGroupId: string): Promise<BillingGroupSummary> {
  const [group] = await db.select().from(billingGroups).where(eq(billingGroups.id, billingGroupId)).limit(1);
  const memberSubs = await db.select().from(subscriptions).where(eq(subscriptions.billingGroupId, billingGroupId));
  const outletIds = memberSubs.map((s) => s.outletId);
  const outletRows = outletIds.length ? await db.select({ id: outlets.id, name: outlets.name }).from(outlets).where(inArray(outlets.id, outletIds)) : [];
  const outletNameById = new Map(outletRows.map((o) => [o.id, o.name]));
  const planIds = Array.from(new Set(memberSubs.map((s) => s.planId).filter((id): id is string => !!id)));
  const planRows = planIds.length ? await db.select().from(subscriptionPlans).where(inArray(subscriptionPlans.id, planIds)) : [];
  const planById = new Map(planRows.map((p) => [p.id, p]));

  const members: BillingGroupMember[] = memberSubs.map((s) => {
    const plan = s.planId ? planById.get(s.planId) : null;
    return {
      outletId: s.outletId,
      outletName: outletNameById.get(s.outletId) ?? "Outlet",
      subscriptionStatus: s.status,
      planName: plan?.name ?? null,
      planPrice: plan?.priceCurrent ?? null,
    };
  });

  return {
    id: billingGroupId,
    name: group?.name ?? "Grup Penagihan",
    members,
    totalMonthly: members.reduce((s, m) => s + (m.planPrice ?? 0), 0),
  };
}

/**
 * Creates a billing group owned by `staffUserId` if they don't have one yet, and always
 * ensures their home/active outlet is a member — mirrors ensureOutletMembership()'s lazy
 * self-heal pattern.
 */
export async function ensureBillingGroup(staffUserId: string, homeOutletId: string): Promise<BillingGroupSummary> {
  let [group] = await db.select().from(billingGroups).where(eq(billingGroups.ownerStaffUserId, staffUserId)).limit(1);
  if (!group) {
    [group] = await db.insert(billingGroups).values({ ownerStaffUserId: staffUserId, name: "Grup Penagihan" }).returning();
  }
  await db.update(subscriptions).set({ billingGroupId: group.id }).where(eq(subscriptions.outletId, homeOutletId));
  return loadBillingGroupSummary(group.id);
}

/**
 * Adds `outletId`'s subscription to `staffUserId`'s billing group (creating the group first
 * if needed). SECURITY: only allowed if `staffUserId` can actually access `outletId` (see
 * outletMemberships) — an owner cannot bundle a stranger's outlet into their invoice.
 */
export async function addOutletToBillingGroup(staffUserId: string, outletId: string): Promise<BillingGroupSummary> {
  const allowed = await canAccessOutlet(staffUserId, outletId);
  if (!allowed) throw new Error("Akun ini tidak terhubung ke outlet tersebut.");

  let [group] = await db.select().from(billingGroups).where(eq(billingGroups.ownerStaffUserId, staffUserId)).limit(1);
  if (!group) {
    [group] = await db.insert(billingGroups).values({ ownerStaffUserId: staffUserId, name: "Grup Penagihan" }).returning();
  }
  await db.update(subscriptions).set({ billingGroupId: group.id }).where(eq(subscriptions.outletId, outletId));
  return loadBillingGroupSummary(group.id);
}

/** Removes `outletId` from whatever billing group it's in — it goes back to being billed individually. */
export async function removeOutletFromBillingGroup(staffUserId: string, outletId: string): Promise<void> {
  const allowed = await canAccessOutlet(staffUserId, outletId);
  if (!allowed) throw new Error("Akun ini tidak terhubung ke outlet tersebut.");
  await db.update(subscriptions).set({ billingGroupId: null }).where(eq(subscriptions.outletId, outletId));
}

/** The billing group `outletId`'s own subscription belongs to, if any — used by the Billing page to know whether to show grouped or individual invoices. */
export async function getBillingGroupForOutlet(outletId: string): Promise<BillingGroupSummary | null> {
  const [sub] = await db.select({ billingGroupId: subscriptions.billingGroupId }).from(subscriptions).where(eq(subscriptions.outletId, outletId)).limit(1);
  if (!sub?.billingGroupId) return null;
  return loadBillingGroupSummary(sub.billingGroupId);
}
