import { db } from "@/db/client";
import { outlets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { ScopeError } from "@/lib/auth/scope";
import { logAudit } from "@/lib/audit/log";

/**
 * Manual (typed-in) discount at the till — anti-fraud control (2026-09-26).
 *
 * Before this, a kasir could type any discount (even 100%) on any order with no limit, no approval
 * and no trace beyond the order row — the classic "sweethearting" gap (friends pay less, or the
 * cashier pockets the difference). Now:
 *  - staff WITHOUT approve_requests (kasir) are capped at outlets.maxManualDiscountPercent of the
 *    subtotal (null = no cap, the default so nothing changes until the owner sets one);
 *  - every manual discount is written to the audit log as "manual_discount", which the shift risk
 *    check counts together with voids/refunds/corrections.
 * Voucher discounts are not "manual" and are not limited here — vouchers have their own rules.
 */
export async function guardManualDiscount(params: {
  outletId: string;
  staffUserId: string;
  role: string;
  manualDiscount: number;
  subtotal: number;
  orderId?: string;
}) {
  const manual = Math.max(0, Number(params.manualDiscount) || 0);
  if (manual <= 0) return;
  if (!hasPermission(params.role as StaffRole, "approve_requests")) {
    const [outlet] = await db.select({ max: outlets.maxManualDiscountPercent }).from(outlets).where(eq(outlets.id, params.outletId)).limit(1);
    const max = outlet?.max;
    if (max != null) {
      const pct = params.subtotal > 0 ? (manual / params.subtotal) * 100 : 100;
      if (pct > max + 1e-9) {
        throw new ScopeError(
          `Diskon manual ${pct.toFixed(1)}% melebihi batas ${max}% untuk kasir. Minta Supervisor/Manager/Owner untuk memberikan diskon ini.`,
          403
        );
      }
    }
  }
}

export async function logManualDiscount(params: { outletId: string; staffUserId: string; manualDiscount: number; subtotal: number; orderId: string }) {
  if (!(params.manualDiscount > 0)) return;
  await logAudit({
    outletId: params.outletId,
    staffUserId: params.staffUserId,
    action: "manual_discount",
    entityType: "order",
    entityId: params.orderId,
    after: { manualDiscount: params.manualDiscount, subtotal: params.subtotal },
  });
}
