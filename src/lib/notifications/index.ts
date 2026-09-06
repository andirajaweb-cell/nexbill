import { db } from "@/db/client";
import { and, eq, or, isNull, sql } from "drizzle-orm";
import { products, approvalRequests, expenses, bookings, subscriptions, notificationReads, platformAnnouncements, outlets } from "@/db/schema";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { listUnitsNeedingMaintenance } from "@/lib/rental/maintenance";
import { translate, type LangCode } from "@/lib/i18n/registry";
// Side-effect imports — this module runs server-side (API routes), so it can't rely on some
// client page having already registered these dictionaries; each must be imported directly by
// whatever server module actually calls translate() with its keys. dict-staff's approvalType.*
// keys are reused here instead of duplicating another 6-language translation for the same labels.
import "@/lib/i18n/dict-notifications";
import "@/lib/i18n/dict-staff";

export type NotificationSeverity = "info" | "warning" | "critical";

export type NotificationType =
  | "low_stock"
  | "approval_pending"
  | "expense_pending"
  | "booking_pending"
  | "subscription_trial"
  | "announcement"
  | "maintenance_due";

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

/** Keyed to the same staff.approvalType.* strings the Staff page already uses (dict-staff.ts) — one 6-language translation, reused here instead of duplicated. */
const APPROVAL_TYPE_KEY: Record<string, string> = {
  void_order: "staff.approvalType.voidOrder",
  void_item: "staff.approvalType.voidItem",
  refund: "staff.approvalType.refund",
  discount_override: "staff.approvalType.discountOverride",
  cancel_session: "staff.approvalType.cancelSession",
  shift_close_review: "staff.approvalType.shiftCloseReview",
  cash_transfer: "staff.approvalType.cashTransfer",
};

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

// ---- Low stock (everyone) ----
async function lowStockItems(outletId: string, lang: LangCode): Promise<NotificationItem[]> {
  const rows = await db
    .select()
    .from(products)
    .where(sql`${products.outletId} = ${outletId} AND ${products.stockQty} <= ${products.lowStockThreshold} AND ${products.isActive} = true`);
  return rows.map((p) => ({
    key: `low_stock:${p.id}`,
    type: "low_stock" as const,
    severity: p.stockQty <= 0 ? ("critical" as const) : ("warning" as const),
    title: translate(lang, "notifications.lowStock.title", "Stok menipis"),
    message: translate(lang, "notifications.lowStock.message", "{name} tersisa {qty} {unit} (ambang batas {threshold})")
      .replace("{name}", p.name)
      .replace("{qty}", String(p.stockQty))
      .replace("{unit}", p.unit)
      .replace("{threshold}", String(p.lowStockThreshold)),
    link: "/dashboard/inventory",
    createdAt: p.updatedAt,
    read: false,
  }));
}

// ---- Pending void/refund/etc. approvals (only those who can decide them) ----
async function approvalItems(outletId: string, lang: LangCode): Promise<NotificationItem[]> {
  const rows = await db
    .select()
    .from(approvalRequests)
    .where(and(eq(approvalRequests.outletId, outletId), eq(approvalRequests.status, "pending")));
  return rows.map((a) => ({
    key: `approval:${a.id}`,
    type: "approval_pending" as const,
    severity: "warning" as const,
    title: `${translate(lang, "notifications.approvalPending.titlePrefix", "Persetujuan")} ${
      APPROVAL_TYPE_KEY[a.type] ? translate(lang, APPROVAL_TYPE_KEY[a.type], a.type) : a.type
    }`,
    message: a.reason ?? translate(lang, "notifications.approvalPending.messageFallback", "Menunggu persetujuan ({refType})").replace("{refType}", a.refType),
    link: "/dashboard/staff",
    createdAt: a.createdAt,
    read: false,
  }));
}

// ---- Pending expense approvals (only those who can approve expenses) ----
async function expenseItems(outletId: string, lang: LangCode): Promise<NotificationItem[]> {
  const rows = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.outletId, outletId), eq(expenses.status, "pending_approval")));
  return rows.map((e) => ({
    key: `expense:${e.id}`,
    type: "expense_pending" as const,
    severity: "warning" as const,
    title: translate(lang, "notifications.expensePending.title", "Expense butuh persetujuan"),
    message: `${e.expenseNumber} — ${e.description ?? e.category} (Rp${e.amount.toLocaleString("id-ID")})`,
    link: "/dashboard/expenses",
    createdAt: e.createdAt,
    read: false,
  }));
}

// ---- Pending bookings needing confirmation (only those who manage bookings) ----
async function bookingItems(outletId: string, lang: LangCode): Promise<NotificationItem[]> {
  const rows = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.outletId, outletId), eq(bookings.status, "pending")));
  return rows.map((b) => ({
    key: `booking:${b.id}`,
    type: "booking_pending" as const,
    severity: "info" as const,
    title: translate(lang, "notifications.bookingPending.title", "Booking baru menunggu konfirmasi"),
    message: `${b.customerName ?? translate(lang, "notifications.bookingPending.customerFallback", "Pelanggan")} — ${new Date(b.scheduledStart).toLocaleString("id-ID")}`,
    link: "/dashboard/booking",
    createdAt: b.createdAt,
    read: false,
  }));
}

// ---- Subscription/billing state (only those who manage settings/billing) ----
async function subscriptionItems(outletId: string, lang: LangCode): Promise<NotificationItem[]> {
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
        title: translate(lang, "notifications.subscriptionTrial.endingTitle", "Masa trial akan berakhir"),
        message:
          left <= 0
            ? translate(lang, "notifications.subscriptionTrial.endsToday", "Masa trial berakhir hari ini.")
            : translate(lang, "notifications.subscriptionTrial.daysLeft", "Sisa {n} hari lagi.").replace("{n}", String(left)),
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
        title: translate(lang, "notifications.subscriptionTrial.expiredTitle", "Masa trial sudah berakhir"),
        message: translate(lang, "notifications.subscriptionTrial.expiredMessage", "Berlangganan sekarang supaya sistem tidak terkunci."),
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
        title: translate(
          lang,
          sub.status === "grace" ? "notifications.subscriptionTrial.graceTitle" : "notifications.subscriptionTrial.suspendedTitle",
          sub.status === "grace" ? "Pembayaran langganan gagal" : "Langganan disuspend"
        ),
        message: translate(lang, "notifications.subscriptionTrial.resolveMessage", "Segera selesaikan pembayaran di halaman Langganan."),
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

// ---- Predictive maintenance (only those who control devices/units) ----
async function maintenanceItems(outletId: string, lang: LangCode): Promise<NotificationItem[]> {
  const [outlet] = await db.select({ notifyMaintenanceDue: outlets.notifyMaintenanceDue }).from(outlets).where(eq(outlets.id, outletId)).limit(1);
  if (outlet && !outlet.notifyMaintenanceDue) return [];

  const due = await listUnitsNeedingMaintenance(outletId);
  return due.map(({ unit, status }) => ({
    key: `maintenance:${unit.id}`,
    type: "maintenance_due" as const,
    severity: status.overdueHours > 0 ? ("critical" as const) : ("warning" as const),
    title: translate(lang, "notifications.maintenanceDue.title", "Unit butuh servis"),
    message: translate(lang, "notifications.maintenanceDue.message", "{name} sudah dipakai {hours} jam sejak servis terakhir (ambang batas {threshold} jam){overdue}")
      .replace("{name}", unit.name)
      .replace("{hours}", String(status.hoursSinceService))
      .replace("{threshold}", String(status.thresholdHours))
      .replace(
        "{overdue}",
        status.overdueHours > 0
          ? translate(lang, "notifications.maintenanceDue.overdueSuffix", " — lewat {overdue} jam").replace("{overdue}", String(status.overdueHours))
          : ""
      ),
    link: "/dashboard/rental",
    createdAt: unit.updatedAt,
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
  role: StaffRole,
  lang: LangCode = "id"
): Promise<{ items: NotificationItem[]; unreadCount: number }> {
  const sourcePromises: Promise<NotificationItem[]>[] = [lowStockItems(outletId, lang), announcementItems(outletId)];
  if (hasPermission(role, "approve_requests")) sourcePromises.push(approvalItems(outletId, lang));
  if (hasPermission(role, "approve_expenses")) sourcePromises.push(expenseItems(outletId, lang));
  if (hasPermission(role, "manage_bookings")) sourcePromises.push(bookingItems(outletId, lang));
  if (hasPermission(role, "manage_devices")) sourcePromises.push(maintenanceItems(outletId, lang));
  // Only Superuser (NEXBILL's own internal/testing account) is exempt from the subscription/
  // trial feature — Owner is the role every real paying merchant uses day to day, so it must
  // still get these warnings; suppressing them for Owner would mean the business never sees a
  // heads-up before SubscriptionGate locks its own dashboard.
  if (role !== "superuser" && hasPermission(role, "manage_settings")) sourcePromises.push(subscriptionItems(outletId, lang));

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
