import { db } from "@/db/client";
import {
  rentalSessions,
  rentalUnits,
  promos,
  tvScreensaverSettings,
  unitCustomerRequests,
  products,
  outlets,
  orders,
  staffUsers,
} from "@/db/schema";
import { and, eq, inArray, isNull, isNotNull, sql } from "drizzle-orm";
import { notifyOutlet } from "./service";
import { formatIdr, normalizeLang } from "./rules";
import { translate } from "@/lib/i18n/registry";
import "@/lib/i18n/dict-unit-qr";

/**
 * Pemicu notifikasi push untuk peristiwa outlet. Semua fungsi aman dipanggil di mana saja:
 * tidak pernah melempar (error hanya dicatat), supaya alur utama (transaksi, booking, tutup
 * shift, scheduler) tidak terganggu bila push gagal.
 */

const DEFAULT_WARNING_MINUTES = 5;
const MINUTE = 60_000;

function safe<T>(label: string, fn: () => Promise<T>): Promise<T | undefined> {
  return fn().catch((err) => {
    console.error(`[push:${label}]`, err);
    return undefined;
  });
}

async function unitName(unitId: string): Promise<string> {
  const [u] = await db.select({ name: rentalUnits.name }).from(rentalUnits).where(eq(rentalUnits.id, unitId)).limit(1);
  return u?.name ?? "Unit";
}

/** Scheduler: sesi berjangka yang tinggal ≤ N menit (N = setelan peringatan TV, bawaan 5) → push sekali. */
export async function runSessionEndingPush(outletId?: string): Promise<number> {
  const r = await safe("sessionEnding", async () => {
    let sent = 0;
    const active = await db
      .select()
      .from(rentalSessions)
      .where(and(outletId ? eq(rentalSessions.outletId, outletId) : sql`true`, inArray(rentalSessions.status, ["running", "paused"] as any), isNull(rentalSessions.pushWarningSentAt)));
    if (!active.length) return 0;
    const outletIds = [...new Set(active.map((s) => s.outletId))];
    const settings = await db
      .select({ outletId: tvScreensaverSettings.outletId, minutes: tvScreensaverSettings.timeWarningMinutes })
      .from(tvScreensaverSettings)
      .where(inArray(tvScreensaverSettings.outletId, outletIds));
    const warnBy = new Map(settings.map((s) => [s.outletId, s.minutes || DEFAULT_WARNING_MINUTES]));
    const promoIds = [...new Set(active.map((s) => s.promoId).filter((id): id is string => !!id))];
    const promoRows = promoIds.length ? await db.select().from(promos).where(inArray(promos.id, promoIds)) : [];
    const promoById = new Map(promoRows.map((p) => [p.id, p]));

    for (const s of active) {
      const allowed = (s.promoId ? promoById.get(s.promoId)?.durationMinutes : null) ?? s.plannedMinutes;
      if (allowed === null || allowed === undefined || allowed <= 0) continue;
      let pauseMs = s.accumulatedPauseMs;
      if (s.status === "paused" && s.pausedAt) pauseMs += Date.now() - new Date(s.pausedAt).getTime();
      const remaining = allowed + s.extendedMinutes - Math.max(0, (Date.now() - new Date(s.startedAt).getTime() - pauseMs) / MINUTE);
      const warn = warnBy.get(s.outletId) ?? DEFAULT_WARNING_MINUTES;
      if (remaining <= 0 || remaining > warn) continue;
      const claimed = await db
        .update(rentalSessions)
        .set({ pushWarningSentAt: new Date().toISOString() })
        .where(and(eq(rentalSessions.id, s.id), isNull(rentalSessions.pushWarningSentAt)))
        .returning({ id: rentalSessions.id });
      if (!claimed.length) continue;
      await notifyOutlet(
        s.outletId,
        "session",
        "sessionEnding",
        { unit: await unitName(s.rentalUnitId), n: Math.max(1, Math.ceil(remaining)), customer: s.customerName ?? "" },
        { url: "/dashboard/rental", tag: `session-${s.id}` }
      );
      sent++;
    }
    return sent;
  });
  return r ?? 0;
}

/** Setelah auto-stop scheduler: "waktu habis" + tagihan. */
export async function notifySessionsAutoStopped(stopped: { sessionId: string; rentalUnitId: string }[]) {
  for (const st of stopped) {
    await safe("sessionEnded", async () => {
      const [s] = await db.select().from(rentalSessions).where(eq(rentalSessions.id, st.sessionId)).limit(1);
      if (!s) return;
      await notifyOutlet(
        s.outletId,
        "session",
        "sessionEnded",
        { unit: await unitName(st.rentalUnitId), customer: s.customerName ?? "", amount: formatIdr(s.totalAmount ?? 0) },
        { url: "/dashboard/rental", tag: `session-${s.id}` }
      );
    });
  }
}

/** Permintaan baru dari halaman QR pelanggan. */
export async function notifyCustomerRequest(requestId: string) {
  await safe("customerRequest", async () => {
    const [req] = await db.select().from(unitCustomerRequests).where(eq(unitCustomerRequests.id, requestId)).limit(1);
    if (!req) return;
    const unit = await unitName(req.rentalUnitId);
    const [o] = await db.select({ lang: outlets.preferredLang }).from(outlets).where(eq(outlets.id, req.outletId)).limit(1);
    const lang = normalizeLang(o?.lang);
    let payload: any = {};
    try {
      payload = JSON.parse(req.payload);
    } catch {
      payload = {};
    }
    const opts = { url: "/dashboard/rental", tag: `unit-request-${req.id}` };
    if (req.type === "order_fnb") {
      const items: { productId: string; qty: number }[] = Array.isArray(payload.items) ? payload.items : [];
      const rows = items.length ? await db.select({ id: products.id, name: products.name }).from(products).where(inArray(products.id, items.map((i) => i.productId))) : [];
      const nameById = new Map(rows.map((r) => [r.id, r.name]));
      const text = items.map((i) => `${i.qty}x ${nameById.get(i.productId) ?? "?"}`).join(", ");
      await notifyOutlet(req.outletId, "customer_request", "requestOrder", { unit, items: text }, opts);
    } else if (req.type === "extend_time") {
      await notifyOutlet(req.outletId, "customer_request", "requestExtend", { unit, n: Number(payload.minutes) || 0 }, opts);
    } else {
      const reason = translate(lang, `unitQr.reason.${payload.reason ?? "help"}`, String(payload.reason ?? ""));
      await notifyOutlet(req.outletId, "customer_request", "requestCall", { unit, reason: payload.note ? `${reason} — ${payload.note}` : reason }, opts);
    }
  });
}

/** Booking online/WhatsApp baru (bukan input kasir). */
export async function notifyNewBooking(booking: { outletId: string; customerName: string | null; scheduledStart: string; id: string }, waitlisted: boolean) {
  await safe("booking", async () => {
    const when = new Date(booking.scheduledStart).toLocaleString("id-ID", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
    await notifyOutlet(booking.outletId, "booking", waitlisted ? "bookingWaitlist" : "booking", { customer: booking.customerName ?? "", when }, { url: "/dashboard/booking", tag: `booking-${booking.id}` });
  });
}

/** Pembayaran non-tunai yang dikonfirmasi gateway (QRIS/VA/e-wallet via webhook). */
export async function notifyPaymentReceived(payment: { id: string; orderId: string; method: string; amount: number }) {
  await safe("payment", async () => {
    const [order] = await db.select({ outletId: orders.outletId }).from(orders).where(eq(orders.id, payment.orderId)).limit(1);
    if (!order) return;
    const method = payment.method?.toLowerCase().includes("qris") ? "QRIS" : String(payment.method ?? "").replace(/_/g, " ").toUpperCase();
    await notifyOutlet(order.outletId, "payment", "payment", { method, amount: formatIdr(payment.amount) }, { url: "/dashboard/transactions", tag: `payment-${payment.id}` });
  });
}

/** Tutup shift: ringkasan omzet (pimpinan) + peringatan anti-fraud bila shift ditandai. */
export async function notifyShiftClosed(input: {
  outletId: string;
  shiftId: string;
  staffUserId: string;
  variance: number | null;
  ordersCount: number;
  incomeTotal: number;
  riskFlags: { label: string }[];
}) {
  await safe("shift", async () => {
    const [staff] = await db.select({ name: staffUsers.name }).from(staffUsers).where(eq(staffUsers.id, input.staffUserId)).limit(1);
    const name = staff?.name ?? "Kasir";
    const v = input.variance ?? 0;
    await notifyOutlet(
      input.outletId,
      "shift_summary",
      "shiftSummary",
      { staff: name, income: formatIdr(input.incomeTotal), orders: input.ordersCount, variance: `${v < 0 ? "-" : v > 0 ? "+" : ""}${formatIdr(Math.abs(v))}` },
      { url: "/dashboard/shift", tag: `shift-${input.shiftId}` }
    );
    if (input.riskFlags.length) {
      await notifyOutlet(input.outletId, "fraud", "fraud", { staff: name, flags: input.riskFlags.map((f) => f.label).join(" · ") }, { url: "/dashboard/shift", tag: `shift-risk-${input.shiftId}` });
    }
  });
}

let lastLowStockRun = 0;
/** Scheduler (paling sering tiap 2 menit): produk yang baru turun ke/di bawah ambang → push sekali. */
export async function runLowStockPush(outletId?: string): Promise<number> {
  if (Date.now() - lastLowStockRun < 2 * MINUTE) return 0;
  lastLowStockRun = Date.now();
  const r = await safe("lowStock", async () => {
    const scope = outletId ? eq(products.outletId, outletId) : sql`true`;
    // Stok sudah naik lagi → reset penanda supaya penurunan berikutnya diberi tahu lagi.
    await db
      .update(products)
      .set({ lowStockNotifiedAt: null })
      .where(and(scope, isNotNull(products.lowStockNotifiedAt), sql`${products.stockQty} > ${products.lowStockThreshold}`));
    const low = await db
      .select({ id: products.id, outletId: products.outletId, name: products.name, qty: products.stockQty, unit: products.unit })
      .from(products)
      .where(and(scope, eq(products.isActive, true), isNull(products.lowStockNotifiedAt), sql`${products.lowStockThreshold} > 0`, sql`${products.stockQty} <= ${products.lowStockThreshold}`))
      .limit(200);
    if (!low.length) return 0;
    // Hormati setelan outlet "Notifikasi stok menipis".
    const outletRows = await db.select({ id: outlets.id, on: outlets.notifyLowStock }).from(outlets).where(inArray(outlets.id, [...new Set(low.map((p) => p.outletId))]));
    const enabled = new Set(outletRows.filter((o) => o.on).map((o) => o.id));
    // Semua ditandai; push dibatasi 3 produk per outlet per putaran (mis. saat pertama kali aktif,
    // banyak produk yang sudah lama menipis — jangan sampai HP dibanjiri notifikasi).
    let sent = 0;
    const perOutlet = new Map<string, number>();
    await db.update(products).set({ lowStockNotifiedAt: new Date().toISOString() }).where(inArray(products.id, low.map((p) => p.id)));
    for (const p of low) {
      if (!enabled.has(p.outletId)) continue;
      const n = perOutlet.get(p.outletId) ?? 0;
      if (n >= 3) continue;
      perOutlet.set(p.outletId, n + 1);
      await notifyOutlet(p.outletId, "low_stock", "lowStock", { product: p.name, qty: p.qty, uom: p.unit }, { url: "/dashboard/inventory", tag: `stock-${p.id}` });
      sent++;
    }
    return sent;
  });
  return r ?? 0;
}
