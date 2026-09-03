import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { purchaseInvoices } from "@/db/schema";
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
    const rows = await db.select().from(purchaseInvoices).where(eq(purchaseInvoices.outletId, session.outletId)).orderBy(desc(purchaseInvoices.invoiceDate)).limit(300);
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
