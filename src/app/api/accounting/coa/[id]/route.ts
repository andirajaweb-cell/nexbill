import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { accounts, journalLines } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { invalidateAccountCache } from "@/lib/accounting/coa";
import { describeError } from "@/lib/api/error";

async function assertCoaAccess() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "Belum login." }, { status: 401 }) };
  if (!hasPermission(session.role as StaffRole, "manage_coa")) {
    return { error: NextResponse.json({ error: "Role kamu tidak punya izin mengelola Chart of Accounts." }, { status: 403 }) };
  }
  return { session };
}

/** Edits an account's name/type/parent/posting-flag/cost-center/tax-code/active-flag. Code can only change if the account has never been posted to (renumbering a live account would orphan the code history a report might have cached — safer to archive + create a new one in that case). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await assertCoaAccess();
  if (access.error) return access.error;
  try {
    const { id } = await params;
    const [existing] = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
    if (!existing || existing.outletId !== access.session!.outletId) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });

    const body = await req.json();
    if (body.code && body.code !== existing.code) {
      const [used] = await db.select().from(journalLines).where(eq(journalLines.accountId, id)).limit(1);
      if (used) return NextResponse.json({ error: "Akun ini sudah pernah dipakai di jurnal — kode tidak bisa diubah. Buat akun baru lalu arsipkan yang lama jika perlu." }, { status: 400 });
      const [dup] = await db.select().from(accounts).where(and(eq(accounts.outletId, existing.outletId), eq(accounts.code, body.code), ne(accounts.id, id))).limit(1);
      if (dup) return NextResponse.json({ error: `Kode akun ${body.code} sudah dipakai.` }, { status: 400 });
    }
    if (body.isPostingAllowed === false) {
      const [child] = await db.select().from(accounts).where(eq(accounts.parentId, id)).limit(1);
      // headers are allowed to have no children yet (about to add some) — only block turning a POSTING account with existing journal history into a header.
      const [used] = await db.select().from(journalLines).where(eq(journalLines.accountId, id)).limit(1);
      if (used) return NextResponse.json({ error: "Akun ini sudah pernah menerima jurnal — tidak bisa dijadikan akun Header." }, { status: 400 });
      void child;
    }

    const values: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const key of ["code", "name", "type", "normalBalance", "parentId", "isPostingAllowed", "costCenter", "taxCode", "isActive"]) {
      if (body[key] !== undefined) values[key] = body[key];
    }
    const [row] = await db.update(accounts).set(values).where(eq(accounts.id, id)).returning();
    invalidateAccountCache(existing.outletId);
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

/** Hard-deletes an account only if it has never been posted to AND has no child accounts; otherwise soft-deletes (isActive false) so historical journal lines keep resolving to a real account row. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await assertCoaAccess();
  if (access.error) return access.error;
  try {
    const { id } = await params;
    const [existing] = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
    if (!existing || existing.outletId !== access.session!.outletId) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });

    const [child] = await db.select().from(accounts).where(eq(accounts.parentId, id)).limit(1);
    if (child) return NextResponse.json({ error: "Akun ini masih punya akun turunan — hapus/pindahkan turunannya dulu." }, { status: 400 });

    const [used] = await db.select().from(journalLines).where(eq(journalLines.accountId, id)).limit(1);
    if (used) {
      const [row] = await db.update(accounts).set({ isActive: false, updatedAt: new Date().toISOString() }).where(eq(accounts.id, id)).returning();
      invalidateAccountCache(existing.outletId);
      return NextResponse.json({ ok: true, softDeleted: true, row });
    }

    await db.delete(accounts).where(eq(accounts.id, id));
    invalidateAccountCache(existing.outletId);
    return NextResponse.json({ ok: true, softDeleted: false });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
