import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { cashBankAccounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireOwnedRow } from "@/lib/auth/scope";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError, errorStatus } from "@/lib/api/error";

/**
 * Currently only toggles includeInShiftFloat — the checklist in Settings > Preferensi >
 * "Komposisi Modal Awal Shift" that decides which cash pools sum into a shift's suggested
 * Modal Awal (see getSuggestedOpeningCash() in lib/shift/shift.ts). Kept narrow on purpose
 * rather than a generic PATCH — renaming/retyping a cash pool already goes through the
 * Admin Data table editor, which is superuser-gated for exactly that kind of master-data edit.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session } = await requireOwnedRow(cashBankAccounts, id, "Akun kas/bank tidak ditemukan.");
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengubah pengaturan ini." }, { status: 403 });
    }
    const body = await req.json();
    if (typeof body.includeInShiftFloat !== "boolean") {
      return NextResponse.json({ error: "includeInShiftFloat (boolean) wajib diisi." }, { status: 400 });
    }
    const [updated] = await db
      .update(cashBankAccounts)
      .set({ includeInShiftFloat: body.includeInShiftFloat, updatedAt: new Date().toISOString() })
      .where(eq(cashBankAccounts.id, id))
      .returning();
    return NextResponse.json(updated);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
