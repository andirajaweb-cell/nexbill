import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { outlets, subscriptions, staffUsers, rentalUnits, outletMemberships } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";
import { seedChartOfAccounts } from "@/lib/accounting/coa";
import { ensureDefaultAccountMappings } from "@/lib/accounting/account-mapping";
import { ensureOutletSlug } from "@/lib/outlets/slug";
import { linkOwnerToOutlet } from "@/lib/outlets/membership";
import { getOrCreateSubscription } from "@/lib/subscription/service";

/**
 * Directory of every outlet/merchant on the platform — the entry point for platform-admin
 * drill-down. Each outlet's own data stays fully isolated from every other outlet (enforced at
 * the outlet-facing API layer via session.outletId scoping); this route is the one deliberate
 * exception, only reachable by a platform-admin session (never an outlet's own staff session),
 * so the SaaS operator can see across tenants without any tenant being able to see each other.
 *
 * Also resolves the "cabang" (branch) tree: when a merchant opens more than one outlet, the
 * SAME owner staffUsers account gets linked to every branch via outletMemberships (see
 * linkOwnerToOutlet / getAccessibleOutlets in lib/outlets/membership.ts — staffUsers.outletId
 * is that owner's "home"/pusat outlet, isHome there === isRoot here). Each row below is enriched
 * with clusterRootId/isRoot/ownerName/branchCount so the platform-admin UI can group a merchant's
 * branches under their pusat outlet instead of showing every outlet as an unrelated flat row.
 * An outlet with no multi-outlet owner is simply its own standalone root (branchCount 0) — same
 * as every outlet looked before this feature.
 */
export async function GET() {
  try {
    await requirePlatformAdmin();

    const allOutlets = await db.select().from(outlets);
    const allSubs = await db.select().from(subscriptions);
    const allStaff = await db.select({ id: staffUsers.id, outletId: staffUsers.outletId, isActive: staffUsers.isActive }).from(staffUsers);
    const allUnits = await db.select({ id: rentalUnits.id, outletId: rentalUnits.outletId }).from(rentalUnits);
    const owners = await db
      .select({ id: staffUsers.id, homeOutletId: staffUsers.outletId, name: staffUsers.name })
      .from(staffUsers)
      .where(eq(staffUsers.role, "owner"));
    const allMemberships = await db.select({ staffUserId: outletMemberships.staffUserId, outletId: outletMemberships.outletId }).from(outletMemberships);

    const subByOutletId = new Map(allSubs.map((s) => [s.outletId, s]));
    const staffCountByOutlet = new Map<string, number>();
    for (const s of allStaff) {
      if (!s.isActive) continue;
      staffCountByOutlet.set(s.outletId, (staffCountByOutlet.get(s.outletId) ?? 0) + 1);
    }
    const unitCountByOutlet = new Map<string, number>();
    for (const u of allUnits) unitCountByOutlet.set(u.outletId, (unitCountByOutlet.get(u.outletId) ?? 0) + 1);

    // ---- Branch clustering: one owner staff account -> home outlet (root/pusat) + N branches ----
    const membershipsByStaff = new Map<string, Set<string>>();
    for (const m of allMemberships) {
      if (!membershipsByStaff.has(m.staffUserId)) membershipsByStaff.set(m.staffUserId, new Set());
      membershipsByStaff.get(m.staffUserId)!.add(m.outletId);
    }
    const clusterRootByOutlet = new Map<string, string>(); // branchOutletId -> rootOutletId
    const rootMeta = new Map<string, { ownerName: string; branchIds: Set<string> }>(); // rootOutletId -> { ownerName, branchIds }
    for (const owner of owners) {
      const memberIds = new Set(membershipsByStaff.get(owner.id) ?? []);
      memberIds.add(owner.homeOutletId);
      if (memberIds.size <= 1) continue; // no branches — leave as a plain standalone outlet below
      const root = owner.homeOutletId;
      if (!rootMeta.has(root)) rootMeta.set(root, { ownerName: owner.name, branchIds: new Set() });
      const meta = rootMeta.get(root)!;
      for (const outletId of memberIds) {
        if (outletId === root) continue;
        meta.branchIds.add(outletId);
        if (!clusterRootByOutlet.has(outletId)) clusterRootByOutlet.set(outletId, root); // first owner claims it — co-ownership is a rare edge case, not modeled further
      }
    }

    const rows = allOutlets
      .map((o) => {
        const meta = rootMeta.get(o.id);
        const parentRootId = clusterRootByOutlet.get(o.id);
        return {
          id: o.id,
          name: o.name,
          address: o.address,
          phone: o.phone,
          createdAt: o.createdAt,
          subscriptionStatus: subByOutletId.get(o.id)?.status ?? "trial",
          staffCount: staffCountByOutlet.get(o.id) ?? 0,
          unitCount: unitCountByOutlet.get(o.id) ?? 0,
          isActive: o.isActive,
          clusterRootId: parentRootId ?? o.id,
          isRoot: !!meta || !parentRootId,
          ownerName: meta?.ownerName ?? null,
          branchCount: meta?.branchIds.size ?? 0,
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(rows);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/**
 * Manual outlet provisioning for customer service — for when a merchant's self-service /daftar
 * signup didn't go through (support ticket, stuck registration, etc.) and a platform operator
 * needs to stand up the outlet + owner account directly. Mirrors provisionOutlet() + the primary
 * owner insert in src/app/api/onboarding/register/route.ts, minus the parts specific to that
 * multi-step wizard (TV composition rentalUnits seeding, branch fan-out, referral attribution,
 * Google-pending identity bridge) — this is the bare minimum to get a working, loginable outlet.
 */
export async function POST(req: NextRequest) {
  try {
    await requirePlatformAdmin();

    const body = await req.json();
    const outletName = String(body.name || "").trim();
    const address = body.address ? String(body.address).trim() : undefined;
    const phone = body.phone ? String(body.phone).trim() : undefined;
    const ownerName = String(body.owner?.name || "").trim();
    const email = String(body.owner?.email || "").toLowerCase().trim();
    const password = String(body.owner?.password || "");

    if (!outletName) return NextResponse.json({ error: "Nama outlet wajib diisi." }, { status: 400 });
    if (!ownerName) return NextResponse.json({ error: "Nama pemilik (owner) wajib diisi." }, { status: 400 });
    if (!email || !email.includes("@")) return NextResponse.json({ error: "Email owner tidak valid." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password minimal 8 karakter." }, { status: 400 });

    const [existing] = await db.select({ id: staffUsers.id }).from(staffUsers).where(eq(staffUsers.email, email)).limit(1);
    if (existing) return NextResponse.json({ error: "Email ini sudah terdaftar di akun lain." }, { status: 409 });

    const [created] = await db.insert(outlets).values({ name: outletName, address, phone }).returning();
    await seedChartOfAccounts(created.id);
    await ensureDefaultAccountMappings(created.id);
    created.slug = await ensureOutletSlug(created.id);

    const [owner] = await db
      .insert(staffUsers)
      .values({ outletId: created.id, name: ownerName, email, passwordHash: await bcrypt.hash(password, 10), role: "owner" })
      .returning();
    await linkOwnerToOutlet(owner.id, created.id);
    await getOrCreateSubscription(created.id);

    console.warn(`[platform-admin] Outlet "${outletName}" (${created.id}) + owner ${email} dibuat manual oleh platform-admin.`);
    return NextResponse.json({ outlet: created, owner: { id: owner.id, name: owner.name, email: owner.email } });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
