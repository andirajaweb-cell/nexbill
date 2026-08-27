import { db } from "@/db/client";
import { homeRentalCustomerRisk, homeRentalRentals, homeRentalRentalAssets, homeRentalAssets } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { logAudit } from "@/lib/audit/log";
import { isFeatureEnabled } from "./feature-flags";
import { getPolicyRules } from "./policy";

/**
 * Customer Risk Control (HOME_RENTAL_RISK) — behavioral risk scoring derived entirely from a
 * customer's own Home Rental history in this schema (late returns, no-shows, cancellations,
 * damaged/missing assets, outstanding balances) plus an optional manual blacklist override.
 * "Customer banking data / fraud" from the original request is deliberately scoped here as
 * identity + behavioral risk data (KTP/ID number, emergency contact, rental history) rather
 * than literal bank account/card storage — this app has no payment-card handling anywhere else
 * in the schema, and taking on PCI-like sensitive-data scope wasn't part of the explicit ask.
 */

export interface RiskSignals {
  totalRentals: number;
  lateReturnCount: number;
  lateOver24hCount: number;
  noShowCount: number;
  cancellationCount: number;
  damagedAssetCount: number;
  missingAssetCount: number;
  outstandingAmount: number;
}

/** Identity/verification inputs the owner's Customer Risk Score point table scores directly — everything besides rental-history behavior. */
export interface RiskIdentitySignals {
  identityComplete: boolean; // nama + no. KTP/SIM + foto KTP + foto pegang KTP + alamat, semua terisi
  addressClear: boolean; // ada alamat yang diisi (belum tentu sudah diverifikasi staf)
  addressVerified: boolean; // staf sudah cek alamat: jelas, bisa didatangi, dalam radius layanan
  waVerified: boolean; // nomor WA aktif dikonfirmasi staf
  referenceValid: boolean; // kontak darurat/referensi tambahan terisi
  verificationStatus: "unverified" | "verified" | "flagged" | "fraudulent"; // "flagged"=data tidak jelas, "fraudulent"=terbukti data palsu
  depositRefused: boolean;
  identityRefused: boolean;
  manualAdjustment: number; // poin custom staf, lihat homeRentalCustomerRisk.manualAdjustment
}

export type RiskLevel = "low" | "medium" | "high";
export type RiskCategory = "aman" | "perhatian" | "risiko" | "tolak";

export const RISK_CATEGORY_LABEL: Record<RiskCategory, string> = {
  aman: "A — 🟢 Aman", perhatian: "B — 🟡 Perlu Perhatian", risiko: "C — 🟠 Risiko", tolak: "D — 🔴 Tolak",
};
export const RISK_CATEGORY_ADVICE: Record<RiskCategory, string> = {
  aman: "Customer terpercaya — deposit normal, bisa diberi benefit customer loyal.",
  perhatian: "Customer cukup aman — deposit normal, verifikasi standar.",
  risiko: "Risiko sedang — deposit lebih tinggi, sebaiknya alamat diverifikasi.",
  tolak: "Risiko tinggi — tidak disarankan rental dibawa pulang.",
};

/**
 * Customer Risk / Trust Score — point-based per the owner's spec, and (per the owner's explicit
 * request) fully EDITABLE per outlet: the weight for each factor below is read from that
 * outlet's "risk_weight" policy rules (see lib/home-rental/policy.ts, Kebijakan tab), not
 * hardcoded — an outlet can raise/lower any weight or deactivate a factor entirely. Only WHICH
 * conditions exist is fixed in code (the `key`s below); a truly custom factor an outlet invents
 * goes through homeRentalCustomerRisk.manualAdjustment instead (a free +/- point with a reason).
 * Default weights sum to 100 on the positive side: identity_complete 20, wa_active 10,
 * address_clear 15, address_verified 10, good_history 20, on_time_history 15, reference_valid 10.
 * Negative: late_once -10, late_over_24h -20, damaged_controller -15, lost_accessory -15,
 * unclear_data -20, refuse_identity -30, refuse_deposit -30, fake_data -50. Clamped 0-100.
 * Category cutoffs (grade): 80-100 A/Aman, 60-79 B/Perlu Perhatian, 40-59 C/Risiko, <40 D/Tolak.
 */
export async function scoreFromSignals(outletId: string, s: RiskSignals, id: RiskIdentitySignals): Promise<{ riskScore: number; riskLevel: RiskLevel; riskCategory: RiskCategory }> {
  const weights = await getPolicyRules(outletId, "risk_weight");
  const byKey = new Map(weights.map((w) => [w.key, w.numericValue]));
  const w = (key: string) => byKey.get(key) ?? 0;

  const goodHistory = s.totalRentals >= 2 && s.lateReturnCount === 0 && s.noShowCount === 0 && s.damagedAssetCount === 0 && s.missingAssetCount === 0;
  const onTimeHistory = s.totalRentals >= 1 && s.lateReturnCount === 0;

  let score = 0;
  if (id.identityComplete) score += w("identity_complete");
  if (id.waVerified) score += w("wa_active");
  if (id.addressClear) score += w("address_clear");
  if (id.addressVerified) score += w("address_verified");
  if (goodHistory) score += w("good_history");
  if (onTimeHistory) score += w("on_time_history");
  if (id.referenceValid) score += w("reference_valid");
  if (s.lateReturnCount > 0) score += w("late_once");
  if (s.lateOver24hCount > 0) score += w("late_over_24h");
  if (s.damagedAssetCount > 0) score += w("damaged_controller");
  if (s.missingAssetCount > 0) score += w("lost_accessory");
  if (id.verificationStatus === "flagged") score += w("unclear_data");
  if (id.identityRefused) score += w("refuse_identity");
  if (id.depositRefused) score += w("refuse_deposit");
  if (id.verificationStatus === "fraudulent") score += w("fake_data");
  score += id.manualAdjustment;

  score = Math.max(0, Math.min(100, Math.round(score)));
  const riskCategory: RiskCategory = score >= 80 ? "aman" : score >= 60 ? "perhatian" : score >= 40 ? "risiko" : "tolak";
  const riskLevel: RiskLevel = riskCategory === "aman" || riskCategory === "perhatian" ? "low" : riskCategory === "risiko" ? "medium" : "high";
  return { riskScore: score, riskLevel, riskCategory };
}

/**
 * Counts how many of a customer's rentals left a physical asset in the given status(es) —
 * keyed off each asset's CURRENT status, taking only the customer's most recent link per asset
 * (so an asset rented, damaged, repaired, then rented again cleanly by the SAME customer isn't
 * double counted). Cross-customer misattribution (asset damaged by a later, different renter)
 * isn't possible to fully rule out without a dedicated incident log — that's Phase 2's Damage &
 * Loss Management module; this is a reasonable Phase-1 proxy since damage/missing status
 * changes happen right at/after this customer's return in practice.
 */
async function countAssetIncidents(rentalIds: string[], targetStatuses: string[]): Promise<number> {
  if (!rentalIds.length) return 0;
  const links = await db.select().from(homeRentalRentalAssets).where(inArray(homeRentalRentalAssets.rentalId, rentalIds));
  if (!links.length) return 0;

  const latestLinkByAsset = new Map<string, (typeof links)[number]>();
  for (const l of links) {
    const cur = latestLinkByAsset.get(l.assetId);
    if (!cur || (l.scannedOutAt ?? "") > (cur.scannedOutAt ?? "")) latestLinkByAsset.set(l.assetId, l);
  }
  const assetIds = [...latestLinkByAsset.keys()];
  const assets = await db.select().from(homeRentalAssets).where(inArray(homeRentalAssets.id, assetIds));
  const statusById = new Map(assets.map((a) => [a.id, a.status]));

  let count = 0;
  for (const assetId of assetIds) {
    if (targetStatuses.includes(statusById.get(assetId) ?? "")) count++;
  }
  return count;
}

export async function computeCustomerRiskProfile(outletId: string, phone: string): Promise<RiskSignals> {
  const rentals = await db.select().from(homeRentalRentals).where(and(eq(homeRentalRentals.outletId, outletId), eq(homeRentalRentals.phone, phone)));

  const totalRentals = rentals.filter((r) => r.status !== "cancelled").length;
  const lateReturns = rentals.filter((r) => r.status === "returned" && r.returnedAt && r.returnedAt > r.scheduledEnd);
  const lateReturnCount = lateReturns.length;
  const lateOver24hCount = lateReturns.filter((r) => new Date(r.returnedAt!).getTime() - new Date(r.scheduledEnd).getTime() > 24 * 60 * 60 * 1000).length;
  const noShowCount = rentals.filter((r) => r.status === "no_show").length;
  const cancellationCount = rentals.filter((r) => r.status === "cancelled").length;
  const outstandingAmount = rentals.reduce((sum, r) => sum + Math.max(0, r.totalAmount - r.paidAmount), 0);

  const rentalIds = rentals.map((r) => r.id);
  const damagedAssetCount = await countAssetIncidents(rentalIds, ["damaged"]);
  const missingAssetCount = await countAssetIncidents(rentalIds, ["missing"]);

  return { totalRentals, lateReturnCount, lateOver24hCount, noShowCount, cancellationCount, damagedAssetCount, missingAssetCount, outstandingAmount };
}

/** Recomputes and upserts the risk profile row for a phone number — call after any status change that affects the behavioral signals (return, no-show, cancel, asset damaged/missing) AND after any identity/verification edit (address, photos, WA/address verified, deposit refused, verificationStatus) so riskScore/riskCategory never go stale. Every identity field falls back to the existing row's value when not supplied, so calling this with only `updatedBy` set (e.g. right after a raw field PATCH) simply re-scores using whatever was just saved. Safe no-op if phone is empty. */
export interface RiskProfileIdentity {
  customerId?: string | null;
  customerName?: string | null;
  identityType?: "ktp" | "sim" | "passport" | "other" | null;
  identityNumber?: string | null;
  address?: string | null;
  idPhotoUrl?: string | null;
  selfieWithIdUrl?: string | null;
  waVerified?: boolean;
  addressVerified?: boolean;
  depositRefused?: boolean;
  identityRefused?: boolean;
  verificationStatus?: "unverified" | "verified" | "flagged" | "fraudulent";
  manualAdjustment?: number;
  manualAdjustmentNote?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  // Return-time assessment — only ever passed in by returnHomeRentalRental right after a return;
  // every other caller omits these, so mergeIdentity's "fall back to existing" behavior naturally
  // keeps the last assessment sticking around until the next actual return happens.
  lastAssessmentRating?: number | null;
  lastAssessmentChecklistOk?: boolean | null;
  lastAssessmentNote?: string | null;
  lastAssessmentAt?: string | null;
  lastAssessmentRentalId?: string | null;
  updatedBy?: string;
}

const IDENTITY_FIELDS = [
  "customerId", "customerName", "identityType", "identityNumber", "address", "idPhotoUrl", "selfieWithIdUrl",
  "waVerified", "addressVerified", "depositRefused", "identityRefused", "verificationStatus",
  "manualAdjustment", "manualAdjustmentNote", "emergencyContactName", "emergencyContactPhone",
  "lastAssessmentRating", "lastAssessmentChecklistOk", "lastAssessmentNote", "lastAssessmentAt", "lastAssessmentRentalId",
] as const;

const IDENTITY_DEFAULTS: Record<string, any> = {
  verificationStatus: "unverified", waVerified: false, addressVerified: false, depositRefused: false,
  identityRefused: false, manualAdjustment: 0,
};

function mergeIdentity(extra: RiskProfileIdentity | undefined, existing: Record<string, any> | undefined) {
  const merged: Record<string, any> = {};
  for (const key of IDENTITY_FIELDS) {
    merged[key] = (extra as any)?.[key] !== undefined ? (extra as any)[key] : existing?.[key] ?? IDENTITY_DEFAULTS[key] ?? null;
  }
  return merged as Required<Omit<RiskProfileIdentity, "updatedBy">>;
}

export async function recomputeCustomerRisk(outletId: string, phone: string | null | undefined, extra?: RiskProfileIdentity) {
  if (!phone) return null;
  const signals = await computeCustomerRiskProfile(outletId, phone);
  const now = new Date().toISOString();

  const [existing] = await db
    .select()
    .from(homeRentalCustomerRisk)
    .where(and(eq(homeRentalCustomerRisk.outletId, outletId), eq(homeRentalCustomerRisk.phone, phone)))
    .limit(1);

  const identity = mergeIdentity(extra, existing);
  const identityComplete = !!(identity.customerName && identity.identityNumber && identity.idPhotoUrl && identity.selfieWithIdUrl && identity.address);
  const { riskScore, riskLevel, riskCategory } = await scoreFromSignals(outletId, signals, {
    identityComplete,
    addressClear: !!identity.address,
    addressVerified: identity.addressVerified,
    waVerified: identity.waVerified,
    referenceValid: !!(identity.emergencyContactName && identity.emergencyContactPhone),
    verificationStatus: identity.verificationStatus,
    depositRefused: identity.depositRefused,
    identityRefused: identity.identityRefused,
    manualAdjustment: identity.manualAdjustment,
  });

  if (existing) {
    const [updated] = await db
      .update(homeRentalCustomerRisk)
      .set({
        ...signals,
        ...identity,
        riskScore, riskLevel, riskCategory,
        lastComputedAt: now,
        updatedBy: extra?.updatedBy ?? existing.updatedBy,
        updatedAt: now,
      })
      .where(eq(homeRentalCustomerRisk.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(homeRentalCustomerRisk)
    .values({
      outletId,
      phone,
      ...identity,
      ...signals,
      riskScore, riskLevel, riskCategory,
      lastComputedAt: now,
      updatedBy: extra?.updatedBy,
    })
    .returning();
  return created;
}

/** Throws if the phone is blacklisted for this outlet — call before creating a new booking. No-op (and always passes) while HOME_RENTAL_RISK is OFF, matching the rest of the feature-flag system's "OFF = no gating" convention. */
export async function assertNotBlacklisted(outletId: string, phone: string | null | undefined) {
  if (!phone) return;
  if (!(await isFeatureEnabled(outletId, "HOME_RENTAL_RISK"))) return;
  const [row] = await db
    .select()
    .from(homeRentalCustomerRisk)
    .where(and(eq(homeRentalCustomerRisk.outletId, outletId), eq(homeRentalCustomerRisk.phone, phone)))
    .limit(1);
  if (row?.isBlacklisted) {
    throw new Error(`Nomor ${phone} masuk daftar blacklist Home Rental${row.blacklistReason ? `: ${row.blacklistReason}` : "."} Hubungi Superuser untuk membuka blokir.`);
  }
}

/** Whether a NEW booking for this phone should be held for manual approval — "not_required" whenever risk control is off or the customer's category is Aman/Perlu Perhatian. "Risiko" and "Tolak" (score <60) both go to manual approval rather than an automatic hard block, since a human (Owner/Manager) is the right control point to weigh a Tolak recommendation against context the score can't see — the category is shown clearly on the approval screen either way. */
export async function determineApprovalStatus(outletId: string, phone: string | null | undefined): Promise<"not_required" | "pending"> {
  if (!phone) return "not_required";
  if (!(await isFeatureEnabled(outletId, "HOME_RENTAL_RISK"))) return "not_required";
  const [row] = await db
    .select()
    .from(homeRentalCustomerRisk)
    .where(and(eq(homeRentalCustomerRisk.outletId, outletId), eq(homeRentalCustomerRisk.phone, phone)))
    .limit(1);
  return row?.riskCategory === "risiko" || row?.riskCategory === "tolak" ? "pending" : "not_required";
}

/** Superuser/Manager/Supervisor (approve_requests) decision on a pending-approval rental. Rejecting cancels the booking outright since no payment/asset allocation has happened yet at the booking stage. */
export async function decideRentalApproval(rentalId: string, decision: "approved" | "rejected", staffUserId: string, note?: string) {
  const [rental] = await db.select().from(homeRentalRentals).where(eq(homeRentalRentals.id, rentalId)).limit(1);
  if (!rental) throw new Error("Rental tidak ditemukan.");
  if (rental.approvalStatus !== "pending") throw new Error(`Rental ini tidak sedang menunggu approval (status saat ini: ${rental.approvalStatus}).`);

  const now = new Date().toISOString();
  const [updated] = await db
    .update(homeRentalRentals)
    .set({
      approvalStatus: decision,
      approvedBy: staffUserId,
      approvedAt: now,
      approvalNote: note ?? null,
      ...(decision === "rejected" ? { status: "cancelled" as const, cancelledAt: now, cancelReason: note || "Ditolak pada tahap approval risk-control" } : {}),
      updatedAt: now,
    })
    .where(eq(homeRentalRentals.id, rentalId))
    .returning();

  await logAudit({
    outletId: rental.outletId,
    staffUserId,
    action: decision === "approved" ? "home_rental_approval_approved" : "home_rental_approval_rejected",
    entityType: "home_rental_rental",
    entityId: rental.id,
    before: rental,
    after: updated,
  });
  return updated;
}

/** Manual blacklist toggle — always allowed regardless of flag state (an owner should be able to pre-blacklist a known-bad number even before turning risk control on). */
export async function setBlacklist(outletId: string, phone: string, isBlacklisted: boolean, staffUserId: string, reason?: string) {
  const now = new Date().toISOString();
  const [existing] = await db
    .select()
    .from(homeRentalCustomerRisk)
    .where(and(eq(homeRentalCustomerRisk.outletId, outletId), eq(homeRentalCustomerRisk.phone, phone)))
    .limit(1);

  const patch = {
    isBlacklisted,
    blacklistReason: isBlacklisted ? reason ?? null : null,
    blacklistedBy: isBlacklisted ? staffUserId : null,
    blacklistedAt: isBlacklisted ? now : null,
    updatedBy: staffUserId,
    updatedAt: now,
  };

  let row;
  if (existing) {
    [row] = await db.update(homeRentalCustomerRisk).set(patch).where(eq(homeRentalCustomerRisk.id, existing.id)).returning();
  } else {
    [row] = await db.insert(homeRentalCustomerRisk).values({ outletId, phone, ...patch }).returning();
  }

  await logAudit({
    outletId,
    staffUserId,
    action: isBlacklisted ? "home_rental_blacklisted" : "home_rental_unblacklisted",
    entityType: "home_rental_customer_risk",
    entityId: row.id,
    before: existing ?? null,
    after: row,
  });
  return row;
}
