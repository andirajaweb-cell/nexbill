import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { customers } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { getTimeCredit, listTimeCreditHistory } from "@/lib/rental/time-credit";

/** Saldo waktu member + riwayatnya. Pelanggan harus milik outlet yang sedang login. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const [c] = await db.select({ outletId: customers.outletId }).from(customers).where(eq(customers.id, id)).limit(1);
    if (!c || c.outletId !== session.outletId) return NextResponse.json({ error: "Pelanggan tidak ditemukan." }, { status: 404 });
    const balance = await getTimeCredit(id);
    const history = balance.migrationMissing ? [] : await listTimeCreditHistory(id);
    return NextResponse.json({
      ...balance,
      history: history.map((h) => ({ id: h.id, type: h.type, minutes: h.minutes, value: h.value, rentalSessionId: h.rentalSessionId, note: h.note, createdAt: h.createdAt })),
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
