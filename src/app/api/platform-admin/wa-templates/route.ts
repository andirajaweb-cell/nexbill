import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { platformWaTemplates } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";
import { parseWaTemplateInput, stageOrder, type WaTemplateInput } from "@/lib/leads/wa-template";

const unauth = (err: unknown) => err instanceof Error && err.message === "UNAUTHENTICATED";

/** Semua template WA (aktif & nonaktif), urut tahap pipeline → sortOrder. adminName dipakai untuk {nama_admin}. */
export async function GET() {
  try {
    const session = await requirePlatformAdmin();
    const rows = await db.select().from(platformWaTemplates);
    rows.sort((a, b) => stageOrder(a.stage) - stageOrder(b.stage) || a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
    return NextResponse.json({ templates: rows, adminName: session.name });
  } catch (err: unknown) {
    if (unauth(err)) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePlatformAdmin();
    const parsed = parseWaTemplateInput(await req.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const v = parsed.value as WaTemplateInput;
    const [row] = await db
      .insert(platformWaTemplates)
      .values({ stage: v.stage, element: v.element, title: v.title, body: v.body, sortOrder: v.sortOrder, isActive: v.isActive, createdBy: session.sub })
      .returning();
    return NextResponse.json(row);
  } catch (err: unknown) {
    if (unauth(err)) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
