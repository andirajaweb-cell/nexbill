import "dotenv/config";
import { db } from "../src/db/client";
import {
  outlets, rentalUnits, products, promos, staffUsers, agentSettings, devices,
  membershipTiers, warehouses, suppliers, recipes, recipeIngredients, pricingRules, vouchers,
} from "../src/db/schema";
import bcrypt from "bcryptjs";
import { seedChartOfAccounts } from "../src/lib/accounting/coa";
import { ensureDefaultPlan, ensureDefaultProducts, getOrCreateSubscription } from "../src/lib/subscription/service";

async function main() {
  console.log("Seeding database...");

  const [outlet] = await db
    .insert(outlets)
    .values({
      name: "POS Rental PS - Cabang Utama",
      address: "Jl. Contoh No. 1",
      phone: "081234567890",
      wifiSsid: "RentalPS-Guest",
      wifiPassword: "rentalps123",
      billingRoundingMinutes: 15,
      serviceChargePercent: 5,
      taxPercent: 10,
    })
    .returning();

  await seedChartOfAccounts(outlet.id);

  await db.insert(staffUsers).values([
    { outletId: outlet.id, name: "Superuser", email: "owner@rentalps.local", passwordHash: await bcrypt.hash("changeme123", 10), role: "superuser" },
    { outletId: outlet.id, name: "Kasir Shift Pagi", email: "kasir@rentalps.local", passwordHash: await bcrypt.hash("changeme123", 10), role: "cashier" },
  ]);

  const deviceRows = await db
    .insert(devices)
    .values([
      { outletId: outlet.id, name: "Plug Bilik 1", protocol: "tasmota_mqtt", mqttTopic: "plug_bilik1" },
      { outletId: outlet.id, name: "Plug Bilik 2", protocol: "tasmota_mqtt", mqttTopic: "plug_bilik2" },
      { outletId: outlet.id, name: "Plug Bilik 3", protocol: "tasmota_mqtt", mqttTopic: "plug_bilik3" },
    ])
    .returning();

  await db.insert(rentalUnits).values([
    { outletId: outlet.id, name: "Bilik 1", consoleType: "ps4", tvType: "android_tv", hourlyRate: 8000, deviceId: deviceRows[0].id },
    { outletId: outlet.id, name: "Bilik 2", consoleType: "ps5", tvType: "smart_tv", hourlyRate: 12000, deviceId: deviceRows[1].id },
    { outletId: outlet.id, name: "Bilik 3", consoleType: "ps3", tvType: "analog_tv", hourlyRate: 5000, deviceId: deviceRows[2].id },
  ]);

  const [warehouse] = await db.insert(warehouses).values({ outletId: outlet.id, name: "Gudang Utama", isDefault: true }).returning();

  const productRows = await db
    .insert(products)
    .values([
      { outletId: outlet.id, name: "Mie Goreng", category: "food", price: 12000, costPrice: 7000, stockQty: 30, unit: "porsi", warehouseId: warehouse.id },
      { outletId: outlet.id, name: "Nasi Goreng", category: "food", price: 13000, costPrice: 8000, stockQty: 30, unit: "porsi", warehouseId: warehouse.id },
      { outletId: outlet.id, name: "Es Teh Manis", category: "drink", price: 5000, costPrice: 1500, stockQty: 50, unit: "gelas", warehouseId: warehouse.id },
      { outletId: outlet.id, name: "Kopi Hitam", category: "drink", price: 6000, costPrice: 2000, stockQty: 50, unit: "gelas", warehouseId: warehouse.id },
      { outletId: outlet.id, name: "Keripik Kentang", category: "snack", price: 8000, costPrice: 5000, stockQty: 20, unit: "pcs", warehouseId: warehouse.id },
      { outletId: outlet.id, name: "Stick Setir Tambahan", category: "device_rental", price: 5000, costPrice: 0, stockQty: 10, unit: "unit", warehouseId: warehouse.id },
      // Raw materials for the BOM/HPP demo on "Kopi Hitam":
      { outletId: outlet.id, name: "Bubuk Kopi", category: "raw_material", price: 0, costPrice: 80, stockQty: 2000, unit: "gram", warehouseId: warehouse.id },
      { outletId: outlet.id, name: "Gula", category: "raw_material", price: 0, costPrice: 12, stockQty: 5000, unit: "gram", warehouseId: warehouse.id },
      { outletId: outlet.id, name: "Cup Plastik", category: "raw_material", price: 0, costPrice: 300, stockQty: 500, unit: "pcs", warehouseId: warehouse.id },
    ])
    .returning();

  const kopiHitam = productRows.find((p) => p.name === "Kopi Hitam")!;
  const bubukKopi = productRows.find((p) => p.name === "Bubuk Kopi")!;
  const gula = productRows.find((p) => p.name === "Gula")!;
  const cup = productRows.find((p) => p.name === "Cup Plastik")!;

  const [kopiRecipe] = await db.insert(recipes).values({ productId: kopiHitam.id, name: "Resep Kopi Hitam", yieldQty: 1 }).returning();
  await db.insert(recipeIngredients).values([
    { recipeId: kopiRecipe.id, ingredientProductId: bubukKopi.id, qtyPerYield: 15, unit: "gram" }, // 15g kopi
    { recipeId: kopiRecipe.id, ingredientProductId: gula.id, qtyPerYield: 10, unit: "gram" }, // 10g gula
    { recipeId: kopiRecipe.id, ingredientProductId: cup.id, qtyPerYield: 1, unit: "pcs" },
  ]);

  await db.insert(promos).values([
    { outletId: outlet.id, name: "Paket 3 Jam PS4", type: "rental_package", consoleType: "ps4", durationMinutes: 180, packagePrice: 20000 },
    { outletId: outlet.id, name: "Paket 2 Jam PS5", type: "rental_package", consoleType: "ps5", durationMinutes: 120, packagePrice: 20000 },
  ]);

  await db.insert(pricingRules).values([
    { outletId: outlet.id, name: "Happy Hour Weekday", consoleType: "any", daysOfWeek: "mon,tue,wed,thu,fri", startTime: "10:00", endTime: "16:00", rateType: "multiplier", rateValue: 0.85, priority: 10 },
    { outletId: outlet.id, name: "Jam Malam", consoleType: "any", daysOfWeek: "mon,tue,wed,thu,fri,sat,sun", startTime: "22:00", endTime: "23:59", rateType: "multiplier", rateValue: 1.15, priority: 20 },
    { outletId: outlet.id, name: "Weekend", consoleType: "any", daysOfWeek: "sat,sun", startTime: "00:00", endTime: "23:59", rateType: "multiplier", rateValue: 1.1, priority: 5 },
  ]);

  await db.insert(membershipTiers).values([
    { outletId: outlet.id, name: "Regular", minSpending: 0, pointMultiplier: 1, discountPercent: 0, sortOrder: 0 },
    { outletId: outlet.id, name: "Silver", minSpending: 200000, pointMultiplier: 1.2, discountPercent: 3, sortOrder: 1 },
    { outletId: outlet.id, name: "Gold", minSpending: 750000, pointMultiplier: 1.5, discountPercent: 5, sortOrder: 2 },
    { outletId: outlet.id, name: "Platinum", minSpending: 2000000, pointMultiplier: 2, discountPercent: 10, sortOrder: 3 },
  ]);

  await db.insert(vouchers).values({
    outletId: outlet.id,
    code: "WELCOME10",
    type: "percent",
    value: 10,
    minPurchase: 10000,
    maxDiscount: 20000,
    isActive: true,
  });

  await db.insert(suppliers).values({
    outletId: outlet.id,
    name: "Toko Sembako Jaya",
    phone: "081298765432",
    address: "Pasar Induk Blok C-12",
    paymentTermsDays: 14,
  });

  await db.insert(agentSettings).values({
    outletId: outlet.id,
    model: "claude-sonnet-5",
    handoffKeywords: "komplain,refund,rusak,marah,kecewa",
  });

  // NEXBILL platform billing: seed the sellable plan catalog + etalase product catalog, then
  // start this outlet's 30-day trial, same as any real outlet gets the first time its
  // subscription state is ever touched — see lib/subscription/service.ts.
  await ensureDefaultPlan();
  await ensureDefaultProducts();
  await getOrCreateSubscription(outlet.id);

  console.log("Seed selesai. Login staff default: owner@rentalps.local / changeme123 (Superuser), kasir@rentalps.local / changeme123 (Cashier)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
