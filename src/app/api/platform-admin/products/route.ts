import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { platformProducts } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";

export async function GET() {
  try {
    await requirePlatformAdmin();
    const rows = await db.select().from(platformProducts);
    return NextResponse.json(rows.sort((a, b) => a.category.localeCompare(b.category) || a.sortOrder - b.sortOrder));
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePlatformAdmin();
    const body = await req.json();
    if (!body.category || !body.name || body.price === undefined) {
      return NextResponse.json({ error: "category, name, dan price wajib diisi." }, { status: 400 });
    }
    if (!["smart_plug", "installation_service", "extra_console"].includes(body.category)) {
      return NextResponse.json({ error: "category tidak valid." }, { status: 400 });
    }
    const toNullableNumber = (v: unknown) => (v === "" || v === undefined || v === null ? null : Number(v));
    const [row] = await db
      .insert(platformProducts)
      .values({
        category: body.category,
        name: body.name,
        description: body.description || null,
        price: Number(body.price) || 0,
        imageUrl: body.imageUrl || null,
        isActive: body.isActive ?? true,
        sortOrder: Number(body.sortOrder ?? 0),
        weightGrams: body.weightGrams !== undefined && body.weightGrams !== "" ? Number(body.weightGrams) : 200,
        lengthCm: toNullableNumber(body.lengthCm),
        widthCm: toNullableNumber(body.widthCm),
        heightCm: toNullableNumber(body.heightCm),
      })
      .returning();
    return NextResponse.json(row);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
