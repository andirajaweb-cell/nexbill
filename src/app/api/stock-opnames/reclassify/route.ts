import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { describeError, errorStatus } from "@/lib/api/error";
import { forbidUnless } from "@/lib/auth/require-permission";
import { reclassifyOpnameJournals } from "@/lib/inventory/stock-opname";

// Banyak jurnal = banyak void + catat ulang; beri waktu cukup supaya tidak timeout lalu diklik ulang.
export const maxDuration = 60;

/**
 * Pindahkan selisih stock opname lama (Kerugian Stock Opname di Laba Rugi) ke Koreksi Persediaan
 * (ekuitas). Stok tidak berubah; hanya jurnalnya. Idempoten.
 */
export async function POST() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const denied = forbidUnless(session, ["manage_inventory_purchasing"], "Role kamu tidak punya izin mengubah jurnal stock opname.");
    if (denied) return denied;
    return NextResponse.json(await reclassifyOpnameJournals(session.outletId));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 500) });
  }
}
