import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { staffUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { allowedCategories, effectiveCategories, sanitizeCategories } from "@/lib/push/rules";
import { countSubscriptions } from "@/lib/push/service";

/** Kategori notifikasi push milik pengguna yang login (per akun, berlaku di semua perangkatnya). */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const [u] = await db.select({ role: staffUsers.role, prefs: staffUsers.pushCategoriesJson }).from(staffUsers).where(eq(staffUsers.id, session.sub)).limit(1);
    const role = u?.role ?? session.role;
    return NextResponse.json({
      allowed: allowedCategories(role),
      enabled: effectiveCategories(role, u?.prefs),
      devices: await countSubscriptions(session.sub),
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const categories = sanitizeCategories(session.role, body.categories);
    await db.update(staffUsers).set({ pushCategoriesJson: JSON.stringify(categories) }).where(eq(staffUsers.id, session.sub));
    return NextResponse.json({ enabled: categories });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
