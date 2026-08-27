import { db } from "@/db/client";
import {
  homeRentalRentals,
  homeRentalRentalAssets,
  homeRentalProducts,
  homeRentalAssets,
  homeRentalPackages,
  homeRentalPackageItems,
  homeRentalRentalItems,
  cashBankAccounts,
} from "@/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { postJournal } from "@/lib/accounting/journal";
import { getMappedAccountId, getCashBankAccountIdForPaymentMethod } from "@/lib/accounting/account-mapping";
import { resolvePaymentFee, feeExpenseLine } from "@/lib/accounting/payment-fee";
import { getCurrentShift } from "@/lib/shift/shift";
import { logAudit } from "@/lib/audit/log";
import { isFeatureEnabled } from "./feature-flags";
import { assertNotBlacklisted, determineApprovalStatus, recomputeCustomerRisk } from "./risk";
import { queueHomeRentalNotification, homeRentalMessages, outletName } from "./notifications";
import { computeRentalFee } from "./pricing";
import { computeDeliveryFee } from "./policy";

/**
 * Core Home Rental ("Sewa Dibawa Pulang") workflow engine — Phase 1 scope:
 * Booking (reservation, no payment yet) -> Checkout (asset allocation +
 * payment + deposit, posts accounting) -> Return (assets back to AVAILABLE,
 * deposit released, posts accounting) -> Cancel (only before checkout).
 *
 * Deliberately simplified vs. the full spec for this phase: asset
 * allocation happens live at checkout against real-time asset.status
 * (not a full future-dated per-asset calendar), and there's no
 * inspection/damage/contract step yet (assets go straight
 * rented_out -> available on return) — those are later phases layered on
 * this same schema. See feature-flags.ts for the full flag roadmap.
 */


/**
 * getCashBankAccountIdForPaymentMethod() returns a cashBankAccounts.id — a wrapper row, not
 * a GL account. journal_lines.accountId is a foreign key into `accounts`, so every journal
 * line needs the underlying accounts.id (cashBankAccounts.accountId), not the wrapper's own
 * id. This resolves both in one call — the mistake of using the wrapper id directly is what
 * caused a FOREIGN KEY constraint failure on the very first live checkout test.
 */
async function resolveCashAccountId(outletId: string, method: string): Promise<string> {
  const cashBankAccountId = await getCashBankAccountIdForPaymentMethod(outletId, method);
  const [row] = await db.select().from(cashBankAccounts).where(eq(cashBankAccounts.id, cashBankAccountId)).limit(1);
  if (!row) throw new Error(`Akun kas/bank untuk metode "${method}" tidak ditemukan.`);
  return row.accountId;
}

async function generateRentalCode(outletId: string): Promise<string> {
  const [{ count }] = (await db
    .select({ count: sql<number>`count(*)` })
    .from(homeRentalRentals)
    .where(eq(homeRentalRentals.outletId, outletId))) as { count: number }[];
  return `HR-${String(count + 1).padStart(5, "0")}`;
}

export interface CreateHomeRentalInput {
  outletId: string;
  customerId?: string | null;
  customerName?: string | null;
  phone?: string | null;
  address?: string | null;
  packageId?: string | null;
  productId?: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  deliveryMethod?: "pickup_by_customer" | "delivery";
  deliveryAddress?: string | null;
  distanceKm?: number | null; // if set + deliveryMethod=delivery, deliveryFee is computed from the outlet's own delivery_distance_tier policy instead of the product/package's flat fee
  discountAmount?: number;
  notes?: string | null;
  staffUserId?: string;
  customerIdentityNumber?: string | null;
  customerIdentityImageUrl?: string | null;
  studentIdNumber?: string | null;
  studentIdImageUrl?: string | null;
  parentName?: string | null;
  parentIdentityNumber?: string | null;
  parentIdentityImageUrl?: string | null;
  items?: { name: string; quantity?: number; note?: string | null }[];
}

/** Product "type" (ps3/ps4/.../accessory) -> the sub-flag that must be ON for it to be bookable, and the home_rental account-mapping transactionKey used at posting time. Both happen to be the same string for products. */
const PRODUCT_TYPE_FLAG: Record<string, string> = {
  ps3: "HOME_RENTAL_PS3", ps4: "HOME_RENTAL_PS4", ps5: "HOME_RENTAL_PS5",
  playbook: "HOME_RENTAL_PLAYBOOK", tv32: "HOME_RENTAL_TV32", tv40: "HOME_RENTAL_TV40", tv43: "HOME_RENTAL_TV43",
  accessory: "HOME_RENTAL_ENABLED", // accessories aren't individually flagged — gated by the master switch only
};

/**
 * Fallback COA code per revenue key, matched to account-mapping.ts's DEFAULT_MAPPING_SEED —
 * getMappedAccountId only needs this when an outlet has no explicit mapping row (or one they
 * deleted); passing the WRONG type-specific fallback here would silently misclassify revenue
 * (e.g. a new "tv40" product falling back to the Package account) instead of erroring loudly.
 */
const REVENUE_FALLBACK_CODE: Record<string, string> = {
  ps3: "4810", ps4: "4820", ps5: "4830", playbook: "4840",
  tv32: "4850", tv40: "4850", tv43: "4850",
  accessory: "4860", package: "4870",
};

async function assertHomeRentalEnabled(outletId: string) {
  if (!(await isFeatureEnabled(outletId, "HOME_RENTAL_ENABLED"))) {
    throw new Error("Home Rental sedang nonaktif — hubungi Owner/Superuser untuk mengaktifkannya di Settings > Feature Management.");
  }
}

/** Creates a "booked" reservation — no payment collected, no assets allocated yet (that happens at checkout). */
export async function createHomeRentalBooking(input: CreateHomeRentalInput) {
  await assertHomeRentalEnabled(input.outletId);
  if (!input.packageId && !input.productId) throw new Error("Pilih produk atau paket.");
  if (new Date(input.scheduledEnd).getTime() <= new Date(input.scheduledStart).getTime()) {
    throw new Error("Waktu selesai harus setelah waktu mulai.");
  }
  await assertNotBlacklisted(input.outletId, input.phone);

  let rentalFee = 0, deliveryFee = 0, pickupFee = 0, depositAmount = 0;

  if (input.packageId) {
    const [pkg] = await db.select().from(homeRentalPackages).where(eq(homeRentalPackages.id, input.packageId)).limit(1);
    if (!pkg || !pkg.isActive) throw new Error("Paket tidak ditemukan/nonaktif.");
    const items = await db.select().from(homeRentalPackageItems).where(eq(homeRentalPackageItems.packageId, pkg.id));
    for (const item of items) {
      const [product] = await db.select().from(homeRentalProducts).where(eq(homeRentalProducts.id, item.productId)).limit(1);
      if (product && !(await isFeatureEnabled(input.outletId, PRODUCT_TYPE_FLAG[product.type] ?? "HOME_RENTAL_ENABLED"))) {
        throw new Error(`Produk "${product.name}" dalam paket ini sedang nonaktif.`);
      }
    }
    rentalFee = computeRentalFee(pkg, input.scheduledStart, input.scheduledEnd).fee;
    deliveryFee = pkg.deliveryFee;
    pickupFee = pkg.pickupFee;
    depositAmount = pkg.defaultDepositAmount;
  } else {
    const [product] = await db.select().from(homeRentalProducts).where(eq(homeRentalProducts.id, input.productId!)).limit(1);
    if (!product || !product.isActive) throw new Error("Produk tidak ditemukan/nonaktif.");
    if (!(await isFeatureEnabled(input.outletId, PRODUCT_TYPE_FLAG[product.type] ?? "HOME_RENTAL_ENABLED"))) {
      throw new Error(`Produk "${product.name}" sedang nonaktif.`);
    }
    const availableCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(homeRentalAssets)
      .where(and(eq(homeRentalAssets.productId, product.id), eq(homeRentalAssets.status, "available"), eq(homeRentalAssets.isActive, true)));
    if ((availableCount[0]?.count ?? 0) < 1) throw new Error(`Tidak ada unit "${product.name}" yang tersedia saat ini.`);
    rentalFee = computeRentalFee(product, input.scheduledStart, input.scheduledEnd).fee;
    deliveryFee = product.deliveryFee;
    pickupFee = product.pickupFee;
    depositAmount = product.defaultDepositAmount;
  }

  if (!(await isFeatureEnabled(input.outletId, "HOME_RENTAL_DEPOSIT"))) depositAmount = 0;
  if (input.deliveryMethod === "delivery" && !(await isFeatureEnabled(input.outletId, "HOME_RENTAL_DELIVERY"))) {
    throw new Error("Fitur Delivery sedang nonaktif — pilih ambil sendiri di toko.");
  }
  // Biaya anter-jemput tergantung jarak — kalau staf mengisi jarak (km), pakai tier jarak milik
  // outlet ini (Kebijakan tab) menggantikan biaya flat produk/paket; kalau tidak diisi, tetap
  // pakai deliveryFee/pickupFee flat seperti sebelumnya (zero regression).
  if (input.deliveryMethod === "delivery" && input.distanceKm != null && input.distanceKm >= 0) {
    const tier = await computeDeliveryFee(input.outletId, input.distanceKm);
    if (tier) { deliveryFee = tier.amount; pickupFee = 0; }
  }

  const discountAmount = Math.max(0, input.discountAmount ?? 0);
  const totalAmount = Math.max(0, rentalFee + deliveryFee + pickupFee - discountAmount);
  const rentalCode = await generateRentalCode(input.outletId);
  const approvalStatus = await determineApprovalStatus(input.outletId, input.phone);

  const [row] = await db
    .insert(homeRentalRentals)
    .values({
      outletId: input.outletId,
      rentalCode,
      customerId: input.customerId ?? null,
      customerName: input.customerName ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      packageId: input.packageId ?? null,
      productId: input.productId ?? null,
      scheduledStart: input.scheduledStart,
      scheduledEnd: input.scheduledEnd,
      status: "booked",
      rentalFee,
      deliveryFee,
      pickupFee,
      discountAmount,
      totalAmount,
      depositAmount,
      deliveryMethod: input.deliveryMethod ?? "pickup_by_customer",
      deliveryAddress: input.deliveryAddress ?? null,
      distanceKm: input.distanceKm ?? null,
      notes: input.notes ?? null,
      staffUserId: input.staffUserId,
      approvalStatus,
      customerIdentityNumber: input.customerIdentityNumber ?? null,
      customerIdentityImageUrl: input.customerIdentityImageUrl ?? null,
      studentIdNumber: input.studentIdNumber ?? null,
      studentIdImageUrl: input.studentIdImageUrl ?? null,
      parentName: input.parentName ?? null,
      parentIdentityNumber: input.parentIdentityNumber ?? null,
      parentIdentityImageUrl: input.parentIdentityImageUrl ?? null,
    })
    .returning();

  if (input.items?.length) {
    await db.insert(homeRentalRentalItems).values(
      input.items.filter((i) => i.name?.trim()).map((i) => ({ rentalId: row.id, name: i.name.trim(), quantity: Math.max(1, i.quantity ?? 1), note: i.note ?? null }))
    );
  }

  await logAudit({ outletId: input.outletId, staffUserId: input.staffUserId, action: "home_rental_booked", entityType: "home_rental_rental", entityId: row.id, after: row });

  // Seed/refresh a risk profile row for first-time phones too, so it exists to check next time —
  // and queue the booking-confirmation WhatsApp message, but only once actually confirmed (not
  // while sitting in high-risk "pending" approval).
  if (input.phone) await recomputeCustomerRisk(input.outletId, input.phone, { customerId: input.customerId, customerName: input.customerName });
  if (approvalStatus === "not_required" && (await isFeatureEnabled(input.outletId, "HOME_RENTAL_REMINDER")) && (await isFeatureEnabled(input.outletId, "HOME_RENTAL_WHATSAPP"))) {
    const name = await outletName(input.outletId);
    await queueHomeRentalNotification({
      rentalId: row.id,
      outletId: input.outletId,
      type: "hr_booking_confirmation",
      phone: row.phone,
      message: homeRentalMessages.bookingConfirmation(row.rentalCode, name, row.scheduledStart),
    });
  }

  return row;
}

export interface CheckoutInput {
  assetIds?: string[]; // specific physical assets scanned/chosen — auto-picked if omitted
  paymentMethod: string;
  depositPaymentMethod?: string;
  rentalFeeOverride?: number; // cashier adjustment at the counter
  discountAmountOverride?: number;
  depositAmountOverride?: number;
  staffUserId?: string;
}

/** Needed products for a rental: [{ productId, quantity }] — a single-product rental needs qty 1 of that product; a package needs each of its items. */
async function neededProducts(rental: typeof homeRentalRentals.$inferSelect): Promise<{ productId: string; quantity: number }[]> {
  if (rental.packageId) {
    const items = await db.select().from(homeRentalPackageItems).where(eq(homeRentalPackageItems.packageId, rental.packageId));
    return items.map((i) => ({ productId: i.productId, quantity: i.quantity }));
  }
  if (rental.productId) return [{ productId: rental.productId, quantity: 1 }];
  return [];
}

/** Allocates physical assets, collects payment + deposit, posts accounting, marks the rental ACTIVE. */
export async function checkoutHomeRentalRental(rentalId: string, input: CheckoutInput) {
  const [rental] = await db.select().from(homeRentalRentals).where(eq(homeRentalRentals.id, rentalId)).limit(1);
  if (!rental) throw new Error("Rental tidak ditemukan.");
  if (rental.status !== "booked") throw new Error(`Rental berstatus "${rental.status}" — hanya booking berstatus "booked" yang bisa checkout.`);
  if (rental.approvalStatus === "pending") throw new Error("Booking ini berisiko tinggi dan menunggu approval Owner/Manager sebelum bisa checkout.");
  await assertHomeRentalEnabled(rental.outletId);

  const needed = await neededProducts(rental);
  if (needed.length === 0) throw new Error("Rental ini tidak punya produk/paket yang valid.");

  const chosenAssetIds: string[] = [];
  const scannedByCaller = new Set(input.assetIds ?? []);

  for (const need of needed) {
    const [product] = await db.select().from(homeRentalProducts).where(eq(homeRentalProducts.id, need.productId)).limit(1);
    const candidateProvided = input.assetIds
      ? await db.select().from(homeRentalAssets).where(and(inArray(homeRentalAssets.id, [...scannedByCaller]), eq(homeRentalAssets.productId, need.productId)))
      : [];
    let picks = candidateProvided.filter((a) => a.status === "available" && a.isActive);
    if (picks.length < need.quantity) {
      const autoPick = await db
        .select()
        .from(homeRentalAssets)
        .where(and(eq(homeRentalAssets.productId, need.productId), eq(homeRentalAssets.status, "available"), eq(homeRentalAssets.isActive, true)))
        .limit(need.quantity + picks.length); // over-fetch by picks.length as a de-dup buffer in case the query re-returns already-picked rows
      const pickedIds = new Set(picks.map((p) => p.id));
      for (const a of autoPick) {
        if (picks.length >= need.quantity) break;
        if (!pickedIds.has(a.id)) { picks.push(a); pickedIds.add(a.id); }
      }
    }
    if (picks.length < need.quantity) {
      throw new Error(`Stok "${product?.name ?? need.productId}" tidak cukup — butuh ${need.quantity}, tersedia ${picks.length}.`);
    }
    chosenAssetIds.push(...picks.slice(0, need.quantity).map((p) => p.id));
  }

  const rentalFee = input.rentalFeeOverride ?? rental.rentalFee;
  const discountAmount = input.discountAmountOverride ?? rental.discountAmount;
  const depositAmount = (await isFeatureEnabled(rental.outletId, "HOME_RENTAL_DEPOSIT")) ? (input.depositAmountOverride ?? rental.depositAmount) : 0;
  const netRevenue = Math.max(0, rentalFee - discountAmount);
  const feesTotal = rental.deliveryFee + rental.pickupFee;
  const totalAmount = netRevenue + feesTotal;
  const now = new Date().toISOString();

  const shift = input.staffUserId ? await getCurrentShift(rental.outletId, input.staffUserId) : null;

  // --- Revenue journal: Dr Cash/Bank (net of channel fee), Cr Home Rental Revenue (+ Delivery/Pickup Fee if any), Dr Biaya Payment Gateway if any ---
  // Fee is computed inline (not persisted on homeRentalRentals — that table already has 4
  // separate payment-method columns for checkout/deposit/late-fee/damage-fee, adding 4 more
  // feeAmount columns wasn't worth the migration) — see lib/accounting/payment-fee.ts.
  const revenueKey = rental.packageId ? "package" : (await db.select().from(homeRentalProducts).where(eq(homeRentalProducts.id, rental.productId!)).limit(1))[0]?.type ?? "package";
  const cashAccountId = await resolveCashAccountId(rental.outletId, input.paymentMethod);
  const revenueAccountId = await getMappedAccountId(rental.outletId, "home_rental", revenueKey, REVENUE_FALLBACK_CODE[revenueKey] ?? "4870");
  const checkoutFee = totalAmount > 0 ? await resolvePaymentFee(rental.outletId, input.paymentMethod, totalAmount) : 0;
  const lines: { accountId?: string; accountCode?: string; debit?: number; credit?: number; description?: string }[] = [
    { accountId: cashAccountId, debit: totalAmount - checkoutFee, credit: 0, description: `Home Rental ${rental.rentalCode} — pembayaran (${input.paymentMethod})` },
    ...feeExpenseLine(checkoutFee, input.paymentMethod),
  ];
  if (netRevenue > 0) lines.push({ accountId: revenueAccountId, debit: 0, credit: netRevenue, description: "Rental fee" });
  if (feesTotal > 0) {
    const feeAccountId = await getMappedAccountId(rental.outletId, "home_rental", "delivery_fee", "4880");
    lines.push({ accountId: feeAccountId, debit: 0, credit: feesTotal, description: "Delivery/Pickup fee" });
  }
  let revenueJournalEntryId: string | null = null;
  if (totalAmount > 0) {
    revenueJournalEntryId = await postJournal({
      outletId: rental.outletId,
      reference: rental.rentalCode,
      description: `Home Rental ${rental.rentalCode} — Checkout`,
      sourceType: "home_rental",
      sourceId: rental.id,
      staffUserId: input.staffUserId,
      lines,
    });
  }

  // --- Deposit journal: Dr Cash/Bank (net of channel fee), Cr Customer Deposit Liability — kept fully separate from revenue ---
  // A QRIS-collected deposit really does incur the same MDR as any other QRIS transaction, so it
  // gets the same fee treatment — the liability booked is still the FULL deposit amount (that's
  // what's owed back to the customer), the fee just reduces what actually lands in cash/bank.
  let depositJournalEntryId: string | null = null;
  if (depositAmount > 0) {
    const depositMethod = input.depositPaymentMethod ?? input.paymentMethod;
    const depositCashAccountId = await resolveCashAccountId(rental.outletId, depositMethod);
    const depositLiabilityAccountId = await getMappedAccountId(rental.outletId, "home_rental", "deposit", "2135");
    const depositFee = await resolvePaymentFee(rental.outletId, depositMethod, depositAmount);
    depositJournalEntryId = await postJournal({
      outletId: rental.outletId,
      reference: rental.rentalCode,
      description: `Home Rental ${rental.rentalCode} — Security Deposit`,
      sourceType: "home_rental",
      sourceId: rental.id,
      staffUserId: input.staffUserId,
      lines: [
        { accountId: depositCashAccountId, debit: depositAmount - depositFee, credit: 0, description: "Deposit diterima" },
        ...feeExpenseLine(depositFee, depositMethod),
        { accountId: depositLiabilityAccountId, debit: 0, credit: depositAmount, description: "Home Rental Security Deposit (liability)" },
      ],
    });
  }

  await db.update(homeRentalAssets).set({ status: "rented_out" }).where(inArray(homeRentalAssets.id, chosenAssetIds));
  await db.insert(homeRentalRentalAssets).values(chosenAssetIds.map((assetId) => ({ rentalId: rental.id, assetId, scannedOutAt: now })));

  const [updated] = await db
    .update(homeRentalRentals)
    .set({
      status: "active",
      pickedUpAt: now,
      rentalFee,
      discountAmount,
      totalAmount,
      paidAmount: totalAmount,
      paymentMethod: input.paymentMethod,
      depositAmount,
      depositStatus: depositAmount > 0 ? "held" : "none",
      depositPaymentMethod: depositAmount > 0 ? (input.depositPaymentMethod ?? input.paymentMethod) : null,
      depositJournalEntryId,
      revenueJournalEntryId,
      staffUserId: input.staffUserId,
      shiftId: shift?.id ?? null,
      updatedAt: now,
    })
    .where(eq(homeRentalRentals.id, rental.id))
    .returning();

  await logAudit({ outletId: rental.outletId, staffUserId: input.staffUserId, action: "home_rental_checkout", entityType: "home_rental_rental", entityId: rental.id, before: rental, after: updated });
  return updated;
}

export interface ReturnInput {
  lateFee?: number;
  lateFeePaymentMethod?: string; // required if lateFee > 0
  staffUserId?: string;
  // Cashier must confirm the Perlengkapan checklist was reviewed and give a 1-5 star rating before
  // a rental can be marked returned — see the validation at the top of returnHomeRentalRental.
  checklistOk?: boolean;
  rating?: number; // 1-5
  ratingNote?: string;
  // Penggantian kerusakan (opsional) — dipotong dari deposit yang ditahan dulu; sisanya (kalau
  // biaya kerusakan melebihi deposit) ditagih tunai lewat damageFeePaymentMethod.
  damageFee?: number;
  damageNote?: string;
  damageFeePaymentMethod?: string; // required only if damageFee > deposit yang ditahan
}

/** Returns all allocated assets to AVAILABLE, releases the deposit in full, marks the rental RETURNED. Phase 1 has no inspection/damage step — that's Phase 2, layered onto the same asset.status enum (which already includes "inspection"/"damaged"/"missing"/"repair" for when it lands). */
export async function returnHomeRentalRental(rentalId: string, input: ReturnInput) {
  const [rental] = await db.select().from(homeRentalRentals).where(eq(homeRentalRentals.id, rentalId)).limit(1);
  if (!rental) throw new Error("Rental tidak ditemukan.");
  if (rental.status !== "active") throw new Error(`Rental berstatus "${rental.status}" — hanya rental aktif yang bisa di-return.`);
  if (!input.checklistOk) throw new Error("Checklist perlengkapan wajib dikonfirmasi sebelum return.");
  if (!Number.isInteger(input.rating) || (input.rating as number) < 1 || (input.rating as number) > 5) {
    throw new Error("Penilaian pengembalian (1-5 bintang) wajib diisi.");
  }
  const rating = input.rating as number;

  const now = new Date().toISOString();
  const returnShift = input.staffUserId ? await getCurrentShift(rental.outletId, input.staffUserId) : null;
  const links = await db.select().from(homeRentalRentalAssets).where(eq(homeRentalRentalAssets.rentalId, rental.id));
  const assetIds = links.map((l) => l.assetId);
  if (assetIds.length) {
    await db.update(homeRentalAssets).set({ status: "available" }).where(inArray(homeRentalAssets.id, assetIds));
    await db.update(homeRentalRentalAssets).set({ scannedInAt: now }).where(eq(homeRentalRentalAssets.rentalId, rental.id));
  }

  const lateFee = Math.max(0, input.lateFee ?? 0);
  if (lateFee > 0) {
    if (!input.lateFeePaymentMethod) throw new Error("Metode pembayaran denda keterlambatan wajib diisi.");
    const cashAccountId = await resolveCashAccountId(rental.outletId, input.lateFeePaymentMethod);
    const lateFeeAccountId = await getMappedAccountId(rental.outletId, "home_rental", "late_fee", "4890");
    const lateFeeCharge = await resolvePaymentFee(rental.outletId, input.lateFeePaymentMethod, lateFee);
    await postJournal({
      outletId: rental.outletId,
      reference: rental.rentalCode,
      description: `Home Rental ${rental.rentalCode} — Denda Keterlambatan`,
      sourceType: "home_rental",
      sourceId: rental.id,
      staffUserId: input.staffUserId,
      lines: [
        { accountId: cashAccountId, debit: lateFee - lateFeeCharge, credit: 0, description: "Denda keterlambatan diterima" },
        ...feeExpenseLine(lateFeeCharge, input.lateFeePaymentMethod),
        { accountId: lateFeeAccountId, debit: 0, credit: lateFee, description: "Late Fee Revenue" },
      ],
    });
  }

  // ---- Damage charge (penggantian kerusakan) — deducted from the held deposit first, any
  // remainder billed as extra cash. Fully separate revenue account from late fee so accounting/
  // reports can tell "customer was late" apart from "customer damaged/lost something".
  const damageFee = Math.max(0, input.damageFee ?? 0);
  const depositHeld = rental.depositAmount > 0 && rental.depositStatus === "held" ? rental.depositAmount : 0;
  const deductFromDeposit = Math.min(damageFee, depositHeld);
  const damageExtraOwed = damageFee - deductFromDeposit;

  let depositLiabilityAccountId: string | null = null;
  if (damageFee > 0 || depositHeld > 0) {
    depositLiabilityAccountId = await getMappedAccountId(rental.outletId, "home_rental", "deposit", "2135");
  }

  if (damageFee > 0) {
    if (damageExtraOwed > 0 && !input.damageFeePaymentMethod) {
      throw new Error("Biaya kerusakan melebihi deposit yang ditahan — metode pembayaran sisa tagihan wajib diisi.");
    }
    const damageAccountId = await getMappedAccountId(rental.outletId, "home_rental", "damage_fee", "4895");
    const lines: { accountId?: string; accountCode?: string; debit?: number; credit?: number; description?: string }[] = [];
    if (deductFromDeposit > 0) {
      lines.push({ accountId: depositLiabilityAccountId!, debit: deductFromDeposit, credit: 0, description: "Dipotong dari deposit" });
    }
    if (damageExtraOwed > 0) {
      const damageCashAccountId = await resolveCashAccountId(rental.outletId, input.damageFeePaymentMethod!);
      const damageFeeCharge = await resolvePaymentFee(rental.outletId, input.damageFeePaymentMethod!, damageExtraOwed);
      lines.push({ accountId: damageCashAccountId, debit: damageExtraOwed - damageFeeCharge, credit: 0, description: `Ditagih tunai (${input.damageFeePaymentMethod})` });
      lines.push(...feeExpenseLine(damageFeeCharge, input.damageFeePaymentMethod!));
    }
    lines.push({ accountId: damageAccountId, debit: 0, credit: damageFee, description: "Penggantian Kerusakan Revenue" });
    await postJournal({
      outletId: rental.outletId,
      reference: rental.rentalCode,
      description: `Home Rental ${rental.rentalCode} — Penggantian Kerusakan`,
      sourceType: "home_rental",
      sourceId: rental.id,
      staffUserId: input.staffUserId,
      lines,
    });
  }

  // Release whatever's left of the held deposit (full amount minus any damage deduction above).
  const depositReleaseAmount = Math.max(0, depositHeld - deductFromDeposit);
  if (depositReleaseAmount > 0) {
    const depositCashAccountId = await resolveCashAccountId(rental.outletId, rental.depositPaymentMethod ?? "cash");
    await postJournal({
      outletId: rental.outletId,
      reference: rental.rentalCode,
      description: `Home Rental ${rental.rentalCode} — Pengembalian Deposit`,
      sourceType: "home_rental",
      sourceId: rental.id,
      staffUserId: input.staffUserId,
      lines: [
        { accountId: depositLiabilityAccountId!, debit: depositReleaseAmount, credit: 0, description: "Home Rental Security Deposit (liability) dilepas" },
        { accountId: depositCashAccountId, debit: 0, credit: depositReleaseAmount, description: "Deposit dikembalikan ke pelanggan" },
      ],
    });
  }

  const depositStatus: "none" | "released" | "partially_deducted" | "forfeited" =
    rental.depositAmount <= 0 ? "none" : deductFromDeposit <= 0 ? "released" : deductFromDeposit >= rental.depositAmount ? "forfeited" : "partially_deducted";

  const [updated] = await db
    .update(homeRentalRentals)
    .set({
      status: "returned",
      returnedAt: now,
      lateFee,
      lateFeePaymentMethod: lateFee > 0 ? input.lateFeePaymentMethod : null,
      damageFee,
      damageNote: input.damageNote || null,
      damageFeePaymentMethod: damageExtraOwed > 0 ? input.damageFeePaymentMethod : null,
      totalAmount: rental.totalAmount + lateFee + damageFee,
      depositStatus,
      returnShiftId: returnShift?.id ?? null,
      returnChecklistOk: true,
      returnRating: rating,
      returnRatingNote: input.ratingNote || null,
      returnedBy: input.staffUserId ?? null,
      updatedAt: now,
    })
    .where(eq(homeRentalRentals.id, rental.id))
    .returning();

  await logAudit({ outletId: rental.outletId, staffUserId: input.staffUserId, action: "home_rental_returned", entityType: "home_rental_rental", entityId: rental.id, before: rental, after: updated });
  if (rental.phone) {
    await recomputeCustomerRisk(rental.outletId, rental.phone, {
      customerId: rental.customerId,
      customerName: rental.customerName,
      updatedBy: input.staffUserId,
      lastAssessmentRating: rating,
      lastAssessmentChecklistOk: true,
      lastAssessmentNote: input.ratingNote || null,
      lastAssessmentAt: now,
      lastAssessmentRentalId: rental.id,
    });
  }
  return updated;
}

/** Only a still-"booked" (not yet checked out) rental can be cancelled — nothing to reverse financially since no payment/asset allocation happened yet. An active rental must go through returnHomeRentalRental instead. */
export async function cancelHomeRentalRental(rentalId: string, reason: string, staffUserId?: string) {
  const [rental] = await db.select().from(homeRentalRentals).where(eq(homeRentalRentals.id, rentalId)).limit(1);
  if (!rental) throw new Error("Rental tidak ditemukan.");
  if (rental.status !== "booked") throw new Error(`Rental berstatus "${rental.status}" tidak bisa dibatalkan langsung.`);

  const [updated] = await db
    .update(homeRentalRentals)
    .set({ status: "cancelled", cancelledAt: new Date().toISOString(), cancelReason: reason })
    .where(eq(homeRentalRentals.id, rental.id))
    .returning();

  await logAudit({ outletId: rental.outletId, staffUserId, action: "home_rental_cancelled", entityType: "home_rental_rental", entityId: rental.id, before: rental, after: updated });
  if (rental.phone) await recomputeCustomerRisk(rental.outletId, rental.phone, { customerId: rental.customerId, customerName: rental.customerName, updatedBy: staffUserId });
  return updated;
}

export async function markHomeRentalNoShow(rentalId: string, staffUserId?: string) {
  const [rental] = await db.select().from(homeRentalRentals).where(eq(homeRentalRentals.id, rentalId)).limit(1);
  if (!rental) throw new Error("Rental tidak ditemukan.");
  if (rental.status !== "booked") throw new Error(`Rental berstatus "${rental.status}" tidak bisa ditandai no-show.`);

  const [updated] = await db
    .update(homeRentalRentals)
    .set({ status: "no_show" })
    .where(eq(homeRentalRentals.id, rental.id))
    .returning();

  await logAudit({ outletId: rental.outletId, staffUserId, action: "home_rental_no_show", entityType: "home_rental_rental", entityId: rental.id, before: rental, after: updated });
  if (rental.phone) await recomputeCustomerRisk(rental.outletId, rental.phone, { customerId: rental.customerId, customerName: rental.customerName, updatedBy: staffUserId });
  return updated;
}

/** Dashboard summary counters. */
export async function getHomeRentalDashboardSummary(outletId: string) {
  const rentals = await db.select().from(homeRentalRentals).where(eq(homeRentalRentals.outletId, outletId));
  const assets = await db.select().from(homeRentalAssets).where(eq(homeRentalAssets.outletId, outletId));
  const now = Date.now();
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);

  const active = rentals.filter((r) => r.status === "active");
  const dueToday = active.filter((r) => {
    const end = new Date(r.scheduledEnd).getTime();
    return end >= startOfToday.getTime() && end <= endOfToday.getTime();
  });
  const overdue = active.filter((r) => new Date(r.scheduledEnd).getTime() < now);
  const reserved = rentals.filter((r) => r.status === "booked");

  return {
    activeRental: active.length,
    availableAsset: assets.filter((a) => a.status === "available" && a.isActive).length,
    reserved: reserved.length,
    dueToday: dueToday.length,
    overdue: overdue.length,
    pendingPickup: reserved.length, // Phase 1: "booked" = awaiting checkout/pickup
    pendingReturn: overdue.length, // Phase 1: no separate "returning" step yet
    inspection: 0, // wired in a later phase (HOME_RENTAL_INSPECTION)
    damageCase: 0, // wired in a later phase (HOME_RENTAL_DAMAGE)
    missingAsset: assets.filter((a) => a.status === "missing").length,
    securityDepositHeld: rentals.filter((r) => r.depositStatus === "held").reduce((s, r) => s + r.depositAmount, 0),
    outstandingPayment: rentals.filter((r) => r.status === "active" && r.paidAmount < r.totalAmount).reduce((s, r) => s + (r.totalAmount - r.paidAmount), 0),
  };
}
