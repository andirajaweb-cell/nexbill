import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { journalEntries, journalLines, accounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getTransactionDetail } from "@/lib/reports/transactions";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "view_reports")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin melihat Transaction Center." }, { status: 403 });
    }

    const { id } = await params;
    const detail = await getTransactionDetail(id);
    if (!detail || detail.order.outletId !== session.outletId) return NextResponse.json({ error: "Transaksi tidak ditemukan." }, { status: 404 });

    const entries = await db.select().from(journalEntries).where(eq(journalEntries.sourceId, id));
    const accountRows = entries.length ? await db.select().from(accounts).where(eq(accounts.outletId, detail.order.outletId)) : [];
    const accountMap = new Map(accountRows.map((a) => [a.id, a]));

    const journal = await Promise.all(
      entries.map(async (entry) => {
        const lines = await db.select().from(journalLines).where(eq(journalLines.journalEntryId, entry.id));
        return {
          ...entry,
          lines: lines.map((l) => ({ ...l, accountCode: accountMap.get(l.accountId)?.code, accountName: accountMap.get(l.accountId)?.name })),
        };
      })
    );

    return NextResponse.json({ ...detail, journal });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
