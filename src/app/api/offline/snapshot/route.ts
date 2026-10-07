import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { orderItems, orders, outlets, payments, pricingRules, products, promos, rentalDurationPresets, rentalSessions, rentalUnits } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import type { OfflineSnapshot } from "@/lib/offline/engine";

/**
 * Data yang disimpan perangkat kasir untuk Mode Offline (lib/offline/store.ts): unit, sesi aktif
 * (beserta F&B dan DP yang sudah ada di tagihannya), aturan tarif, paket, durasi, dan produk.
 * Diambil berkala selama online, supaya saat internet putus papan kasir offline bisa langsung
 * dipakai dengan tarif dan harga yang sama dengan server.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const outletId = session.outletId;

    const [outlet] = await db.select().from(outlets).where(eq(outlets.id, outletId)).limit(1);
    if (!outlet) return NextResponse.json({ error: "Outlet tidak ditemukan." }, { status: 404 });

    const [unitRows, sessionRows, ruleRows, promoRows, presetRows, productRows] = await Promise.all([
      db.select().from(rentalUnits).where(and(eq(rentalUnits.outletId, outletId), eq(rentalUnits.isActive, true))),
      db.select().from(rentalSessions).where(and(eq(rentalSessions.outletId, outletId), inArray(rentalSessions.status, ["running", "paused"]))),
      db.select().from(pricingRules).where(and(eq(pricingRules.outletId, outletId), eq(pricingRules.isActive, true))),
      db.select().from(promos).where(and(eq(promos.outletId, outletId), eq(promos.isActive, true), eq(promos.type, "rental_package"))),
      db.select().from(rentalDurationPresets).where(and(eq(rentalDurationPresets.outletId, outletId), eq(rentalDurationPresets.isActive, true))),
      db.select().from(products).where(and(eq(products.outletId, outletId), eq(products.isActive, true))),
    ]);

    // F&B already on each active session's open bill + money already received (DP), so the
    // offline estimate at "Stop" = rental charge + these items − what was already paid.
    const sessionIds = sessionRows.map((s) => s.id);
    const billRows = sessionIds.length
      ? await db.select().from(orders).where(and(inArray(orders.rentalSessionId, sessionIds), eq(orders.status, "open")))
      : [];
    const billIds = billRows.map((b) => b.id);
    const [itemRows, paymentRows] = billIds.length
      ? await Promise.all([
          db.select().from(orderItems).where(inArray(orderItems.orderId, billIds)),
          db.select().from(payments).where(and(inArray(payments.orderId, billIds), eq(payments.status, "success"))),
        ])
      : [[], []];
    const bills: OfflineSnapshot["bills"] = {};
    for (const b of billRows) {
      if (!b.rentalSessionId) continue;
      const items = itemRows.filter((i) => i.orderId === b.id && i.itemType !== "rental" && i.kitchenStatus !== "cancelled");
      bills[b.rentalSessionId] = {
        items: items.map((i) => ({ description: i.description, qty: i.qty, lineTotal: i.lineTotal })),
        paidTotal: paymentRows.filter((p) => p.orderId === b.id).reduce((s, p) => s + p.amount, 0),
      };
    }

    const snapshot: OfflineSnapshot = {
      version: 1,
      serverTime: new Date().toISOString(),
      outlet: { id: outlet.id, name: outlet.name, billingRoundingMinutes: outlet.billingRoundingMinutes ?? 1 },
      staff: { id: session.sub, name: session.name },
      units: unitRows.map((u) => ({ id: u.id, name: u.name, consoleType: u.consoleType, hourlyRate: u.hourlyRate, status: u.status, hasDevice: !!u.deviceId })),
      sessions: sessionRows.map((s) => ({
        id: s.id,
        rentalUnitId: s.rentalUnitId,
        customerName: s.customerName,
        startedAt: s.startedAt,
        status: s.status as "running" | "paused",
        pausedAt: s.pausedAt,
        accumulatedPauseMs: s.accumulatedPauseMs,
        plannedMinutes: s.plannedMinutes,
        extendedMinutes: s.extendedMinutes,
        ratePerHour: s.ratePerHour,
        promoId: s.promoId,
        promoPackagePrice: s.promoPackagePrice,
        discountAmount: s.discountAmount,
      })),
      pricingRules: ruleRows.map((r) => ({
        name: r.name,
        consoleType: r.consoleType,
        daysOfWeek: r.daysOfWeek,
        startTime: r.startTime,
        endTime: r.endTime,
        rateType: r.rateType,
        rateValue: r.rateValue,
        priority: r.priority,
      })),
      promos: promoRows
        .filter((p) => p.durationMinutes)
        .map((p) => ({ id: p.id, name: p.name, consoleType: p.consoleType ?? "any", durationMinutes: p.durationMinutes!, packagePrice: p.packagePrice ?? 0 })),
      durationPresets: presetRows.map((d) => ({ minutes: d.minutes, label: d.label })).sort((a, b) => a.minutes - b.minutes),
      products: productRows.map((p) => ({ id: p.id, name: p.name, price: p.price, category: p.category ?? null })),
      bills,
    };
    return NextResponse.json(snapshot, { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
