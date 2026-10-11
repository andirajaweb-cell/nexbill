import { NextRequest, NextResponse } from "next/server";
import { describeError, errorStatus } from "@/lib/api/error";
import { payPurchaseInvoice } from "@/lib/inventory/purchasing";
import { purchaseInvoices } from "@/db/schema";
import { requireOwnedRow } from "@/lib/auth/scope";
import { forbidUnless } from "@/lib/auth/require-permission";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { amount, method, cashBankAccountId } = await req.json();
  try {
    const { session } = await requireOwnedRow(purchaseInvoices, id, "Faktur pembelian tidak ditemukan.");
    // Membayar faktur = uang keluar dari kas/bank. Dipakai dari Inventory (pembelian) dan dari
    // Akuntansi (akuntan melunasi hutang usaha).
    const denied = forbidUnless(session, ["manage_inventory_purchasing", "manage_supplier_purchase_history", "manage_expenses"], "Role kamu tidak punya izin membayar faktur supplier.");
    if (denied) return denied;
    return NextResponse.json(await payPurchaseInvoice(id, amount, method, cashBankAccountId, session.sub));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
