import { db } from "@/db/client";
import { outletMemberships, outlets, staffUsers } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";

/**
 * Multi-outlet ownership helpers. See the doc comment on `outletMemberships` in
 * src/db/schema.ts for the model: a staff account's "home" outlet (staffUsers.outletId)
 * is always implicitly accessible, PLUS whatever extra outlets are linked via
 * outletMemberships rows (e.g. other branches the same Owner also runs).
 *
 * Nothing here changes per-outlet data isolation — every business table stays scoped to
 * whichever outletId is the CURRENT active session outlet (see /api/session/switch-outlet).
 * This module only answers "which outlets is this account allowed to switch into".
 */

export interface AccessibleOutlet {
  id: string;
  name: string;
  slug: string | null;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  isHome: boolean;
}

/**
 * Idempotent — inserts a membership row linking `staffUserId` to `outletId` if one doesn't
 * already exist. Safe to call on every read (same lazy self-healing pattern as
 * ensureOutletSlug()): backfills the home-outlet membership for accounts that existed
 * before this feature shipped, with zero manual migration step.
 */
export async function ensureOutletMembership(staffUserId: string, outletId: string): Promise<void> {
  await db
    .insert(outletMemberships)
    .values({ staffUserId, outletId })
    .onConflictDoNothing({ target: [outletMemberships.staffUserId, outletMemberships.outletId] });
}

/**
 * Every outlet `staffUserId` may switch into: their home outlet (staffUsers.outletId, always
 * included even if its membership row hasn't been backfilled yet) plus every outlet linked
 * via outletMemberships. Also backfills the home-outlet membership row as a side effect so
 * subsequent lookups (and the "Ringkasan Semua Outlet" page, which reads outletMemberships
 * directly) see it too.
 *
 * By default only returns ACTIVE outlets (isActive) — a deactivated/archived branch (see
 * isActive on the outlets table) shouldn't show up in the switch-outlet dropdown or be
 * switchable into. Pass `includeInactive: true` for management views (the "Ringkasan Semua
 * Outlet" page) that need to show archived branches too, e.g. to reactivate them.
 */
export async function getAccessibleOutlets(staffUserId: string, opts?: { includeInactive?: boolean }): Promise<AccessibleOutlet[]> {
  const [staff] = await db.select({ outletId: staffUsers.outletId }).from(staffUsers).where(eq(staffUsers.id, staffUserId)).limit(1);
  if (!staff) return [];

  await ensureOutletMembership(staffUserId, staff.outletId);

  const memberships = await db.select({ outletId: outletMemberships.outletId }).from(outletMemberships).where(eq(outletMemberships.staffUserId, staffUserId));
  const outletIds = Array.from(new Set(memberships.map((m) => m.outletId)));
  if (outletIds.length === 0) return [];

  const rows = await db
    .select({ id: outlets.id, name: outlets.name, slug: outlets.slug, address: outlets.address, phone: outlets.phone, isActive: outlets.isActive })
    .from(outlets)
    .where(inArray(outlets.id, outletIds));
  return rows
    .filter((r) => opts?.includeInactive || r.isActive)
    .map((r) => ({ ...r, isHome: r.id === staff.outletId }))
    .sort((a, b) => (a.isHome === b.isHome ? a.name.localeCompare(b.name) : a.isHome ? -1 : 1));
}

/** True if `staffUserId` is allowed to switch its active session into `outletId` (implies the outlet is active). */
export async function canAccessOutlet(staffUserId: string, outletId: string): Promise<boolean> {
  const accessible = await getAccessibleOutlets(staffUserId);
  return accessible.some((o) => o.id === outletId);
}

/** True if `staffUserId` is linked to `outletId` at all, active or archived — used to authorize
 * management actions (edit/deactivate/reactivate) on a branch that's currently archived, where
 * canAccessOutlet() would (correctly) say no because archived outlets aren't switchable. */
export async function canManageOutlet(staffUserId: string, outletId: string): Promise<boolean> {
  const accessible = await getAccessibleOutlets(staffUserId, { includeInactive: true });
  return accessible.some((o) => o.id === outletId);
}

/** Links an already-logged-in owner to a newly created branch outlet — called right after outlet creation. */
export async function linkOwnerToOutlet(staffUserId: string, outletId: string): Promise<void> {
  await ensureOutletMembership(staffUserId, outletId);
}

/**
 * "Business Name + Nama Cabang" display name for public-facing surfaces (see /book/[slug] and
 * /api/public/outlet-info) — an outlet's own `name` field alone can be a bare branch label (e.g.
 * "Cabang Utama") with no indication of which overarching business it belongs to. Same
 * pusat/cabang relationship the platform-admin outlets tree uses (an owner's HOME outlet is the
 * "pusat"/business name, every other outlet an outletMemberships row links them to is a cabang —
 * see /api/platform-admin/outlets): if this outlet is a cabang under a multi-outlet owner, this
 * prefixes the pusat outlet's name, e.g. "POS Rental PS - Cabang Utama". Skipped when the
 * branch's own name already contains the business name (case-insensitive), so an outlet whose
 * name was already entered as the full combined form doesn't get "X - X Cabang Utama". Returns
 * the outlet's own name unchanged for standalone outlets (no owner cluster) or for a pusat
 * outlet itself.
 */
export async function resolveOutletDisplayName(outletId: string): Promise<string> {
  const [self] = await db.select({ name: outlets.name }).from(outlets).where(eq(outlets.id, outletId)).limit(1);
  if (!self?.name) return "";

  const links = await db
    .select({ homeOutletId: staffUsers.outletId })
    .from(outletMemberships)
    .innerJoin(staffUsers, eq(staffUsers.id, outletMemberships.staffUserId))
    .where(and(eq(outletMemberships.outletId, outletId), eq(staffUsers.role, "owner")));

  const rootOutletId = links.find((l) => l.homeOutletId !== outletId)?.homeOutletId;
  if (!rootOutletId) return self.name; // standalone, or this outlet IS the pusat

  const [root] = await db.select({ name: outlets.name }).from(outlets).where(eq(outlets.id, rootOutletId)).limit(1);
  if (!root?.name || self.name.toLowerCase().includes(root.name.toLowerCase())) return self.name;
  return `${root.name} - ${self.name}`;
}
