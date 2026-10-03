import { randomBytes } from "crypto";
import { and, desc, eq, inArray, gte } from "drizzle-orm";
import { db } from "@/db/client";
import { orders, orderItems, outlets, products, rentalSessions, rentalUnits, unitCustomerRequests } from "@/db/schema";
import { getOrCreateTvSettings, lastFinishedSessionWithBill } from "@/lib/tv/service";
import { computeUnitView, type TvUnitView } from "@/lib/tv/view";
import { getLiveBillingBoard } from "@/lib/rental/board";
import { addItemsToBill, getOpenBillForSession } from "@/lib/pos/bill";
import { extendRentalSession } from "@/lib/rental/sessions";
import {
  canSubmitRequest,
  generateQrToken,
  isPlausibleToken,
  isTimeUpActive,
  validateRequestPayload,
  type CallPayload,
  type ExtendPayload,
  type OrderPayload,
  type UnitRequestType,
} from "./rules";

/**
 * QR Pelanggan per bilik (lihat rules.ts untuk aturan murninya).
 *
 * Batas data yang dikirim ke HP pelanggan disengaja: nama unit/outlet, status & sisa waktu, perkiraan
 * tagihan berjalan sesi YANG SEDANG di unit itu, dan menu. TIDAK ada nama/telepon pelanggan, tidak
 * ada data sesi lain. Halaman ini hanya bermodal token di stiker QR — orang yang memegangnya memang
 * sedang duduk di bilik itu.
 */

const PRODUCT_EXCLUDED_CATEGORIES = new Set(["device_rental"]);

function newToken(): string {
  return generateQrToken((n) => new Uint8Array(randomBytes(n)));
}

/** Token QR unit (dibuat bila belum ada). Hanya untuk staf — outletId dari sesi login. */
export async function ensureUnitQrToken(outletId: string, unitId: string, rotate = false): Promise<string> {
  const [unit] = await db
    .select({ id: rentalUnits.id, outletId: rentalUnits.outletId, token: rentalUnits.customerQrToken })
    .from(rentalUnits)
    .where(eq(rentalUnits.id, unitId))
    .limit(1);
  if (!unit || unit.outletId !== outletId) throw new Error("Unit tidak ditemukan.");
  if (unit.token && !rotate) return unit.token;
  const token = newToken();
  await db.update(rentalUnits).set({ customerQrToken: token }).where(eq(rentalUnits.id, unitId));
  return token;
}

async function loadUnitByToken(token: string) {
  if (!isPlausibleToken(token)) return null;
  const [unit] = await db.select().from(rentalUnits).where(eq(rentalUnits.customerQrToken, token)).limit(1);
  if (!unit || unit.isActive === false) return null;
  return unit;
}

async function activeSessionOf(unitId: string) {
  const [s] = await db
    .select()
    .from(rentalSessions)
    .where(and(eq(rentalSessions.rentalUnitId, unitId), inArray(rentalSessions.status, ["running", "paused"])))
    .limit(1);
  return s ?? null;
}

export interface PublicUnitState {
  outletName: string;
  logoUrl: string | null;
  lang: string;
  country: string | null;
  bookingPath: string | null;
  unitName: string;
  consoleType: string;
  hourlyRate: number;
  view: TvUnitView;
  hasActiveSession: boolean;
  /** Perkiraan tagihan berjalan sesi aktif (rental + aksesoris + F&B). null bila tidak ada sesi. */
  runningTotal: number | null;
  fnbItems: { description: string; qty: number; lineTotal: number }[];
  /** Waktu habis & tagihan belum dibayar (lihat isTimeUpActive). */
  timeUp: { active: boolean; billTotal: number | null };
  orderEnabled: boolean;
  extendEnabled: boolean;
  /** Permintaan dari unit ini selama sesi aktif / 2 jam terakhir. */
  requests: { id: string; type: UnitRequestType; status: string; createdAt: string; summary: string; rejectReason: string | null }[];
  serverTime: string;
}

function summarize(type: UnitRequestType, payload: string, productNames: Map<string, string>): string {
  try {
    const p = JSON.parse(payload);
    if (type === "order_fnb") return (p.items ?? []).map((i: { productId: string; qty: number }) => `${i.qty}× ${productNames.get(i.productId) ?? "Menu"}`).join(", ");
    if (type === "extend_time") return `+${p.minutes} menit`;
    return p.note ? `${p.reason}: ${p.note}` : p.reason;
  } catch {
    return "";
  }
}

export async function getPublicUnitState(token: string): Promise<PublicUnitState | null> {
  const unit = await loadUnitByToken(token);
  if (!unit) return null;
  const now = new Date();
  const [outlet] = await db
    .select({ name: outlets.name, logoUrl: outlets.logoUrl, slug: outlets.slug, lang: outlets.preferredLang, country: outlets.outletCountry })
    .from(outlets)
    .where(eq(outlets.id, unit.outletId))
    .limit(1);
  const settings = await getOrCreateTvSettings(unit.outletId);
  const session = await activeSessionOf(unit.id);

  const view = computeUnitView(
    unit.status,
    session
      ? {
          status: session.status as "running" | "paused",
          startedAt: session.startedAt,
          accumulatedPauseMs: session.accumulatedPauseMs,
          pausedAt: session.pausedAt,
          plannedMinutes: session.plannedMinutes,
          extendedMinutes: session.extendedMinutes,
        }
      : null,
    now.getTime(),
  );

  let runningTotal: number | null = null;
  let fnbItems: PublicUnitState["fnbItems"] = [];
  if (session) {
    const board = await getLiveBillingBoard(unit.outletId);
    const row = board.find((r) => r.sessionId === session.id);
    runningTotal = row ? row.runningTotal : null;
    if (row?.billId) {
      fnbItems = (
        await db
          .select({ description: orderItems.description, qty: orderItems.qty, lineTotal: orderItems.lineTotal, itemType: orderItems.itemType })
          .from(orderItems)
          .where(eq(orderItems.orderId, row.billId))
      )
        .filter((i) => i.itemType === "product")
        .map(({ description, qty, lineTotal }) => ({ description, qty, lineTotal }));
    }
  }

  const finished = session ? null : await lastFinishedSessionWithBill(unit.id);
  const timeUpActive = finished ? isTimeUpActive(finished.last, finished.billOpen, false, now.getTime()) : false;

  // Riwayat permintaan: sejak sesi aktif dimulai, atau 2 jam terakhir bila tidak ada sesi.
  const since = session ? session.startedAt : new Date(now.getTime() - 2 * 3600_000).toISOString();
  const reqRows = await db
    .select()
    .from(unitCustomerRequests)
    .where(and(eq(unitCustomerRequests.rentalUnitId, unit.id), gte(unitCustomerRequests.createdAt, since)))
    .orderBy(desc(unitCustomerRequests.createdAt))
    .limit(20);
  const productIds = new Set<string>();
  for (const r of reqRows) {
    if (r.type !== "order_fnb") continue;
    try {
      for (const it of JSON.parse(r.payload).items ?? []) productIds.add(it.productId);
    } catch {
      /* abaikan payload rusak */
    }
  }
  const names = productIds.size
    ? new Map((await db.select({ id: products.id, name: products.name }).from(products).where(inArray(products.id, [...productIds]))).map((p) => [p.id, p.name]))
    : new Map<string, string>();

  return {
    outletName: outlet?.name ?? "Outlet",
    logoUrl: outlet?.logoUrl ?? null,
    lang: outlet?.lang ?? "id",
    country: outlet?.country ?? null,
    bookingPath: outlet?.slug ? `/book/${outlet.slug}` : null,
    unitName: unit.name,
    consoleType: unit.consoleType,
    hourlyRate: unit.hourlyRate,
    view,
    hasActiveSession: !!session,
    runningTotal,
    fnbItems,
    timeUp: { active: timeUpActive, billTotal: timeUpActive ? finished?.billTotal ?? null : null },
    orderEnabled: settings.unitQrOrderEnabled,
    extendEnabled: settings.unitQrExtendEnabled,
    requests: reqRows.map((r) => ({
      id: r.id,
      type: r.type as UnitRequestType,
      status: r.status,
      createdAt: r.createdAt,
      summary: summarize(r.type as UnitRequestType, r.payload, names),
      rejectReason: r.rejectReason,
    })),
    serverTime: now.toISOString(),
  };
}

export interface PublicMenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  soldOut: boolean;
}

/** Menu F&B untuk HP pelanggan: produk aktif berharga > 0, tanpa kategori sewa perangkat. */
export async function getPublicMenu(token: string): Promise<PublicMenuItem[] | null> {
  const unit = await loadUnitByToken(token);
  if (!unit) return null;
  const rows = await db
    .select({ id: products.id, name: products.name, category: products.category, price: products.price, stockQty: products.stockQty, isActive: products.isActive })
    .from(products)
    .where(and(eq(products.outletId, unit.outletId), eq(products.isActive, true)));
  return rows
    .filter((p) => p.price > 0 && !PRODUCT_EXCLUDED_CATEGORIES.has(p.category))
    .map((p) => ({ id: p.id, name: p.name, category: p.category, price: p.price, soldOut: false }))
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

/** Membuat permintaan dari HP pelanggan (sudah divalidasi & dibatasi). */
export async function submitPublicRequest(token: string, type: UnitRequestType, rawPayload: unknown): Promise<{ id: string }> {
  const unit = await loadUnitByToken(token);
  if (!unit) throw new Error("QR tidak dikenal atau sudah diganti. Minta QR terbaru ke kasir.");
  const valid = validateRequestPayload(type, rawPayload);
  if (!valid.ok) throw new Error(valid.error);

  const settings = await getOrCreateTvSettings(unit.outletId);
  const session = await activeSessionOf(unit.id);

  const recent = await db
    .select({ type: unitCustomerRequests.type, status: unitCustomerRequests.status, createdAt: unitCustomerRequests.createdAt })
    .from(unitCustomerRequests)
    .where(and(eq(unitCustomerRequests.rentalUnitId, unit.id), gte(unitCustomerRequests.createdAt, new Date(Date.now() - 6 * 3600_000).toISOString())))
    .orderBy(desc(unitCustomerRequests.createdAt))
    .limit(50);
  const lastSame = recent.find((r) => r.type === type);
  const check = canSubmitRequest({
    type,
    hasActiveSession: !!session,
    orderEnabled: settings.unitQrOrderEnabled,
    extendEnabled: settings.unitQrExtendEnabled,
    pendingCount: recent.filter((r) => r.status === "pending").length,
    secondsSinceLastSameType: lastSame ? (Date.now() - new Date(lastSame.createdAt).getTime()) / 1000 : null,
  });
  if (!check.ok) throw new Error(check.error);

  if (type === "order_fnb") {
    // Produk harus milik outlet ini, aktif, dan bukan kategori sewa perangkat.
    const ids = (valid.value as OrderPayload).items.map((i) => i.productId);
    const rows = await db
      .select({ id: products.id, outletId: products.outletId, isActive: products.isActive, category: products.category, price: products.price })
      .from(products)
      .where(inArray(products.id, ids));
    const ok = new Set(rows.filter((p) => p.outletId === unit.outletId && p.isActive && p.price > 0 && !PRODUCT_EXCLUDED_CATEGORIES.has(p.category)).map((p) => p.id));
    if (ids.some((id) => !ok.has(id))) throw new Error("Ada menu yang sudah tidak tersedia. Muat ulang halaman lalu pesan lagi.");
  }

  const [row] = await db
    .insert(unitCustomerRequests)
    .values({
      outletId: unit.outletId,
      rentalUnitId: unit.id,
      rentalSessionId: session?.id ?? null,
      type,
      payload: JSON.stringify(valid.value),
    })
    .returning({ id: unitCustomerRequests.id });
  return row;
}

/** ---------------- SISI KASIR ---------------- */

export interface StaffRequestRow {
  id: string;
  type: UnitRequestType;
  status: string;
  createdAt: string;
  handledAt: string | null;
  handledByName: string | null;
  rejectReason: string | null;
  unitId: string;
  unitName: string;
  sessionId: string | null;
  sessionActive: boolean;
  /** Ringkasan siap tampil; untuk F&B termasuk harga saat ini. */
  summary: string;
  items: { productId: string; name: string; qty: number; price: number }[];
  minutes: number | null;
  reason: string | null;
  note: string | null;
}

export async function listStaffRequests(outletId: string): Promise<StaffRequestRow[]> {
  const since = new Date(Date.now() - 12 * 3600_000).toISOString();
  const rows = await db
    .select()
    .from(unitCustomerRequests)
    .where(and(eq(unitCustomerRequests.outletId, outletId), gte(unitCustomerRequests.createdAt, since)))
    .orderBy(desc(unitCustomerRequests.createdAt))
    .limit(60);
  if (rows.length === 0) return [];

  const unitIds = [...new Set(rows.map((r) => r.rentalUnitId))];
  const units = new Map((await db.select({ id: rentalUnits.id, name: rentalUnits.name }).from(rentalUnits).where(inArray(rentalUnits.id, unitIds))).map((u) => [u.id, u.name]));
  const sessionIds = [...new Set(rows.map((r) => r.rentalSessionId).filter((v): v is string => !!v))];
  const activeSessions = new Set(
    sessionIds.length
      ? (await db.select({ id: rentalSessions.id, status: rentalSessions.status }).from(rentalSessions).where(inArray(rentalSessions.id, sessionIds)))
          .filter((s) => s.status === "running" || s.status === "paused")
          .map((s) => s.id)
      : [],
  );
  const productIds = new Set<string>();
  const parsed = rows.map((r) => {
    let p: Record<string, unknown> = {};
    try {
      p = JSON.parse(r.payload);
    } catch {
      /* payload rusak → kosong */
    }
    if (r.type === "order_fnb") for (const it of (p.items as { productId: string }[]) ?? []) productIds.add(it.productId);
    return p;
  });
  const prodMap = productIds.size
    ? new Map((await db.select({ id: products.id, name: products.name, price: products.price }).from(products).where(inArray(products.id, [...productIds]))).map((p) => [p.id, p]))
    : new Map<string, { id: string; name: string; price: number }>();

  return rows.map((r, idx) => {
    const p = parsed[idx];
    const type = r.type as UnitRequestType;
    const items =
      type === "order_fnb"
        ? ((p.items as { productId: string; qty: number }[]) ?? []).map((i) => ({
            productId: i.productId,
            name: prodMap.get(i.productId)?.name ?? "Menu dihapus",
            qty: i.qty,
            price: prodMap.get(i.productId)?.price ?? 0,
          }))
        : [];
    return {
      id: r.id,
      type,
      status: r.status,
      createdAt: r.createdAt,
      handledAt: r.handledAt,
      handledByName: r.handledByName,
      rejectReason: r.rejectReason,
      unitId: r.rentalUnitId,
      unitName: units.get(r.rentalUnitId) ?? "Unit",
      sessionId: r.rentalSessionId,
      sessionActive: r.rentalSessionId ? activeSessions.has(r.rentalSessionId) : false,
      summary:
        type === "order_fnb"
          ? items.map((i) => `${i.qty}× ${i.name}`).join(", ")
          : type === "extend_time"
            ? `+${(p as ExtendPayload).minutes} menit`
            : [(p as CallPayload).reason, (p as CallPayload).note].filter(Boolean).join(" — "),
      items,
      minutes: type === "extend_time" ? Number((p as ExtendPayload).minutes) || null : null,
      reason: type === "call_staff" ? ((p as CallPayload).reason ?? null) : null,
      note: type === "call_staff" ? ((p as CallPayload).note ?? null) : null,
    };
  });
}

export type StaffAction = "accept" | "reject" | "done";

/**
 * Kasir menanggapi permintaan.
 *  - accept order_fnb  → item ditambahkan ke tagihan sesi (harga dibaca ULANG dari database), masuk Kitchen Display.
 *  - accept extend_time → waktu sesi ditambah.
 *  - call_staff         → cukup ditandai selesai.
 * Status diklaim dulu (pending → accepted) dengan WHERE status='pending' supaya dua kasir yang
 * menekan bersamaan tidak menambahkan pesanan dua kali.
 */
export async function handleStaffRequest(
  outletId: string,
  requestId: string,
  action: StaffAction,
  staff: { id: string; name: string },
  rejectReason?: string,
): Promise<void> {
  const [req] = await db.select().from(unitCustomerRequests).where(eq(unitCustomerRequests.id, requestId)).limit(1);
  if (!req || req.outletId !== outletId) throw new Error("Permintaan tidak ditemukan.");
  if (req.status !== "pending") throw new Error("Permintaan ini sudah ditanggapi.");

  const nowIso = new Date().toISOString();
  const nextStatus = action === "reject" ? "rejected" : action === "done" || req.type === "call_staff" ? "done" : "accepted";
  const claimed = await db
    .update(unitCustomerRequests)
    .set({
      status: nextStatus,
      handledAt: nowIso,
      handledBy: staff.id,
      handledByName: staff.name,
      rejectReason: action === "reject" ? (rejectReason ?? "").trim().slice(0, 140) || null : null,
      updatedAt: nowIso,
    })
    .where(and(eq(unitCustomerRequests.id, requestId), eq(unitCustomerRequests.status, "pending")))
    .returning({ id: unitCustomerRequests.id });
  if (claimed.length === 0) throw new Error("Permintaan ini sudah ditanggapi.");
  if (action !== "accept" || req.type === "call_staff") return;

  const revert = async () => {
    await db
      .update(unitCustomerRequests)
      .set({ status: "pending", handledAt: null, handledBy: null, handledByName: null, updatedAt: new Date().toISOString() })
      .where(eq(unitCustomerRequests.id, requestId));
  };

  try {
    if (!req.rentalSessionId) throw new Error("Permintaan ini tidak terhubung ke sesi mana pun.");
    const [session] = await db.select().from(rentalSessions).where(eq(rentalSessions.id, req.rentalSessionId)).limit(1);
    if (!session || session.outletId !== outletId) throw new Error("Sesi tidak ditemukan.");
    const payload = JSON.parse(req.payload);

    if (req.type === "extend_time") {
      if (session.status !== "running" && session.status !== "paused") throw new Error("Sesi sudah selesai — mulai sesi baru di Rental PS.");
      const minutes = Number(payload.minutes);
      if (!Number.isFinite(minutes) || minutes <= 0) throw new Error("Durasi tidak sah.");
      await extendRentalSession(session.id, minutes);
      return;
    }

    // order_fnb
    const bill = await getOpenBillForSession(session.id);
    if (!bill) throw new Error("Tagihan sesi ini sudah ditutup — catat pesanan lewat Kasir.");
    const items = (payload.items ?? []) as { productId: string; qty: number }[];
    const prodRows = await db
      .select({ id: products.id, name: products.name, price: products.price, outletId: products.outletId, isActive: products.isActive })
      .from(products)
      .where(inArray(products.id, items.map((i) => i.productId)));
    const prodMap = new Map(prodRows.filter((p) => p.outletId === outletId && p.isActive).map((p) => [p.id, p]));
    const lines = items
      .filter((i) => prodMap.has(i.productId) && i.qty > 0)
      .map((i) => ({ productId: i.productId, description: prodMap.get(i.productId)!.name, qty: i.qty, unitPrice: prodMap.get(i.productId)!.price }));
    if (lines.length === 0) throw new Error("Semua menu di pesanan ini sudah tidak tersedia.");
    await addItemsToBill(bill.id, lines, staff.id);
  } catch (err) {
    await revert();
    throw err;
  }
}

/** Jumlah permintaan menunggu per outlet — untuk lencana. */
export async function countPendingRequests(outletId: string): Promise<number> {
  const rows = await db
    .select({ id: unitCustomerRequests.id })
    .from(unitCustomerRequests)
    .where(and(eq(unitCustomerRequests.outletId, outletId), eq(unitCustomerRequests.status, "pending")));
  return rows.length;
}
