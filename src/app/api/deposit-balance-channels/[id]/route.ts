import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { depositBalanceChannels, accounts, cashBankAccounts, journalLines, shiftBalanceChecks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { invalidateAccountCache } from "@/lib/accounting/coa";
import { describeError } from "@/lib/api/error";

async function assertAccess() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "Belum login." }, { status: 401 }) };
  if (!hasPermission(session.role as StaffRole, "manage_coa")) {
    return { error: NextResponse.json({ error: "Role kamu tidak punya izin mengelola channel saldo deposit." }, { status: 403 }) };
  }
  return { session };
}

/**
 * Renames a channel — keeps the label AND its linked COA account name AND its
 * cashBankAccounts wrapper name all "calibrated" together, per the owner's
 * request. Works for the system Fastpay PPOB row too (still not deletable,
 * see DELETE below), since every lookup elsewhere resolves it by account CODE
 * ("1151"), never by name.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await assertAccess();
  if (access.error) return access.error;
  try {
    const { id } = await params;
    const [existing] = await db.select().from(depositBalanceChannels).where(eq(depositBalanceChannels.id, id)).limit(1);
    if (!existing || existing.outletId !== access.session!.outletId) {
      return NextResponse.json({ error: "Channel saldo deposit tidak ditemukan." }, { status: 404 });
    }

    const body = await req.json();
    const label = (body.label as string | undefined)?.trim();
    if (!label) return NextResponse.json({ error: "Nama channel wajib diisi." }, { status: 400 });

    const now = new Date().toISOString();
    const [updated] = await db
      .update(depositBalanceChannels)
      .set({ label, updatedAt: now })
      .where(eq(depositBalanceChannels.id, id))
      .returning();
    await db.update(accounts).set({ name: label, updatedAt: now }).where(eq(accounts.id, existing.accountId));
    await db.update(cashBankAccounts).set({ name: label, updatedAt: now }).where(eq(cashBankAccounts.id, existing.cashBankAccountId));
    invalidateAccountCache(existing.outletId);

    return NextResponse.json(updated);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

/**
 * Deletes a custom channel AND cleans up its linked COA account together —
 * hard-deletes the account (+ cashBankAccounts wrapper) if it was never
 * actually used (no journal history, no historical shift-close check),
 * otherwise soft-deletes the account (isActive: false) so old records keep
 * resolving, mirroring the same guard the Chart of Accounts CRUD uses. The
 * seeded Fastpay PPOB row (isSystem) can never be deleted — the PPOB module
 * depends on account 1151 always existing — only renamed via PATCH above.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await assertAccess();
  if (access.error) return access.error;
  try {
    const { id } = await params;
    const [existing] = await db.select().from(depositBalanceChannels).where(eq(depositBalanceChannels.id, id)).limit(1);
    if (!existing) return NextResponse.json({ ok: true }); // already gone
    if (existing.outletId !== access.session!.outletId) return NextResponse.json({ error: "Channel saldo deposit tidak ditemukan." }, { status: 404 });
    if (existing.isSystem) {
      return NextResponse.json({ error: "Channel Saldo Deposit Fastpay (PPOB) tidak bisa dihapus — hanya bisa diganti namanya." }, { status: 400 });
    }

    await db.delete(depositBalanceChannels).where(eq(depositBalanceChannels.id, id));

    const [usedInJournal] = await db.select().from(journalLines).where(eq(journalLines.accountId, existing.accountId)).limit(1);
    const [usedInShiftChecks] = await db
      .select()
      .from(shiftBalanceChecks)
      .where(eq(shiftBalanceChecks.cashBankAccountId, existing.cashBankAccountId))
      .limit(1);

    if (usedInJournal || usedInShiftChecks) {
      await db.update(accounts).set({ isActive: false, updatedAt: new Date().toISOString() }).where(eq(accounts.id, existing.accountId));
      invalidateAccountCache(existing.outletId);
      return NextResponse.json({ ok: true, softDeleted: true });
    }

    await db.delete(cashBankAccounts).where(eq(cashBankAccounts.id, existing.cashBankAccountId));
    await db.delete(accounts).where(eq(accounts.id, existing.accountId));
    invalidateAccountCache(existing.outletId);
    return NextResponse.json({ ok: true, softDeleted: false });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
