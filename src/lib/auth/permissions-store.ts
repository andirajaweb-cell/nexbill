import { db } from "@/db/client";
import { rolePermissions } from "@/db/schema";
import {
  ALL_ROLES,
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  setFullEffectiveMatrix,
  type StaffRole,
  type Permission,
} from "./permissions";

/**
 * Server-only companion to permissions.ts. This file imports `db`, so it
 * must never be imported from a client component (permissions.ts itself
 * stays db-free for exactly that reason — client components import that
 * file directly for hasPermission()/labels/types).
 *
 * Responsibilities:
 *  - seedRolePermissionsIfEmpty(): first-run seed of the role_permissions
 *    table from the hardcoded DEFAULT_ROLE_PERMISSIONS, so the table starts
 *    out reflecting exactly what the app already behaved like.
 *  - refreshPermissionsCache(): loads every row and pushes it into the
 *    in-memory cache in permissions.ts via setFullEffectiveMatrix(). Called
 *    from getSession() so every server-rendered request/API route sees
 *    current permissions without a per-call DB round trip.
 *  - listRolePermissionMatrix()/updateRolePermission()/resetRolePermissions():
 *    read/write helpers backing the /api/role-permissions routes.
 */

let seeded = false;

export async function seedRolePermissionsIfEmpty(): Promise<void> {
  if (seeded) return;
  const existing = await db.select({ id: rolePermissions.id }).from(rolePermissions).limit(1);
  if (existing.length === 0) {
    const rows: (typeof rolePermissions.$inferInsert)[] = [];
    for (const role of ALL_ROLES) {
      const granted = new Set(DEFAULT_ROLE_PERMISSIONS[role] ?? []);
      for (const permission of ALL_PERMISSIONS) {
        rows.push({ role, permission, granted: granted.has(permission) });
      }
    }
    await db.insert(rolePermissions).values(rows);
  }
  seeded = true;
}

// getSession() (session.ts) calls refreshPermissionsCache() on every single authenticated
// request so that a permissions change takes effect immediately without a restart — but that
// meant every page load / API call spent one of the pool's 3 connections just re-reading a
// table that changes maybe a few times a year (only via the Role & Izin admin screen). This TTL
// turns that into "at most once per TTL_MS across the whole server", not once per request.
// updateRolePermission()/resetRolePermissions() below force a fresh read (lastRefreshAt = 0)
// right after they write, so an admin's change is never delayed by a stale cache window.
const TTL_MS = 30_000;
let lastRefreshAt = 0;

export async function refreshPermissionsCache(force = false): Promise<void> {
  if (!force && Date.now() - lastRefreshAt < TTL_MS) return;
  await seedRolePermissionsIfEmpty();
  const rows = await db.select().from(rolePermissions);
  setFullEffectiveMatrix(rows);
  lastRefreshAt = Date.now();
}

/** Full 7-role x N-permission matrix for the "Role & Izin" UI, filling in any gaps (e.g. a permission added to the codebase after the table was seeded) with the hardcoded default. */
export async function listRolePermissionMatrix(): Promise<{ role: StaffRole; permission: Permission; granted: boolean }[]> {
  await seedRolePermissionsIfEmpty();
  const rows = await db.select().from(rolePermissions);
  const byKey = new Map(rows.map((r) => [`${r.role}:${r.permission}`, r.granted]));
  const result: { role: StaffRole; permission: Permission; granted: boolean }[] = [];
  for (const role of ALL_ROLES) {
    for (const permission of ALL_PERMISSIONS) {
      const key = `${role}:${permission}`;
      const granted = byKey.has(key) ? !!byKey.get(key) : (DEFAULT_ROLE_PERMISSIONS[role] ?? []).includes(permission);
      result.push({ role, permission, granted });
    }
  }
  return result;
}

/** Toggles a single role/permission cell. Superuser and Owner are both protected from losing manage_staff — otherwise an admin could accidentally lock every account (including their own) out of the one screen that can undo the mistake. */
export async function updateRolePermission(role: StaffRole, permission: Permission, granted: boolean): Promise<void> {
  if (!granted && (role === "superuser" || role === "owner") && permission === "manage_staff") {
    throw new Error(`${role === "superuser" ? "Superuser" : "Owner"} wajib memiliki izin 'Kelola Staf & Role' agar tidak ada yang terkunci dari halaman ini.`);
  }
  await seedRolePermissionsIfEmpty();
  await db
    .insert(rolePermissions)
    .values({ role, permission, granted })
    .onConflictDoUpdate({
      target: [rolePermissions.role, rolePermissions.permission],
      set: { granted, updatedAt: new Date().toISOString() },
    });
  await refreshPermissionsCache(true);
}

/** Resets one role (or, if omitted, every role) back to the hardcoded defaults. */
export async function resetRolePermissions(role?: StaffRole): Promise<void> {
  await seedRolePermissionsIfEmpty();
  const roles = role ? [role] : ALL_ROLES;
  for (const r of roles) {
    const granted = new Set(DEFAULT_ROLE_PERMISSIONS[r] ?? []);
    for (const permission of ALL_PERMISSIONS) {
      await db
        .insert(rolePermissions)
        .values({ role: r, permission, granted: granted.has(permission) })
        .onConflictDoUpdate({
          target: [rolePermissions.role, rolePermissions.permission],
          set: { granted: granted.has(permission), updatedAt: new Date().toISOString() },
        });
    }
  }
  await refreshPermissionsCache(true);
}
