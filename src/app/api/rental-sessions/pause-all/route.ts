import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { rentalSessions } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { pauseRentalSession, resumeRentalSession } from "@/lib/rental/sessions";

/**
 * Jeda / lanjutkan SEMUA sesi outlet sekaligus — untuk listrik padam (lihat lib/rental/bulk-pause.ts).
 *   POST { action: "pause" }                → semua sesi "running" dijeda dengan SATU cap waktu.
 *   POST { action: "resume", pausedAt: T }  → hanya sesi yang dijeda dengan cap T yang dilanjutkan.
 * Hak aksesnya sama dengan tombol Jeda/Lanjut per sesi (semua staf yang bisa membuka Rental PS).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const body = await req.json().catch(() => ({}));

    if (body.action === "pause") {
      const at = new Date().toISOString();
      const running = await db
        .select({ id: rentalSessions.id })
        .from(rentalSessions)
        .where(and(eq(rentalSessions.outletId, session.outletId), eq(rentalSessions.status, "running")));
      const done: string[] = [];
      for (const r of running) {
        try {
          await pauseRentalSession(r.id, at);
          done.push(r.id);
        } catch {
          /* sesi berubah status di tengah jalan (mis. baru saja distop) — dilewati */
        }
      }
      return NextResponse.json({ pausedAt: at, count: done.length, sessionIds: done });
    }

    if (body.action === "resume") {
      const pausedAt = typeof body.pausedAt === "string" ? body.pausedAt : "";
      if (!pausedAt) return NextResponse.json({ error: "pausedAt wajib diisi." }, { status: 400 });
      const paused = await db
        .select({ id: rentalSessions.id })
        .from(rentalSessions)
        .where(and(eq(rentalSessions.outletId, session.outletId), eq(rentalSessions.status, "paused"), eq(rentalSessions.pausedAt, pausedAt)));
      const done: string[] = [];
      for (const r of paused) {
        try {
          await resumeRentalSession(r.id);
          done.push(r.id);
        } catch {
          /* sudah dilanjutkan dari perangkat lain */
        }
      }
      return NextResponse.json({ count: done.length, sessionIds: done });
    }

    return NextResponse.json({ error: "action harus \"pause\" atau \"resume\"." }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
