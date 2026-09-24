import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";
import { putuskanAduan } from "@/lib/marketplace/trust-service";

/** Memutuskan satu aduan: { resolution: "dismissed" | "warning" | "suspended", note }. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requirePlatformAdmin();
    const { id } = await params;
    const body = await req.json();
    return NextResponse.json(await putuskanAduan(id, admin.sub, body.resolution, body.note));
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
