import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { outlets, bookings } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { createBooking } from "@/lib/rental/bookings";
import { describeError } from "@/lib/api/error";

const ACTIVE_STATUSES = ["pending", "confirmed", "waitlisted"] as const;
const MAX_ACTIVE_PER_PHONE = 3;

/**
 * Public, unauthenticated booking submission for /book. Anti-abuse measures
 * (this endpoint has no login gate, so it's the one surface in the app
 * genuinely open to the internet):
 *  - honeypot: a hidden form field real visitors never fill; any non-empty
 *    value here silently "succeeds" without writing anything, so a bot
 *    can't tell it was rejected and doesn't adapt.
 *  - per-phone cap: refuses a new booking once a phone number already has
 *    MAX_ACTIVE_PER_PHONE pending/confirmed/waitlisted bookings, so one
 *    number can't flood the schedule.
 * Real IP-based rate limiting isn't implemented here (needs edge/proxy-level
 * infra this app doesn't have) — recommended if abuse becomes a problem in
 * production: put this route behind Cloudflare/a reverse proxy with rate
 * limiting, or add one at the Next.js middleware layer.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.website) return NextResponse.json({ ok: true }); // honeypot tripped — fake success, no-op

    const outletId = body.outletId;
    if (!outletId) return NextResponse.json({ error: "outletId wajib diisi." }, { status: 400 });
    const name = String(body.name ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    if (!name) return NextResponse.json({ error: "Nama wajib diisi." }, { status: 400 });
    if (!/^[0-9+][0-9\s-]{7,}$/.test(phone)) return NextResponse.json({ error: "Nomor WhatsApp tidak valid." }, { status: 400 });
    if (!body.scheduledStart || !body.scheduledEnd) return NextResponse.json({ error: "Waktu booking wajib diisi." }, { status: 400 });
    if (!body.rentalUnitId && !body.consoleType) return NextResponse.json({ error: "Pilih tipe konsol atau unit." }, { status: 400 });

    const [outlet] = await db.select().from(outlets).where(eq(outlets.id, outletId)).limit(1);
    if (!outlet) return NextResponse.json({ error: "Outlet tidak ditemukan." }, { status: 404 });
    if (!outlet.acceptOnlineBooking) {
      return NextResponse.json({ error: "Booking online sedang tidak tersedia — silakan hubungi kami langsung." }, { status: 403 });
    }

    const activeForPhone = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(and(eq(bookings.outletId, outletId), eq(bookings.phone, phone), inArray(bookings.status, ACTIVE_STATUSES as any)));
    if (activeForPhone.length >= MAX_ACTIVE_PER_PHONE) {
      return NextResponse.json({ error: `Nomor ini sudah punya ${MAX_ACTIVE_PER_PHONE} booking aktif. Selesaikan atau batalkan salah satu dulu sebelum booking baru.` }, { status: 429 });
    }

    const { booking, waitlisted } = await createBooking({
      outletId,
      rentalUnitId: body.rentalUnitId || null,
      consoleType: body.consoleType || null,
      customerName: name,
      phone,
      scheduledStart: body.scheduledStart,
      scheduledEnd: body.scheduledEnd,
      notes: body.notes || null,
      source: "online",
    });

    return NextResponse.json({
      bookingCode: booking.bookingCode,
      status: booking.status,
      waitlistPosition: booking.waitlistPosition,
      scheduledStart: booking.scheduledStart,
      scheduledEnd: booking.scheduledEnd,
      waitlisted,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
