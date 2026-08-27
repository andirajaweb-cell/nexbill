import { NextRequest, NextResponse } from "next/server";
import { describeError, errorStatus } from "@/lib/api/error";
import { receivePurchaseOrder } from "@/lib/inventory/purchasing";
import { purchaseOrders } from "@/db/schema";
import { requireOwnedRow } from "@/lib/auth/scope";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { receivedQtyByItemId, createInvoice = true, invoiceNumber } = await req.json();
  try {
    const { session } = await requireOwnedRow(purchaseOrders, id, "Purchase order tidak ditemukan.");
    return NextResponse.json(await receivePurchaseOrder(id, receivedQtyByItemId ?? null, createInvoice, invoiceNumber, session.sub));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
