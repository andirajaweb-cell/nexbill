import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { eq } from "drizzle-orm";
import { outlets } from "@/db/schema";
import { seedChartOfAccounts } from "@/lib/accounting/coa";
import { ensureDefaultAccountMappings } from "@/lib/accounting/account-mapping";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { ensureOutletSlug } from "@/lib/outlets/slug";
import { linkOwnerToOutlet } from "@/lib/outlets/membership";
import { addOutletToBillingGroup, ensureBillingGroup } from "@/lib/subscription/billing-group";
import { getOrCreateSubscription } from "@/lib/subscription/service";

/**
 * Returns only the outlet matching the session's CURRENT active outletId — this deliberately
 * does NOT return every tenant's outlets (it used to, unauthenticated, leaking every outlet's
 * row including its WiFi password). An account CAN now be linked to several outlets (see
 * outletMemberships in schema.ts) but that list is served by GET /api/auth/me
 * (`linkedOutlets`) and switched via POST /api/session/switch-outlet, not here — this route
 * always reflects whichever single outlet is active right now.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const rows = await db.select().from(outlets).where(eq(outlets.id, session.outletId));
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/**
 * Creates a new branch — seeds its own Chart of Accounts immediately so it's fully usable
 * right away, and links the creating account to it via outletMemberships so they can
 * actually switch into and operate it afterward (see /api/session/switch-outlet).
 *
 * Owner/superuser only: this is a billable unit (a new outlet means a new subscription to
 * pay for, whether standalone or bundled into a billing group — see billingGroups in
 * schema.ts), not a routine settings change, so the broader manage_settings permission
 * (which managers can also hold) isn't enough here.
 *
 * New branches are bundled into the creating owner's billing group by default — NEXBILL's
 * multi-outlet billing model is "one combined invoice per owner" (see billing-group.ts), not
 * an opt-in add-on, so this doesn't wait for a separate "combine billing" step.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (session.role !== "owner" && session.role !== "superuser") {
      return NextResponse.json({ error: "Hanya Owner/Superuser yang bisa membuat cabang baru." }, { status: 403 });
    }
    const body = await req.json();
    if (!body.name) return NextResponse.json({ error: "Nama cabang wajib diisi." }, { status: 400 });

    const [created] = await db.insert(outlets).values({ name: body.name, address: body.address, phone: body.phone }).returning();
    await seedChartOfAccounts(created.id);
    await ensureDefaultAccountMappings(created.id);
    await linkOwnerToOutlet(session.sub, created.id);
    await getOrCreateSubscription(created.id); // new outlet needs its own subscriptions row before it can join a billing group
    await ensureBillingGroup(session.sub, session.outletId); // also bundles the caller's own home outlet the first time a group is needed
    await addOutletToBillingGroup(session.sub, created.id);
    // Public booking link (/book/[slug]) works the moment this branch exists, no separate setup step.
    created.slug = await ensureOutletSlug(created.id);
    return NextResponse.json(created);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
