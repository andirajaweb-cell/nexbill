import { db } from "@/db/client";
import { bookingNotifications, outlets } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export type BookingNotificationType =
  | "reminder_h24"
  | "reminder_h2"
  | "reminder_15m"
  | "confirmation"
  | "reschedule"
  | "cancellation"
  | "waitlist_available"
  | "no_show"
  | "session_time_warning";

/**
 * Queues an outbound WhatsApp notification for a booking — never sends
 * directly (this process/route doesn't hold a WhatsApp connection). The
 * long-running scripts/whatsapp-bot.ts process polls bookingNotifications for
 * status="pending" rows and sends them over its live Baileys socket. This
 * split means booking logic here has zero dependency on whether the bot is
 * currently connected — worst case, messages queue up until it reconnects.
 *
 * No-op (returns null) if there's no phone number to send to, or a
 * notification of this exact type for this booking is still sitting
 * "pending" (not yet sent by the WhatsApp bot) — keeps callers simple (safe
 * to call unconditionally on every relevant transition) without piling up
 * duplicate unsent reminders on retries/re-runs. Deliberately only checks
 * "pending", not "any row ever" — that's what lets a booking rescheduled
 * twice get a fresh notification each time instead of being permanently
 * deduped after the first one is sent.
 */
export async function queueBookingNotification(input: {
  bookingId: string;
  outletId: string;
  type: BookingNotificationType;
  phone?: string | null;
  message: string;
}) {
  if (!input.phone) return null;

  const [existing] = await db
    .select()
    .from(bookingNotifications)
    .where(and(eq(bookingNotifications.bookingId, input.bookingId), eq(bookingNotifications.type, input.type), eq(bookingNotifications.status, "pending")))
    .limit(1);
  if (existing) return existing;

  const [row] = await db
    .insert(bookingNotifications)
    .values({
      bookingId: input.bookingId,
      outletId: input.outletId,
      type: input.type,
      channel: "whatsapp",
      phone: input.phone,
      message: input.message,
      status: "pending",
      scheduledFor: new Date().toISOString(),
    })
    .returning();
  return row;
}

const fmt = (iso: string) => new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

export async function outletName(outletId: string): Promise<string> {
  const [row] = await db.select({ name: outlets.name }).from(outlets).where(eq(outlets.id, outletId)).limit(1);
  return row?.name ?? "kami";
}

export const bookingMessages = {
  confirmation: (code: string, name: string, start: string) => `Booking ${code} kamu di ${name} untuk ${fmt(start)} sudah *dikonfirmasi*. Sampai jumpa!`,
  pendingReview: (code: string, name: string, start: string) => `Booking ${code} kamu di ${name} untuk ${fmt(start)} sudah diterima dan *menunggu konfirmasi* dari staf kami. Kami akan kabari begitu dikonfirmasi.`,
  waitlisted: (code: string, name: string, start: string, position: number) => `Slot untuk ${fmt(start)} di ${name} sedang penuh — booking ${code} kamu masuk *waiting list posisi #${position}*. Kami akan kabari kalau ada slot kosong.`,
  reschedule: (code: string, name: string, newStart: string) => `Booking ${code} kamu di ${name} dijadwal ulang ke *${fmt(newStart)}*.`,
  cancellation: (code: string, name: string, reason?: string | null) => `Booking ${code} kamu di ${name} telah *dibatalkan*.${reason ? ` Alasan: ${reason}` : ""}`,
  waitlistAvailable: (code: string, name: string, start: string) => `Kabar baik! Slot untuk booking ${code} kamu di ${name} sudah tersedia dan otomatis dikonfirmasi untuk *${fmt(start)}*.`,
  reminderH24: (code: string, name: string, start: string) => `Reminder: booking ${code} kamu di ${name} besok, *${fmt(start)}*. Sampai jumpa!`,
  reminderH2: (code: string, name: string, start: string) => `Reminder: booking ${code} kamu di ${name} sekitar 2 jam lagi, pukul *${fmt(start)}*.`,
  reminderM15: (code: string, name: string, start: string) => `Reminder: booking ${code} kamu di ${name} *15 menit lagi*! Ditunggu ya.`,
  sessionTimeWarning: (code: string, name: string, remainingMinutes: number) => `Waktu main kamu di ${name} (booking ${code}) tinggal *~${Math.max(1, Math.round(remainingMinutes))} menit lagi*. Mau lanjut? Bilang ke kasir untuk extend ya!`,
};
