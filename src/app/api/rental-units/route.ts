import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { rentalUnits, outlets } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { computeMaintenanceStatus } from "@/lib/rental/maintenance";

/**
 * Case/whitespace-insensitive duplicate check, scoped to this outlet's still-active units — two
 * units named "TV 4" is legal at the DB level (name has no unique constraint), but produces two
 * visually-identical cards on the Live Billing Board with nothing to tell them apart, which is
 * exactly the confusion a cashier watching that screen can't afford. Archived (isActive: false)
 * units don't block reusing their old name.
 */
async function nameAlreadyUsed(outletId: string, name: string, excludeId?: string): Promise<boolean> {
  const rows = await db.select({ id: rentalUnits.id, name: rentalUnits.name }).from(rentalUnits).where(and(eq(rentalUnits.outletId, outletId), eq(rentalUnits.isActive, true)));
  const normalized = name.trim().toLowerCase();
  return rows.some((r) => r.id !== excludeId && r.name.trim().toLowerCase() === normalized);
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const rows = await db.select().from(rentalUnits).where(eq(rentalUnits.outletId, session.outletId));
    const [outlet] = await db
      .select({ defaultMaintenanceThresholdHours: outlets.defaultMaintenanceThresholdHours })
      .from(outlets)
      .where(eq(outlets.id, session.outletId))
      .limit(1);
    // Attach computed predictive-maintenance status (see lib/rental/maintenance.ts) so the Live
    // Billing Board can show a "butuh servis" badge without every page needing its own copy of the
    // threshold math.
    const withMaintenance = rows.map((u) => ({ ...u, maintenance: computeMaintenanceStatus(u, outlet) }));
    return NextResponse.json(withMaintenance);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/** Add a new PS unit. */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const body = await req.json();
    if (!body.name) return NextResponse.json({ error: "Nama unit wajib diisi." }, { status: 400 });
    if (await nameAlreadyUsed(session.outletId, body.name)) {
      return NextResponse.json({ error: `Unit dengan nama "${body.name}" sudah ada — pakai nama lain supaya tidak tertukar di Live Billing Board.` }, { status: 400 });
    }
    const [row] = await db
      .insert(rentalUnits)
      .values({
        outletId: session.outletId,
        name: body.name,
        consoleType: body.consoleType ?? "ps4",
        tvType: body.tvType ?? "smart_tv",
        hourlyRate: body.hourlyRate ?? 0,
        note: body.note ?? null,
      })
      .returning();
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
