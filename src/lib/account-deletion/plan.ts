import type { PgTable } from "drizzle-orm/pg-core";
import {
  customers,
  rentalSessions,
  bookings,
  bookingNotifications,
  ppobTransactions,
  homeRentalRentals,
  homeRentalCustomerRisk,
  suppliers,
  smartPlugOrders,
  marketplaceListings,
  marketplaceOutletTrust,
  paymentMethods,
} from "@/db/schema";

/**
 * Daftar kolom berisi data pribadi yang dihapus/dianonimkan saat purge akun (Kebijakan Privasi
 * bagian 8). Kolom nullable → NULL; kolom wajib-isi teks → "dihapus-<id>" (unik per baris).
 * Baris transaksi, invoice, dan angka keuangan TIDAK dihapus (kewajiban pencatatan), hanya
 * identitasnya. fileCols = URL file di Supabase Storage yang ikut dihapus.
 * Divalidasi oleh plan.test.ts — setiap kolom harus benar-benar ada di schema.
 * Tambahkan di sini setiap kali ada tabel/kolom baru berisi data pribadi.
 */
export interface AnonymizeStep {
  label: string;
  table: PgTable;
  /** Kolom yang memuat outletId untuk filter. */
  outletKey: string;
  cols: string[];
  fileCols?: string[];
}

export const ANONYMIZE_PLAN: AnonymizeStep[] = [
  { label: "Pelanggan", table: customers, outletKey: "outletId", cols: ["name", "phone", "email", "instagramHandle", "waJid", "notes"] },
  { label: "Sesi rental", table: rentalSessions, outletKey: "outletId", cols: ["customerName"] },
  { label: "Booking", table: bookings, outletKey: "outletId", cols: ["customerName", "phone", "notes"] },
  { label: "Notifikasi booking", table: bookingNotifications, outletKey: "outletId", cols: ["phone"] },
  { label: "Transaksi PPOB", table: ppobTransactions, outletKey: "outletId", cols: ["customerName", "serviceRef", "notes"] },
  {
    label: "Rental ke rumah",
    table: homeRentalRentals,
    outletKey: "outletId",
    cols: [
      "customerName", "phone", "address", "deliveryAddress", "notes", "customerIdentityNumber", "customerIdentityImageUrl",
      "parentIdentityNumber", "parentIdentityImageUrl", "verificationNote", "damageNote", "approvalNote", "returnRatingNote",
    ],
    fileCols: ["customerIdentityImageUrl", "parentIdentityImageUrl"],
  },
  {
    label: "Data verifikasi penyewa",
    table: homeRentalCustomerRisk,
    outletKey: "outletId",
    cols: ["phone", "customerName", "identityNumber", "address", "idPhotoUrl", "selfieWithIdUrl", "emergencyContactPhone", "notes", "manualAdjustmentNote", "lastAssessmentNote"],
    fileCols: ["idPhotoUrl", "selfieWithIdUrl"],
  },
  { label: "Supplier", table: suppliers, outletKey: "outletId", cols: ["phone", "address", "notes"] },
  { label: "Pengiriman smart plug", table: smartPlugOrders, outletKey: "outletId", cols: ["contactName", "contactPhone", "shippingAddress", "notes"] },
  { label: "Iklan marketplace", table: marketplaceListings, outletKey: "outletId", cols: ["contactPhone"] },
  { label: "Rekening marketplace", table: marketplaceOutletTrust, outletKey: "outletId", cols: ["bankAccountNumber", "bankAccountHolder"] },
  { label: "Metode pembayaran outlet", table: paymentMethods, outletKey: "outletId", cols: ["bankAccountNumber", "bankAccountHolder", "qrisImageUrl"], fileCols: ["qrisImageUrl"] },
];

/** Kolom data pribadi pada tabel outlets (diproses terpisah karena difilter berdasarkan id). */
export const OUTLET_PII_COLS = [
  "address", "phone", "logoUrl", "wifiSsid", "wifiPassword", "bankName", "bankSwiftCode", "bankAccountNumber", "bankAccountHolderName",
  "npwpNumber", "nitku", "taxpayerName", "taxpayerAddress", "onboardingProfile", "receiptFooterText", "tuyaAccessId", "tuyaAccessSecret",
  "tuyaProjectCode", "slug",
];
