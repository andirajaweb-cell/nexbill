import { db } from "@/db/client";
import { homeRentalPolicyRules } from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";

/**
 * Per-outlet EDITABLE Home Rental policy defaults — every merchant/outlet can edit, add, or
 * delete these from the Kebijakan tab; what's here is only what gets lazily seeded the first
 * time an outlet's policy is read for a given category (see ensureSeeded below), never
 * re-applied afterward. Numbers match the owner's own "rental PS dibawa pulang" playbook.
 */
export type PolicyCategory = "risk_weight" | "deposit_loyalty_tier" | "late_fee_tier" | "delivery_distance_tier" | "damage_rule" | "checklist_item" | "printed_rule";

interface DefaultRule {
  category: PolicyCategory;
  key?: string;
  productType?: "ps3" | "ps4" | "ps5" | "playbook" | "tv32" | "tv40" | "tv43" | "accessory" | "any";
  label: string;
  numericValue?: number;
  threshold?: number | null;
  chargeFullDay?: boolean;
  note?: string;
  sortOrder: number;
}

const DEFAULT_POLICY_RULES: DefaultRule[] = [
  // ---- risk_weight (Customer Risk Score, 100 poin) ----
  { category: "risk_weight", key: "identity_complete", label: "Identitas lengkap & valid", numericValue: 20, sortOrder: 1 },
  { category: "risk_weight", key: "wa_active", label: "Nomor WhatsApp aktif", numericValue: 10, sortOrder: 2 },
  { category: "risk_weight", key: "address_clear", label: "Alamat tempat tinggal jelas", numericValue: 15, sortOrder: 3 },
  { category: "risk_weight", key: "address_verified", label: "Alamat bisa diverifikasi", numericValue: 10, sortOrder: 4 },
  { category: "risk_weight", key: "good_history", label: "Customer lama & riwayat baik", numericValue: 20, sortOrder: 5 },
  { category: "risk_weight", key: "on_time_history", label: "Pernah rental dan tepat waktu", numericValue: 15, sortOrder: 6 },
  { category: "risk_weight", key: "reference_valid", label: "Referensi/kontak tambahan valid", numericValue: 10, sortOrder: 7 },
  { category: "risk_weight", key: "late_once", label: "Pernah terlambat", numericValue: -10, sortOrder: 8 },
  { category: "risk_weight", key: "late_over_24h", label: "Terlambat lebih dari 24 jam", numericValue: -20, sortOrder: 9 },
  { category: "risk_weight", key: "damaged_controller", label: "Pernah merusakkan controller", numericValue: -15, sortOrder: 10 },
  { category: "risk_weight", key: "lost_accessory", label: "Pernah menghilangkan aksesori", numericValue: -15, sortOrder: 11 },
  { category: "risk_weight", key: "unclear_data", label: "Data/alamat tidak jelas", numericValue: -20, sortOrder: 12 },
  { category: "risk_weight", key: "refuse_identity", label: "Menolak menunjukkan identitas", numericValue: -30, sortOrder: 13 },
  { category: "risk_weight", key: "refuse_deposit", label: "Menolak deposit", numericValue: -30, sortOrder: 14 },
  { category: "risk_weight", key: "fake_data", label: "Memberikan data palsu", numericValue: -50, sortOrder: 15 },

  // ---- deposit_loyalty_tier — numericValue = fraksi dari deposit dasar produk/paket (defaultDepositAmount) ----
  { category: "deposit_loyalty_tier", label: "3x rental lancar tanpa masalah", numericValue: 0.65, threshold: 3, note: "~65% dari deposit dasar", sortOrder: 1 },
  { category: "deposit_loyalty_tier", label: "5x rental lancar tanpa masalah", numericValue: 0.45, threshold: 5, note: "~45% dari deposit dasar", sortOrder: 2 },

  // ---- late_fee_tier — PS3 (asumsi rental Rp50.000/hari) ----
  { category: "late_fee_tier", productType: "ps3", label: "Telat < 3 jam", numericValue: 10000, threshold: 3, sortOrder: 1 },
  { category: "late_fee_tier", productType: "ps3", label: "Telat 3–6 jam", numericValue: 20000, threshold: 6, sortOrder: 2 },
  { category: "late_fee_tier", productType: "ps3", label: "Telat 6–12 jam", numericValue: 30000, threshold: 12, sortOrder: 3 },
  { category: "late_fee_tier", productType: "ps3", label: "Telat > 12 jam", numericValue: 0, threshold: null, chargeFullDay: true, note: "Dihitung 1 hari tambahan", sortOrder: 4 },
  // ---- late_fee_tier — PS4 (asumsi rental Rp75.000/hari) ----
  { category: "late_fee_tier", productType: "ps4", label: "Telat < 3 jam", numericValue: 15000, threshold: 3, sortOrder: 1 },
  { category: "late_fee_tier", productType: "ps4", label: "Telat 3–6 jam", numericValue: 30000, threshold: 6, sortOrder: 2 },
  { category: "late_fee_tier", productType: "ps4", label: "Telat 6–12 jam", numericValue: 50000, threshold: 12, sortOrder: 3 },
  { category: "late_fee_tier", productType: "ps4", label: "Telat > 12 jam", numericValue: 0, threshold: null, chargeFullDay: true, note: "Dihitung 1 hari tambahan", sortOrder: 4 },

  // ---- delivery_distance_tier — threshold = jarak maksimum (km), numericValue = biaya antar-jemput Rp ----
  { category: "delivery_distance_tier", label: "0–3 km", numericValue: 0, threshold: 3, note: "Gratis dalam radius toko", sortOrder: 1 },
  { category: "delivery_distance_tier", label: "3–5 km", numericValue: 10000, threshold: 5, sortOrder: 2 },
  { category: "delivery_distance_tier", label: "5–10 km", numericValue: 20000, threshold: 10, sortOrder: 3 },
  { category: "delivery_distance_tier", label: "10–15 km", numericValue: 35000, threshold: 15, sortOrder: 4 },
  { category: "delivery_distance_tier", label: "> 15 km", numericValue: 50000, threshold: null, note: "Konfirmasi manual untuk jarak jauh", sortOrder: 5 },

  // ---- damage_rule (referensi, tidak otomatis memotong deposit) ----
  { category: "damage_rule", label: "Analog drift ringan", note: "Perbaikan", sortOrder: 1 },
  { category: "damage_rule", label: "Tombol controller rusak", note: "Perbaikan", sortOrder: 2 },
  { category: "damage_rule", label: "Body controller pecah", note: "Ganti komponen", sortOrder: 3 },
  { category: "damage_rule", label: "Controller mati karena kelalaian", note: "Perbaikan/ganti", sortOrder: 4 },
  { category: "damage_rule", label: "Controller hilang", note: "Ganti sesuai nilai controller", sortOrder: 5 },
  { category: "damage_rule", label: "Kabel HDMI hilang/rusak", note: "Ganti Rp50.000–100.000", sortOrder: 6 },
  { category: "damage_rule", label: "Kabel charging hilang/rusak", note: "Ganti Rp30.000–50.000", sortOrder: 7 },
  { category: "damage_rule", label: "Kabel power hilang/rusak", note: "Ganti Rp50.000–100.000", sortOrder: 8 },
  { category: "damage_rule", label: "PS terkena air/jatuh/pecah/dibongkar/segel rusak", note: "Customer bertanggung jawab atas biaya perbaikan/penggantian wajar berdasarkan hasil pemeriksaan; jika butuh teknisi, deposit ditahan sementara sampai hasil keluar.", sortOrder: 9 },
  { category: "damage_rule", label: "Kerusakan wear and tear normal (pemakaian wajar)", note: "Tanggung jawab pemilik usaha, BUKAN customer.", sortOrder: 10 },

  // ---- checklist_item (serah terima) ----
  { category: "checklist_item", label: "PS Menyala", sortOrder: 1 },
  { category: "checklist_item", label: "HDMI Berfungsi", sortOrder: 2 },
  { category: "checklist_item", label: "Power Berfungsi", sortOrder: 3 },
  { category: "checklist_item", label: "USB Berfungsi", sortOrder: 4 },
  { category: "checklist_item", label: "Storage Terbaca", sortOrder: 5 },
  { category: "checklist_item", label: "Kondisi Fisik PS (Tidak Ada Kerusakan)", sortOrder: 6 },
  { category: "checklist_item", label: "Analog Kiri & Kanan", sortOrder: 7 },
  { category: "checklist_item", label: "Tombol Aksi (X/O/Kotak/Segitiga)", sortOrder: 8 },
  { category: "checklist_item", label: "D-Pad", sortOrder: 9 },
  { category: "checklist_item", label: "L1/L2/R1/R2", sortOrder: 10 },
  { category: "checklist_item", label: "Tombol PS & Charging Controller", sortOrder: 11 },
  { category: "checklist_item", label: "Kabel HDMI", sortOrder: 12 },
  { category: "checklist_item", label: "Kabel Power", sortOrder: 13 },
  { category: "checklist_item", label: "Kabel Charging", sortOrder: 14 },
  { category: "checklist_item", label: "Tas/Koper", sortOrder: 15 },

  // ---- printed_rule ("ATURAN RENTAL PS DIBAWA PULANG") ----
  { category: "printed_rule", label: "Identitas customer wajib diverifikasi.", sortOrder: 1 },
  { category: "printed_rule", label: "Deposit wajib dibayarkan sebelum barang dibawa.", sortOrder: 2 },
  { category: "printed_rule", label: "Customer wajib mengembalikan barang sesuai tanggal dan jam yang disepakati.", sortOrder: 3 },
  { category: "printed_rule", label: "Customer bertanggung jawab menjaga seluruh perangkat selama masa rental.", sortOrder: 4 },
  { category: "printed_rule", label: "Kerusakan akibat kelalaian customer menjadi tanggung jawab customer.", sortOrder: 5 },
  { category: "printed_rule", label: "Barang hilang wajib diganti sesuai nilai penggantian yang wajar.", sortOrder: 6 },
  { category: "printed_rule", label: "Barang tidak boleh dibongkar atau diperbaiki sendiri.", sortOrder: 7 },
  { category: "printed_rule", label: "Kerusakan yang terjadi karena pemakaian normal akan diperiksa terlebih dahulu.", sortOrder: 8 },
  { category: "printed_rule", label: "Deposit dikembalikan setelah seluruh barang selesai diperiksa.", sortOrder: 9 },
  { category: "printed_rule", label: "Untuk kerusakan yang membutuhkan pemeriksaan teknisi, pengembalian deposit dilakukan setelah biaya kerusakan diketahui.", sortOrder: 10 },
  { category: "printed_rule", label: "Perpanjangan rental wajib dikonfirmasi sebelum masa rental berakhir.", sortOrder: 11 },
  { category: "printed_rule", label: "Tidak ada perpanjangan otomatis tanpa persetujuan admin.", sortOrder: 12 },
];

/** Lazily seeds an outlet's defaults for one category the first time it's read — never re-applied once any row exists for that (outlet, category), so an owner's edits/deletes stick permanently. */
async function ensureSeeded(outletId: string, category: PolicyCategory) {
  const existing = await db.select({ id: homeRentalPolicyRules.id }).from(homeRentalPolicyRules).where(and(eq(homeRentalPolicyRules.outletId, outletId), eq(homeRentalPolicyRules.category, category))).limit(1);
  if (existing.length > 0) return;
  const defaults = DEFAULT_POLICY_RULES.filter((r) => r.category === category);
  if (!defaults.length) return;
  await db.insert(homeRentalPolicyRules).values(
    defaults.map((r) => ({
      outletId,
      category: r.category,
      key: r.key ?? null,
      productType: r.productType ?? null,
      label: r.label,
      numericValue: r.numericValue ?? 0,
      threshold: r.threshold ?? null,
      chargeFullDay: r.chargeFullDay ?? false,
      note: r.note ?? null,
      sortOrder: r.sortOrder,
    }))
  );
}

export async function getPolicyRules(outletId: string, category: PolicyCategory, activeOnly = true) {
  await ensureSeeded(outletId, category);
  const rows = await db
    .select()
    .from(homeRentalPolicyRules)
    .where(activeOnly ? and(eq(homeRentalPolicyRules.outletId, outletId), eq(homeRentalPolicyRules.category, category), eq(homeRentalPolicyRules.isActive, true)) : and(eq(homeRentalPolicyRules.outletId, outletId), eq(homeRentalPolicyRules.category, category)))
    .orderBy(asc(homeRentalPolicyRules.sortOrder));
  return rows;
}

/** Best-matching deposit-loyalty tier for a customer's clean rental count — highest threshold they qualify for. Returns the suggested deposit amount (fraction x baseDeposit), or baseDeposit unchanged if no tier matches (new/low-history customer). */
export async function computeSuggestedDeposit(outletId: string, baseDepositAmount: number, cleanRentalCount: number): Promise<{ amount: number; tierLabel: string | null }> {
  const tiers = await getPolicyRules(outletId, "deposit_loyalty_tier");
  const qualifying = tiers.filter((t) => (t.threshold ?? Infinity) <= cleanRentalCount).sort((a, b) => (b.threshold ?? 0) - (a.threshold ?? 0));
  const best = qualifying[0];
  if (!best) return { amount: baseDepositAmount, tierLabel: null };
  return { amount: Math.round(baseDepositAmount * best.numericValue), tierLabel: best.label };
}

/** Best-matching late-fee tier for a product type + hours late. Returns the suggested fee, or a "charge one extra day" signal (dailyRate must be supplied by the caller, since this module doesn't know product pricing). null = no configured tier for this product type (owner hasn't set one, e.g. PS5/TV) — caller should fall back to manual entry. */
export async function computeSuggestedLateFee(outletId: string, productType: string, hoursLate: number, dailyRate: number): Promise<{ amount: number; tierLabel: string } | null> {
  if (hoursLate <= 0) return null;
  const tiers = await getPolicyRules(outletId, "late_fee_tier");
  const forProduct = tiers.filter((t) => t.productType === productType);
  if (!forProduct.length) return null;
  const bracket = forProduct.filter((t) => t.threshold !== null).sort((a, b) => (a.threshold ?? 0) - (b.threshold ?? 0)).find((t) => hoursLate <= (t.threshold ?? Infinity));
  if (bracket) return { amount: bracket.numericValue, tierLabel: bracket.label };
  const catchAll = forProduct.find((t) => t.threshold === null);
  if (catchAll) return { amount: catchAll.chargeFullDay ? dailyRate : catchAll.numericValue, tierLabel: catchAll.label };
  return null;
}

/** Best-matching delivery/pickup distance tier — smallest threshold the distance still qualifies for wins, falling through to the unbounded (threshold=null) tier if the distance exceeds every configured bracket. Returns null only if the outlet has no tiers configured at all (shouldn't happen once seeded), so callers should fall back to the product/package's own flat deliveryFee in that case. */
export async function computeDeliveryFee(outletId: string, distanceKm: number): Promise<{ amount: number; tierLabel: string } | null> {
  const tiers = await getPolicyRules(outletId, "delivery_distance_tier");
  if (!tiers.length) return null;
  const bracket = tiers.filter((t) => t.threshold !== null).sort((a, b) => (a.threshold ?? 0) - (b.threshold ?? 0)).find((t) => distanceKm <= (t.threshold ?? Infinity));
  if (bracket) return { amount: bracket.numericValue, tierLabel: bracket.label };
  const catchAll = tiers.find((t) => t.threshold === null);
  if (catchAll) return { amount: catchAll.numericValue, tierLabel: catchAll.label };
  return null;
}
