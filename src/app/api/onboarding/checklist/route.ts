import { NextResponse } from "next/server";
import { and, count, eq, inArray, isNotNull, ne, notInArray, or } from "drizzle-orm";
import { db } from "@/db/client";
import { devices, outlets, paymentMethods, products, relayAgents, rentalSessions, rentalUnits, shifts, staffUsers, tvScreens } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError, errorStatus } from "@/lib/api/error";
import { buildChecklist } from "@/lib/onboarding/checklist";

export const dynamic = "force-dynamic";

/**
 * Daftar "Siap Buka Outlet" untuk Ringkasan (lib/onboarding/checklist.ts). Hanya untuk peran yang
 * melihat ringkasan bisnis (Owner/Manager) — kasir tidak perlu daftar persiapan outlet.
 * Semua hitungan adalah COUNT berindeks per outlet; tidak ada data pelanggan yang dikirim.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "view_dashboard_owner")) return NextResponse.json({ hidden: true });
    const outletId = session.outletId;

    const one = async (q: Promise<{ n: number }[]>) => Number((await q)[0]?.n ?? 0);
    const [outlet] = await db.select({ address: outlets.address, country: outlets.outletCountry, printer: outlets.printerName }).from(outlets).where(eq(outlets.id, outletId)).limit(1);

    const [activeUnits, zeroRateUnits, configuredNonCash, staffCount, plugCount, screenCount, agentCount, productCount, shiftCount, sessionCount] = await Promise.all([
      one(db.select({ n: count() }).from(rentalUnits).where(and(eq(rentalUnits.outletId, outletId), eq(rentalUnits.isActive, true)))),
      one(db.select({ n: count() }).from(rentalUnits).where(and(eq(rentalUnits.outletId, outletId), eq(rentalUnits.isActive, true), eq(rentalUnits.hourlyRate, 0)))),
      one(
        db
          .select({ n: count() })
          .from(paymentMethods)
          .where(and(eq(paymentMethods.outletId, outletId), eq(paymentMethods.isActive, true), ne(paymentMethods.kind, "cash"), or(isNotNull(paymentMethods.qrisImageUrl), isNotNull(paymentMethods.bankAccountNumber))))
      ),
      one(db.select({ n: count() }).from(staffUsers).where(and(eq(staffUsers.outletId, outletId), eq(staffUsers.isActive, true), notInArray(staffUsers.role, ["owner", "superuser"])))),
      one(db.select({ n: count() }).from(devices).where(eq(devices.outletId, outletId))),
      one(db.select({ n: count() }).from(tvScreens).where(eq(tvScreens.outletId, outletId))),
      one(db.select({ n: count() }).from(relayAgents).where(eq(relayAgents.outletId, outletId))),
      one(db.select({ n: count() }).from(products).where(eq(products.outletId, outletId))),
      one(db.select({ n: count() }).from(shifts).where(eq(shifts.outletId, outletId))),
      one(db.select({ n: count() }).from(rentalSessions).where(and(eq(rentalSessions.outletId, outletId), inArray(rentalSessions.status, ["running", "paused", "finished"])))),
    ]);

    const checklist = buildChecklist({
      hasAddress: !!outlet?.address?.trim(),
      hasCountry: !!outlet?.country,
      activeUnits,
      zeroRateUnits,
      configuredNonCashMethods: configuredNonCash,
      staffCount,
      controlDevices: plugCount + screenCount + agentCount,
      hasPrinter: !!outlet?.printer?.trim(),
      products: productCount,
      shifts: shiftCount,
      sessions: sessionCount,
    });
    return NextResponse.json({ outletId, ...checklist }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 500) });
  }
}
