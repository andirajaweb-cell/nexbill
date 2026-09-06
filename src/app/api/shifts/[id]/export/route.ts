import { NextRequest, NextResponse } from "next/server";
import { getShiftDetail } from "@/lib/shift/shift";
import { buildShiftClosingPdf } from "@/lib/shift/shift-export";
import { shifts } from "@/db/schema";
import { requireOwnedRow } from "@/lib/auth/scope";
import { describeError, errorStatus } from "@/lib/api/error";
import { LANG_OPTIONS, type LangCode } from "@/lib/i18n/registry";

/** GET ?format=pdf — downloadable "Berita Acara Tutup Kasir" signed closing report for one shift. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireOwnedRow(shifts, id, "Shift tidak ditemukan.");
    const format = req.nextUrl.searchParams.get("format") ?? "pdf";
    if (format !== "pdf") return NextResponse.json({ error: "format hanya mendukung pdf saat ini." }, { status: 400 });
    // Report language — passed by the client from its own active dashboard language (see the PDF
    // link in shift/page.tsx) so the printed report matches whatever the person downloading it is
    // already viewing the dashboard in. Falls back to Indonesian if missing/invalid, never errors.
    const langParam = req.nextUrl.searchParams.get("lang");
    const lang: LangCode = LANG_OPTIONS.some((o) => o.code === langParam) ? (langParam as LangCode) : "id";

    const detail = await getShiftDetail(id);
    if (!detail) return NextResponse.json({ error: "Shift tidak ditemukan." }, { status: 404 });
    if (detail.shift.status !== "closed") return NextResponse.json({ error: "Shift belum ditutup — laporan hanya tersedia setelah shift ditutup." }, { status: 400 });

    const buffer = await buildShiftClosingPdf(detail, lang);
    const dateTag = (detail.shift.closedAt ?? detail.shift.openedAt).slice(0, 10);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="tutup-kasir-${dateTag}.pdf"`,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 500) });
  }
}
