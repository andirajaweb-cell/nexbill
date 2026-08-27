import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { setFeatureFlag } from "@/lib/home-rental/feature-flags";

const ADMIN_ROLES = ["superuser", "owner"];

/**
 * Toggle a single feature flag. Hard role-gated to Superuser/Owner — not
 * just permission-gated — per the explicit requirement that the master
 * HOME_RENTAL_ENABLED switch (and, for simplicity/consistency, every
 * sub-flag under it) can only be changed by the outlet's top-level role, even if the
 * editable role-permission matrix elsewhere in the app were ever misused to
 * grant manage_feature_flags to another role.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  try {
    const session = await requireRole(ADMIN_ROLES);
    const { enabled } = await req.json();
    const row = await setFeatureFlag(session.outletId, key, Boolean(enabled), session.sub);
    return NextResponse.json(row);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (err instanceof Error && err.message === "FORBIDDEN") return NextResponse.json({ error: "Hanya Superuser/Owner yang bisa mengubah Feature Management." }, { status: 403 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
