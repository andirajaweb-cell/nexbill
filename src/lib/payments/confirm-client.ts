"use client";
import { showAlert, showPrompt } from "@/lib/ui/dialog";
import { uiText } from "@/lib/i18n/client-text";
import "@/lib/i18n/dict-payments";

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
      uiText(
        "payments.confirm.prompt",
        "Masukkan nomor referensi {method} — mis. 4–6 digit terakhir kode transaksi di aplikasi merchant QRIS atau mutasi bank. Pastikan dananya benar-benar sudah masuk."
      ).replace("{method}", `${opts.methodLabel ?? method}${opts.amountLabel ? ` (${opts.amountLabel})` : ""}`),
      {
        title: uiText("payments.confirm.title", "Konfirmasi Pembayaran Diterima"),
        required: true,
        placeholder: uiText("payments.confirm.placeholder", "No. referensi / 4–6 digit terakhir"),
        confirmLabel: uiText("payments.confirm.button", "Tandai Diterima"),
      }
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
      await showAlert(err?.error ?? uiText("payments.confirm.failed", "Gagal menandai pembayaran diterima (HTTP {status}).").replace("{status}", String(res.status)));
      return false;
    }
    return true;
  } catch (err) {
    await showAlert(uiText("payments.confirm.networkFailed", "Gagal menghubungi server: {error}").replace("{error}", err instanceof Error ? err.message : String(err)));
    return false;
  }
}
