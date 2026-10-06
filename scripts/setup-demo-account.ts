import "dotenv/config";
import { db } from "../src/db/client";
import { staffUsers, outlets, rentalUnits, products, subscriptions } from "../src/db/schema";
import { and, eq } from "drizzle-orm";
import { grantFreeForever, getOrCreateSubscription } from "../src/lib/subscription/service";
import { recordOpeningStock } from "../src/lib/accounting/inventory-postings";

/**
 * Menyiapkan akun DEMO untuk peninjau Google Play (dan demo ke calon pelanggan).
 *
 * Syarat Google: peninjau harus bisa membuka SEMUA bagian aplikasi tanpa membayar dan tanpa
 * masa percobaan. Script ini TIDAK membuat akun/password (itu tetap lewat /daftar oleh Anda
 * sendiri, supaya outlet, COA, mapping akun, dan billing group tersusun persis seperti outlet
 * sungguhan). Setelah akun dibuat, script ini:
 *   1. menandai email owner sudah terverifikasi (peninjau tidak diminta verifikasi email),
 *   2. memberi status free_forever (akses penuh setara Pro, tanpa trial & tanpa tagihan),
 *   3. mengaktifkan AI Add-on sampai 2099 (opsional, matikan dengan --no-ai),
 *   4. mengisi unit PS (tipe konsol + tarif) dan produk contoh (dengan barcode & stok awal).
 * Aman dijalankan berulang — data contoh hanya ditambahkan kalau belum ada.
 *
 * Pemakaian (dari folder pos-rental-ps, .env berisi DATABASE_URL produksi):
 *   npx tsx scripts/setup-demo-account.ts demo@nexbill.id
 *   npx tsx scripts/setup-demo-account.ts demo@nexbill.id --no-ai
 */

const DEMO_UNITS: { name: string; consoleType: "ps4" | "ps5" | "ps3"; tvType: "android_tv" | "smart_tv" | "analog_tv"; hourlyRate: number }[] = [
  { name: "PS 1", consoleType: "ps4", tvType: "android_tv", hourlyRate: 6000 },
  { name: "PS 2", consoleType: "ps4", tvType: "android_tv", hourlyRate: 6000 },
  { name: "PS 3", consoleType: "ps5", tvType: "smart_tv", hourlyRate: 10000 },
  { name: "PS 4 VIP", consoleType: "ps5", tvType: "smart_tv", hourlyRate: 15000 },
];

const DEMO_PRODUCTS: { name: string; category: string; price: number; costPrice: number; stockQty: number; unit: string; barcode: string | null; sendToKitchen: boolean }[] = [
  { name: "Indomie Goreng", category: "food", price: 8000, costPrice: 3500, stockQty: 40, unit: "pcs", barcode: null, sendToKitchen: true },
  { name: "Nasi Goreng", category: "food", price: 15000, costPrice: 7000, stockQty: 20, unit: "porsi", barcode: null, sendToKitchen: true },
  { name: "Es Teh Manis", category: "drink", price: 5000, costPrice: 1500, stockQty: 50, unit: "gelas", barcode: null, sendToKitchen: true },
  { name: "Air Mineral 600ml", category: "drink", price: 5000, costPrice: 2500, stockQty: 48, unit: "botol", barcode: "8886008101053", sendToKitchen: false },
  { name: "Kopi Susu Sachet", category: "coffee", price: 6000, costPrice: 2000, stockQty: 30, unit: "gelas", barcode: null, sendToKitchen: true },
  { name: "Keripik Kentang", category: "snack", price: 10000, costPrice: 6000, stockQty: 24, unit: "pcs", barcode: "8992388110012", sendToKitchen: false },
];

async function main() {
  const args = process.argv.slice(2);
  const email = (args.find((a) => !a.startsWith("--")) ?? "demo@nexbill.id").toLowerCase().trim();
  const withAi = !args.includes("--no-ai");

  const [owner] = await db.select().from(staffUsers).where(eq(staffUsers.email, email)).limit(1);
  if (!owner) {
    console.error(`❌ Akun ${email} belum ada. Daftar dulu di https://dashboard.nexbill.id/daftar dengan email ini, lalu jalankan script ini lagi.`);
    process.exit(1);
  }
  const outletId = owner.outletId;
  const [outlet] = await db.select().from(outlets).where(eq(outlets.id, outletId)).limit(1);
  console.log(`Akun: ${owner.name} <${email}> (role ${owner.role}) · outlet "${outlet?.name}" (${outletId})`);
  if (owner.role !== "owner" && owner.role !== "superuser") {
    console.warn(`⚠ Role akun ini "${owner.role}". Untuk peninjau sebaiknya Owner supaya semua menu terlihat.`);
  }

  // 1) Email terverifikasi.
  await db.update(staffUsers).set({ emailVerified: true, emailVerifiedAt: new Date().toISOString() }).where(eq(staffUsers.id, owner.id));
  console.log("✅ Email ditandai terverifikasi.");

  // 2) Akses penuh tanpa trial.
  await grantFreeForever(outletId, "scripts/setup-demo-account.ts", "Akun demo untuk peninjau Google Play — akses penuh tanpa trial.");
  console.log("✅ Langganan: free_forever (akses penuh, tanpa trial, tanpa tagihan).");

  // 3) AI Add-on (opsional).
  if (withAi) {
    const sub = await getOrCreateSubscription(outletId);
    await db.update(subscriptions).set({ aiAddonActive: true, aiAddonPeriodEnd: "2099-12-31T23:59:59.000Z" }).where(eq(subscriptions.id, sub.id));
    console.log("✅ AI Add-on aktif sampai 2099 (pemakaian AI memakai kuota API Anthropic Anda).");
  }

  // 4a) Unit PS: rapikan unit hasil pendaftaran, atau buat unit contoh.
  const units = await db.select().from(rentalUnits).where(and(eq(rentalUnits.outletId, outletId), eq(rentalUnits.isActive, true)));
  if (units.length === 0) {
    await db.insert(rentalUnits).values(DEMO_UNITS.map((u) => ({ ...u, outletId, note: "Unit demo" })));
    console.log(`✅ ${DEMO_UNITS.length} unit PS demo dibuat.`);
  } else {
    let fixed = 0;
    for (const [i, u] of units.entries()) {
      if (u.hourlyRate > 0) continue;
      const tpl = DEMO_UNITS[i % DEMO_UNITS.length];
      await db.update(rentalUnits).set({ consoleType: tpl.consoleType, hourlyRate: tpl.hourlyRate }).where(eq(rentalUnits.id, u.id));
      fixed++;
    }
    console.log(fixed ? `✅ ${fixed} unit diberi tipe konsol & tarif contoh.` : "• Unit sudah punya tarif — tidak diubah.");
  }

  // 4b) Produk contoh + stok awal (jurnal persediaan ikut tercatat).
  const existing = await db.select({ name: products.name }).from(products).where(eq(products.outletId, outletId));
  const have = new Set(existing.map((p) => p.name.toLowerCase()));
  const toCreate = DEMO_PRODUCTS.filter((p) => !have.has(p.name.toLowerCase()));
  if (toCreate.length) {
    await db.transaction(async (tx) => {
      const created = await tx.insert(products).values(toCreate.map((p) => ({ ...p, outletId, lowStockThreshold: 5, isActive: true }))).returning();
      await recordOpeningStock(outletId, created, owner.id, tx);
    });
    console.log(`✅ ${toCreate.length} produk contoh dibuat (stok awal + jurnal persediaan).`);
  } else {
    console.log("• Produk contoh sudah ada — dilewati.");
  }

  console.log("\nSelesai. Langkah berikutnya:");
  console.log("  1. Login sekali di HP/browser dengan akun demo, buat 1–2 transaksi rental & kasir supaya laporan berisi.");
  console.log("  2. Logout. Jangan pakai akun ini selama masa review (1 akun = 1 sesi aktif).");
  console.log("  3. Isi email & password akun demo di Play Console → Sign in details.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
