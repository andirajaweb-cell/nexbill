import { db } from "@/db/client";
import { vouchers, loyaltyRedemptions } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface VoucherValidation {
  valid: boolean;
  reason?: string;
  voucher?: typeof vouchers.$inferSelect;
  discountAmount: number;
}

export async function validateVoucher(outletId: string, code: string, subtotal: number, customerId?: string | null): Promise<VoucherValidation> {
  const [voucher] = await db.select().from(vouchers).where(eq(vouchers.code, code.toUpperCase())).limit(1);

  if (!voucher || voucher.outletId !== outletId) return { valid: false, reason: "Kode voucher tidak ditemukan.", discountAmount: 0 };
  // Personal rewards minted from a loyalty redemption (see lib/membership/rewards.ts) are scoped
  // to the customer who redeemed them — anyone else typing in the code gets rejected here.
  if (voucher.customerId && voucher.customerId !== customerId) {
    return { valid: false, reason: "Kode reward ini khusus untuk customer lain.", discountAmount: 0 };
  }
  if (!voucher.isActive) return { valid: false, reason: "Voucher tidak aktif.", discountAmount: 0 };
  if (voucher.validFrom && new Date() < new Date(voucher.validFrom)) return { valid: false, reason: "Voucher belum berlaku.", discountAmount: 0 };
  if (voucher.validUntil && new Date() > new Date(voucher.validUntil)) return { valid: false, reason: "Voucher sudah kedaluwarsa.", discountAmount: 0 };
  if (voucher.usageLimit !== null && voucher.usedCount >= voucher.usageLimit) return { valid: false, reason: "Voucher sudah mencapai batas pemakaian.", discountAmount: 0 };
  if (subtotal < voucher.minPurchase) return { valid: false, reason: `Minimal belanja Rp${voucher.minPurchase.toLocaleString("id-ID")}.`, discountAmount: 0 };

  let discountAmount = voucher.type === "percent" ? Math.round((subtotal * voucher.value) / 100) : voucher.value;
  if (voucher.maxDiscount) discountAmount = Math.min(discountAmount, voucher.maxDiscount);
  discountAmount = Math.min(discountAmount, subtotal);

  return { valid: true, voucher, discountAmount };
}

export async function consumeVoucher(voucherId: string) {
  const [voucher] = await db.select().from(vouchers).where(eq(vouchers.id, voucherId)).limit(1);
  if (!voucher) return;
  await db.update(vouchers).set({ usedCount: voucher.usedCount + 1 }).where(eq(vouchers.id, voucherId));

  // If this voucher was minted from a loyalty reward redemption (play_discount type — see
  // lib/membership/rewards.ts), flip that redemption's CRM status to "used" too so the
  // customer's history reflects reality without a separate manual step.
  const [redemption] = await db.select().from(loyaltyRedemptions).where(eq(loyaltyRedemptions.voucherId, voucherId)).limit(1);
  if (redemption && redemption.status === "issued") {
    await db.update(loyaltyRedemptions).set({ status: "used", usedAt: new Date().toISOString() }).where(eq(loyaltyRedemptions.id, redemption.id));
  }
}
