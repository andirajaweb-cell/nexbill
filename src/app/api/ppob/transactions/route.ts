import { NextRequest, NextResponse } from "next/server";
import { postPpobTransaction } from "@/lib/ppob/engine";
import { computePpobList } from "@/lib/ppob/reports";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_ppob") && !hasPermission(session.role as StaffRole, "view_reports")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin melihat transaksi PPOB." }, { status: 403 });
    }

    const params = req.nextUrl.searchParams;

    // Always the caller's own outlet — never trust a client-supplied outletId here.
    const result = await computePpobList({
      outletId: session.outletId,
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined,
      category: params.get("category") ?? undefined,
      status: params.get("status") ?? undefined,
      staffUserId: params.get("staffUserId") ?? undefined,
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
    if (!hasPermission(session.role as StaffRole, "manage_ppob")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mencatat transaksi PPOB." }, { status: 403 });
    }

    const body = await req.json();
    if (!body.category || !body.product) return NextResponse.json({ error: "Kategori dan produk wajib diisi." }, { status: 400 });
    if (!body.fundingCashBankAccountId || !body.receivingCashBankAccountId) {
      return NextResponse.json({ error: "Akun sumber modal dan akun penerima wajib dipilih." }, { status: 400 });
    }
    if (!(Number(body.nominal) > 0)) return NextResponse.json({ error: "Nominal harus lebih dari 0." }, { status: 400 });

    // Always the caller's own outlet — never trust a client-supplied outletId here, this posts
    // a real PPOB transaction that moves money.
    const result = await postPpobTransaction({
      outletId: session.outletId,
      category: body.category,
      product: body.product,
      serviceRef: body.serviceRef ?? null,
      customerId: body.customerId ?? null,
      customerName: body.customerName ?? null,
      nominal: Number(body.nominal),
      modal: Number(body.modal ?? body.nominal),
      providerFee: Number(body.providerFee ?? 0),
      feeAdmin: Number(body.feeAdmin ?? 0),
      fundingCashBankAccountId: body.fundingCashBankAccountId,
      receivingCashBankAccountId: body.receivingCashBankAccountId,
      staffUserId: session.sub,
      shiftId: body.shiftId ?? null,
      notes: body.notes ?? null,
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
