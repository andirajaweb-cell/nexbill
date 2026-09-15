import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { platformTuyaAccount, outlets, devices } from "@/db/schema";
import { eq, and, or, isNull } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { getOrCreatePlatformTuyaAccount } from "@/lib/devices/adapters/tuya";
import { describeError } from "@/lib/api/error";

/** Same "drawing from the shared pool" definition as assertSharedTuyaCapacityAvailable() in
 * lib/devices/adapters/tuya.ts — kept in sync manually since one lives in the adapter (server-only
 * write path) and this one just reads a count for the admin UI. */
async function countSharedPoolDevices(): Promise<number> {
  const rows = await db
    .select({ id: devices.id })
    .from(devices)
    .innerJoin(outlets, eq(devices.outletId, outlets.id))
    .where(
      and(
        eq(devices.protocol, "tuya"),
        eq(outlets.tuyaUseSharedPlatformAccount, true),
        or(isNull(outlets.tuyaAccessId), eq(outlets.tuyaAccessId, ""))
      )
    );
  return rows.length;
}

function mask(secret: string | null) {
  if (!secret) return "";
  return secret.length <= 4 ? "••••" : `••••${secret.slice(-4)}`;
}

/** The legacy shared Tuya Cloud API account (see platformTuyaAccount in schema.ts) — since 2026-09-15
 * no longer the default for every outlet/merchant. Only outlets explicitly flagged
 * `tuyaUseSharedPlatformAccount` (a platform-admin-only exception, e.g. Xtream Playstation) fall
 * back to this account; every other outlet configures its own Tuya Cloud API from its own
 * Settings page (see EDITABLE_FIELDS in /api/settings/outlet/route.ts and the credential
 * resolution in lib/devices/adapters/tuya.ts's getCreds()). */
export async function GET() {
  try {
    await requirePlatformAdmin();
    const row = await getOrCreatePlatformTuyaAccount();
    const usedDevices = await countSharedPoolDevices();
    return NextResponse.json({ ...row, accessSecret: mask(row.accessSecret), hasAccessSecret: !!row.accessSecret, usedDevices });
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
    if (body.maxControllableDevices !== undefined) {
      const n = Number(body.maxControllableDevices);
      if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: "Kapasitas maksimal device harus angka >= 0." }, { status: 400 });
      patch.maxControllableDevices = Math.floor(n);
    }
    if (typeof body.accessSecret === "string" && body.accessSecret.trim() && !body.accessSecret.startsWith("••••")) {
      patch.accessSecret = body.accessSecret.trim();
    }
    const [updated] = await db.update(platformTuyaAccount).set(patch).where(eq(platformTuyaAccount.id, existing.id)).returning();
    const usedDevices = await countSharedPoolDevices();
    return NextResponse.json({ ...updated, accessSecret: mask(updated.accessSecret), hasAccessSecret: !!updated.accessSecret, usedDevices });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
