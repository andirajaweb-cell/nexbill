import { NextRequest, NextResponse } from "next/server";
import { requireOwnedOrder } from "@/lib/pos/order-guard";
import { hardDeleteOrder } from "@/lib/pos/void";
import { describeError, errorStatus } from "@/lib/api/error";

/**
 * Hard-deletes a transaction — genuinely removed (order, items, payments,
 * journal entries), not voided-with-a-reversal-entry like void/refund.
 * Restricted to the Superuser/Owner roles specifically (exact string match, same
 * pattern as the full data reset feature).
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session } = await requireOwnedOrder(id);
    if (session.role !== "superuser" && session.role !== "owner") {
      return NextResponse.json({ error: "Hanya akun Superuser/Owner yang bisa menghapus transaksi." }, { status: 403 });
    }
    const result = await hardDeleteOrder(id, session.sub);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
