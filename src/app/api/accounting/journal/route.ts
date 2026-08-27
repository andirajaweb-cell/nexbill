import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { journalEntries, journalLines, accounts } from "@/db/schema";
import { eq, desc, and, gte, lte, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { postJournal } from "@/lib/accounting/journal";
import { describeError } from "@/lib/api/error";

/** Lists journal entries, newest first. Optional filters: sourceType=manual|pos|rental|... (exact match), from/to (entryDate range, inclusive ISO date strings). */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    // Never trust the outletId query param on its own — this endpoint returns the full
    // accounting journal, previously readable by anyone unauthenticated for any outlet id.
    const outletId = session.outletId;
    const sourceType = req.nextUrl.searchParams.get("sourceType");
    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");

    const conditions = [eq(journalEntries.outletId, outletId)];
    if (sourceType) conditions.push(eq(journalEntries.sourceType, sourceType as any));
    if (from) conditions.push(gte(journalEntries.entryDate, from));
    if (to) conditions.push(lte(journalEntries.entryDate, to));

    const entries = await db
      .select()
      .from(journalEntries)
      .where(and(...conditions))
      .orderBy(desc(journalEntries.entryDate))
      .limit(300);

    const accountRows = await db.select().from(accounts).where(eq(accounts.outletId, outletId));
    const accountMap = new Map(accountRows.map((a) => [a.id, a]));

    const result = await Promise.all(
      entries.map(async (entry) => {
        const lines = await db.select().from(journalLines).where(eq(journalLines.journalEntryId, entry.id));
        return {
          ...entry,
          lines: lines.map((l) => ({
            ...l,
            accountCode: accountMap.get(l.accountId)?.code,
            accountName: accountMap.get(l.accountId)?.name,
          })),
        };
      })
    );

    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/**
 * Creates a manual journal entry — superuser/accountant only
 * (post_manual_journal). Every line must reference a real posting account
 * (accountId, not accountCode — the UI resolves the picker to an id
 * directly); postJournal() itself still enforces the balance check and the
 * Header-account guard, so this route is a thin, permission-gated wrapper.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "post_manual_journal")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin membuat jurnal manual." }, { status: 403 });
    }

    const body = await req.json();
    if (!body.description || !Array.isArray(body.lines) || body.lines.length < 2) {
      return NextResponse.json({ error: "Deskripsi dan minimal 2 baris jurnal wajib diisi." }, { status: 400 });
    }
    for (const line of body.lines) {
      if (!line.accountId) return NextResponse.json({ error: "Setiap baris wajib memilih akun." }, { status: 400 });
      if ((Number(line.debit) || 0) < 0 || (Number(line.credit) || 0) < 0) return NextResponse.json({ error: "Nilai debit/kredit tidak boleh negatif." }, { status: 400 });
      if ((Number(line.debit) || 0) > 0 && (Number(line.credit) || 0) > 0) return NextResponse.json({ error: "Satu baris tidak boleh punya debit dan kredit sekaligus." }, { status: 400 });
    }

    // outletId always comes from the session, never the request body — every account picked
    // in body.lines must also belong to this outlet, or postJournal would post a manual entry
    // against another tenant's chart of accounts.
    const accountIds = [...new Set(body.lines.map((l: any) => l.accountId))] as string[];
    const ownedAccounts = accountIds.length ? await db.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.outletId, session.outletId), inArray(accounts.id, accountIds))) : [];
    if (ownedAccounts.length !== accountIds.length) {
      return NextResponse.json({ error: "Salah satu akun tidak ditemukan." }, { status: 400 });
    }

    const journalId = await postJournal({
      outletId: session.outletId,
      entryDate: body.entryDate || undefined,
      reference: body.reference || undefined,
      description: body.description,
      sourceType: "manual",
      staffUserId: session.sub,
      lines: body.lines.map((l: any) => ({ accountId: l.accountId, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0, description: l.description || undefined })),
    });

    return NextResponse.json({ id: journalId });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
