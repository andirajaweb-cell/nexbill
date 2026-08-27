import { NextRequest, NextResponse } from "next/server";
import { describeError, errorStatus } from "@/lib/api/error";
import { extendRentalSession } from "@/lib/rental/sessions";
import { requireOwnedRentalSession } from "@/lib/rental/session-guard";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { additionalMinutes } = await req.json();
  try {
    await requireOwnedRentalSession(id);
    return NextResponse.json(await extendRentalSession(id, additionalMinutes));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
