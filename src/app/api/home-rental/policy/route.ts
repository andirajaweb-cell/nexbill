import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { homeRentalPolicyRules } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { getPolicyRules, PolicyCategory } from "@/lib/home-rental/policy";

const VALID_CATEGORIES = ["risk_weight", "deposit_loyalty_tier", "late_fee_tier", "damage_rule", "checklist_item", "printed_rule"];

/**
 * Per-outlet Home Rental policy rules (Kebijakan tab) — every merchant's own editable rulebook:
 * Customer Risk Score weights, deposit loyalty tiers, late-fee tiers, damage-cost reference,
 * standard handover checklist, and printed rental rules. Seeded with sane defaults on first read
 * (see lib/home-rental/policy.ts), then fully owner-editable from here — add/edit/deactivate/
 * delete any row, same "small flat master list" pattern as Payment Methods/Satuan/PPOB Price Rules.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const category = req.nextUrl.searchParams.get("category") as PolicyCategory | null;
    if (!category || !VALID_CATEGORIES.includes(category)) return NextResponse.json({ error: "Kategori kebijakan tidak valid." }, { status: 400 });
    const includeInactive = req.nextUrl.searchParams.get("includeInactive") === "1";
    if (includeInactive) {
      if (!hasPermission(session.role as StaffRole, "manage_home_rental")) {
        return NextResponse.json({ error: "Role kamu tidak punya izin mengelola Home Rental." }, { status: 403 });
      }
      await getPolicyRules(session.outletId, category); // ensure seeded
      const rows = await db
        .select()
        .from(homeRentalPolicyRules)
        .where(and(eq(homeRentalPolicyRules.outletId, session.outletId), eq(homeRentalPolicyRules.category, category)))
        .orderBy(asc(homeRentalPolicyRules.sortOrder));
      return NextResponse.json(rows);
    }
    const rows = await getPolicyRules(session.outletId, category);
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_home_rental")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola Home Rental." }, { status: 403 });
    }
    const body = await req.json();
    if (!body.category || !VALID_CATEGORIES.includes(body.category)) return NextResponse.json({ error: "Kategori kebijakan tidak valid." }, { status: 400 });
    if (!body.label?.trim()) return NextResponse.json({ error: "Label wajib diisi." }, { status: 400 });
    const [row] = await db
      .insert(homeRentalPolicyRules)
      .values({
        outletId: session.outletId,
        category: body.category,
        key: body.key ?? null,
        productType: body.productType ?? null,
        label: body.label.trim(),
        numericValue: Number(body.numericValue) || 0,
        threshold: body.threshold === "" || body.threshold === undefined || body.threshold === null ? null : Number(body.threshold),
        chargeFullDay: !!body.chargeFullDay,
        note: body.note || null,
        sortOrder: Number(body.sortOrder) || 0,
      })
      .returning();
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
