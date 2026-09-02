import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { HELP_CATEGORIES } from "@/lib/help/content";
import { upsertHelpOverride, resetHelpOverride, type EditableHelpFields } from "@/lib/help/overrides";
import { describeError } from "@/lib/api/error";

/**
 * Editing the Help & Guide content is deliberately restricted to EXACTLY the "superuser" role —
 * per explicit request (originally said "supervisor", corrected by the user to "superuser" —
 * not the usual hasPermission()/role-group model used elsewhere in this app). Owner/Manager/
 * Accountant/Supervisor/etc. can all still VIEW the Help page (see the GET route in ../route.ts,
 * open to any logged-in staff) — they just can't edit it, same as everyone except Superuser.
 */
function assertSuperuser(role: string | undefined) {
  if (role !== "superuser") {
    throw Object.assign(new Error("Hanya akun dengan role Superuser yang bisa mengedit Bantuan & Panduan."), { status: 403 });
  }
}

const EDITABLE_KEYS = ["label", "navHint", "summary", "roles", "steps", "notes", "subsections"] as const;

function pickEditableFields(body: unknown): EditableHelpFields {
  const out: EditableHelpFields = {};
  if (!body || typeof body !== "object") return out;
  const b = body as Record<string, unknown>;
  for (const key of EDITABLE_KEYS) {
    if (b[key] !== undefined) (out as Record<string, unknown>)[key] = b[key];
  }
  return out;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ categoryId: string }> }) {
  try {
    const { categoryId } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    assertSuperuser(session.role);

    if (!HELP_CATEGORIES.some((c) => c.id === categoryId)) {
      return NextResponse.json({ error: "Topik bantuan tidak dikenali." }, { status: 404 });
    }

    const body = await req.json();
    const fields = pickEditableFields(body);
    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: "Tidak ada perubahan yang dikirim." }, { status: 400 });
    }

    await upsertHelpOverride(session.outletId, categoryId, fields, session.sub);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: (err as { status?: number })?.status ?? 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ categoryId: string }> }) {
  try {
    const { categoryId } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    assertSuperuser(session.role);

    await resetHelpOverride(session.outletId, categoryId);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: (err as { status?: number })?.status ?? 500 });
  }
}
