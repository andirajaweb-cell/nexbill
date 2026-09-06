import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { findOrphanedPpobEntries, summarizeOrphanImpact, cleanOrphanedPpobEntries } from "@/lib/accounting/orphan-cleanup";
import { invalidateAccountCache } from "@/lib/accounting/coa";
import { logAudit } from "@/lib/audit/log";
import { describeError } from "@/lib/api/error";

/**
 * One-time repair tool for outlets that hit the pre-fix hardDeletePpobTransaction
 * bug (see lib/accounting/orphan-cleanup.ts) — a deleted PPOB transaction left
 * behind an unpaired void-reversal or superseded-edit journal entry that keeps
 * distorting the linked account's balance (e.g. a shift's non-cash channel
 * verification showing a negative "Ekspektasi" with no transaction to explain it).
 *
 * GET is a pure dry-run/diagnostic — safe for anyone with manage_coa to check.
 * POST actually deletes the orphaned entries — restricted to superuser/owner,
 * same bar as full-reset, since it's a direct journal_entries/journal_lines
 * mutation even though (unlike full-reset) it only ever removes entries that
 * are already provably disconnected from any live transaction.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });

    const orphans = await findOrphanedPpobEntries(session.outletId);
    const impact = summarizeOrphanImpact(orphans);
    return NextResponse.json({ orphanedEntryCount: orphans.length, impact, orphans });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (session.role !== "superuser" && session.role !== "owner") {
      return NextResponse.json({ error: "Hanya akun Superuser/Owner yang bisa menjalankan pembersihan ini." }, { status: 403 });
    }

    const before = await findOrphanedPpobEntries(session.outletId);
    const impact = summarizeOrphanImpact(before);
    const { removedEntries } = await cleanOrphanedPpobEntries(session.outletId);
    invalidateAccountCache(session.outletId);

    await logAudit({
      outletId: session.outletId,
      staffUserId: session.sub,
      action: "cleanup_orphaned_ppob_entries",
      entityType: "journal_entry",
      entityId: session.outletId,
      before: { orphanedEntryCount: before.length, impact },
      after: { removedEntries },
    });

    return NextResponse.json({ ok: true, removedEntries, impact });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
