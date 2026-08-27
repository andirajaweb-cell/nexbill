import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { marketRiskCurrencies } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";

export async function GET() {
  try {
    await requirePlatformAdmin();
    const rows = await db.select().from(marketRiskCurrencies);
    return NextResponse.json(rows.sort((a, b) => a.code.localeCompare(b.code)));
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePlatformAdmin();
    const body = await req.json();
    if (!body.code || !body.label) return NextResponse.json({ error: "code dan label wajib diisi." }, { status: 400 });
    const [row] = await db
      .insert(marketRiskCurrencies)
      .values({
        code: String(body.code).toUpperCase(),
        label: body.label,
        langCode: body.langCode || null,
        apiRateIdrPerUnit: body.apiRateIdrPerUnit != null ? Number(body.apiRateIdrPerUnit) : null,
        manualRateIdrPerUnit: body.manualRateIdrPerUnit != null ? Number(body.manualRateIdrPerUnit) : null,
        markupPercent: Number(body.markupPercent ?? 0),
        isActive: body.isActive ?? true,
        updatedBy: session.sub,
      })
      .returning();
    return NextResponse.json(row);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
