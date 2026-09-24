import { db } from "@/db/client";
import {
  outlets,
  subscriptions,
  marketplaceDeals,
  marketplaceOutletTrust,
  marketplaceReviews,
  marketplaceDisputes,
} from "@/db/schema";
import { and, eq, inArray, or, sql, desc } from "drizzle-orm";
import { logAudit } from "@/lib/audit/log";
import type { DealStatus } from "./ujrah";
import { bersihkanFotoBarang } from "./photos";
import { pastikanTanpaKontak } from "./anti-bypass";
import {
  hitungProfilKepercayaan,
  validasiRekening,
  validasiRating,
  bolehAdukan,
  bolehUlas,
  bolehUnggahBukti,
  kategoriAduanSah,
  keputusanAduanSah,
  KATEGORI_ADUAN,
  KEPUTUSAN_ADUAN,
  type ProfilKepercayaan,
  type Rekening,
} from "./trust";

/**
 * Keamanan sesama outlet di Marketplace — bagian yang menyentuh basis data. Aturannya sendiri ada
 * di trust.ts (murni, teruji). Rancangan & alasannya: lihat komentar pembuka trust.ts.
 */

const nowIso = () => new Date().toISOString();
const SUB_AKTIF = new Set(["trial", "active", "grace", "free_forever"]);

/* ================= BARIS KEAMANAN PER OUTLET ================= */

export async function ambilBarisTrust(outletId: string) {
  const [row] = await db.select().from(marketplaceOutletTrust).where(eq(marketplaceOutletTrust.outletId, outletId)).limit(1);
  return row ?? null;
}

async function pastikanBarisTrust(outletId: string) {
  await db.insert(marketplaceOutletTrust).values({ outletId }).onConflictDoNothing();
}

export async function outletDitangguhkan(outletId: string): Promise<boolean> {
  return (await ambilBarisTrust(outletId))?.suspended ?? false;
}

/** Semua outlet yang sedang ditangguhkan — dipakai untuk menyaring etalase. */
export async function daftarOutletDitangguhkan(): Promise<Set<string>> {
  const rows = await db.select({ id: marketplaceOutletTrust.outletId }).from(marketplaceOutletTrust).where(eq(marketplaceOutletTrust.suspended, true));
  return new Set(rows.map((r) => r.id));
}

/* ================= PROFIL KEPERCAYAAN ================= */

/**
 * Profil kepercayaan beberapa outlet sekaligus (satu putaran kueri, bukan satu per kartu etalase).
 * Semua angkanya berasal dari data yang TIDAK bisa diatur outlet itu sendiri: tanggal daftar,
 * kesepakatan yang ditandai selesai oleh pihak lawan, ulasan dari outlet lain, dan keputusan
 * platform-admin.
 */
export async function ambilProfilKepercayaan(outletIds: string[]): Promise<Map<string, ProfilKepercayaan>> {
  const ids = Array.from(new Set(outletIds.filter(Boolean)));
  const hasil = new Map<string, ProfilKepercayaan>();
  if (ids.length === 0) return hasil;

  const [oRows, dealRows, reviewRows, disputeRows, trustRows, subRows] = await Promise.all([
    db.select({ id: outlets.id, createdAt: outlets.createdAt }).from(outlets).where(inArray(outlets.id, ids)),
    db
      .select({ seller: marketplaceDeals.sellerOutletId, buyer: marketplaceDeals.buyerOutletId })
      .from(marketplaceDeals)
      .where(and(eq(marketplaceDeals.status, "completed"), or(inArray(marketplaceDeals.sellerOutletId, ids), inArray(marketplaceDeals.buyerOutletId, ids)))),
    db
      .select({ id: marketplaceReviews.revieweeOutletId, sum: sql<number>`coalesce(sum(${marketplaceReviews.rating}),0)`, n: sql<number>`count(*)` })
      .from(marketplaceReviews)
      .where(inArray(marketplaceReviews.revieweeOutletId, ids))
      .groupBy(marketplaceReviews.revieweeOutletId),
    db
      .select({ id: marketplaceDisputes.reportedOutletId, status: marketplaceDisputes.status, resolution: marketplaceDisputes.resolution })
      .from(marketplaceDisputes)
      .where(inArray(marketplaceDisputes.reportedOutletId, ids)),
    db.select({ id: marketplaceOutletTrust.outletId, suspended: marketplaceOutletTrust.suspended }).from(marketplaceOutletTrust).where(inArray(marketplaceOutletTrust.outletId, ids)),
    db.select({ id: subscriptions.outletId, status: subscriptions.status }).from(subscriptions).where(inArray(subscriptions.outletId, ids)),
  ]);

  const selesai = new Map<string, number>();
  for (const d of dealRows) {
    selesai.set(d.seller, (selesai.get(d.seller) ?? 0) + 1);
    selesai.set(d.buyer, (selesai.get(d.buyer) ?? 0) + 1);
  }
  const ulasan = new Map(reviewRows.map((r) => [r.id, { sum: Number(r.sum), n: Number(r.n) }] as const));
  const terbukti = new Map<string, number>();
  const terbuka = new Map<string, number>();
  for (const d of disputeRows) {
    if (d.status === "open") terbuka.set(d.id, (terbuka.get(d.id) ?? 0) + 1);
    else if (d.resolution === "warning" || d.resolution === "suspended") terbukti.set(d.id, (terbukti.get(d.id) ?? 0) + 1);
  }
  const tangguh = new Map(trustRows.map((t) => [t.id, t.suspended] as const));
  const subAktif = new Set(subRows.filter((s) => SUB_AKTIF.has(s.status)).map((s) => s.id));

  for (const o of oRows) {
    const u = ulasan.get(o.id);
    hasil.set(
      o.id,
      hitungProfilKepercayaan({
        joinedAt: o.createdAt,
        completedDeals: selesai.get(o.id) ?? 0,
        ratingSum: u?.sum ?? 0,
        ratingCount: u?.n ?? 0,
        provenDisputes: terbukti.get(o.id) ?? 0,
        openDisputesAgainst: terbuka.get(o.id) ?? 0,
        suspended: tangguh.get(o.id) ?? false,
        subscriptionActive: subAktif.has(o.id),
      })
    );
  }
  return hasil;
}

export async function profilSatuOutlet(outletId: string): Promise<ProfilKepercayaan> {
  const p = (await ambilProfilKepercayaan([outletId])).get(outletId);
  if (!p) throw new Error("Outlet tidak ditemukan.");
  return p;
}

/** Ulasan terbaru untuk sebuah outlet (ditampilkan di profil). */
export async function ulasanTerbaru(outletId: string, limit = 5) {
  const rows = await db
    .select({ rating: marketplaceReviews.rating, comment: marketplaceReviews.comment, createdAt: marketplaceReviews.createdAt, reviewer: outlets.name })
    .from(marketplaceReviews)
    .leftJoin(outlets, eq(outlets.id, marketplaceReviews.reviewerOutletId))
    .where(eq(marketplaceReviews.revieweeOutletId, outletId))
    .orderBy(desc(marketplaceReviews.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r, reviewer: r.reviewer ?? "Outlet" }));
}

/* ================= REKENING PENERIMA ================= */

export function rekeningDariBaris(row: { bankName: string | null; bankAccountNumber: string | null; bankAccountHolder: string | null } | null): Rekening | null {
  if (!row?.bankName || !row.bankAccountNumber || !row.bankAccountHolder) return null;
  return { bankName: row.bankName, accountNumber: row.bankAccountNumber, holder: row.bankAccountHolder };
}

export async function simpanRekening(outletId: string, input: Partial<Record<keyof Rekening, unknown>>, staffUserId?: string) {
  const rek = validasiRekening(input);
  await pastikanBarisTrust(outletId);
  const lama = rekeningDariBaris(await ambilBarisTrust(outletId));
  const berubah = !lama || lama.bankName !== rek.bankName || lama.accountNumber !== rek.accountNumber || lama.holder !== rek.holder;
  if (!berubah) return rek;

  await db
    .update(marketplaceOutletTrust)
    .set({ bankName: rek.bankName, bankAccountNumber: rek.accountNumber, bankAccountHolder: rek.holder, bankUpdatedAt: nowIso(), updatedAt: nowIso() })
    .where(eq(marketplaceOutletTrust.outletId, outletId));

  // Penggantian rekening dicatat lengkap: ini jejak pertama yang diperiksa saat ada aduan "diminta transfer ke rekening lain".
  await logAudit({ outletId, staffUserId, action: "marketplace_update_payout_account", entityType: "marketplace_outlet_trust", entityId: outletId, before: lama, after: rek });
  return rek;
}

/* ================= BUKTI TRANSAKSI ================= */

async function ambilDealUntukPihak(dealId: string, outletId: string) {
  const [deal] = await db.select().from(marketplaceDeals).where(eq(marketplaceDeals.id, dealId)).limit(1);
  if (!deal) throw new Error("Kesepakatan tidak ditemukan.");
  const peran = deal.sellerOutletId === outletId ? "seller" : deal.buyerOutletId === outletId ? "buyer" : null;
  if (!peran) throw new Error("Outlet kamu bukan bagian dari kesepakatan ini.");
  return { deal, peran } as const;
}

/**
 * Pembeli mengunggah bukti bayar, penjual mengunggah bukti serah-terima/kirim. Satu bukti per sisi
 * (unggah ulang menimpa — misalnya bila salah foto), dan hanya selama kesepakatan diterima/selesai.
 */
export async function simpanBukti(dealId: string, outletId: string, url: unknown, staffUserId?: string) {
  const { deal, peran } = await ambilDealUntukPihak(dealId, outletId);
  if (!bolehUnggahBukti(deal.status as DealStatus)) throw new Error("Bukti hanya bisa diunggah setelah penawaran diterima.");
  const [bersih] = bersihkanFotoBarang([url], process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!bersih) throw new Error("Foto bukti tidak ditemukan.");

  const now = nowIso();
  const patch =
    peran === "buyer"
      ? { buyerPaymentProofUrl: bersih, buyerPaymentProofAt: now, updatedAt: now }
      : { sellerHandoverProofUrl: bersih, sellerHandoverProofAt: now, updatedAt: now };
  await db.update(marketplaceDeals).set(patch).where(eq(marketplaceDeals.id, dealId));
  await logAudit({ outletId, staffUserId, action: peran === "buyer" ? "marketplace_payment_proof" : "marketplace_handover_proof", entityType: "marketplace_deal", entityId: dealId, after: { url: bersih } });
  return { ok: true };
}

/* ================= ULASAN ================= */

export async function beriUlasan(dealId: string, outletId: string, rating: unknown, comment: unknown, staffUserId?: string) {
  const { deal, peran } = await ambilDealUntukPihak(dealId, outletId);
  if (!bolehUlas(deal.status as DealStatus)) throw new Error("Ulasan hanya bisa diberikan setelah kesepakatan selesai.");
  const nilai = validasiRating(rating);
  const komentar = typeof comment === "string" ? comment.trim().slice(0, 500) || null : null;
  pastikanTanpaKontak({ Ulasan: komentar });

  const reviewee = peran === "seller" ? deal.buyerOutletId : deal.sellerOutletId;
  const [row] = await db
    .insert(marketplaceReviews)
    .values({ dealId, reviewerOutletId: outletId, revieweeOutletId: reviewee, rating: nilai, comment: komentar })
    .onConflictDoNothing()
    .returning();
  if (!row) throw new Error("Anda sudah memberi ulasan untuk kesepakatan ini.");
  await logAudit({ outletId, staffUserId, action: "marketplace_review", entityType: "marketplace_deal", entityId: dealId, after: { rating: nilai } });
  return row;
}

/* ================= ADUAN ================= */

const parseJsonArray = (s: string | null): string[] => {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
};

export async function ajukanAduan(
  input: { dealId: string; outletId: string; category: unknown; description: unknown; evidenceUrls: unknown },
  staffUserId?: string
) {
  const { deal, peran } = await ambilDealUntukPihak(input.dealId, input.outletId);
  if (!bolehAdukan(deal.status as DealStatus)) throw new Error("Aduan hanya bisa diajukan setelah penawaran diterima.");
  if (!kategoriAduanSah(input.category)) throw new Error("Pilih jenis masalahnya.");
  const deskripsi = typeof input.description === "string" ? input.description.trim() : "";
  if (deskripsi.length < 20) throw new Error("Ceritakan kronologinya minimal 20 karakter: apa yang disepakati, apa yang terjadi, kapan.");
  const bukti = bersihkanFotoBarang(input.evidenceUrls ?? [], process.env.NEXT_PUBLIC_SUPABASE_URL);

  const [sudahAda] = await db
    .select({ id: marketplaceDisputes.id })
    .from(marketplaceDisputes)
    .where(and(eq(marketplaceDisputes.dealId, deal.id), eq(marketplaceDisputes.reporterOutletId, input.outletId), eq(marketplaceDisputes.status, "open")))
    .limit(1);
  if (sudahAda) throw new Error("Anda sudah punya aduan terbuka untuk kesepakatan ini. Tunggu keputusan tim NEXBILL.");

  const [row] = await db
    .insert(marketplaceDisputes)
    .values({
      dealId: deal.id,
      reporterOutletId: input.outletId,
      reportedOutletId: peran === "seller" ? deal.buyerOutletId : deal.sellerOutletId,
      category: input.category,
      description: deskripsi.slice(0, 3000),
      evidenceUrls: bukti.length ? JSON.stringify(bukti) : null,
    })
    .returning();
  await logAudit({ outletId: input.outletId, staffUserId, action: "marketplace_dispute_open", entityType: "marketplace_dispute", entityId: row.id, after: { dealNumber: deal.dealNumber, category: input.category } });
  return row;
}

/** Pihak yang diadukan memberi tanggapan + bukti. Boleh diperbarui selama aduan belum diputuskan. */
export async function tanggapiAduan(disputeId: string, outletId: string, statement: unknown, evidenceUrls: unknown, staffUserId?: string) {
  const [d] = await db.select().from(marketplaceDisputes).where(eq(marketplaceDisputes.id, disputeId)).limit(1);
  if (!d || d.reportedOutletId !== outletId) throw new Error("Aduan tidak ditemukan.");
  if (d.status !== "open") throw new Error("Aduan ini sudah diputuskan.");
  const isi = typeof statement === "string" ? statement.trim() : "";
  if (isi.length < 10) throw new Error("Tuliskan tanggapan Anda minimal 10 karakter.");
  const bukti = bersihkanFotoBarang(evidenceUrls ?? [], process.env.NEXT_PUBLIC_SUPABASE_URL);

  await db
    .update(marketplaceDisputes)
    .set({ respondentStatement: isi.slice(0, 3000), respondentEvidenceUrls: bukti.length ? JSON.stringify(bukti) : null, respondentAt: nowIso(), updatedAt: nowIso() })
    .where(eq(marketplaceDisputes.id, disputeId));
  await logAudit({ outletId, staffUserId, action: "marketplace_dispute_respond", entityType: "marketplace_dispute", entityId: disputeId });
  return { ok: true };
}

/** Aduan yang menyangkut outlet ini (sebagai pelapor maupun terlapor), untuk tab Kesepakatan. */
export async function aduanUntukOutlet(outletId: string) {
  const rows = await db
    .select()
    .from(marketplaceDisputes)
    .where(or(eq(marketplaceDisputes.reporterOutletId, outletId), eq(marketplaceDisputes.reportedOutletId, outletId)))
    .orderBy(desc(marketplaceDisputes.createdAt));
  const dealIds = Array.from(new Set(rows.map((r) => r.dealId)));
  const infoDeal = new Map<string, { id: string; dealNumber: string; title: string | null }>();
  if (dealIds.length) {
    const ds = await db.select({ id: marketplaceDeals.id, dealNumber: marketplaceDeals.dealNumber, title: marketplaceDeals.sellerNote }).from(marketplaceDeals).where(inArray(marketplaceDeals.id, dealIds));
    ds.forEach((d) => infoDeal.set(d.id, d));
  }
  return rows.map((r) => ({
    ...r,
    dealNumber: infoDeal.get(r.dealId)?.dealNumber ?? "",
    dealTitle: infoDeal.get(r.dealId)?.title ?? "",
    peran: r.reporterOutletId === outletId ? ("reporter" as const) : ("reported" as const),
    categoryLabel: KATEGORI_ADUAN[r.category as keyof typeof KATEGORI_ADUAN] ?? r.category,
    resolutionLabel: r.resolution ? KEPUTUSAN_ADUAN[r.resolution] : null,
    evidenceUrls: parseJsonArray(r.evidenceUrls),
    respondentEvidenceUrls: parseJsonArray(r.respondentEvidenceUrls),
  }));
}

/* ================= PLATFORM-ADMIN ================= */

export async function daftarAduanAdmin(status: "open" | "resolved" | "all" = "open") {
  const rows = await db
    .select()
    .from(marketplaceDisputes)
    .where(status === "all" ? undefined : eq(marketplaceDisputes.status, status))
    .orderBy(desc(marketplaceDisputes.createdAt));
  if (rows.length === 0) return [];

  const dealIds = Array.from(new Set(rows.map((r) => r.dealId)));
  const deals = await db.select().from(marketplaceDeals).where(inArray(marketplaceDeals.id, dealIds));
  const dealMap = new Map(deals.map((d) => [d.id, d] as const));
  const outletIds = Array.from(new Set(rows.flatMap((r) => [r.reporterOutletId, r.reportedOutletId])));
  const nama = new Map((await db.select({ id: outlets.id, name: outlets.name }).from(outlets).where(inArray(outlets.id, outletIds))).map((o) => [o.id, o.name] as const));
  const profil = await ambilProfilKepercayaan(outletIds);

  return rows.map((r) => {
    const d = dealMap.get(r.dealId);
    return {
      ...r,
      categoryLabel: KATEGORI_ADUAN[r.category as keyof typeof KATEGORI_ADUAN] ?? r.category,
      resolutionLabel: r.resolution ? KEPUTUSAN_ADUAN[r.resolution] : null,
      evidenceUrls: parseJsonArray(r.evidenceUrls),
      respondentEvidenceUrls: parseJsonArray(r.respondentEvidenceUrls),
      reporterName: nama.get(r.reporterOutletId) ?? "Outlet",
      reportedName: nama.get(r.reportedOutletId) ?? "Outlet",
      reporterProfile: profil.get(r.reporterOutletId) ?? null,
      reportedProfile: profil.get(r.reportedOutletId) ?? null,
      deal: d
        ? {
            dealNumber: d.dealNumber,
            status: d.status,
            title: d.sellerNote,
            qty: d.qty,
            agreedPrice: d.agreedPrice,
            sellerOutletId: d.sellerOutletId,
            buyerOutletId: d.buyerOutletId,
            buyerNote: d.buyerNote,
            closedReason: d.closedReason,
            payoutSnapshot: d.payoutSnapshot ? JSON.parse(d.payoutSnapshot) : null,
            buyerPaymentProofUrl: d.buyerPaymentProofUrl,
            buyerPaymentProofAt: d.buyerPaymentProofAt,
            sellerHandoverProofUrl: d.sellerHandoverProofUrl,
            sellerHandoverProofAt: d.sellerHandoverProofAt,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          }
        : null,
    };
  });
}

/**
 * Keputusan platform-admin atas satu aduan.
 *   dismissed → aduan ditutup, tidak ada sanksi.
 *   warning   → peringatan resmi: warning_count terlapor +1, terhitung "aduan terbukti" di profilnya.
 *   suspended → seperti warning, DAN akses Marketplace terlapor ditangguhkan (barangnya hilang dari
 *               etalase, tidak bisa memasang/menawar/menerima). Kesepakatan yang sedang berjalan
 *               tetap bisa dilihat dan diselesaikan — menutupnya justru merugikan pihak yang jujur.
 */
export async function putuskanAduan(disputeId: string, adminId: string, resolution: unknown, note: unknown) {
  if (!keputusanAduanSah(resolution)) throw new Error("Pilih keputusan.");
  const catatan = typeof note === "string" ? note.trim() : "";
  if (catatan.length < 10) throw new Error("Tuliskan alasan keputusan (minimal 10 karakter) — alasan ini dibaca kedua outlet.");

  const [d] = await db.select().from(marketplaceDisputes).where(eq(marketplaceDisputes.id, disputeId)).limit(1);
  if (!d) throw new Error("Aduan tidak ditemukan.");
  if (d.status !== "open") throw new Error("Aduan ini sudah diputuskan.");

  const now = nowIso();
  await db
    .update(marketplaceDisputes)
    .set({ status: "resolved", resolution, adminNote: catatan, resolvedBy: adminId, resolvedAt: now, updatedAt: now })
    .where(eq(marketplaceDisputes.id, disputeId));

  if (resolution !== "dismissed") {
    await pastikanBarisTrust(d.reportedOutletId);
    await db
      .update(marketplaceOutletTrust)
      .set({
        warningCount: sql`${marketplaceOutletTrust.warningCount} + 1`,
        ...(resolution === "suspended" ? { suspended: true, suspendedReason: catatan, suspendedAt: now, suspendedBy: adminId } : {}),
        updatedAt: now,
      })
      .where(eq(marketplaceOutletTrust.outletId, d.reportedOutletId));
  }

  await logAudit({
    outletId: d.reportedOutletId,
    action: "marketplace_dispute_resolved",
    entityType: "marketplace_dispute",
    entityId: disputeId,
    after: { resolution, catatan, platformAdminId: adminId },
  });
  return { ok: true };
}

export async function cabutPenangguhan(outletId: string, adminId: string, note: unknown) {
  const catatan = typeof note === "string" ? note.trim() : "";
  if (catatan.length < 5) throw new Error("Tuliskan alasan mencabut penangguhan.");
  await db
    .update(marketplaceOutletTrust)
    .set({ suspended: false, suspendedReason: null, suspendedAt: null, suspendedBy: null, updatedAt: nowIso() })
    .where(eq(marketplaceOutletTrust.outletId, outletId));
  await logAudit({ outletId, action: "marketplace_unsuspend", entityType: "marketplace_outlet_trust", entityId: outletId, after: { catatan, platformAdminId: adminId } });
  return { ok: true };
}

/** Outlet yang sedang ditangguhkan, untuk panel platform-admin. */
export async function daftarPenangguhan() {
  const rows = await db
    .select({ outletId: marketplaceOutletTrust.outletId, reason: marketplaceOutletTrust.suspendedReason, at: marketplaceOutletTrust.suspendedAt, warnings: marketplaceOutletTrust.warningCount, name: outlets.name })
    .from(marketplaceOutletTrust)
    .leftJoin(outlets, eq(outlets.id, marketplaceOutletTrust.outletId))
    .where(eq(marketplaceOutletTrust.suspended, true));
  return rows;
}
