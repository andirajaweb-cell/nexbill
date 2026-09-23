import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { accountMappings } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { invalidateMappingCache } from "@/lib/accounting/account-mapping";
import { describeError } from "@/lib/api/error";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_coa")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola Account Mapping." }, { status: 403 });
    }
    const { id } = await params;
    const [existing] = await db.select().from(accountMappings).where(eq(accountMappings.id, id)).limit(1);
    if (!existing || existing.outletId !== session.outletId) return NextResponse.json({ error: "Mapping tidak ditemukan." }, { status: 404 });
    const body = await req.json();
    const values: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const key of ["accountId", "label", "isActive"]) {
      if (body[key] !== undefined) values[key] = body[key];
    }

    /*
     * transactionKey kini ikut bisa diubah (2026-09-21) — sebelumnya hanya accountId dan label yang
     * diterima, jadi baris yang kuncinya salah ketik cuma bisa dihapus lalu dibuat ulang.
     *
     * Dua penjagaan wajib ada, dan keduanya bukan formalitas:
     *
     * 1. HURUF KECIL. getMappedAccountId() mencari dengan transactionKey.toLowerCase(), jadi kunci
     *    yang disimpan dengan huruf besar tidak akan pernah cocok — barisnya tampak benar di layar
     *    tapi tidak pernah dipakai, dan modulnya diam-diam kembali ke akun default bawaan.
     *
     * 2. TIDAK BOLEH KEMBAR. Ada unique index (outletId, module, transactionKey) di skema. Tanpa
     *    pemeriksaan di sini, mengubah kunci menjadi kunci yang sudah ada akan melempar galat
     *    Postgres mentah ke layar — pesan yang tidak berarti apa pun bagi pemilik outlet.
     */
    if (body.transactionKey !== undefined) {
      const nextKey = String(body.transactionKey).trim().toLowerCase();
      if (!nextKey) return NextResponse.json({ error: "Nama transaksi tidak boleh kosong." }, { status: 400 });

      if (nextKey !== existing.transactionKey) {
        const [clash] = await db
          .select({ id: accountMappings.id })
          .from(accountMappings)
          .where(
            and(
              eq(accountMappings.outletId, session.outletId),
              eq(accountMappings.module, existing.module),
              eq(accountMappings.transactionKey, nextKey)
            )
          )
          .limit(1);
        if (clash) {
          return NextResponse.json(
            { error: `Sudah ada mapping lain di modul "${existing.module}" dengan nama transaksi "${nextKey}". Pakai nama lain, atau hapus baris yang lama dulu.` },
            { status: 400 }
          );
        }
      }
      values.transactionKey = nextKey;
    }

    const [row] = await db.update(accountMappings).set(values).where(eq(accountMappings.id, id)).returning();
    if (!row) return NextResponse.json({ error: "Mapping tidak ditemukan." }, { status: 404 });
    invalidateMappingCache(row.outletId);
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

/** Deletes a mapping row — falls back to the hardcoded default code the next time that module/key is resolved (see account-mapping.ts), never breaks posting. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_coa")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola Account Mapping." }, { status: 403 });
    }
    const { id } = await params;
    const [existing] = await db.select().from(accountMappings).where(eq(accountMappings.id, id)).limit(1);
    if (!existing || existing.outletId !== session.outletId) return NextResponse.json({ error: "Mapping tidak ditemukan." }, { status: 404 });
    const [row] = await db.delete(accountMappings).where(eq(accountMappings.id, id)).returning();
    if (!row) return NextResponse.json({ error: "Mapping tidak ditemukan." }, { status: 404 });
    invalidateMappingCache(row.outletId);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
