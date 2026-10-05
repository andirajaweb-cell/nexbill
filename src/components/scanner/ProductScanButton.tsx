"use client";
import { useState } from "react";
import { ScanLine } from "lucide-react";
import { CameraScanner } from "./CameraScanner";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { findProductByCode, type CodedProduct } from "@/lib/inventory/barcode";
import "@/lib/i18n/dict-scanner";

/**
 * Tombol "Scan" di samping pemilih produk (Resep/BOM, Belanja Supplier, Purchase Order, Stock
 * Opname). Barcode/SKU hasil scan dicocokkan ke daftar produk yang sudah dimuat halaman.
 *  - mode "pick": kamera tertutup begitu produk ditemukan (memilih satu produk).
 *  - mode "continuous": kamera tetap terbuka (mis. Stock Opname: tiap scan = +1 hitungan);
 *    onFound boleh mengembalikan pesan untuk ditampilkan di layar scanner.
 * Kode yang tidak dikenal memanggil onNotFound (bila ada) — mis. untuk menawarkan produk baru.
 */
export function ProductScanButton<P extends CodedProduct>({
  products,
  onFound,
  onNotFound,
  mode = "pick",
  label,
  hint,
  className,
}: {
  products: P[];
  onFound: (p: P) => string | void;
  onNotFound?: (code: string) => void;
  mode?: "pick" | "continuous";
  label?: string;
  hint?: string;
  className?: string;
}) {
  const { t } = useDashboardLang();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? "shrink-0 flex items-center justify-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-500/20"}
        title={t("scanner.scanBarcodeButton", "Scan barcode dengan kamera")}
      >
        <ScanLine size={16} /> {label !== undefined ? label : <span className="hidden sm:inline">{t("scanner.button", "Scan kamera")}</span>}
      </button>
      <CameraScanner
        open={open}
        onClose={() => setOpen(false)}
        mode="continuous"
        hint={hint ?? t("scanner.hintBarcodeField", "Arahkan kamera ke barcode di kemasan produk.")}
        onCode={(code) => {
          const p = findProductByCode(products, code);
          if (!p) {
            if (onNotFound) {
              setOpen(false);
              onNotFound(code);
              return;
            }
            return t("scanner.notFound", "Kode {code} tidak ditemukan di produk.").replace("{code}", code);
          }
          const msg = onFound(p);
          if (mode === "pick") {
            setOpen(false);
            return;
          }
          return msg ?? t("scanner.found", "Ditemukan: {name}").replace("{name}", p.name);
        }}
      />
    </>
  );
}
