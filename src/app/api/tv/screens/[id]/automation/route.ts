import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { updateScreenAutomation } from "@/lib/tv/automation";

/**
 * Mengubah pengaturan otomatisasi satu layar: port HDMI, paket browser, konfirmasi verifikasi, dan
 * saklar otomatis. Semua aturan (tidak bisa dinyalakan sebelum diverifikasi; mengganti port/browser
 * membatalkan verifikasi) ditegakkan di updateScreenAutomation — route ini hanya menyaring kolom
 * yang boleh dikirim dan memeriksa izin.
 *
 * manage_settings wajib: saklar ini menentukan apa yang dilakukan TV setiap kali kasir memulai dan
 * menghentikan sesi berbayar.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengubah otomatisasi TV." }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    // Hanya empat kolom ini yang diteruskan, dengan tipe yang dipaksa — apa pun selain itu di body
    // diabaikan. Nilai sebenarnya divalidasi lagi di updateScreenAutomation.
    const patch: { hdmiPort?: number | null; browserPackage?: string | null; autoSwitchEnabled?: boolean; confirmVerified?: boolean } = {};
    if (body.hdmiPort !== undefined) patch.hdmiPort = body.hdmiPort === null || body.hdmiPort === "" ? null : Number(body.hdmiPort);
    if (body.browserPackage !== undefined) patch.browserPackage = typeof body.browserPackage === "string" ? body.browserPackage : null;
    if (body.autoSwitchEnabled !== undefined) patch.autoSwitchEnabled = body.autoSwitchEnabled === true;
    if (body.confirmVerified !== undefined) patch.confirmVerified = body.confirmVerified === true;

    const row = await updateScreenAutomation(session.outletId, id, patch);
    return NextResponse.json({
      id: row.id,
      hdmiPort: row.hdmiPort,
      browserPackage: row.browserPackage,
      autoSwitchEnabled: row.autoSwitchEnabled,
      verifiedAt: row.autoSwitchVerifiedAt,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
