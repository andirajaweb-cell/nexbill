import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { banners } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { describeError } from "@/lib/api/error";

/** Public, unauthenticated — only active banners for the given outlet, in slideshow order. Powers the looping ad banner on /book, right after the booking section. */
export async function GET(req: NextRequest) {
  try {
    const outletId = req.nextUrl.searchParams.get("outletId");
    if (!outletId) return NextResponse.json({ error: "outletId wajib diisi" }, { status: 400 });

    const rows = await db
      .select({ id: banners.id, imageUrl: banners.imageUrl, linkUrl: banners.linkUrl, title: banners.title })
      .from(banners)
      .where(and(eq(banners.outletId, outletId), eq(banners.isActive, true)))
      .orderBy(asc(banners.sortOrder), asc(banners.createdAt));

    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
