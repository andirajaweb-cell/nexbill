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

// ---- Low stock (everyone) ----
async function lowStockItems(outletId: string): Promise<NotificationItem[]> {
  const rows = await db
    .select()
    .from(products)
    .where(sql`${products.outletId} = ${outletId} AND ${products.stockQty} <= ${products.lowStockThreshold} AND ${products.isActive} = true`);
  return rows.map((p) => ({
    key: `low_stock:${p.id}`,
    type: "low_stock" as const,
    severity: p.stockQty <= 0 ? ("critical" as const) : ("warning" as const),
    title: "Stok menipis",
    message: `${p.name} tersisa ${p.stockQty} ${p.unit} (ambang batas ${p.lowStockThreshold})`,
    link: "/dashboard/inventory",
    createdAt: p.updatedAt,
    read: false,
  }));
}

// ---- Pending void/refund/etc. approvals (only those who can decide them) ----
async function approvalItems(outletId: string): Promise<NotificationItem[]> {
  const rows = await db
    .select()
    .from(approvalRequests)
    .where(and(eq(approvalRequests.outletId, outletId), eq(approvalRequests.status, "pending")));
  return rows.map((a) => ({
    key: `approval:${a.id}`,
    type: "approval_pending" as const,
    severity: "warning" as const,
    title: `Persetujuan ${APPROVAL_TYPE_LABEL[a.type] ?? a.type}`,
    message: a.reason ?? `Menunggu persetujuan (${a.refType})`,
    link: "/dashboard/staff",
    createdAt: a.createdAt,
    read: false,
  }));
}

// ---- Pending expense approvals (only those who can approve expenses) ----
async function expenseItems(outletId: string): Promise<NotificationItem[]> {
  const rows = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.outletId, outletId), eq(expenses.status, "pending_approval")));
  return rows.map((e) => ({
    key: `expense:${e.id}`,
    type: "expense_pending" as const,
    severity: "warning" as const,
    title: "Expense butuh persetujuan",
    message: `${e.expenseNumber} — ${e.description ?? e.category} (Rp${e.amount.toLocaleString("id-ID")})`,
    link: "/dashboard/expenses",
    createdAt: e.createdAt,
    read: false,
  }));
}

// ---- Pending bookings needing confirmation (only those who manage bookings) ----
async function bookingItems(outletId: string): Promise<NotificationItem[]> {
  const rows = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.outletId, outletId), eq(bookings.status, "pending")));
  return rows.map((b) => ({
    key: `booking:${b.id}`,
    type: "booking_pending" as const,
    severity: "info" as const,
    title: "Booking baru menunggu konfirmasi",
    message: `${b.customerName ?? "Pelanggan"} — ${new Date(b.scheduledStart).toLocaleString("id-ID")}`,
    link: "/dashboard/booking",
    createdAt: b.createdAt,
    read: false,
  }));
}

// ---- Subscription/billing state (only those who manage settings/billing) ----
async function subscriptionItems(outletId: string): Promise<NotificationItem[]> {
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.outletId, outletId)).limit(1);
  if (!sub) return [];
  if (sub.status === "trial") {
    const left = daysUntil(sub.trialEndsAt);
    if (left > 5) return [];
    return [
      {
        key: `subscription:${sub.id}:trial`,
        type: "subscription_trial",
        severity: left <= 1 ? "critical" : "warning",
        title: "Masa trial akan berakhir",
        message: left <= 0 ? "Masa trial berakhir hari ini." : `Sisa ${left} hari lagi.`,
        link: "/dashboard/billing",
        createdAt: sub.trialEndsAt,
        read: false,
      },
    ];
  }
  if (sub.status === "trial_expired") {
    return [
      {
        key: `subscription:${sub.id}:expired`,
        type: "subscription_trial",
        severity: "critical",
        title: "Masa trial sudah berakhir",
        message: "Berlangganan sekarang supaya sistem tidak terkunci.",
        link: "/dashboard/billing",
        createdAt: sub.updatedAt,
        read: false,
      },
    ];
  }
  if (sub.status === "grace" || sub.status === "suspended") {
    return [
      {
        key: `subscription:${sub.id}:${sub.status}`,
        type: "subscription_trial",
        severity: "critical",
        title: sub.status === "grace" ? "Pembayaran langganan gagal" : "Langganan disuspend",
        message: "Segera selesaikan pembayaran di halaman Langganan.",
        link: "/dashboard/billing",
        createdAt: sub.updatedAt,
        read: false,
      },
    ];
  }
  return [];
}

// ---- Platform announcements (everyone — broadcast from NEXBILL/Digitrajasa) ----
async function announcementItems(outletId: string): Promise<NotificationItem[]> {
  const rows = await db
    .select()
    .from(platformAnnouncements)
    .where(and(eq(platformAnnouncements.isActive, true), or(isNull(platformAnnouncements.outletId), eq(platformAnnouncements.outletId, outletId))));
  return rows.map((a) => ({
    key: `announcement:${a.id}`,
    type: "announcement" as const,
    severity: a.severity,
    title: a.title,
    message: a.message,
    link: "/dashboard/notifikasi",
    createdAt: a.createdAt,
    read: false,
  }));
}

async function readKeysFor(staffUserId: string): Promise<Set<string>> {
  const reads = await db
    .select({ notificationKey: notificationReads.notificationKey })
    .from(notificationReads)
    .where(eq(notificationReads.staffUserId, staffUserId));
  return new Set(reads.map((r) => r.notificationKey));
}

/**
 * Notification center — computes an in-app notification feed on the fly from
 * live data (there is no persisted "notifications" table for events; only
 * `notificationReads` remembers what's been dismissed). Each source above is
 * permission-gated to whoever can actually act on it, EXCEPT low stock,
 * which stays visible to everyone logged in — that matches the original
 * bell-icon behavior before this was built out, and low stock is relevant
 * front-of-house context even for staff who can't restock it themselves.
 *
 * All sources + the read-state lookup run concurrently via Promise.all — this function is
 * called on EVERY dashboard page load (TopBar polls it every 60s), so the ~6 independent,
 * per-outlet-scoped queries running one after another instead of in parallel was a real
 * cross-page latency tax. Each was previously a sequential `await` in a straight-line function;
 * they're now separate helpers above so Promise.all can fire whichever ones the caller's role is
 * actually permitted to see, all at once, instead of paying for round-trip time N times over.
 *
 * Adding a new source later: add a helper following the same shape above, push its promise into
 * `sourcePromises` below, and it's automatically picked up by both the TopBar dropdown and the
 * /dashboard/notifikasi page — neither needs to change.
 */
export async function getNotifications(
  outletId: string,
  staffUserId: string,
  role: StaffRole
): Promise<{ items: NotificationItem[]; unreadCount: number }> {
  const sourcePromises: Promise<NotificationItem[]>[] = [lowStockItems(outletId), announcementItems(outletId)];
  if (hasPermission(role, "approve_requests")) sourcePromises.push(approvalItems(outletId));
  if (hasPermission(role, "approve_expenses")) sourcePromises.push(expenseItems(outletId));
  if (hasPermission(role, "manage_bookings")) sourcePromises.push(bookingItems(outletId));
  // Only Superuser (NEXBILL's own internal/testing account) is exempt from the subscription/
  // trial feature — Owner is the role every real paying merchant uses day to day, so it must
  // still get these warnings; suppressing them for Owner would mean the business never sees a
  // heads-up before SubscriptionGate locks its own dashboard.
  if (role !== "superuser" && hasPermission(role, "manage_settings")) sourcePromises.push(subscriptionItems(outletId));

  const [sources, readKeys] = await Promise.all([Promise.all(sourcePromises), readKeysFor(staffUserId)]);
  const items = sources.flat();
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
