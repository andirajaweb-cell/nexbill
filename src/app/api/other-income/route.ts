import { NextRequest, NextResponse } from "next/server";
import { createOtherIncome, listOtherIncomes } from "@/lib/accounting/other-income";
import { getCurrentShift } from "@/lib/shift/shift";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_other_income") && !hasPermission(session.role as StaffRole, "view_reports")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin melihat Pendapatan Lain-lain." }, { status: 403 });
    }

    const params = req.nextUrl.searchParams;
    const outletId = session.outletId;

    const result = await listOtherIncomes({
      outletId,
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined,
      category: params.get("category") ?? undefined,
      status: params.get("status") ?? undefined,
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_other_income")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mencatat Pendapatan Lain-lain." }, { status: 403 });
    }

    const body = await req.json();
    if (!body.category) return NextResponse.json({ error: "Kategori wajib diisi." }, { status: 400 });
    if (!body.paymentMethod) return NextResponse.json({ error: "Metode pembayaran wajib diisi." }, { status: 400 });
    if (!(Number(body.amount) > 0)) return NextResponse.json({ error: "Nominal harus lebih dari 0." }, { status: 400 });

    // Auto-attach the cashier's currently-open shift (if any) so cash received this way folds
    // into that shift's cash-count reconciliation instead of silently going unaccounted for.
    const currentShift = await getCurrentShift(session.outletId, session.sub);

    const result = await createOtherIncome({
      outletId: session.outletId,
      category: body.category,
      description: body.description || undefined,
      payerName: body.payerName || undefined,
      amount: Number(body.amount),
      paymentMethod: body.paymentMethod,
      costCenterId: body.costCenterId || undefined,
      attachmentUrl: body.attachmentUrl || undefined,
      incomeDate: body.incomeDate || undefined,
      staffUserId: session.sub,
      shiftId: currentShift?.id ?? null,
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
