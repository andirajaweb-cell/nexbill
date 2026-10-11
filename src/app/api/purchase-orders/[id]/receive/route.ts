import { NextRequest, NextResponse } from "next/server";
import { describeError, errorStatus } from "@/lib/api/error";
import { receivePurchaseOrder } from "@/lib/inventory/purchasing";
import { purchaseOrders } from "@/db/schema";
import { requireOwnedRow } from "@/lib/auth/scope";
import { forbidUnless } from "@/lib/auth/require-permission";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { receivedQtyByItemId, createInvoice = true, invoiceNumber } = await req.json();
  try {
    const { session } = await requireOwnedRow(purchaseOrders, id, "Purchase order tidak ditemukan.");
    const denied = forbidUnless(session, ["manage_inventory_purchasing"], "Role kamu tidak punya izin menerima purchase order.");
    if (denied) return denied;
    return NextResponse.json(await receivePurchaseOrder(id, receivedQtyByItemId ?? null, createInvoice, invoiceNumber, session.sub));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
