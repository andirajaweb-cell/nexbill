import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, type DbOrTx } from "@/db/client";
import { customers, customerTimeCredits, orders, rentalSessions, timeCreditTransactions } from "@/db/schema";
import { postJournal } from "@/lib/accounting/journal";
import { getMappedAccountId } from "@/lib/accounting/account-mapping";
import { getAccountIdByCode, invalidateAccountCache, seedChartOfAccounts } from "@/lib/accounting/coa";
import {
  allowedSessionMinutes,
  creditUseValue,
  leftoverMinutes,
  leftoverValue,
  TIME_CREDIT_MIN_SAVE_MINUTES,
  validateCreditUse,
  type CreditBalance,
} from "./time-credit-core";

/**
 * Saldo waktu member — bagian yang menyentuh database. Aturan & rumus ada di time-credit-core.ts.
 *
 * Akuntansi (tanpa uang masuk/keluar):
 *   SIMPAN  Dr Pendapatan Rental Member (mapping rental/member, bawaan 4180)  Cr 2134 Pendapatan Diterima di Muka
 *   PAKAI   Dr 2134                                                           Cr Pendapatan Rental Member
 * Kedua jurnal memakai sourceId = id tagihan (order) sesinya, sehingga void/refund tagihan itu ikut
 * membalik jurnalnya (lib/pos/void.ts, refund.ts) — saldo menitnya dibalik oleh reverseTimeCreditsForOrder.
 *
 * Tabel dari migrasi 0035. Sebelum migrasi dijalankan semua fungsi baca mengembalikan kosong
 * (migrationMissing) dan fitur ini tidak tampil — sesi rental tetap berjalan normal.
 */

const UNEARNED_REVENUE_CODE = "2134";

export function isTimeCreditTableMissing(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string }; message?: string };
  return e?.code === "42P01" || e?.cause?.code === "42P01" || /customer_time_credits|time_credit_transactions/i.test(e?.message ?? "");
}

async function memberRevenueAccountId(outletId: string, dbc: DbOrTx) {
  return getMappedAccountId(outletId, "rental", "member", "4180", dbc);
}

/** Outlet lama mungkin belum punya akun 2134 — seed COA (idempoten) sebelum transaksi dimulai. */
async function ensureUnearnedAccount(outletId: string) {
  try {
    await getAccountIdByCode(outletId, UNEARNED_REVENUE_CODE);
  } catch {
    await seedChartOfAccounts(outletId);
    invalidateAccountCache(outletId);
  }
}

export async function getTimeCredit(customerId: string, dbc: DbOrTx = db): Promise<CreditBalance & { migrationMissing?: boolean }> {
  try {
    const [row] = await dbc.select().from(customerTimeCredits).where(eq(customerTimeCredits.customerId, customerId)).limit(1);
    return { minutes: row?.minutes ?? 0, value: row?.value ?? 0 };
  } catch (err) {
    if (isTimeCreditTableMissing(err)) return { minutes: 0, value: 0, migrationMissing: true };
    throw err;
  }
}

export async function listTimeCreditHistory(customerId: string, limit = 30) {
  try {
    return await db
      .select()
      .from(timeCreditTransactions)
      .where(eq(timeCreditTransactions.customerId, customerId))
      .orderBy(desc(timeCreditTransactions.createdAt))
      .limit(limit);
  } catch (err) {
    if (isTimeCreditTableMissing(err)) return [];
    throw err;
  }
}

/** Menit saldo yang dipakai per sesi (untuk estimasi tagihan berjalan & saat sesi selesai). */
export async function creditMinutesForSessions(sessionIds: string[], dbc: DbOrTx = db): Promise<Map<string, { minutes: number; value: number }>> {
  const out = new Map<string, { minutes: number; value: number }>();
  if (!sessionIds.length) return out;
  try {
    const rows = await dbc
      .select({ sessionId: timeCreditTransactions.rentalSessionId, type: timeCreditTransactions.type, minutes: timeCreditTransactions.minutes, value: timeCreditTransactions.value })
      .from(timeCreditTransactions)
      .where(and(inArray(timeCreditTransactions.rentalSessionId, sessionIds), inArray(timeCreditTransactions.type, ["use", "refund"])));
    for (const r of rows) {
      if (!r.sessionId) continue;
      const cur = out.get(r.sessionId) ?? { minutes: 0, value: 0 };
      const sign = r.type === "use" ? 1 : -1;
      cur.minutes += sign * r.minutes;
      cur.value += sign * r.value;
      out.set(r.sessionId, cur);
    }
    for (const [k, v] of out) if (v.minutes <= 0) out.delete(k);
  } catch (err) {
    if (!isTimeCreditTableMissing(err)) throw err;
  }
  return out;
}

/** Cek sebelum unit diklaim: member, bukan paket promo, saldo cukup. Melempar Error berpesan. */
export async function assertCanUseTimeCredit(params: { outletId: string; customerId: string | null | undefined; minutes: unknown; promo: boolean }) {
  if (!params.minutes) return;
  let isMember = false;
  if (params.customerId) {
    const [c] = await db.select({ outletId: customers.outletId, tier: customers.membershipTierId }).from(customers).where(eq(customers.id, params.customerId)).limit(1);
    isMember = !!c && c.outletId === params.outletId && !!c.tier;
  }
  const balance = params.customerId && isMember ? await getTimeCredit(params.customerId) : null;
  if (balance?.migrationMissing) throw new Error("Fitur saldo waktu belum aktif (pembaruan database belum dijalankan).");
  const msg = validateCreditUse(params.minutes, balance, { promo: params.promo, isMember });
  if (msg) throw new Error(msg);
}

/** Potong saldo secara atomik saat sesi dimulai (dipanggil startRentalSession setelah sesi dibuat). */
export async function useTimeCreditForSession(params: { outletId: string; customerId: string; sessionId: string; minutes: number; staffUserId?: string | null }) {
  return db.transaction(async (tx) => {
    const [bal] = await tx.select().from(customerTimeCredits).where(eq(customerTimeCredits.customerId, params.customerId)).for("update");
    if (!bal || bal.outletId !== params.outletId || bal.minutes < params.minutes) throw new Error(`Saldo waktu member tidak cukup (tersisa ${bal?.minutes ?? 0} menit).`);
    const value = creditUseValue(bal, params.minutes);
    const now = new Date().toISOString();
    await tx
      .update(customerTimeCredits)
      .set({ minutes: bal.minutes - params.minutes, value: Math.max(0, Math.round((bal.value - value) * 100) / 100), updatedAt: now })
      .where(eq(customerTimeCredits.customerId, params.customerId));
    const [row] = await tx
      .insert(timeCreditTransactions)
      .values({ outletId: params.outletId, customerId: params.customerId, rentalSessionId: params.sessionId, type: "use", minutes: params.minutes, value, staffUserId: params.staffUserId ?? null, note: "Dipakai saat mulai sesi" })
      .returning();
    return row;
  });
}

/**
 * Saat sesi selesai: pindahkan nilai saldo yang dipakai dari 2134 ke pendapatan (Dr 2134 / Cr pendapatan
 * member), sourceId = tagihan sesi. Tidak pernah menggagalkan penghentian sesi — galat hanya dicatat.
 */
export async function postTimeCreditUseJournal(session: { id: string; outletId: string; customerId: string | null; staffUserId: string | null }, orderId: string, entryDate: string) {
  try {
    const rows = await db
      .select()
      .from(timeCreditTransactions)
      .where(and(eq(timeCreditTransactions.rentalSessionId, session.id), eq(timeCreditTransactions.type, "use"), sql`${timeCreditTransactions.journalEntryId} is null`));
    const value = Math.round(rows.reduce((s, r) => s + r.value, 0) * 100) / 100;
    if (!rows.length || value <= 0) return;
    await ensureUnearnedAccount(session.outletId);
    const minutes = rows.reduce((s, r) => s + r.minutes, 0);
    await db.transaction(async (tx) => {
      const revenueId = await memberRevenueAccountId(session.outletId, tx);
      const journalId = await postJournal(
        {
          outletId: session.outletId,
          entryDate,
          reference: `TC-USE-${session.id.slice(0, 8)}`,
          description: `Saldo waktu member dipakai: ${minutes} menit`,
          sourceType: "time_credit",
          sourceId: orderId,
          staffUserId: session.staffUserId ?? undefined,
          lines: [
            { accountCode: UNEARNED_REVENUE_CODE, debit: value, description: "Saldo waktu member terpakai" },
            { accountId: revenueId, credit: value, description: "Pendapatan rental dari saldo waktu" },
          ],
        },
        tx
      );
      await tx.update(timeCreditTransactions).set({ journalEntryId: journalId }).where(inArray(timeCreditTransactions.id, rows.map((r) => r.id)));
    });
  } catch (err) {
    if (isTimeCreditTableMissing(err)) return;
    console.error(`Gagal membukukan saldo waktu terpakai untuk sesi ${session.id}:`, err);
  }
}

export interface LeftoverInfo {
  eligible: boolean;
  reason?: "not_member" | "open_session" | "too_short" | "already_saved" | "not_finished" | "bill_cancelled" | "migration_missing";
  minutes: number;
  value: number;
  customerName?: string | null;
}

async function loadLeftoverContext(sessionId: string, dbc: DbOrTx) {
  const [session] = await dbc.select().from(rentalSessions).where(eq(rentalSessions.id, sessionId)).limit(1);
  if (!session) throw new Error("Sesi tidak ditemukan.");
  const [customer] = session.customerId ? await dbc.select().from(customers).where(eq(customers.id, session.customerId)).limit(1) : [];
  const [order] = await dbc.select().from(orders).where(eq(orders.rentalSessionId, session.id)).orderBy(desc(orders.createdAt)).limit(1);
  const saved = await dbc
    .select({ id: timeCreditTransactions.id })
    .from(timeCreditTransactions)
    .where(and(eq(timeCreditTransactions.rentalSessionId, session.id), eq(timeCreditTransactions.type, "save")))
    .limit(1);
  const used = await creditMinutesForSessions([session.id], dbc);
  return { session, customer, order, alreadySaved: saved.length > 0, usedValue: used.get(session.id)?.value ?? 0 };
}

function leftoverOf(ctx: Awaited<ReturnType<typeof loadLeftoverContext>>): LeftoverInfo {
  const { session, customer, order } = ctx;
  const allowed = allowedSessionMinutes(session);
  const minutes = leftoverMinutes(session);
  const value = allowed ? leftoverValue(session.totalAmount ?? 0, ctx.usedValue, allowed, minutes) : 0;
  const base = { minutes, value, customerName: customer?.name ?? session.customerName ?? null };
  if (session.status !== "finished") return { ...base, eligible: false, reason: "not_finished" };
  if (!customer?.membershipTierId) return { ...base, eligible: false, reason: "not_member" };
  if (!allowed) return { ...base, eligible: false, reason: "open_session" };
  if (ctx.alreadySaved) return { ...base, eligible: false, reason: "already_saved" };
  if (order?.status === "cancelled") return { ...base, eligible: false, reason: "bill_cancelled" };
  if (minutes < TIME_CREDIT_MIN_SAVE_MINUTES) return { ...base, eligible: false, reason: "too_short" };
  return { ...base, eligible: true };
}

/** Bisakah sisa sesi ini disimpan, berapa menit & nilainya. */
export async function getSessionLeftover(sessionId: string): Promise<LeftoverInfo> {
  try {
    return leftoverOf(await loadLeftoverContext(sessionId, db));
  } catch (err) {
    if (isTimeCreditTableMissing(err)) return { eligible: false, reason: "migration_missing", minutes: 0, value: 0 };
    throw err;
  }
}

/** Simpan sisa menit sesi ke saldo member + jurnal Dr pendapatan member / Cr 2134. Sekali per sesi. */
export async function saveSessionLeftover(sessionId: string, staffUserId: string | null) {
  const [s] = await db.select({ outletId: rentalSessions.outletId }).from(rentalSessions).where(eq(rentalSessions.id, sessionId)).limit(1);
  if (!s) throw new Error("Sesi tidak ditemukan.");
  await ensureUnearnedAccount(s.outletId);
  return db.transaction(async (tx) => {
    await tx.select({ id: rentalSessions.id }).from(rentalSessions).where(eq(rentalSessions.id, sessionId)).for("update");
    const ctx = await loadLeftoverContext(sessionId, tx);
    const info = leftoverOf(ctx);
    if (!info.eligible) {
      const why: Record<NonNullable<LeftoverInfo["reason"]>, string> = {
        not_member: "Saldo waktu hanya untuk member terdaftar.",
        open_session: "Sesi terbuka (tanpa batas waktu) tidak punya sisa waktu.",
        too_short: `Sisa waktu kurang dari ${TIME_CREDIT_MIN_SAVE_MINUTES} menit.`,
        already_saved: "Sisa waktu sesi ini sudah disimpan.",
        not_finished: "Sesi belum selesai.",
        bill_cancelled: "Tagihan sesi ini sudah dibatalkan.",
        migration_missing: "Fitur saldo waktu belum aktif.",
      };
      throw new Error(why[info.reason ?? "not_finished"]);
    }
    const { session, order } = ctx;
    const customerId = session.customerId!;
    const now = new Date().toISOString();
    let journalEntryId: string | null = null;
    if (info.value > 0) {
      const revenueId = await memberRevenueAccountId(session.outletId, tx);
      journalEntryId = await postJournal(
        {
          outletId: session.outletId,
          reference: `TC-SAVE-${session.id.slice(0, 8)}`,
          description: `Sisa ${info.minutes} menit disimpan ke saldo waktu member${info.customerName ? ` (${info.customerName})` : ""}`,
          sourceType: "time_credit",
          sourceId: order?.id ?? session.id,
          staffUserId: staffUserId ?? undefined,
          lines: [
            { accountId: revenueId, debit: info.value, description: "Sisa waktu sewa disimpan sebagai saldo" },
            { accountCode: UNEARNED_REVENUE_CODE, credit: info.value, description: "Saldo waktu member" },
          ],
        },
        tx
      );
    }
    const [txRow] = await tx
      .insert(timeCreditTransactions)
      .values({ outletId: session.outletId, customerId, rentalSessionId: session.id, type: "save", minutes: info.minutes, value: info.value, journalEntryId, staffUserId, note: "Sisa sesi disimpan" })
      .returning();
    await tx
      .insert(customerTimeCredits)
      .values({ customerId, outletId: session.outletId, minutes: info.minutes, value: info.value, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: customerTimeCredits.customerId,
        set: { minutes: sql`${customerTimeCredits.minutes} + ${info.minutes}`, value: sql`${customerTimeCredits.value} + ${info.value}`, updatedAt: now },
      });
    return { transaction: txRow, ...info };
  });
}

/**
 * Tagihan sesi di-void/refund: jurnal saldo waktunya sudah ikut dibalik (sourceId = order). Di sini
 * menitnya dibalik: simpanan dari sesi itu ditarik lagi, pemakaian dikembalikan ke saldo. Dipanggil di
 * dalam transaksi void SEBELUM jurnal dibalik — melempar Error bila simpanan sudah terpakai.
 */
export async function reverseTimeCreditsForOrder(orderId: string, tx: DbOrTx) {
  const [order] = await tx.select({ rentalSessionId: orders.rentalSessionId }).from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order?.rentalSessionId) return;
  let rows: (typeof timeCreditTransactions.$inferSelect)[];
  try {
    // SAVEPOINT supaya tabel yang belum ada (migrasi 0035 belum dijalankan) tidak membatalkan transaksi void.
    rows = await tx.transaction(async (sp) => sp.select().from(timeCreditTransactions).where(eq(timeCreditTransactions.rentalSessionId, order.rentalSessionId!)));
  } catch (err) {
    if (isTimeCreditTableMissing(err)) return;
    throw err;
  }
  const net = { save: { m: 0, v: 0 }, use: { m: 0, v: 0 } };
  let customerId: string | null = null;
  let outletId: string | null = null;
  for (const r of rows) {
    customerId = r.customerId;
    outletId = r.outletId;
    if (r.type === "save") (net.save.m += r.minutes), (net.save.v += r.value);
    if (r.type === "use") (net.use.m += r.minutes), (net.use.v += r.value);
    if (r.type === "refund") (net.use.m -= r.minutes), (net.use.v -= r.value);
    if (r.type === "reverse") return; // sudah pernah dibalik
  }
  if (!customerId || !outletId || (net.save.m <= 0 && net.use.m <= 0)) return;
  const deltaMinutes = net.use.m - net.save.m;
  const deltaValue = Math.round((net.use.v - net.save.v) * 100) / 100;
  const [bal] = await tx.select().from(customerTimeCredits).where(eq(customerTimeCredits.customerId, customerId)).for("update");
  const curM = bal?.minutes ?? 0;
  const curV = bal?.value ?? 0;
  if (curM + deltaMinutes < 0) {
    throw new Error(`Sisa ${net.save.m} menit dari sesi ini sudah disimpan ke saldo waktu member dan sebagian sudah terpakai (saldo tinggal ${curM} menit). Tagihan tidak bisa dibatalkan sebelum saldonya dikoreksi.`);
  }
  const now = new Date().toISOString();
  await tx
    .insert(customerTimeCredits)
    .values({ customerId, outletId, minutes: curM + deltaMinutes, value: Math.max(0, curV + deltaValue), createdAt: now, updatedAt: now })
    .onConflictDoUpdate({ target: customerTimeCredits.customerId, set: { minutes: curM + deltaMinutes, value: Math.max(0, Math.round((curV + deltaValue) * 100) / 100), updatedAt: now } });
  await tx.insert(timeCreditTransactions).values({
    outletId,
    customerId,
    rentalSessionId: order.rentalSessionId,
    type: "reverse",
    minutes: deltaMinutes,
    value: deltaValue,
    note: "Tagihan sesi dibatalkan — saldo waktu dikoreksi",
  });
}
