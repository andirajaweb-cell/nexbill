import { NextRequest, NextResponse } from "next/server";
import { pokeTvUnits } from "@/lib/tv/push";
import { db } from "@/db/client";
import { rentalUnits } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { hasAnyPermission } from "@/lib/auth/require-permission";
import { describeError, errorStatus } from "@/lib/api/error";
import { assertUnitQuotaAvailable } from "@/lib/subscription/service";

/** Same duplicate-name guard as POST /api/rental-units — see that file's comment. */
async function nameAlreadyUsed(outletId: string, name: string, excludeId: string): Promise<boolean> {
  const rows = await db.select({ id: rentalUnits.id, name: rentalUnits.name }).from(rentalUnits).where(and(eq(rentalUnits.outletId, outletId), eq(rentalUnits.isActive, true)));
  const normalized = name.trim().toLowerCase();
  return rows.some((r) => r.id !== excludeId && r.name.trim().toLowerCase() === normalized);
}

/** Edit a unit's name/console/TV/rate/note, or archive it (isActive: false) — soft-delete only, see schema comment on rentalUnits.isActive. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const body = await req.json();

    const [existing] = await db.select().from(rentalUnits).where(eq(rentalUnits.id, id)).limit(1);
    if (!existing || existing.outletId !== session.outletId) return NextResponse.json({ error: "Unit tidak ditemukan." }, { status: 404 });

    // Tarif per jam = harga jual. Mengubahnya butuh izin harga (sama dengan Promo); peran lain tetap
    // boleh mengubah hal operasional unit (maintenance, catatan, dll.).
    if (
      body.hourlyRate !== undefined &&
      Number(body.hourlyRate) !== Number(existing.hourlyRate) &&
      !hasPermission(session.role as StaffRole, "manage_pricing_promo")
    ) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengubah tarif unit." }, { status: 403 });
    }
    // Mengarsipkan/mengaktifkan unit mengubah kuota tagihan langganan dan isi grid kasir —
    // hak yang sama dengan menambah unit.
    if (
      body.isActive !== undefined &&
      Boolean(body.isActive) !== Boolean(existing.isActive) &&
      !hasAnyPermission(session.role, ["manage_pricing_promo", "manage_settings", "manage_devices"])
    ) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengarsipkan atau mengaktifkan unit." }, { status: 403 });
    }

    if (body.isActive === false && existing.status === "occupied") {
      return NextResponse.json({ error: "Unit sedang dipakai — hentikan sesi dulu sebelum menonaktifkan unit." }, { status: 400 });
    }
    if (body.status === "maintenance" && existing.status === "occupied") {
      return NextResponse.json({ error: "Unit sedang dipakai — hentikan sesi dulu sebelum menandai maintenance." }, { status: 400 });
    }
    if (body.name && (await nameAlreadyUsed(existing.outletId, body.name, id))) {
      return NextResponse.json({ error: `Unit dengan nama "${body.name}" sudah ada — pakai nama lain supaya tidak tertukar di Live Billing Board.` }, { status: 400 });
    }

    // Mengaktifkan kembali unit arsip = menambah unit aktif → cek kuota paket Starter.
    if (body.isActive === true && !existing.isActive) {
      await assertUnitQuotaAvailable(existing.outletId, session.role, id);
    }

    const { id: _ignoreId, outletId: _ignoreOutlet, createdAt: _ignoreCreated, ...rest } = body;
    const [row] = await db.update(rentalUnits).set(rest).where(eq(rentalUnits.id, id)).returning();
    // Status maintenance / nama / konsol berubah → TV unit ini langsung menampilkan yang baru.
    await pokeTvUnits([id]);
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 500) });
  }
}
