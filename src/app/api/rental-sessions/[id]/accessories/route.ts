import { NextRequest, NextResponse } from "next/server";
import { addAccessory, listSessionAccessories } from "@/lib/rental/accessories";
import { requireOwnedRentalSession } from "@/lib/rental/session-guard";
import { describeError, errorStatus } from "@/lib/api/error";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await requireOwnedRentalSession(id);
    return NextResponse.json(await listSessionAccessories(id));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 500) });
  }
}

/** Add an extra controller/accessory rental to an active session — starts its per-hour billing clock. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await requireOwnedRentalSession(id);
    const { name, qty, ratePerHour, staffUserId } = await req.json();
    if (!name) return NextResponse.json({ error: "Nama aksesoris wajib diisi." }, { status: 400 });
    const row = await addAccessory({ rentalSessionId: id, name, qty, ratePerHour, staffUserId });
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
