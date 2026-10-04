"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-scanner";

/** QR berisi No. Anggota — di-scan kasir di Rental PS (CameraScanner mode "single"). */
export function MemberQrCard({ memberNumber, name }: { memberNumber: string; name?: string | null }) {
  const { t } = useDashboardLang();
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(memberNumber, { margin: 1, width: 360, errorCorrectionLevel: "M" })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [memberNumber]);

  if (!dataUrl) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 flex items-center gap-3">
      <img src={dataUrl} alt={memberNumber} className="h-24 w-24 rounded bg-white p-1" />
      <div className="min-w-0 space-y-1">
        <div className="text-xs font-medium text-neutral-200">{t("member.qrTitle", "QR Kartu Member")}</div>
        <div className="text-[11px] text-neutral-500">{t("member.qrHint", "Cetak atau kirim ke pelanggan — kasir cukup scan QR ini di Rental PS.")}</div>
        <a href={dataUrl} download={`member-${memberNumber}${name ? `-${name.replace(/[^a-z0-9]+/gi, "-")}` : ""}.png`} className="inline-block text-xs text-cyan-300 underline">
          {t("member.qrDownload", "Unduh QR")}
        </a>
      </div>
    </div>
  );
}
