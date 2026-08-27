import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { paymentMethods } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getActivePaymentMethods, slugifyMethodKey } from "@/lib/payments/methods";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { invalidatePaymentFeeCache } from "@/lib/accounting/payment-fee";

/** Clamped 0-100, defaults to 0 (no fee) for any unparsable input — never lets a bad body value silently become NaN in the DB. */
function toFeePercent(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, 100);
}

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    // Always the caller's own outlet — never trust a client-supplied outletId here.
    const rows = await getActivePaymentMethods(session.outletId);
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/**
 * Upsert: pass `id` to edit (label/kind/isActive/sortOrder only — `key` is
 * permanent once created, since it's what's stored on historical payments/
 * other_incomes rows forever). Omit `id` to create a new method — the key is
 * auto-derived from the label and de-duped against existing keys for this outlet.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengatur metode pembayaran." }, { status: 403 });
    }

    const body = await req.json();
    if (!body.label?.trim()) return NextResponse.json({ error: "Nama metode wajib diisi." }, { status: 400 });
    const kind = ["cash", "balance_tracked", "info_only"].includes(body.kind) ? body.kind : "info_only";
    const feePercent = toFeePercent(body.feePercent);

    if (body.id) {
      const [existing] = await db.select().from(paymentMethods).where(eq(paymentMethods.id, body.id)).limit(1);
      // 404 (not 403) if it's missing OR belongs to a different outlet — never trust body.outletId for scoping.
      if (!existing || existing.outletId !== session.outletId) return NextResponse.json({ error: "Metode pembayaran tidak ditemukan." }, { status: 404 });
      // A single "cash" channel is load-bearing (shift denomination count assumes it exists, checkout pickers default to it) — don't let it be reclassified or hidden.
      const nextKind = existing.kind === "cash" ? "cash" : kind;
      const nextActive = existing.kind === "cash" ? true : (body.isActive ?? true);
      const [updated] = await db
        .update(paymentMethods)
        .set({
          label: body.label.trim(),
          kind: nextKind,
          isActive: nextActive,
          feePercent,
          sortOrder: Number.isFinite(body.sortOrder) ? Number(body.sortOrder) : existing.sortOrder,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(paymentMethods.id, body.id))
        .returning();
      invalidatePaymentFeeCache(session.outletId);
      return NextResponse.json(updated);
    }

    // Always the caller's own outlet — never trust a client-supplied outletId here.
    const siblings = await db.select().from(paymentMethods).where(eq(paymentMethods.outletId, session.outletId));
    const existingKeys = new Set(siblings.map((m) => m.key));
    let key = slugifyMethodKey(body.label);
    let suffix = 2;
    while (existingKeys.has(key)) {
      key = `${slugifyMethodKey(body.label)}_${suffix}`;
      suffix++;
    }
    const maxOrder = siblings.reduce((m, s) => Math.max(m, s.sortOrder), -1);

    const [created] = await db
      .insert(paymentMethods)
      .values({
        outletId: session.outletId,
        key,
        label: body.label.trim(),
        kind: kind === "cash" ? "info_only" : kind, // never let a fresh custom row claim the load-bearing "cash" kind
        isActive: body.isActive ?? true,
        feePercent,
        sortOrder: maxOrder + 1,
      })
      .returning();
    return NextResponse.json(created);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
