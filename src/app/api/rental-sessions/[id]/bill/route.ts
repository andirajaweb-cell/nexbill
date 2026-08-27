import { NextRequest, NextResponse } from "next/server";
import { getOpenBillForSession, getBillBreakdown } from "@/lib/pos/bill";
import { requireOwnedRentalSession } from "@/lib/rental/session-guard";
import { describeError, errorStatus } from "@/lib/api/error";

/** Convenience lookup: session -> its unified bill breakdown, so the Rental page and live billing board don't need to know the order id. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await requireOwnedRentalSession(id);
    const bill = await getOpenBillForSession(id);
    if (!bill) return NextResponse.json({ error: "Bill terbuka tidak ditemukan untuk sesi ini." }, { status: 404 });
    const breakdown = await getBillBreakdown(bill.id);
    return NextResponse.json(breakdown);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 500) });
  }
}
