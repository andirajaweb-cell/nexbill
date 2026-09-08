import { db, type DbOrTx } from "@/db/client";
import { accountingPeriods } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Task #62 — Accounting Period Locking: "accounting period yang sudah ditutup tidak boleh
 * menerima posting baru." Periods are tracked at month granularity ("YYYY-MM"), matching the
 * cadence real close processes actually run at (see finance:close-management). A period with no
 * row in accountingPeriods is implicitly OPEN — most periods never get touched at all, only ones
 * an owner/accountant has explicitly closed (or since reopened) have a row.
 *
 * postJournal (accounting/journal.ts) is the single choke point every posting function in the app
 * routes through, so enforcing the lock there — via isPeriodLocked() below — makes it apply
 * everywhere (sales, COGS, expense, asset, depreciation, PPOB, manual entries, etc.) with one
 * check, with zero risk of some other posting path forgetting to check it.
 */

/** "2026-08-15T10:00:00.000Z" -> "2026-08". Journal entryDate is always a full ISO string. */
export function periodOf(entryDateIso: string): string {
  return entryDateIso.slice(0, 7);
}

/** Human label for a "YYYY-MM" period string, Indonesian month names (matches this app's default locale for accounting docs). */
const MONTH_LABEL_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
export function periodLabel(period: string): string {
  const [y, m] = period.split("-");
  const idx = Number(m) - 1;
  return idx >= 0 && idx < 12 ? `${MONTH_LABEL_ID[idx]} ${y}` : period;
}

export async function isPeriodLocked(outletId: string, entryDateIso: string, dbc: DbOrTx = db): Promise<boolean> {
  const period = periodOf(entryDateIso);
  const [row] = await dbc
    .select()
    .from(accountingPeriods)
    .where(and(eq(accountingPeriods.outletId, outletId), eq(accountingPeriods.period, period)))
    .limit(1);
  return row?.status === "closed";
}

export async function listPeriods(outletId: string) {
  return db.select().from(accountingPeriods).where(eq(accountingPeriods.outletId, outletId)).orderBy(desc(accountingPeriods.period));
}

/** Idempotent: closing an already-closed period is a no-op that returns the existing row unchanged. */
export async function closePeriod(outletId: string, period: string, staffUserId: string, note?: string) {
  const [existing] = await db
    .select()
    .from(accountingPeriods)
    .where(and(eq(accountingPeriods.outletId, outletId), eq(accountingPeriods.period, period)))
    .limit(1);

  if (existing) {
    if (existing.status === "closed") return existing;
    const [updated] = await db
      .update(accountingPeriods)
      .set({ status: "closed", closedBy: staffUserId, closedAt: new Date().toISOString(), note: note ?? existing.note })
      .where(eq(accountingPeriods.id, existing.id))
      .returning();
    return updated;
  }

  const [inserted] = await db
    .insert(accountingPeriods)
    .values({ outletId, period, status: "closed", closedBy: staffUserId, closedAt: new Date().toISOString(), note })
    .returning();
  return inserted;
}

/** Idempotent: reopening an already-open (or never-closed) period is a no-op. */
export async function reopenPeriod(outletId: string, period: string, staffUserId: string, note?: string) {
  const [existing] = await db
    .select()
    .from(accountingPeriods)
    .where(and(eq(accountingPeriods.outletId, outletId), eq(accountingPeriods.period, period)))
    .limit(1);
  if (!existing || existing.status === "open") return existing ?? null;

  const [updated] = await db
    .update(accountingPeriods)
    .set({ status: "open", reopenedBy: staffUserId, reopenedAt: new Date().toISOString(), note: note ?? existing.note })
    .where(eq(accountingPeriods.id, existing.id))
    .returning();
  return updated;
}
