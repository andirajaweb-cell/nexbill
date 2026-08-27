import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { eq } from "drizzle-orm";
import { outlets, staffUsers } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { canManageOutlet } from "@/lib/outlets/membership";
import { describeError } from "@/lib/api/error";

/**
 * Edit a branch's profile (name/address/phone) and/or archive-toggle it (isActive) — the
 * "Edit" and "Hapus" (soft-delete/arsip) actions on the "Ringkasan Semua Outlet" page. Owner/
 * superuser only (the two full-authority roles — same gate as creating a branch in the first
 * place, see POST /api/outlets), and the caller must actually be linked to this outlet via
 * outletMemberships (canManageOutlet — includes archived outlets, unlike canAccessOutlet which
 * is only for the switch-outlet dropdown), so an owner can never touch another tenant's branch.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (session.role !== "owner" && session.role !== "superuser") {
      return NextResponse.json({ error: "Hanya Owner/Superuser yang bisa mengelola cabang." }, { status: 403 });
    }

    const allowed = await canManageOutlet(session.sub, id);
    if (!allowed) return NextResponse.json({ error: "Outlet tidak ditemukan atau tidak terhubung ke akun kamu." }, { status: 404 });

    const body = await req.json();
    const values: Record<string, unknown> = {};
    if ("name" in body) {
      if (!body.name || !String(body.name).trim()) return NextResponse.json({ error: "Nama cabang wajib diisi." }, { status: 400 });
      values.name = String(body.name).trim();
    }
    if ("address" in body) values.address = body.address || null;
    if ("phone" in body) values.phone = body.phone || null;
    if ("isActive" in body) {
      const isActive = Boolean(body.isActive);
      if (!isActive) {
        // Refuse to archive the caller's own home outlet (staffUsers.outletId) — that's the
        // account's anchor branch; archiving it would strand the very account doing the
        // archiving (their session's home outlet would no longer be switchable/loadable).
        // Archive secondary/branch outlets instead, or transfer ownership first.
        const [staff] = await db.select({ outletId: staffUsers.outletId }).from(staffUsers).where(eq(staffUsers.id, session.sub)).limit(1);
        if (staff?.outletId === id) {
          return NextResponse.json({ error: "Tidak bisa menonaktifkan outlet utama (home) akun kamu sendiri. Nonaktifkan cabang lain, bukan outlet ini." }, { status: 400 });
        }
      }
      values.isActive = isActive;
    }
    if (Object.keys(values).length === 0) return NextResponse.json({ error: "Tidak ada perubahan." }, { status: 400 });
    values.updatedAt = new Date().toISOString();

    const [updated] = await db.update(outlets).set(values).where(eq(outlets.id, id)).returning();
    if (!updated) return NextResponse.json({ error: "Outlet tidak ditemukan." }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
