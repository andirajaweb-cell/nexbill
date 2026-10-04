import { db } from "@/db/client";
import {
  accountDeletionRequests,
  staffUsers,
  outlets,
  outletMemberships,
  outletTuyaAccounts,
  subscriptions,
  subscriptionInvoices,
  marketplaceDeals,
} from "@/db/schema";
import { and, eq, inArray, ne, or, sql, desc, lte } from "drizzle-orm";
import { getTableColumns } from "drizzle-orm";
import { revokeSession } from "@/lib/auth/single-session";
import { sendEmail, accountDeletionCodeEmail, accountDeletionConfirmedEmail } from "@/lib/notifications/email";
import { deleteFromSupabaseStorageByPublicUrl } from "@/lib/storage/supabase-storage";
import { ANONYMIZE_PLAN, OUTLET_PII_COLS } from "./plan";
import { removeAllSubscriptionsFor } from "@/lib/push/service";
import {
  generateDeletionCode,
  hashDeletionCode,
  checkDeletionCode,
  addMinutesIso,
  purgeDueAt,
  anonymizedEmail,
  maskEmail,
  parseIdList,
  CODE_TTL_MINUTES,
  MAX_CODE_ATTEMPTS,
} from "./rules";

/**
 * Penghapusan akun Owner + data outletnya (Kebijakan Privasi bagian 8–9, syarat Google Play):
 *  1. requestAccountDeletion  → kode 6 digit ke email Owner (status pending_verification).
 *  2. confirmAccountDeletion  → akun Owner, staf outlet, dan outlet langsung NONAKTIF; langganan
 *                               dibatalkan (kecuali free_forever yang tidak diubah); purge
 *                               dijadwalkan 30 hari (status confirmed).
 *  3. purgeAccountDeletion    → data pribadi dihapus/dianonimkan (ANONYMIZE_PLAN), file identitas
 *                               dihapus dari storage, kredensial Tuya dihapus. Catatan transaksi &
 *                               invoice tetap ada tanpa identitas (kewajiban pencatatan).
 * sweepDueAccountDeletions dipanggil scheduler harian + saat platform-admin membuka daftar.
 */

export type DeletionRequestRow = typeof accountDeletionRequests.$inferSelect;

export class DeletionError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/** Outlet yang ikut terhapus: outlet utama Owner + semua outlet yang terhubung ke akun Owner. */
export async function getOwnerOutlets(staffUserId: string): Promise<{ id: string; name: string }[]> {
  const [owner] = await db.select().from(staffUsers).where(eq(staffUsers.id, staffUserId)).limit(1);
  if (!owner) return [];
  const memberships = await db.select({ outletId: outletMemberships.outletId }).from(outletMemberships).where(eq(outletMemberships.staffUserId, staffUserId));
  const ids = Array.from(new Set([owner.outletId, ...memberships.map((m) => m.outletId)]));
  const rows = await db.select({ id: outlets.id, name: outlets.name }).from(outlets).where(inArray(outlets.id, ids));
  return rows;
}

async function openRequestFor(staffUserId: string): Promise<DeletionRequestRow | null> {
  const [row] = await db
    .select()
    .from(accountDeletionRequests)
    .where(and(eq(accountDeletionRequests.requestedByStaffUserId, staffUserId), inArray(accountDeletionRequests.status, ["pending_verification", "confirmed"])))
    .orderBy(desc(accountDeletionRequests.createdAt))
    .limit(1);
  return row ?? null;
}

/** Status untuk ditampilkan di Pengaturan → Akun Saya. */
export async function getDeletionStatus(staffUserId: string) {
  const request = await openRequestFor(staffUserId);
  const outletRows = await getOwnerOutlets(staffUserId);
  return {
    outlets: outletRows,
    request: request
      ? { id: request.id, status: request.status, codeExpiresAt: request.codeExpiresAt, scheduledPurgeAt: request.scheduledPurgeAt, email: maskEmail(request.email) }
      : null,
  };
}

/** Langkah 1 — hanya Owner. Membuat (atau memperbarui) permintaan & mengirim kode ke email terdaftar. */
export async function requestAccountDeletion(session: { sub: string; role: string }, reason?: string) {
  if (session.role !== "owner") throw new DeletionError("Hanya akun Owner yang bisa meminta penghapusan akun & data outlet. Staf dapat meminta Owner menghapus aksesnya di menu Staf & Hak Akses.", 403);
  const [owner] = await db.select().from(staffUsers).where(eq(staffUsers.id, session.sub)).limit(1);
  if (!owner) throw new DeletionError("Akun tidak ditemukan.", 404);
  const existing = await openRequestFor(owner.id);
  if (existing?.status === "confirmed") throw new DeletionError("Penghapusan akun ini sudah dikonfirmasi dan sedang dijadwalkan.");

  const outletRows = await getOwnerOutlets(owner.id);
  const code = generateDeletionCode();
  const now = new Date();
  const values = {
    requestedByStaffUserId: owner.id,
    email: owner.email,
    outletIdsJson: JSON.stringify(outletRows.map((o) => o.id)),
    outletNames: outletRows.map((o) => o.name).join(", "),
    reason: reason?.trim().slice(0, 1000) || null,
    status: "pending_verification" as const,
    codeExpiresAt: addMinutesIso(now, CODE_TTL_MINUTES),
    attempts: 0,
    updatedAt: now.toISOString(),
  };
  let row: DeletionRequestRow;
  if (existing) {
    [row] = await db.update(accountDeletionRequests).set(values).where(eq(accountDeletionRequests.id, existing.id)).returning();
  } else {
    [row] = await db.insert(accountDeletionRequests).values(values).returning();
  }
  await db.update(accountDeletionRequests).set({ codeHash: hashDeletionCode(row.id, code) }).where(eq(accountDeletionRequests.id, row.id));

  const { subject, html } = accountDeletionCodeEmail(esc(owner.name), code, esc(values.outletNames || "-"), CODE_TTL_MINUTES);
  const sent = await sendEmail({ to: owner.email, subject, html });
  if (!sent.sent && sent.reason !== "not-configured") throw new DeletionError("Gagal mengirim kode ke email. Coba lagi beberapa saat lagi, atau hubungi sales@nexbill.id.", 502);
  return { requestId: row.id, email: maskEmail(owner.email), expiresAt: values.codeExpiresAt, outlets: outletRows };
}

/** Owner membatalkan permintaan yang belum dikonfirmasi. */
export async function cancelPendingDeletion(session: { sub: string }) {
  const existing = await openRequestFor(session.sub);
  if (!existing) return;
  if (existing.status !== "pending_verification") throw new DeletionError("Permintaan sudah dikonfirmasi — hubungi sales@nexbill.id untuk membatalkan.");
  await db
    .update(accountDeletionRequests)
    .set({ status: "cancelled", cancelledAt: new Date().toISOString(), codeHash: null, handledBy: "owner", updatedAt: new Date().toISOString() })
    .where(eq(accountDeletionRequests.id, existing.id));
}

/** Langkah 2 — kode benar → nonaktifkan akun, staf, outlet; batalkan langganan; jadwalkan purge. */
export async function confirmAccountDeletion(session: { sub: string; role: string }, code: string) {
  if (session.role !== "owner") throw new DeletionError("Hanya akun Owner yang bisa mengonfirmasi penghapusan.", 403);
  const request = await openRequestFor(session.sub);
  if (!request || request.status !== "pending_verification") throw new DeletionError("Tidak ada permintaan hapus akun yang menunggu konfirmasi. Minta kode baru dulu.");
  const check = checkDeletionCode({ requestId: request.id, code, codeHash: request.codeHash, codeExpiresAt: request.codeExpiresAt, attempts: request.attempts });
  if (!check.ok) {
    if (check.reason === "wrong_code") {
      await db.update(accountDeletionRequests).set({ attempts: request.attempts + 1 }).where(eq(accountDeletionRequests.id, request.id));
      const left = MAX_CODE_ATTEMPTS - request.attempts - 1;
      throw new DeletionError(left > 0 ? `Kode salah. Sisa percobaan: ${left}.` : "Kode salah terlalu sering. Minta kode baru.");
    }
    throw new DeletionError(check.reason === "expired" ? "Kode sudah kedaluwarsa. Minta kode baru." : "Kode tidak berlaku lagi. Minta kode baru.");
  }

  const now = new Date();
  const outletIds = parseIdList(request.outletIdsJson);
  // Staf yang dinonaktifkan: Owner + semua staf yang outlet utamanya termasuk outlet yang dihapus.
  const staffRows = await db
    .select({ id: staffUsers.id, isActive: staffUsers.isActive })
    .from(staffUsers)
    .where(outletIds.length ? or(eq(staffUsers.id, request.requestedByStaffUserId), inArray(staffUsers.outletId, outletIds)) : eq(staffUsers.id, request.requestedByStaffUserId));
  const toDeactivate = staffRows.filter((s) => s.isActive).map((s) => s.id);

  const scheduledPurgeAt = purgeDueAt(now);
  await db
    .update(accountDeletionRequests)
    .set({
      status: "confirmed",
      confirmedAt: now.toISOString(),
      scheduledPurgeAt,
      codeHash: null,
      deactivatedStaffIdsJson: JSON.stringify(toDeactivate),
      updatedAt: now.toISOString(),
    })
    .where(eq(accountDeletionRequests.id, request.id));

  if (outletIds.length) {
    await db.update(outlets).set({ isActive: false }).where(inArray(outlets.id, outletIds));
    // Langganan berhenti (tidak ada tagihan/pengingat lagi). Status "free_forever" sengaja tidak diubah.
    await db
      .update(subscriptions)
      .set({ status: "cancelled", cancelledAt: now.toISOString(), cancelReason: "account_deletion" })
      .where(and(inArray(subscriptions.outletId, outletIds), ne(subscriptions.status, "free_forever")));
    await db
      .update(subscriptionInvoices)
      .set({ status: "cancelled", cancelReason: "account_deletion", method: null, providerRef: null, qrString: null, qrImageUrl: null, vaNumber: null, vaBankCode: null })
      .where(and(inArray(subscriptionInvoices.outletId, outletIds), eq(subscriptionInvoices.status, "unpaid")));
  }
  if (toDeactivate.length) {
    await db.update(staffUsers).set({ isActive: false }).where(inArray(staffUsers.id, toDeactivate));
    for (const id of toDeactivate) await revokeSession(id);
    await removeAllSubscriptionsFor(toDeactivate);
  }

  const [owner] = await db.select().from(staffUsers).where(eq(staffUsers.id, request.requestedByStaffUserId)).limit(1);
  if (owner) {
    const purgeDate = new Date(scheduledPurgeAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    const { subject, html } = accountDeletionConfirmedEmail(esc(owner.name), esc(request.outletNames || "-"), purgeDate);
    await sendEmail({ to: owner.email, subject, html });
  }
  return { scheduledPurgeAt };
}

/** Platform-admin: batalkan penghapusan yang sudah dikonfirmasi (sebelum purge) & aktifkan kembali. */
export async function adminCancelDeletion(requestId: string, adminLabel: string) {
  const [request] = await db.select().from(accountDeletionRequests).where(eq(accountDeletionRequests.id, requestId)).limit(1);
  if (!request) throw new DeletionError("Permintaan tidak ditemukan.", 404);
  if (request.status === "purged") throw new DeletionError("Data sudah dihapus — tidak bisa dibatalkan.");
  if (request.status === "confirmed") {
    const outletIds = parseIdList(request.outletIdsJson);
    const staffIds = parseIdList(request.deactivatedStaffIdsJson);
    if (outletIds.length) await db.update(outlets).set({ isActive: true }).where(inArray(outlets.id, outletIds));
    if (staffIds.length) await db.update(staffUsers).set({ isActive: true }).where(inArray(staffUsers.id, staffIds));
    // Langganan yang dibatalkan karena hapus akun → trial_expired, supaya Owner berlangganan lagi lewat halaman Langganan.
    if (outletIds.length) {
      await db
        .update(subscriptions)
        .set({ status: "trial_expired", cancelledAt: null, cancelReason: null })
        .where(and(inArray(subscriptions.outletId, outletIds), eq(subscriptions.cancelReason, "account_deletion")));
    }
  }
  await db
    .update(accountDeletionRequests)
    .set({ status: "cancelled", cancelledAt: new Date().toISOString(), handledBy: adminLabel, codeHash: null, updatedAt: new Date().toISOString() })
    .where(eq(accountDeletionRequests.id, requestId));
}

/** Langkah 3 — hapus/anonimkan data pribadi. Idempoten per request. */
export async function purgeAccountDeletion(requestId: string, by: string) {
  const [request] = await db.select().from(accountDeletionRequests).where(eq(accountDeletionRequests.id, requestId)).limit(1);
  if (!request) throw new DeletionError("Permintaan tidak ditemukan.", 404);
  if (request.status === "purged") return { files: 0 };
  if (request.status !== "confirmed") throw new DeletionError("Hanya permintaan yang sudah dikonfirmasi Owner yang bisa dihapus permanen.");

  const outletIds = parseIdList(request.outletIdsJson);
  const staffIds = Array.from(new Set([request.requestedByStaffUserId, ...parseIdList(request.deactivatedStaffIdsJson)]));
  let files = 0;

  if (outletIds.length) {
    for (const step of ANONYMIZE_PLAN) {
      const cols = getTableColumns(step.table) as Record<string, any>;
      const outletCol = cols[step.outletKey];
      // Kumpulkan URL file dulu sebelum kolomnya dikosongkan.
      if (step.fileCols?.length) {
        const sel: Record<string, any> = {};
        for (const f of step.fileCols) sel[f] = cols[f];
        const rows = (await db.select(sel).from(step.table as any).where(inArray(outletCol, outletIds))) as Record<string, string | null>[];
        for (const r of rows) for (const f of step.fileCols) if (await deleteFromSupabaseStorageByPublicUrl(r[f])) files++;
      }
      const idCol = cols.id ?? outletCol;
      const set: Record<string, unknown> = {};
      for (const c of step.cols) {
        const col = cols[c];
        if (!col.notNull) set[c] = null;
        else if (col.dataType === "string") set[c] = sql`'dihapus-' || ${idCol}`;
        else if (col.dataType === "number") set[c] = 0;
        else if (col.dataType === "boolean") set[c] = false;
      }
      await db.update(step.table as any).set(set).where(inArray(outletCol, outletIds));
    }
    // Nomor kontak pembeli di transaksi marketplace (outlet ini sebagai pembeli).
    await db.update(marketplaceDeals).set({ buyerContactPhone: null }).where(inArray(marketplaceDeals.buyerOutletId, outletIds));
    // Kredensial Tuya milik outlet dihapus total.
    await db.delete(outletTuyaAccounts).where(inArray(outletTuyaAccounts.outletId, outletIds));
    // Profil outlet.
    const outletRows = await db.select({ id: outlets.id, logoUrl: outlets.logoUrl }).from(outlets).where(inArray(outlets.id, outletIds));
    for (const o of outletRows) if (await deleteFromSupabaseStorageByPublicUrl(o.logoUrl)) files++;
    const outletSet: Record<string, unknown> = { name: "Outlet dihapus", isActive: false };
    for (const c of OUTLET_PII_COLS) outletSet[c] = null;
    await db.update(outlets).set(outletSet).where(inArray(outlets.id, outletIds));
  }

  // Akun staf & Owner.
  for (const id of staffIds) {
    await db
      .update(staffUsers)
      .set({ name: "Pengguna dihapus", email: anonymizedEmail(id), passwordHash: null, googleId: null, isActive: false, activeSessionId: null, activeSessionAt: null, activeSessionDevice: null, activeSessionIp: null })
      .where(eq(staffUsers.id, id));
    await revokeSession(id);
  }

  await db
    .update(accountDeletionRequests)
    .set({ status: "purged", purgedAt: new Date().toISOString(), email: maskEmail(request.email), reason: null, handledBy: by, updatedAt: new Date().toISOString() })
    .where(eq(accountDeletionRequests.id, requestId));
  return { files };
}

/** Purge semua permintaan terkonfirmasi yang sudah lewat 30 hari. */
export async function sweepDueAccountDeletions() {
  const now = new Date().toISOString();
  const due = await db
    .select({ id: accountDeletionRequests.id })
    .from(accountDeletionRequests)
    .where(and(eq(accountDeletionRequests.status, "confirmed"), lte(accountDeletionRequests.scheduledPurgeAt, now)));
  let done = 0;
  for (const r of due) {
    try {
      await purgeAccountDeletion(r.id, "scheduler");
      done++;
    } catch (e) {
      console.error("[account-deletion] purge gagal", r.id, e);
    }
  }
  return done;
}

export async function listDeletionRequests() {
  return db.select().from(accountDeletionRequests).orderBy(desc(accountDeletionRequests.createdAt)).limit(200);
}
