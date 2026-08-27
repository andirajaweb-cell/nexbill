import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ALL_PERMISSIONS, hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { getAccessibleOutlets } from "@/lib/outlets/membership";
import { describeError } from "@/lib/api/error";

/**
 * This is the single most load-bearing route in the app — useAuth() calls it on every page
 * mount, and every dashboard page reads `user` before doing anything else. It must degrade
 * gracefully rather than take the whole session down.
 *
 * linkedOutlets (multi-outlet switcher support — see lib/outlets/membership.ts) queries a
 * table that only exists once `outlet_memberships`/`billing_groups` have actually been pushed
 * to the live database via `db:push` — schema.ts alone isn't enough. Until that migration
 * runs, that query would throw "relation does not exist" and, if left unguarded, would take
 * this whole route down with it. Falling back to an empty list here just means the outlet
 * switcher doesn't render yet (single-outlet behavior, same as before this feature existed) —
 * far better than breaking login/session for every account.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    // getSession() already refreshed the permissions cache above, so this reads current data.
    const role = session.role as StaffRole;
    const permissions = ALL_PERMISSIONS.filter((p) => hasPermission(role, p));

    let linkedOutlets: Awaited<ReturnType<typeof getAccessibleOutlets>> = [];
    try {
      linkedOutlets = await getAccessibleOutlets(session.sub);
    } catch (linkErr) {
      console.error("getAccessibleOutlets failed (outlet_memberships table may not be pushed yet):", linkErr);
    }

    return NextResponse.json({
      id: session.sub,
      name: session.name,
      email: session.email,
      role: session.role,
      outletId: session.outletId,
      permissions,
      linkedOutlets,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
