import { NextRequest, NextResponse } from "next/server";
import { purchaseInvoices } from "@/db/schema";
import { requireOwnedRow } from "@/lib/auth/scope";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { permanentlyDeletePurchaseInvoice } from "@/lib/inventory/purchase-invoice-correction";
import { describeError, errorStatus } from "@/lib/api/error";

/** Hard delete (never recoverable) — see permanentlyDeletePurchaseInvoice for exactly what gets
 *  removed (invoice + items + stock movements + payments + journal entries, including the void
 *  reversal). Deliberately a separate route/permission from the regular void DELETE on
 *  /api/purchase-invoices/[id] — restricted to owner/superuser only via
 *  permanently_delete_purchase_history, and only works on an invoice that's already "cancelled". */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session } = await requireOwnedRow(purchaseInvoices, id, "Invoice pembelian tidak ditemukan.");
    if (!hasPermission(session.role as StaffRole, "permanently_delete_purchase_history")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin menghapus permanen riwayat belanja supplier." }, { status: 403 });
    }
    const result = await permanentlyDeletePurchaseInvoice(id, session.sub);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
