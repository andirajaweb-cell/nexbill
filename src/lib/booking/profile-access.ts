import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "@/lib/auth/session";
import { hasPermission, isFullAuthorityRole, type StaffRole } from "@/lib/auth/permissions";

/** Mengubah profil halaman booking (foto, WhatsApp, lokasi): Owner atau izin Kelola Pengaturan. */
export function canEditBookingProfile(role: string) {
  return isFullAuthorityRole(role as StaffRole) || hasPermission(role as StaffRole, "manage_settings");
}

export async function requireBookingProfileEditor(): Promise<SessionPayload | NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
  if (!canEditBookingProfile(session.role)) return NextResponse.json({ error: "Role kamu tidak punya izin mengubah halaman booking." }, { status: 403 });
  return session;
}
