import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { db } from "@/db/client";
import { platformIpaymuSandboxTests } from "@/db/schema";
import { eq } from "drizzle-orm";
import { describeError } from "@/lib/api/error";

/** Polled by the Platform Admin UI after opening the sandbox checkout URL, to show the result once
 * the webhook (route.ts in ./webhook) lands. Superuser-only, read-only. */
export async function GET(req: NextRequest) {
  try {
    await requirePlatformAdmin();
    const referenceId = req.nextUrl.searchParams.get("referenceId");
    if (!referenceId) return NextResponse.json({ error: "referenceId wajib diisi." }, { status: 400 });

    const [row] = await db.select().from(platformIpaymuSandboxTests).where(eq(platformIpaymuSandboxTests.referenceId, referenceId)).limit(1);
    if (!row) return NextResponse.json({ error: "Data ujicoba tidak ditemukan." }, { status: 404 });

    return NextResponse.json({ status: row.status, amount: row.amount, rawCallback: row.rawCallback, updatedAt: row.updatedAt });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
