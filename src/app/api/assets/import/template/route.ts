import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { buildAssetImportTemplate } from "@/lib/assets/asset-xlsx";
import { parseLang } from "@/lib/assets/lang";

/** Template Excel untuk upload Daftar Aset (?lang= mengikuti bahasa dashboard). */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const buffer = await buildAssetImportTemplate(session.outletId, parseLang(req.nextUrl.searchParams.get("lang")));
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="template-upload-aset.xlsx"',
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
