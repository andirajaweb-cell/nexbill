"use client";
import { useState } from "react";
import { ScanLine } from "lucide-react";
import { CameraScanner } from "./CameraScanner";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { normalizeBarcode } from "@/lib/inventory/barcode";
import "@/lib/i18n/dict-scanner";

/**
 * Isian barcode produk: ketik manual, tembak dengan scanner USB/Bluetooth (scanner mengetik
 * kodenya + Enter ke kolom ini), atau tekan ikon kamera untuk scan pakai kamera HP/laptop.
 * `warning` dipakai induk untuk menampilkan "sudah dipakai produk X" sebelum disimpan.
 */
export function BarcodeField({
  value,
  onChange,
  className,
  inputClassName,
  placeholder,
  warning,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  warning?: string | null;
}) {
  const { t } = useDashboardLang();
  const [open, setOpen] = useState(false);
  return (
    <div className={className}>
      <div className="flex gap-1">
        <input
          className={inputClassName ?? "flex-1 min-w-0 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm"}
          placeholder={placeholder ?? t("scanner.barcodePlaceholder", "Barcode (scan / ketik)")}
          value={value}
          inputMode="text"
          onChange={(e) => onChange(e.target.value)}
          // Scanner USB mengirim Enter di akhir kode — jangan sampai memicu submit form lain.
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onChange(normalizeBarcode(value) ?? ""); } }}
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 flex items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-2.5 text-cyan-200 hover:bg-cyan-500/20"
          title={t("scanner.scanBarcodeButton", "Scan barcode dengan kamera")}
          aria-label={t("scanner.scanBarcodeButton", "Scan barcode dengan kamera")}
        >
          <ScanLine size={16} />
        </button>
      </div>
      {warning && <div className="mt-0.5 text-[11px] text-amber-400">{warning}</div>}
      <CameraScanner
        open={open}
        onClose={() => setOpen(false)}
        mode="single"
        hint={t("scanner.hintBarcodeField", "Arahkan kamera ke barcode di kemasan produk.")}
        onCode={(code) => onChange(normalizeBarcode(code) ?? "")}
      />
    </div>
  );
}
