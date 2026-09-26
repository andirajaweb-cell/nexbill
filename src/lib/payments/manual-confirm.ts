import { requireOwnedPayment, ScopeError } from "@/lib/auth/scope";
import { resolveDrawerShiftId } from "@/lib/shift/drawer";
import type { PaymentConfirmation } from "./index";

/**
 * Shared guard for the manual "Tandai Diterima" confirm routes (confirm-cash, confirm-deposit).
 *
 * Anti-fraud: a NON-cash payment (QRIS, transfer, e-wallet…) can only be marked received with a
 * reference the cashier read from the outlet's merchant app / bank mutation (e.g. the last digits of
 * the QRIS/transfer reference). Without it, "customer paid cash, cashier records it as QRIS and
 * keeps the cash" left nothing to reconcile against — QRIS/transfer aren't part of the cash count.
 * The confirmer and their drawer shift are recorded on the payment (payments.confirmedBy /
 * confirmationRef / shiftId).
 */
export async function authorizeManualConfirmation(paymentId: string, body: { reference?: unknown } | null): Promise<PaymentConfirmation> {
  const { session, payment } = await requireOwnedPayment(paymentId);
  const reference = typeof body?.reference === "string" ? body.reference.trim() : "";
  if (payment.method !== "cash" && payment.status !== "success" && reference.length < 3) {
    throw new ScopeError(
      "Isi nomor referensi pembayaran (mis. 4–6 digit terakhir kode transaksi QRIS/transfer dari aplikasi merchant atau mutasi bank) sebelum menandai diterima.",
      400
    );
  }
  return { staffUserId: session.sub, reference: reference || null, shiftId: await resolveDrawerShiftId(session.outletId, session.sub) };
}
