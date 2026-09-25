import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { platformLeads } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";
import { toWhatsappNumber } from "@/lib/leads/places";
import { leadSummary, listLeads, parseLeadFilters } from "@/lib/leads/service";

export async function GET(req: NextRequest) {
  try {
    await requirePlatformAdmin();
    const [leads, summary] = await Promise.all([listLeads(parseLeadFilters(req.nextUrl.searchParams)), leadSummary()]);
    return NextResponse.json({ leads, ...summary });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/** Manual lead — for prospects met offline, via referral, social media, etc. (not from Google Maps). */
export async function POST(req: NextRequest) {
  try {
    const session = await requirePlatformAdmin();
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Nama usaha wajib diisi." }, { status: 400 });
    const phone = String(body.phone ?? "").trim() || null;

    const [row] = await db
      .insert(platformLeads)
      .values({
        source: "manual",
        name,
        contactName: String(body.contactName ?? "").trim() || null,
        phone,
        waNumber: toWhatsappNumber(phone),
        address: String(body.address ?? "").trim() || null,
        city: String(body.city ?? "").trim() || null,
        notes: String(body.notes ?? "").trim() || null,
        createdBy: session.sub,
      })
      .returning();
    return NextResponse.json(row);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
