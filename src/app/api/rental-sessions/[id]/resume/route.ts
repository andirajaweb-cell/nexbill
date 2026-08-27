import { NextResponse } from "next/server";
import { describeError, errorStatus } from "@/lib/api/error";
import { resumeRentalSession } from "@/lib/rental/sessions";
import { requireOwnedRentalSession } from "@/lib/rental/session-guard";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await requireOwnedRentalSession(id);
    return NextResponse.json(await resumeRentalSession(id));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
