import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { rentalUnits } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const rows = await db.select().from(rentalUnits).where(eq(rentalUnits.outletId, session.outletId));
    return NextResponse.json(rows);
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
