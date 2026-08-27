import { NextRequest, NextResponse } from "next/server";
import { transferRentalSession } from "@/lib/rental/sessions";
import { requireOwnedRentalSession } from "@/lib/rental/session-guard";
import { describeError, errorStatus } from "@/lib/api/error";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { newRentalUnitId, staffUserId } = await req.json();
  if (!newRentalUnitId) return NextResponse.json({ error: "newRentalUnitId wajib diisi" }, { status: 400 });
  try {
    await requireOwnedRentalSession(id);
    return NextResponse.json(await transferRentalSession(id, newRentalUnitId, staffUserId));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
