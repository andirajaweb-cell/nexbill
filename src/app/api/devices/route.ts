import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { devices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { assertDeviceAllowed } from "@/lib/subscription/service";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    // Always the caller's own outlet — never trust a client-supplied outletId here, this
    // includes device control endpoints.
    const rows = await db.select().from(devices).where(eq(devices.outletId, session.outletId));
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_devices")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin menambah perangkat." }, { status: 403 });
    }
    const body = await req.json();
    // Trial/subscription gate — smart-plug protocols are blocked pre-purchase,
    // Android-TV-family protocols capped at 1 device during trial. See
    // lib/subscription/service.ts for the full rule set.
    await assertDeviceAllowed(session.outletId, body.protocol, undefined, session.role);
    // outletId always comes from the session — never trust a client-supplied value, otherwise
    // a device could be created under a different outlet than the one just gated above.
    const [row] = await db.insert(devices).values({ ...body, outletId: session.outletId }).returning();
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
