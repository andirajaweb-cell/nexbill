import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { eq } from "drizzle-orm";
import { outlets, staffUsers, rentalUnits } from "@/db/schema";
import bcrypt from "bcryptjs";
import { signSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { seedChartOfAccounts } from "@/lib/accounting/coa";
import { ensureDefaultAccountMappings } from "@/lib/accounting/account-mapping";
import { ensureOutletSlug } from "@/lib/outlets/slug";
import { linkOwnerToOutlet } from "@/lib/outlets/membership";
import { ensureBillingGroup, addOutletToBillingGroup } from "@/lib/subscription/billing-group";
import { getOrCreateSubscription, computeTvComposition, ensureDefaultPlan } from "@/lib/subscription/service";
import { attachReferralOnSignup } from "@/lib/referral/service";
import { getGooglePending, GOOGLE_PENDING_COOKIE } from "@/lib/auth/google-pending";

/**
 * The self-service signup flow this app never had (see full-reset.ts's old comment: "staff
 * accounts can only be created by an already-logged-in superuser/owner/manager"). This is the
 * ONE place a brand-new owner can create their own outlet(s) + account without anyone already
 * logged in. Deliberately public — no auth check — this route's entire job IS account creation.
 *
 * The TV-composition screening (android/smart/analog counts) doesn't invent new billing logic —
 * it just pre-populates rentalUnits rows so the EXISTING checkout math (computeTvComposition /
 * startCheckout in service.ts) already has real data to work with the moment the new owner opens
 * the Billing page: smart plug qty = however many non-Android-TV units exist, extra-console addon
 * = whatever's beyond the plan's included quota. No duplicated business rule here on purpose.
 */

interface RegisterBody {
  businessName?: string;
  outletName?: string;
  address?: string;
  phone?: string;
  branchCount?: number;
  tv?: { android?: number; smart?: number; analog?: number };
  shifts?: number;
  employees?: { kasir?: number; dapur?: number; lainnya?: number };
  owner?: { name?: string; email?: string; password?: string };
  ref?: string; // referral code carried on the /daftar?ref=CODE signup link — see lib/referral/service.ts
}

const TV_LABELS: Record<"android_tv" | "smart_tv" | "analog_tv", string> = {
  android_tv: "TV Android",
  smart_tv: "Smart TV",
  analog_tv: "TV Analog",
};

const clampInt = (n: unknown, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number(n) || 0)));

async function createUnitsForComposition(outletId: string, tv: { android: number; smart: number; analog: number }) {
  const rows: (typeof rentalUnits.$inferInsert)[] = [];
  const push = (type: "android_tv" | "smart_tv" | "analog_tv", count: number) => {
    for (let i = 1; i <= count; i++) {
      rows.push({
        outletId,
        name: `${TV_LABELS[type]} ${i}`,
        consoleType: "ps4", // placeholder — owner adjusts real console type/tarif in Kelola Unit
        tvType: type,
        hourlyRate: 0,
        note: "Dibuat otomatis saat pendaftaran — sesuaikan tipe konsol & tarif di menu Kelola Unit.",
      });
    }
  };
  push("android_tv", tv.android);
  push("smart_tv", tv.smart);
  push("analog_tv", tv.analog);
  if (rows.length > 0) await db.insert(rentalUnits).values(rows);
}

async function provisionOutlet(name: string, address: string | undefined, phone: string | undefined) {
  const [created] = await db.insert(outlets).values({ name, address, phone }).returning();
  await seedChartOfAccounts(created.id);
  await ensureDefaultAccountMappings(created.id);
  created.slug = await ensureOutletSlug(created.id);
  return created;
}

export async function POST(req: NextRequest) {
  try {
    const body: RegisterBody = await req.json();

    const businessName = String(body.businessName || "").trim();
    const outletName = String(body.outletName || businessName).trim();
    const ownerName = String(body.owner?.name || "").trim();
    const email = String(body.owner?.email || "").toLowerCase().trim();
    const password = String(body.owner?.password || "");

    // A brand-new signup via "Daftar dengan Google" (see /api/auth/google/callback) arrives with
    // this cookie already set to a VERIFIED identity — the client-supplied email in the request
    // body must match it exactly, otherwise someone could submit this form claiming an email
    // address they don't actually control. Never trust body.owner.email alone for a Google signup.
    const googlePending = await getGooglePending();
    const viaGoogle = !!googlePending;

    if (!businessName) return NextResponse.json({ error: "Nama usaha wajib diisi." }, { status: 400 });
    if (!outletName) return NextResponse.json({ error: "Nama outlet/merchant wajib diisi." }, { status: 400 });
    if (!ownerName) return NextResponse.json({ error: "Nama pemilik (owner) wajib diisi." }, { status: 400 });
    if (!email || !email.includes("@")) return NextResponse.json({ error: "Email owner tidak valid." }, { status: 400 });
    if (viaGoogle) {
      if (email !== googlePending!.email) {
        return NextResponse.json({ error: "Email tidak cocok dengan akun Google yang terverifikasi. Ulangi \"Daftar dengan Google\"." }, { status: 400 });
      }
    } else if (password.length < 8) {
      return NextResponse.json({ error: "Password minimal 8 karakter." }, { status: 400 });
    }

    const [existing] = await db.select({ id: staffUsers.id }).from(staffUsers).where(eq(staffUsers.email, email)).limit(1);
    if (existing) return NextResponse.json({ error: "Email ini sudah terdaftar. Silakan masuk (login) atau gunakan email lain." }, { status: 409 });

    const branchCount = clampInt(body.branchCount, 1, 20);
    const tv = {
      android: clampInt(body.tv?.android, 0, 500),
      smart: clampInt(body.tv?.smart, 0, 500),
      analog: clampInt(body.tv?.analog, 0, 500),
    };
    const shifts = clampInt(body.shifts, 1, 5);
    const employees = {
      kasir: clampInt(body.employees?.kasir, 0, 200),
      dapur: clampInt(body.employees?.dapur, 0, 200),
      lainnya: clampInt(body.employees?.lainnya, 0, 200),
    };

    // ---- Primary outlet ----
    const primary = await provisionOutlet(outletName, body.address, body.phone);
    const [owner] = await db
      .insert(staffUsers)
      .values(
        viaGoogle
          ? { outletId: primary.id, name: ownerName, email, passwordHash: null, authProvider: "google", googleId: googlePending!.googleId, role: "owner" }
          : { outletId: primary.id, name: ownerName, email, passwordHash: await bcrypt.hash(password, 10), role: "owner" }
      )
      .returning();
    await linkOwnerToOutlet(owner.id, primary.id);
    await createUnitsForComposition(primary.id, tv);
    await getOrCreateSubscription(primary.id);
    // Referral attribution — only on the primary outlet (the one that actually gets billed the
    // discounted first subscription_fee invoice in startCheckout); branch outlets below don't
    // separately attach even if branchCount > 1. Silently ignored for an invalid/missing code.
    await attachReferralOnSignup(primary.id, body.ref);

    const onboardingProfile = JSON.stringify({
      businessName,
      branchCount,
      shifts,
      employees,
      tv,
      registeredAt: new Date().toISOString(),
    });
    await db.update(outlets).set({ onboardingProfile }).where(eq(outlets.id, primary.id));

    // ---- Additional branches (multi-outlet, bundled into one billing group) ----
    let branchesCreated = 0;
    if (branchCount > 1) {
      await ensureBillingGroup(owner.id, primary.id);
      for (let i = 2; i <= branchCount; i++) {
        const branch = await provisionOutlet(`${outletName} - Cabang ${i}`, body.address, body.phone);
        await linkOwnerToOutlet(owner.id, branch.id);
        await createUnitsForComposition(branch.id, tv);
        await getOrCreateSubscription(branch.id);
        await addOutletToBillingGroup(owner.id, branch.id);
        branchesCreated++;
      }
    }

    // ---- Recommendation summary (mirrors startCheckout's own math, read-only here) ----
    const plan = await ensureDefaultPlan();
    const composition = await computeTvComposition(primary.id);
    const recommendation = {
      smartPlugQty: composition.nonAndroidTv,
      extraConsoleQty: Math.max(0, composition.total - plan.includedConsoles),
      staffAccountsSuggested: employees.kasir + employees.dapur + employees.lainnya,
      employees,
      shifts,
    };

    const token = signSessionToken({ sub: owner.id, outletId: primary.id, role: owner.role, name: owner.name, email: owner.email });
    const res = NextResponse.json({
      outlet: { id: primary.id, name: primary.name, slug: primary.slug },
      branchesCreated,
      recommendation,
      redirectTo: "/dashboard/billing",
    });
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    if (viaGoogle) res.cookies.set(GOOGLE_PENDING_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
