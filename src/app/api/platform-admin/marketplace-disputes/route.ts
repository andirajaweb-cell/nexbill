import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";
import { daftarAduanAdmin, daftarPenangguhan } from "@/lib/marketplace/trust-service";

/** Aduan Marketplace untuk ditinjau platform-admin (?status=open|resolved|all) + daftar outlet yang ditangguhkan. */
export async function GET(req: NextRequest) {
  try {
    await requirePlatformAdmin();
    const s = new URL(req.url).searchParams.get("status");
    const status = s === "resolved" || s === "all" ? s : "open";
    const [aduan, penangguhan] = await Promise.all([daftarAduanAdmin(status), daftarPenangguhan()]);
    return NextResponse.json({ aduan, penangguhan });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
