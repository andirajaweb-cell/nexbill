import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { outlets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { ensureOutletSlug } from "@/lib/outlets/slug";
import { SEA_COUNTRY_TO_LANG } from "@/lib/data/sea-banks";

/** Curated fields the Settings UI (Business/Tax/Printer/Notification tabs) is allowed to edit on the outlet row. */
const EDITABLE_FIELDS = [
  "name", "address", "phone", "logoUrl", "wifiSsid", "wifiPassword",
  "billingRoundingMinutes", "serviceChargePercent", "taxPercent", "expenseApprovalThreshold",
  "printerName", "printerPaperWidthMm", "receiptFooterText",
  "notifyLowStock", "notifyPendingApproval", "notifyShiftVariance", "notifyBookingReminder",
  "bookingBufferMinutes", "bookingAutoReleaseMinutes", "bookingMinLeadMinutes", "acceptOnlineBooking",
  "salesTargetMonthly",
  "bankCountry", "bankName", "bankSwiftCode", "bankAccountNumber", "bankAccountHolderName",
  "outletCountry", "province", "city", "postalCode",
  // "Profil Billing" tab on /dashboard/billing (Faktur Pajak fields, mirrors Accurate.id).
  "hasNpwp", "npwpNumber", "nitku", "taxpayerName", "taxpayerAddress", "businessEntityType", "businessType",
  // Deliberately NOT "preferredLang" anymore — see the doc comment on that column in schema.ts.
  // It's now derived server-side below from outletCountry, not a direct user-editable field.
] as const;

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin melihat pengaturan." }, { status: 403 });
    }
    // Always the caller's own outlet — never trust a client-supplied outletId here, this row
    // includes sensitive fields (e.g. WiFi password).
    const [row] = await db.select().from(outlets).where(eq(outlets.id, session.outletId)).limit(1);
    if (!row) return NextResponse.json({ error: "Outlet tidak ditemukan." }, { status: 404 });
    // Lazily backfill outlets created before the slug column existed — see ensureOutletSlug().
    if (!row.slug) row.slug = await ensureOutletSlug(row.id);
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengubah pengaturan." }, { status: 403 });
    }

    const body = await req.json();

    const patch: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELDS) {
      if (body[key] !== undefined) patch[key] = body[key];
    }
    // Saving a country auto-derives preferredLang (support translation + billing currency both
    // read that column — see SEA_COUNTRY_TO_LANG's doc comment) — an outlet picks its country
    // once here, not the language directly.
    if (typeof patch.outletCountry === "string" && patch.outletCountry) {
      patch.preferredLang = SEA_COUNTRY_TO_LANG[patch.outletCountry] ?? "en";
    }
    patch.updatedAt = new Date().toISOString();

    // Always the caller's own outlet — never trust a client-supplied outletId here, this can
    // otherwise edit another outlet's WiFi/tax/printer settings.
    const [updated] = await db.update(outlets).set(patch).where(eq(outlets.id, session.outletId)).returning();
    if (!updated) return NextResponse.json({ error: "Outlet tidak ditemukan." }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
