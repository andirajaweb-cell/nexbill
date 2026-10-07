"use client";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { KATEGORI_LABEL, KONDISI_LABEL, STATUS_DEAL_LABEL, type DealStatus } from "@/lib/marketplace/ujrah";
import { ALASAN_TARIK, type AlasanTarik } from "@/lib/marketplace/anti-bypass";
import { AMBANG, KATEGORI_ADUAN, KEPUTUSAN_ADUAN, LABEL_LEVEL, TIPS_TRANSAKSI_AMAN, type KategoriAduan, type LevelKepercayaan } from "@/lib/marketplace/trust";
import "@/lib/i18n/dict-marketplace";

/**
 * Label Marketplace dalam bahasa dashboard. Label sumbernya (Bahasa Indonesia) tetap di lib/marketplace
 * karena server juga memakainya; di layar setiap kode diterjemahkan lewat key eksplisit di bawah
 * (sengaja tidak dirakit dari template string, supaya test cakupan i18n bisa memeriksa setiap key).
 */

const KATEGORI_KEY: Record<string, string> = {
  controller: "marketplace.category.controller",
  console: "marketplace.category.console",
  cable: "marketplace.category.cable",
  tv: "marketplace.category.tv",
  furniture: "marketplace.category.furniture",
  accessory: "marketplace.category.accessory",
  other: "marketplace.category.other",
};

const KONDISI_KEY: Record<string, string> = {
  new: "marketplace.condition.new",
  like_new: "marketplace.condition.likeNew",
  used: "marketplace.condition.used",
  needs_repair: "marketplace.condition.needsRepair",
};

const STATUS_DEAL_KEY: Record<DealStatus, string> = {
  requested: "marketplace.dealStatus.requested",
  accepted: "marketplace.dealStatus.accepted",
  completed: "marketplace.dealStatus.completed",
  rejected: "marketplace.dealStatus.rejected",
  cancelled: "marketplace.dealStatus.cancelled",
};

const ALASAN_TARIK_KEY: Record<AlasanTarik, string> = {
  sold_outside: "marketplace.withdrawReason.soldOutside",
  not_selling: "marketplace.withdrawReason.notSelling",
  damaged: "marketplace.withdrawReason.damaged",
  other: "marketplace.withdrawReason.other",
};

const KATEGORI_ADUAN_KEY: Record<KategoriAduan, string> = {
  not_delivered: "marketplace.disputeCategory.notDelivered",
  not_as_described: "marketplace.disputeCategory.notAsDescribed",
  payment_not_received: "marketplace.disputeCategory.paymentNotReceived",
  fake_proof: "marketplace.disputeCategory.fakeProof",
  wrong_account: "marketplace.disputeCategory.wrongAccount",
  unresponsive: "marketplace.disputeCategory.unresponsive",
  other: "marketplace.disputeCategory.other",
};

const KEPUTUSAN_ADUAN_KEY: Record<string, string> = {
  dismissed: "marketplace.disputeResolution.dismissed",
  warning: "marketplace.disputeResolution.warning",
  suspended: "marketplace.disputeResolution.suspended",
};

const LEVEL_KEY: Record<LevelKepercayaan, string> = {
  suspended: "marketplace.trustLevel.suspended",
  caution: "marketplace.trustLevel.caution",
  new: "marketplace.trustLevel.new",
  active: "marketplace.trustLevel.active",
  trusted: "marketplace.trustLevel.trusted",
};

/** Urutan sama dengan TIPS_TRANSAKSI_AMAN di lib/marketplace/trust.ts. */
const TIPS_KEYS = [
  "marketplace.tips.checkProfile",
  "marketplace.tips.preferCod",
  "marketplace.tips.lockedAccountOnly",
  "marketplace.tips.uploadProof",
  "marketplace.tips.startSmall",
  "marketplace.tips.honestCondition",
  "marketplace.tips.markDoneLast",
];

/** cariKontakDalamTeks() mengembalikan jenis kontak dalam Bahasa Indonesia; ini terjemahannya. */
const JENIS_KONTAK_KEY: Record<string, string> = {
  "nomor HP": "marketplace.contactKind.phone",
  "link WhatsApp": "marketplace.contactKind.whatsapp",
  Telegram: "marketplace.contactKind.telegram",
  "akun media sosial": "marketplace.contactKind.social",
  "alamat email": "marketplace.contactKind.email",
  "link situs": "marketplace.contactKind.website",
};

/** Bentuk profil kepercayaan yang dikirim server (lib/marketplace/trust.ts → ProfilKepercayaan). */
export interface ProfilTampil {
  level: LevelKepercayaan;
  ageDays: number;
  completedDeals: number;
  avgRating: number | null;
  ratingCount: number;
  provenDisputes: number;
  openDisputesAgainst: number;
  isNew: boolean;
  subscriptionActive: boolean;
}

export function useMarketplaceLabels() {
  const { t, lang } = useDashboardLang();
  const pick = (keys: Record<string, string>, source: Record<string, string>, code: string) => (keys[code] ? t(keys[code], source[code] ?? code) : source[code] ?? code);
  return {
    t,
    lang,
    kategori: (k: string) => pick(KATEGORI_KEY, KATEGORI_LABEL, k),
    kondisi: (k: string) => pick(KONDISI_KEY, KONDISI_LABEL, k),
    statusDeal: (k: DealStatus) => pick(STATUS_DEAL_KEY, STATUS_DEAL_LABEL, k),
    alasanTarik: (k: string) => pick(ALASAN_TARIK_KEY, ALASAN_TARIK, k),
    kategoriAduan: (k: string) => pick(KATEGORI_ADUAN_KEY, KATEGORI_ADUAN, k),
    keputusanAduan: (k: string) => pick(KEPUTUSAN_ADUAN_KEY, KEPUTUSAN_ADUAN, k),
    level: (k: string) => pick(LEVEL_KEY, LABEL_LEVEL, k),
    jenisKontak: (jenis: string) => (JENIS_KONTAK_KEY[jenis] ? t(JENIS_KONTAK_KEY[jenis], jenis) : jenis),
    tips: TIPS_TRANSAKSI_AMAN.map((tip, i) => (TIPS_KEYS[i] ? t(TIPS_KEYS[i], tip) : tip)),
    kategoriKeys: Object.keys(KATEGORI_LABEL),
    kondisiKeys: Object.keys(KONDISI_LABEL),
    alasanTarikKeys: Object.keys(ALASAN_TARIK) as AlasanTarik[],
    kategoriAduanKeys: Object.keys(KATEGORI_ADUAN) as KategoriAduan[],
    /**
     * Peringatan profil dalam bahasa dashboard. Server mengirim `peringatan` berbahasa Indonesia
     * (hitungProfilKepercayaan); syaratnya sama persis di sini, disusun ulang dari angka profil.
     */
    peringatan: (p: ProfilTampil | null | undefined): string[] => {
      if (!p) return [];
      const out: string[] = [];
      if (p.provenDisputes > 0) out.push(t("marketplace.warning.provenDisputes", "Pernah terbukti bermasalah dalam {n} aduan.").replace("{n}", String(p.provenDisputes)));
      if (p.openDisputesAgainst > 0) out.push(t("marketplace.warning.openDisputes", "Sedang menghadapi {n} aduan yang belum diputuskan.").replace("{n}", String(p.openDisputesAgainst)));
      if (p.avgRating !== null && p.ratingCount >= 3 && p.avgRating < AMBANG.RATING_WASPADA) {
        out.push(t("marketplace.warning.lowRating", "Rating rendah ({rating} dari {n} ulasan).").replace("{rating}", String(p.avgRating)).replace("{n}", String(p.ratingCount)));
      }
      if (!p.subscriptionActive) out.push(t("marketplace.warning.subscriptionInactive", "Langganan NEXBILL outlet ini tidak aktif."));
      if (p.isNew) out.push(t("marketplace.warning.newAccount", "Akun NEXBILL baru ({n} hari) — belum punya riwayat.").replace("{n}", String(p.ageDays)));
      else if (p.completedDeals === 0) out.push(t("marketplace.warning.noCompletedDeals", "Belum punya riwayat transaksi Marketplace yang selesai."));
      return out;
    },
  };
}
