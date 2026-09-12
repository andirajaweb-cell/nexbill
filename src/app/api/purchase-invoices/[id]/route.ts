import { NextRequest, NextResponse } from "next/server";
import { purchaseInvoices } from "@/db/schema";
import { requireOwnedRow } from "@/lib/auth/scope";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { reconstructInvoiceLines, editPurchaseInvoiceLines, voidPurchaseInvoice } from "@/lib/inventory/purchase-invoice-correction";
import { describeError, errorStatus } from "@/lib/api/error";

/** Detail view (View) — reconstructs line items alongside the invoice row. Restricted to
 *  owner/superuser/supervisor/manager via manage_supplier_purchase_history, same as Edit/Delete —
 *  the user asked for View/Edit/Delete to all sit behind the same role gate. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session, row } = await requireOwnedRow(purchaseInvoices, id, "Invoice pembelian tidak ditemukan.");
    if (!hasPermission(session.role as StaffRole, "manage_supplier_purchase_history")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin melihat riwayat belanja supplier." }, { status: 403 });
    }
    const { lines, isLegacy } = await reconstructInvoiceLines(id);
    return NextResponse.json({ invoice: row, lines, isLegacy });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}

/** Edit (in-place) — see editPurchaseInvoiceLines for the reverse-then-reapply mechanics. Restricted
 *  to owner/superuser/supervisor/manager via manage_supplier_purchase_history. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session } = await requireOwnedRow(purchaseInvoices, id, "Invoice pembelian tidak ditemukan.");
    if (!hasPermission(session.role as StaffRole, "manage_supplier_purchase_history")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengedit riwayat belanja supplier." }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    if (!Array.isArray(body.lines) || body.lines.length === 0) {
      return NextResponse.json({ error: "Minimal 1 item." }, { status: 400 });
    }
    const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : "Koreksi manual";
    const result = await editPurchaseInvoiceLines(id, body.lines, reason, session.sub);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}

/** Delete (void, never a hard delete) — see voidPurchaseInvoice. Restricted to owner/superuser/
 *  supervisor/manager via manage_supplier_purchase_history. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session } = await requireOwnedRow(purchaseInvoices, id, "Invoice pembelian tidak ditemukan.");
    if (!hasPermission(session.role as StaffRole, "manage_supplier_purchase_history")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin menghapus riwayat belanja supplier." }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : "Dibatalkan manual";
    const invoice = await voidPurchaseInvoice(id, reason, session.sub);
    return NextResponse.json({ invoice });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
