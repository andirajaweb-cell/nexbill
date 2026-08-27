import { NextRequest, NextResponse } from "next/server";
import { changeSessionCustomer } from "@/lib/rental/sessions";
import { requireOwnedRentalSession } from "@/lib/rental/session-guard";
import { describeError, errorStatus } from "@/lib/api/error";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { customerId, customerName } = await req.json();
  try {
    await requireOwnedRentalSession(id);
    return NextResponse.json(await changeSessionCustomer(id, { customerId, customerName }));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
