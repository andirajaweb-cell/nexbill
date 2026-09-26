"use client";
import { showAlert, showPrompt } from "@/lib/ui/dialog";

/**
 * Client side of "Tandai Diterima" for any payment. Cash confirms straight away; any other method
 * first asks the cashier for the payment reference they checked in the outlet's merchant app / bank
 * mutation (required server-side, see lib/payments/manual-confirm.ts). Returns true when the payment
 * is now confirmed. Shows its own error dialogs.
 */
export async function confirmPaymentReceived(
  paymentId: string,
  method: string,
  opts: { kind?: "sale" | "deposit"; methodLabel?: string; amountLabel?: string } = {}
): Promise<boolean> {
  let reference: string | null = null;
  if (method !== "cash") {
    reference = await showPrompt(
      `Masukkan nomor referensi ${opts.methodLabel ?? method}${opts.amountLabel ? ` (${opts.amountLabel})` : ""} — mis. 4–6 digit terakhir kode transaksi di aplikasi merchant QRIS atau mutasi bank. Pastikan dananya benar-benar sudah masuk.`,
      { title: "Konfirmasi Pembayaran Diterima", required: true, placeholder: "No. referensi / 4–6 digit terakhir", confirmLabel: "Tandai Diterima" }
    );
    if (!reference) return false;
  }
  const endpoint = opts.kind === "deposit" ? "confirm-deposit" : "confirm-cash";
  try {
    const res = await fetch(`/api/payments/${paymentId}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      await showAlert(err?.error ?? `Gagal menandai pembayaran diterima (HTTP ${res.status}).`);
      return false;
    }
    return true;
  } catch (err) {
    await showAlert(`Gagal menghubungi server: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}
