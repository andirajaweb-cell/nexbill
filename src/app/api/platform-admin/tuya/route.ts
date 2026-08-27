import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { platformTuyaAccount } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { getOrCreatePlatformTuyaAccount } from "@/lib/devices/adapters/tuya";
import { describeError } from "@/lib/api/error";

function mask(secret: string | null) {
  if (!secret) return "";
  return secret.length <= 4 ? "••••" : `••••${secret.slice(-4)}`;
}

/** The ONE shared Tuya Cloud API account used to control devices for every outlet/merchant, every country — see platformTuyaAccount in schema.ts. Not scoped to any outlet. */
export async function GET() {
  try {
    await requirePlatformAdmin();
    const row = await getOrCreatePlatformTuyaAccount();
    return NextResponse.json({ ...row, accessSecret: mask(row.accessSecret), hasAccessSecret: !!row.accessSecret });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/** Edit the shared account. A masked secret (starts with "••••") means "leave unchanged" — same write semantics the old per-outlet route used, so re-saving the form without touching the secret field never wipes it. */
export async function PATCH(req: NextRequest) {
  try {
    await requirePlatformAdmin();
    const body = await req.json();
    const existing = await getOrCreatePlatformTuyaAccount();
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (body.accessId !== undefined) patch.accessId = body.accessId;
    if (body.projectCode !== undefined) patch.projectCode = body.projectCode;
    if (body.region !== undefined) patch.region = body.region;
    if (typeof body.accessSecret === "string" && body.accessSecret.trim() && !body.accessSecret.startsWith("••••")) {
      patch.accessSecret = body.accessSecret.trim();
    }
    const [updated] = await db.update(platformTuyaAccount).set(patch).where(eq(platformTuyaAccount.id, existing.id)).returning();
    return NextResponse.json({ ...updated, accessSecret: mask(updated.accessSecret), hasAccessSecret: !!updated.accessSecret });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
