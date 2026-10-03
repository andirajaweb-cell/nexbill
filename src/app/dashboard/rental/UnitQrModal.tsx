"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-unit-qr";

/**
 * QR Pelanggan untuk satu unit: tampilkan, salin tautan, ganti (QR lama mati), dan setelan izin
 * (boleh pesan F&B / minta tambah waktu dari HP). Cetak stiker semua unit di /dashboard/rental/qr-print.
 */
export function UnitQrModal({ unit, onClose }: { unit: { id: string; name: string }; onClose: () => void }) {
  const { t } = useDashboardLang();
  const [qr, setQr] = useState<{ url: string; qrDataUrl: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<{ unitQrOrderEnabled: boolean; unitQrExtendEnabled: boolean } | null>(null);

  useEffect(() => {
    fetch(`/api/rental-units/${unit.id}/customer-qr`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setQr(d);
      })
      .catch((e) => showAlert(e instanceof Error ? e.message : "Gagal memuat QR."));
    fetch("/api/tv/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSettings({ unitQrOrderEnabled: !!d.unitQrOrderEnabled, unitQrExtendEnabled: !!d.unitQrExtendEnabled }))
      .catch(() => {});
  }, [unit.id]);

  const rotate = async () => {
    const ok = await showConfirm(
      t("unitQr.rotateConfirm", "Ganti QR unit {unit}? Stiker lama langsung tidak berlaku — cetak & tempel stiker baru.").replace("{unit}", unit.name),
      { tone: "danger", confirmLabel: t("unitQr.rotate", "Ganti QR") },
    );
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/rental-units/${unit.id}/customer-qr`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rotate: true }) });
      const d = await res.json();
      if (!res.ok) return showAlert(d.error);
      setQr(d);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (key: "unitQrOrderEnabled" | "unitQrExtendEnabled", value: boolean) => {
    const res = await fetch("/api/tv/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [key]: value }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return showAlert(d.error ?? "Gagal menyimpan.");
    setSettings({ unitQrOrderEnabled: !!d.unitQrOrderEnabled, unitQrExtendEnabled: !!d.unitQrExtendEnabled });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0a0f1e] p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div>
          <h3 className="font-semibold">{t("unitQr.modalTitle", "QR Pelanggan — {unit}").replace("{unit}", unit.name)}</h3>
          <p className="text-xs text-neutral-500 mt-1">
            {t("unitQr.modalDesc", "Tempel QR ini di bilik. Pelanggan scan untuk melihat sisa waktu & tagihan, pesan makanan, minta tambah waktu, atau panggil kasir. Semua permintaan masuk ke panel Permintaan Pelanggan di halaman ini.")}
          </p>
        </div>
        <div className="flex justify-center">
          {qr ? <img src={qr.qrDataUrl} alt="QR" className="h-56 w-56 rounded-xl bg-white p-2" /> : <div className="h-56 w-56 animate-pulse rounded-xl bg-white/5" />}
        </div>
        {qr && (
          <div className="flex gap-2">
            <input readOnly value={qr.url} className="flex-1 min-w-0 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs" onFocus={(e) => e.target.select()} />
            <Button variant="secondary" className="text-xs" onClick={() => navigator.clipboard.writeText(qr.url)}>
              {t("unitQr.copy", "Salin")}
            </Button>
          </div>
        )}
        {settings && (
          <div className="space-y-2 rounded-lg border border-white/10 p-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={settings.unitQrOrderEnabled} onChange={(e) => toggle("unitQrOrderEnabled", e.target.checked)} />
              {t("unitQr.allowOrder", "Boleh pesan F&B dari HP")}
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={settings.unitQrExtendEnabled} onChange={(e) => toggle("unitQrExtendEnabled", e.target.checked)} />
              {t("unitQr.allowExtend", "Boleh minta tambah waktu dari HP")}
            </label>
            <p className="text-[11px] text-neutral-500">{t("unitQr.allowNote", "Berlaku untuk semua unit. Panggil kasir selalu aktif. Semua permintaan tetap perlu disetujui kasir.")}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/rental/qr-print" target="_blank" className="rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-200">
            {t("unitQr.printAll", "Cetak stiker semua unit")}
          </Link>
          <Button variant="ghost" className="text-xs text-rose-300" disabled={busy} onClick={rotate}>
            {t("unitQr.rotate", "Ganti QR")}
          </Button>
          <Button variant="secondary" className="text-xs ml-auto" onClick={onClose}>
            {t("unitQr.close", "Tutup")}
          </Button>
        </div>
      </div>
    </div>
  );
}
