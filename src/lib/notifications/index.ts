import { db } from "@/db/client";
import { and, eq, or, isNull, sql } from "drizzle-orm";
import { products, approvalRequests, expenses, bookings, subscriptions, notificationReads, platformAnnouncements } from "@/db/schema";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";

export type NotificationSeverity = "info" | "warning" | "critical";

export type NotificationType = "low_stock" | "approval_pending" | "expense_pending" | "booking_pending" | "subscription_trial" | "announcement";

export type NotificationItem = {
  key: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  link: string;
  createdAt: string;
  read: boolean;
};

const APPROVAL_TYPE_LABEL: Record<string, string> = {
  void_order: "Void Order",
  void_item: "Void Item",
  refund: "Refund",
  discount_override: "Override Diskon",
  cancel_session: "Batal Sesi",
};

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

/**
 * Notification center — computes an in-app notification feed on the fly from
 * live data (there is no persisted "notifications" table for events; only
 * `notificationReads` remembers what's been dismissed). Each source below is
 * permission-gated to whoever can actually act on it, EXCEPT low stock,
 * which stays visible to everyone logged in — that matches the original
 * bell-icon behavior before this was built out, and low stock is relevant
 * front-of-house context even for staff who can't restock it themselves.
 *
 * Adding a new source later: push more items into `items` following the same
 * shape, give each a stable, content-derived `key` (so read-state survives
 * across refreshes), and it's automatically picked up by both the TopBar
 * dropdown and the /dashboard/notifikasi page — neither needs to change.
 */
export async function getNotifications(
  outletId: string,
  staffUserId: string,
  role: StaffRole
): Promise<{ items: NotificationItem[]; unreadCount: number }> {
  const items: NotificationItem[] = [];

  // ---- Low stock (everyone) ----
  const lowStock = await db
    .select()
    .from(products)
    .where(sql`${products.outletId} = ${outletId} AND ${products.stockQty} <= ${products.lowStockThreshold} AND ${products.isActive} = true`);
  for (const p of lowStock) {
    items.push({
      key: `low_stock:${p.id}`,
      type: "low_stock",
      severity: p.stockQty <= 0 ? "critical" : "warning",
      title: "Stok menipis",
      message: `${p.name} tersisa ${p.stockQty} ${p.unit} (ambang batas ${p.lowStockThreshold})`,
      link: "/dashboard/inventory",
      createdAt: p.updatedAt,
      read: false,
    });
  }

  // ---- Pending void/refund/etc. approvals (only those who can decide them) ----
  if (hasPermission(role, "approve_requests")) {
    const pending = await db
      .select()
      .from(approvalRequests)
      .where(and(eq(approvalRequests.outletId, outletId), eq(approvalRequests.status, "pending")));
    for (const a of pending) {
      items.push({
        key: `approval:${a.id}`,
        type: "approval_pending",
        severity: "warning",
        title: `Persetujuan ${APPROVAL_TYPE_LABEL[a.type] ?? a.type}`,
        message: a.reason ?? `Menunggu persetujuan (${a.refType})`,
        link: "/dashboard/staff",
        createdAt: a.createdAt,
        read: false,
      });
    }
  }

  // ---- Pending expense approvals (only those who can approve expenses) ----
  if (hasPermission(role, "approve_expenses")) {
    const pending = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.outletId, outletId), eq(expenses.status, "pending_approval")));
    for (const e of pending) {
      items.push({
        key: `expense:${e.id}`,
        type: "expense_pending",
        severity: "warning",
        title: "Expense butuh persetujuan",
        message: `${e.expenseNumber} — ${e.description ?? e.category} (Rp${e.amount.toLocaleString("id-ID")})`,
        link: "/dashboard/expenses",
        createdAt: e.createdAt,
        read: false,
      });
    }
  }

  // ---- Pending bookings needing confirmation (only those who manage bookings) ----
  if (hasPermission(role, "manage_bookings")) {
    const pending = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.outletId, outletId), eq(bookings.status, "pending")));
    for (const b of pending) {
      items.push({
        key: `booking:${b.id}`,
        type: "booking_pending",
        severity: "info",
        title: "Booking baru menunggu konfirmasi",
        message: `${b.customerName ?? "Pelanggan"} — ${new Date(b.scheduledStart).toLocaleString("id-ID")}`,
        link: "/dashboard/booking",
        createdAt: b.createdAt,
        read: false,
      });
    }
  }

  // ---- Subscription/billing state (only those who manage settings/billing) ----
  // Only Superuser (NEXBILL's own internal/testing account) is exempt from the subscription/
  // trial feature — Owner is the role every real paying merchant uses day to day, so it must
  // still get these warnings; suppressing them for Owner would mean the business never sees a
  // heads-up before SubscriptionGate locks its own dashboard.
  if (role !== "superuser" && hasPermission(role, "manage_settings")) {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.outletId, outletId)).limit(1);
    if (sub) {
      if (sub.status === "trial") {
        const left = daysUntil(sub.trialEndsAt);
        if (left <= 5) {
          items.push({
            key: `subscription:${sub.id}:trial`,
            type: "subscription_trial",
            severity: left <= 1 ? "critical" : "warning",
            title: "Masa trial akan berakhir",
            message: left <= 0 ? "Masa trial berakhir hari ini." : `Sisa ${left} hari lagi.`,
            link: "/dashboard/billing",
            createdAt: sub.trialEndsAt,
            read: false,
          });
        }
      } else if (sub.status === "trial_expired") {
        items.push({
          key: `subscription:${sub.id}:expired`,
          type: "subscription_trial",
          severity: "critical",
          title: "Masa trial sudah berakhir",
          message: "Berlangganan sekarang supaya sistem tidak terkunci.",
          link: "/dashboard/billing",
          createdAt: sub.updatedAt,
          read: false,
        });
      } else if (sub.status === "grace" || sub.status === "suspended") {
        items.push({
          key: `subscription:${sub.id}:${sub.status}`,
          type: "subscription_trial",
          severity: "critical",
          title: sub.status === "grace" ? "Pembayaran langganan gagal" : "Langganan disuspend",
          message: "Segera selesaikan pembayaran di halaman Langganan.",
          link: "/dashboard/billing",
          createdAt: sub.updatedAt,
          read: false,
        });
      }
    }
  }

  // ---- Platform announcements (everyone — broadcast from NEXBILL/Digitrajasa) ----
  const announcements = await db
    .select()
    .from(platformAnnouncements)
    .where(and(eq(platformAnnouncements.isActive, true), or(isNull(platformAnnouncements.outletId), eq(platformAnnouncements.outletId, outletId))));
  for (const a of announcements) {
    items.push({
      key: `announcement:${a.id}`,
      type: "announcement",
      severity: a.severity,
      title: a.title,
      message: a.message,
      link: "/dashboard/notifikasi",
      createdAt: a.createdAt,
      read: false,
    });
  }

  // ---- Cross-reference read state for this staff member ----
  const reads = await db
    .select({ notificationKey: notificationReads.notificationKey })
    .from(notificationReads)
    .where(eq(notificationReads.staffUserId, staffUserId));
  const readKeys = new Set(reads.map((r) => r.notificationKey));
  for (const item of items) item.read = readKeys.has(item.key);

  items.sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1; // unread first
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // newest first
  });

  return { items, unreadCount: items.filter((i) => !i.read).length };
}

export async function markNotificationRead(outletId: string, staffUserId: string, key: string) {
  await db.insert(notificationReads).values({ outletId, staffUserId, notificationKey: key }).onConflictDoNothing();
}

export async function markAllNotificationsRead(outletId: string, staffUserId: string, keys: string[]) {
  if (keys.length === 0) return;
  await db
    .insert(notificationReads)
    .values(keys.map((key) => ({ outletId, staffUserId, notificationKey: key })))
    .onConflictDoNothing();
}
