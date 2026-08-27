import { db } from "@/db/client";
import { bookingNotifications, outlets } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export type HomeRentalNotificationType = "hr_reminder_h24" | "hr_reminder_h2" | "hr_return_h24" | "hr_due_now" | "hr_overdue" | "hr_booking_confirmation";

/**
 * Home Rental's equivalent of lib/rental/notifications.ts's queueBookingNotification — reuses
 * the exact same bookingNotifications table/queue/WhatsApp-bot-poll pipeline (see
 * homeRentalRentalId on that table) instead of standing up a parallel one. No-op if there's no
 * phone, or an identical pending (not-yet-sent) notification already exists for this rental —
 * same dedup convention as the booking version.
 */
export async function queueHomeRentalNotification(input: {
  rentalId: string;
  outletId: string;
  type: HomeRentalNotificationType;
  phone?: string | null;
  message: string;
}) {
  if (!input.phone) return null;

  const [existing] = await db
    .select()
    .from(bookingNotifications)
    .where(and(eq(bookingNotifications.homeRentalRentalId, input.rentalId), eq(bookingNotifications.type, input.type), eq(bookingNotifications.status, "pending")))
    .limit(1);
  if (existing) return existing;

  const [row] = await db
    .insert(bookingNotifications)
    .values({
      homeRentalRentalId: input.rentalId,
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

export const homeRentalMessages = {
  bookingConfirmation: (code: string, name: string, start: string) => `Booking sewa ${code} di ${name} sudah *dikonfirmasi* untuk pengambilan *${fmt(start)}*. Sampai jumpa!`,
  reminderH24: (code: string, name: string, start: string) => `Reminder: sewa ${code} kamu di ${name} dijadwal ambil besok, *${fmt(start)}*.`,
  reminderH2: (code: string, name: string, start: string) => `Reminder: sewa ${code} kamu di ${name} sekitar 2 jam lagi, pukul *${fmt(start)}*.`,
  returnH24: (code: string, name: string, end: string) => `Reminder: sewa ${code} kamu di ${name} akan *segera habis besok, ${fmt(end)}*. Yuk mulai siap-siap dikembalikan agar tidak kena denda keterlambatan.`,
  dueNow: (code: string, name: string, end: string) => `Sewa ${code} kamu di ${name} jatuh tempo pengembalian *hari ini, ${fmt(end)}*. Yuk siap-siap dikembalikan agar tidak kena denda keterlambatan.`,
  overdue: (code: string, name: string, end: string, daysLate: number) => `Sewa ${code} kamu di ${name} sudah *terlambat ${daysLate} hari* dari jadwal kembali (${fmt(end)}). Mohon segera dikembalikan — denda keterlambatan berjalan setiap harinya.`,
};
