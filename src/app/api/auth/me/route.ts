import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { outlets, staffUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession, inspectSession } from "@/lib/auth/session";
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
    // Distinguish "sesi ini sudah tidak berlaku" (akun dipakai di perangkat lain / dikeluarkan Owner)
    // from "belum login", so the app can tell the user WHY it sent them back to the login page.
    const inspected = await inspectSession();
    if (inspected.ended) return NextResponse.json({ error: "Sesi ini sudah tidak berlaku.", code: "SESSION_ENDED" }, { status: 401 });
    const session = inspected.session ? await getSession() : null;
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

    // Drives the outlet's display-currency symbol/format everywhere (see lib/currency/format.ts)
    // — read fresh from the DB rather than the JWT since it's editable in Settings > Business &
    // Tax and should reflect the latest value without forcing a re-login.
    const [outletRow] = await db
      .select({ outletCountry: outlets.outletCountry, decimalStyle: outlets.decimalStyle, decimalPlaces: outlets.decimalPlaces, dateFormat: outlets.dateFormat })
      .from(outlets)
      .where(eq(outlets.id, session.outletId))
      .limit(1);
    // Same "read fresh from DB, not the JWT" reasoning — emailVerified changes after a link
    // click, which shouldn't require re-login to reflect. Defaults true (see schema.ts) if the
    // row is somehow missing, so this never accidentally holds a stale account hostage.
    const [staffRow] = await db.select({ emailVerified: staffUsers.emailVerified }).from(staffUsers).where(eq(staffUsers.id, session.sub)).limit(1);

    return NextResponse.json({
      id: session.sub,
      name: session.name,
      email: session.email,
      role: session.role,
      outletId: session.outletId,
      outletCountry: outletRow?.outletCountry ?? null,
      decimalStyle: outletRow?.decimalStyle ?? "id",
      decimalPlaces: outletRow?.decimalPlaces ?? 0,
      dateFormat: outletRow?.dateFormat ?? "dmy",
      emailVerified: staffRow?.emailVerified ?? true,
      permissions,
      linkedOutlets,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
