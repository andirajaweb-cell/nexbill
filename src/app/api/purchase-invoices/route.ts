import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { purchaseInvoices, staffUsers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    // Unbounded before — an outlet's full purchase-invoice history, growing forever, fetched on
    // every Inventory > Pembelian page load. 300 gives comfortable headroom over what that tab
    // actually displays at once.
    // Left-joined so the "Belanja" history list can show who recorded each purchase (audit trail
    // requested 2026-09-13, same as the Expense Management list) without a second round-trip per
    // row. staffUserId is nullable — rows from before this column existed just show staffName null.
    const rows = await db
      .select({
        id: purchaseInvoices.id,
        outletId: purchaseInvoices.outletId,
        supplierId: purchaseInvoices.supplierId,
        purchaseOrderId: purchaseInvoices.purchaseOrderId,
        invoiceNumber: purchaseInvoices.invoiceNumber,
        invoiceDate: purchaseInvoices.invoiceDate,
        dueDate: purchaseInvoices.dueDate,
        amount: purchaseInvoices.amount,
        paidAmount: purchaseInvoices.paidAmount,
        status: purchaseInvoices.status,
        journalEntryId: purchaseInvoices.journalEntryId,
        staffUserId: purchaseInvoices.staffUserId,
        staffName: staffUsers.name,
      })
      .from(purchaseInvoices)
      .leftJoin(staffUsers, eq(purchaseInvoices.staffUserId, staffUsers.id))
      .where(eq(purchaseInvoices.outletId, session.outletId))
      .orderBy(desc(purchaseInvoices.invoiceDate))
      .limit(300);
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
