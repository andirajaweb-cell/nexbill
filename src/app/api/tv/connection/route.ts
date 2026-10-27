import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { listTvConnection } from "@/lib/tv/service";

/** Status sambungan NEXBILL TV per unit (Rental PS): nama layar, terakhir terlihat, versi aplikasi. Tanpa token/kode. */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ serverTime: new Date().toISOString(), screens: await listTvConnection(session.outletId) });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
