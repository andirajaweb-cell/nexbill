import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getNotifications } from "@/lib/notifications";
import type { StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { LANG_OPTIONS, type LangCode } from "@/lib/i18n/registry";

/** Bell-icon + /dashboard/notifikasi feed — scoped to the caller's own outlet + role automatically via the session, never a client-supplied outletId. */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    // ?lang= is purely the dashboard's client-side language preference (see dashboard-lang.tsx —
    // it's a localStorage choice, not tied to the outlet's own preferredLang), so it has to be
    // passed explicitly rather than looked up server-side. Validated against the known set,
    // defaulting to "id" for old clients that don't send it yet.
    const rawLang = req.nextUrl.searchParams.get("lang");
    const lang: LangCode = LANG_OPTIONS.some((o) => o.code === rawLang) ? (rawLang as LangCode) : "id";
    const result = await getNotifications(session.outletId, session.sub, session.role as StaffRole, lang);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
