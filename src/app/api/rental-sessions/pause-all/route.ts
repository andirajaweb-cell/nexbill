import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { rentalSessions } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

/**
 * Jeda / lanjutkan SEMUA sesi SATU outlet sekaligus — untuk listrik padam (lib/rental/bulk-pause.ts).
 *   POST { action: "pause" }                → semua sesi "running" OUTLET INI dijeda dengan satu cap waktu.
 *   POST { action: "resume", pausedAt: T }  → hanya sesi OUTLET INI yang dijeda dengan cap T yang dilanjutkan.
 *
 * ISOLASI ANTAR-OUTLET (wajib dijaga): outlet SELALU diambil dari sesi login (session.outletId), tidak
 * pernah dari body, dan setiap UPDATE di bawah memuat syarat `outlet_id = session.outletId` di klausa
 * WHERE-nya sendiri — bukan hanya di query pencarian sebelumnya. Jadi outlet lain yang tidak mati lampu
 * tidak tersentuh sama sekali, termasuk outlet lain milik pemilik yang sama (yang berlaku hanya outlet
 * yang sedang aktif di dashboard). Dijaga oleh src/lib/rental/bulk-pause-scope.test.ts.
 *
 * Satu UPDATE per aksi (atomik): sesi yang baru dimulai/distop di tengah proses tidak membuat sebagian
 * sesi terjeda dan sebagian tidak. Hak aksesnya sama dengan tombol Jeda/Lanjut per sesi.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const outletId = session.outletId;
    const body = await req.json().catch(() => ({}));

    if (body.action === "pause") {
      const at = new Date().toISOString();
      const rows = await db
        .update(rentalSessions)
        .set({ status: "paused", pausedAt: at })
        .where(and(eq(rentalSessions.outletId, outletId), eq(rentalSessions.status, "running")))
        .returning({ id: rentalSessions.id });
      return NextResponse.json({ pausedAt: at, count: rows.length, sessionIds: rows.map((r) => r.id) });
    }

    if (body.action === "resume") {
      const pausedAt = typeof body.pausedAt === "string" ? body.pausedAt : "";
      const pausedMs = Date.parse(pausedAt);
      if (!pausedAt || !Number.isFinite(pausedMs)) return NextResponse.json({ error: "pausedAt tidak valid." }, { status: 400 });
      // Semua sesi dalam kelompok ini dijeda pada cap yang sama, jadi lama jedanya sama untuk semuanya.
      const pauseDurationMs = Math.max(0, Date.now() - pausedMs);
      const rows = await db
        .update(rentalSessions)
        .set({
          status: "running",
          pausedAt: null,
          accumulatedPauseMs: sql`${rentalSessions.accumulatedPauseMs} + ${pauseDurationMs}`,
        })
        .where(and(eq(rentalSessions.outletId, outletId), eq(rentalSessions.status, "paused"), eq(rentalSessions.pausedAt, pausedAt)))
        .returning({ id: rentalSessions.id });
      return NextResponse.json({ count: rows.length, sessionIds: rows.map((r) => r.id) });
    }

    return NextResponse.json({ error: 'action harus "pause" atau "resume".' }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
