import { NextResponse } from "next/server";
import { describeError, errorStatus } from "@/lib/api/error";
import { stopRentalSession } from "@/lib/rental/sessions";
import { requireOwnedRentalSession } from "@/lib/rental/session-guard";

/** Stop a session: computes the bill (rounded overtime/hourly), frees the unit, and creates an order ready for checkout. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await requireOwnedRentalSession(id);
    const result = await stopRentalSession(id);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
