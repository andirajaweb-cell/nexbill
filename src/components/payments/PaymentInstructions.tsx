"use client";
import { useState } from "react";
import { Copy, Check, Maximize2, X, Info } from "lucide-react";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-payments";
import type { PaymentMethodOption } from "@/lib/payments/use-payment-methods";

const rupiah = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;

/**
 * "Arahkan pelanggan membayar ke:" — shown under the payment-method picker at every checkout that
 * collects from a customer (Rental, Kasir, Home Rental, Membership). Renders the outlet's own static
 * QRIS image and/or bank account for the selected method (set on /dashboard/payments), so the
 * customer pays straight into the OUTLET's account and the cashier can see where to check.
 * Cash shows nothing; a non-cash method with no instructions yet shows a hint to set them up.
 */
export function PaymentInstructions({ method, amount, compact = false }: { method: PaymentMethodOption | null; amount?: number; compact?: boolean }) {
  const { t } = useDashboardLang();
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(false);

  if (!method || method.kind === "cash") return null;

  const hasBank = !!(method.bankName || method.bankAccountNumber);
  const hasAny = !!method.qrisImageUrl || hasBank || !!method.customerNote;

  if (!hasAny) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-300">
        <Info size={14} className="mt-0.5 shrink-0" />
        <span>
          {t("payments.instructions.missing", "Belum ada arahan pembayaran untuk {method}. Tambahkan gambar QRIS atau rekening outlet di menu Pembayaran supaya bisa ditunjukkan ke pelanggan.").replace("{method}", method.label)}
        </span>
      </div>
    );
  }

  const copyAccount = async () => {
    if (!method.bankAccountNumber) return;
    try {
      await navigator.clipboard.writeText(method.bankAccountNumber.replace(/\s+/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — number is still visible to read out */
    }
  };

  return (
    <div className="rounded-lg border border-cyan-400/30 bg-cyan-500/5 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-cyan-300">{t("payments.instructions.heading", "Arahkan pelanggan membayar ke:")}</div>
        {amount != null && amount > 0 && <div className="text-sm font-semibold text-neutral-100">{rupiah(amount)}</div>}
      </div>

      <div className={`flex ${compact ? "flex-row" : "flex-col sm:flex-row"} gap-3 items-start`}>
        {method.qrisImageUrl && (
          <button
            type="button"
            onClick={() => setZoom(true)}
            className="relative shrink-0 rounded-lg bg-white p-1.5 group"
            title={t("payments.instructions.showCustomer", "Perbesar untuk ditunjukkan ke pelanggan")}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={method.qrisImageUrl} alt={`QRIS ${method.label}`} className={compact ? "h-24 w-24 object-contain" : "h-36 w-36 object-contain"} />
            <span className="absolute bottom-1 right-1 rounded bg-black/60 p-0.5 text-white opacity-80 group-hover:opacity-100">
              <Maximize2 size={12} />
            </span>
          </button>
        )}

        <div className="space-y-1.5 text-xs min-w-0">
          {hasBank && (
            <div className="space-y-0.5">
              <div className="text-neutral-400">{method.bankName ?? t("payments.instructions.bank", "Rekening")}</div>
              {method.bankAccountNumber && (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-semibold tracking-wide text-neutral-100 break-all">{method.bankAccountNumber}</span>
                  <button type="button" onClick={copyAccount} className="text-neutral-400 hover:text-cyan-300" title={t("payments.instructions.copy", "Salin nomor rekening")}>
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              )}
              {method.bankAccountHolder && (
                <div className="text-neutral-300">
                  {t("payments.instructions.holder", "a.n.")} {method.bankAccountHolder}
                </div>
              )}
            </div>
          )}
          {method.qrisImageUrl && !hasBank && <div className="text-neutral-400">{t("payments.instructions.scan", "Minta pelanggan scan QRIS ini.")}</div>}
          {method.customerNote && <div className="text-neutral-400 whitespace-pre-line">{method.customerNote}</div>}
          <div className="text-[10px] text-neutral-500">{t("payments.instructions.confirmHint", "Tandai lunas setelah dana benar-benar masuk ke rekening/aplikasi outlet.")}</div>
        </div>
      </div>

      {zoom && method.qrisImageUrl && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4" onClick={() => setZoom(false)}>
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-4 text-center" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setZoom(false)} className="absolute right-2 top-2 rounded-full p-1 text-neutral-500 hover:bg-neutral-100">
              <X size={18} />
            </button>
            <div className="text-sm font-semibold text-neutral-900">{method.label}</div>
            {amount != null && amount > 0 && <div className="text-2xl font-bold text-neutral-900">{rupiah(amount)}</div>}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={method.qrisImageUrl} alt={`QRIS ${method.label}`} className="mx-auto mt-2 w-full max-w-xs object-contain" />
            <div className="mt-2 text-xs text-neutral-500">{t("payments.instructions.scan", "Minta pelanggan scan QRIS ini.")}</div>
          </div>
        </div>
      )}
    </div>
  );
}
