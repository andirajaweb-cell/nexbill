import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { getDepositOverview, createDepositTopupInvoice } from "@/lib/subscription/service";
import { describeError } from "@/lib/api/error";

/** "Saldo Deposit" tab data: current balance + full Daftar Mutasi history. */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const overview = await getDepositOverview(session.outletId);
    return NextResponse.json(overview);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/** "Tambah Deposit" button — creates an unpaid deposit_topup invoice for the requested amount,
 * which the outlet then pays through the exact same cash/QRIS/VA/iPaymu flow as any other invoice
 * (POST /api/subscription/invoices/[id]/pay) — paying it is what actually credits the balance. */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Hanya Superuser yang bisa mengelola saldo deposit." }, { status: 403 });
    }
    const { amount } = await req.json();
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      return NextResponse.json({ error: "Jumlah top up harus lebih dari 0." }, { status: 400 });
    }
    const invoice = await createDepositTopupInvoice(session.outletId, n);
    return NextResponse.json(invoice);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
