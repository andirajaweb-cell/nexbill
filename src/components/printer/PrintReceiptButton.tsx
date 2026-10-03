"use client";
import { useState } from "react";
import { Printer } from "lucide-react";
import { useAuth } from "@/lib/auth/client";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { showAlert } from "@/lib/ui/dialog";
import { printOrderReceipt } from "@/lib/printer/print-receipt";
import "@/lib/i18n/dict-printer";

/**
 * Tombol "Cetak Struk" yang mengikuti cara cetak perangkat ini (Pengaturan → Printer):
 * dialog print biasa di PC, atau langsung ke printer Bluetooth / RawBT di HP & aplikasi Android.
 */
export function PrintReceiptButton({
  orderId,
  className,
  label,
  variant = "link",
}: {
  orderId: string;
  className?: string;
  label?: string;
  variant?: "link" | "button";
}) {
  const { user } = useAuth();
  const { t } = useDashboardLang();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await printOrderReceipt(orderId, user?.outletId);
      if (result === "printed") showAlert(t("printer.printed", "Struk terkirim ke printer."));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      showAlert(`${t("printer.failed", "Gagal mencetak")}: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  const text = busy ? t("printer.printing", "Mencetak...") : label ?? t("printer.print", "Cetak Struk");
  if (variant === "button") {
    return (
      <button type="button" onClick={onClick} disabled={busy} className={className ?? "inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15 disabled:opacity-50"}>
        <Printer size={13} /> {text}
      </button>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={busy} className={className ?? "text-emerald-400 underline disabled:opacity-50"}>
      {text}
    </button>
  );
}
