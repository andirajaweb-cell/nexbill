import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { getCurrentShift } from "@/lib/shift/shift";
import { transitionDeal } from "@/lib/marketplace/service";
import type { DealStatus } from "@/lib/marketplace/ujrah";

const STATUS_SAH: DealStatus[] = ["accepted", "completed", "rejected", "cancelled"];

/**
 * Memindahkan status satu kesepakatan. Aturan siapa-boleh-apa dan transisi mana yang sah
 * ditegakkan di transitionDeal(), bukan di sini — rute ini hanya menjaga bentuk masukannya.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_marketplace")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin bertransaksi di Marketplace." }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    if (!STATUS_SAH.includes(body.ke)) return NextResponse.json({ error: "Status tujuan tidak dikenal." }, { status: 400 });

    // Sama seperti Pendapatan Lain-lain dan Jual Keanggotaan: uang yang masuk lewat kesepakatan
    // yang selesai ikut masuk hitungan kas shift kasir yang sedang terbuka.
    const shift = body.ke === "completed" ? await getCurrentShift(session.outletId, session.sub) : null;

    const row = await transitionDeal({
      dealId: id,
      outletId: session.outletId,
      ke: body.ke,
      alasan: body.alasan,
      settlementMethod: body.settlementMethod,
      staffUserId: session.sub,
      shiftId: shift?.id ?? null,
    });
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
