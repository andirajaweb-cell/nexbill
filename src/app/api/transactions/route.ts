import { NextRequest, NextResponse } from "next/server";
import { computeTransactionList } from "@/lib/reports/transactions";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "view_reports")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin melihat Transaction Center." }, { status: 403 });
    }

    const params = req.nextUrl.searchParams;
    const outletId = session.outletId;

    const minTotal = params.get("minTotal");
    const maxTotal = params.get("maxTotal");

    const result = await computeTransactionList({
      outletId,
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined,
      staffUserId: params.get("staffUserId") ?? undefined,
      type: (params.get("type") as any) ?? undefined,
      paymentMethodGroup: params.get("paymentMethodGroup") ?? undefined,
      status: params.get("status") ?? undefined,
      customerId: params.get("customerId") ?? undefined,
      shiftId: params.get("shiftId") ?? undefined,
      minTotal: minTotal ? Number(minTotal) : undefined,
      maxTotal: maxTotal ? Number(maxTotal) : undefined,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
