import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { db } from "@/db/client";
import { nexbillHardwareUnits, outlets } from "@/db/schema";
import { desc, inArray } from "drizzle-orm";
import { createHardwareBatch } from "@/lib/hardware/units";
import { describeError } from "@/lib/api/error";

/** Superuser-only inventory view for the NEXBILL-branded smart plug program — see
 * nexbillHardwareUnits' doc comment in db/schema.ts for the full lifecycle. */
export async function GET() {
  try {
    await requirePlatformAdmin();
    const rows = await db.select().from(nexbillHardwareUnits).orderBy(desc(nexbillHardwareUnits.createdAt)).limit(500);
    const outletIds = [...new Set(rows.map((r) => r.claimedOutletId).filter((id): id is string => !!id))];
    const outletRows = outletIds.length ? await db.select({ id: outlets.id, name: outlets.name }).from(outlets).where(inArray(outlets.id, outletIds)) : [];
    const outletNameById = new Map(outletRows.map((o) => [o.id, o.name]));
    return NextResponse.json(
      rows.map((r) => ({ ...r, claimedOutletName: r.claimedOutletId ? outletNameById.get(r.claimedOutletId) ?? null : null }))
    );
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/** Generates a new batch of unclaimed unit (serial + pre-assigned MQTT topic) rows ahead of a
 * shipment/flashing run — see createHardwareBatch's own doc comment. Response includes the full
 * serial+topic list so ops can export it as CSV for the flashing station and printed labels. */
export async function POST(req: NextRequest) {
  try {
    await requirePlatformAdmin();
    const body = await req.json().catch(() => ({}));
    const count = Number(body.count);
    const batchLabel = typeof body.batchLabel === "string" ? body.batchLabel.trim() : undefined;
    if (!Number.isFinite(count) || count <= 0) return NextResponse.json({ error: "Jumlah unit wajib diisi dan lebih dari 0." }, { status: 400 });
    const created = await createHardwareBatch(count, batchLabel);
    return NextResponse.json({ created });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
