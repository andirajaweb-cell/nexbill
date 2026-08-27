import { NextRequest, NextResponse } from "next/server";
import { getExistingOpeningBalance, postOpeningBalance, voidOpeningBalance } from "@/lib/accounting/opening-balance";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

const CAN_MIGRATE = ["superuser", "owner"];

function authError(err: any) {
  if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
  return null;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const result = await getExistingOpeningBalance(session.outletId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return authError(err) ?? NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/** Superuser/Owner only — bulk-setting every account's starting balance is a one-time, high-impact operation (misuse could fabricate an entire balance sheet). outletId always comes from the caller's own session, never the request body, so this can only ever target the caller's own outlet. */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!CAN_MIGRATE.includes(session.role) || !hasPermission(session.role as StaffRole, "post_manual_journal")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin migrasi Saldo Awal (khusus Superuser/Owner)." }, { status: 403 });
    }

    const body = await req.json();
    if (!body.cutoverDate || !Array.isArray(body.lines)) {
      return NextResponse.json({ error: "Tanggal cutover dan baris akun wajib diisi." }, { status: 400 });
    }
    const journalId = await postOpeningBalance(
      session.outletId,
      body.cutoverDate,
      body.lines.map((l: any) => ({ accountId: l.accountId, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0 })),
      session.sub
    );
    return NextResponse.json({ id: journalId });
  } catch (err: unknown) {
    return authError(err) ?? NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!CAN_MIGRATE.includes(session.role)) {
      return NextResponse.json({ error: "Role kamu tidak punya izin void Saldo Awal (khusus Superuser/Owner)." }, { status: 403 });
    }

    const { reason } = await req.json();
    if (!reason) return NextResponse.json({ error: "Alasan wajib diisi." }, { status: 400 });
    await voidOpeningBalance(session.outletId, session.sub, reason);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return authError(err) ?? NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
