import { NextRequest, NextResponse } from "next/server";
import { describeError, errorStatus } from "@/lib/api/error";
import { payPurchaseInvoice } from "@/lib/inventory/purchasing";
import { purchaseInvoices } from "@/db/schema";
import { requireOwnedRow } from "@/lib/auth/scope";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { amount, method, cashBankAccountId } = await req.json();
  try {
    const { session } = await requireOwnedRow(purchaseInvoices, id, "Faktur pembelian tidak ditemukan.");
    return NextResponse.json(await payPurchaseInvoice(id, amount, method, cashBankAccountId, session.sub));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
