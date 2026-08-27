import { NextResponse } from "next/server";
import { generateImportTemplate } from "@/lib/inventory/import";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });

    const buffer = generateImportTemplate();
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="template-import-produk.xlsx"',
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
