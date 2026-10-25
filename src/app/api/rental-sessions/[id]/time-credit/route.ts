import { NextResponse } from "next/server";
import { describeError, errorStatus } from "@/lib/api/error";
import { requireOwnedRentalSession } from "@/lib/rental/session-guard";
import { getSessionLeftover, saveSessionLeftover } from "@/lib/rental/time-credit";
import { logAudit } from "@/lib/audit/log";

/** Sisa waktu sesi yang sudah selesai: bisa disimpan ke saldo waktu member? (Saldo waktu member.) */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await requireOwnedRentalSession(id);
    return NextResponse.json(await getSessionLeftover(id));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}

/** Simpan sisa waktu sesi ke saldo member — sekali per sesi. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session, row } = await requireOwnedRentalSession(id);
    const result = await saveSessionLeftover(id, session.sub);
    await logAudit({ outletId: row.outletId, staffUserId: session.sub, action: "time_credit_save", entityType: "rental_session", entityId: id, after: { minutes: result.minutes, value: result.value } });
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
