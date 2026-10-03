"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { fetchJsonArray } from "@/lib/api/fetch-json";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { useAuth } from "@/lib/auth/client";
import "@/lib/i18n/dict-unit-qr";

/**
 * Lembar stiker QR Pelanggan untuk semua unit aktif — siap cetak (Ctrl+P). Satu kartu per unit:
 * nama unit, QR besar, dan petunjuk singkat. Kartu tidak terpotong antar-halaman (break-inside).
 */
interface Unit {
  id: string;
  name: string;
  isActive?: boolean | null;
}

export default function QrPrintPage() {
  const { t } = useDashboardLang();
  const { user } = useAuth();
  const [cards, setCards] = useState<{ id: string; name: string; qrDataUrl: string }[] | null>(null);

  useEffect(() => {
    (async () => {
      const units = (await fetchJsonArray<Unit>("/api/rental-units")).filter((u) => u.isActive !== false);
      const out: { id: string; name: string; qrDataUrl: string }[] = [];
      for (const u of units) {
        try {
          const r = await fetch(`/api/rental-units/${u.id}/customer-qr`);
          if (r.ok) out.push({ id: u.id, name: u.name, qrDataUrl: (await r.json()).qrDataUrl });
        } catch {
          /* lewati unit yang gagal */
        }
      }
      setCards(out);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <style>{`@media print { aside, header, footer, nav, .no-print, .sticky { display: none !important; } main { padding: 0 !important; } body { background: #fff !important; } }`}</style>
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="gm-display text-2xl font-bold gm-gradient-title">{t("unitQr.printTitle", "Stiker QR Pelanggan")}</h1>
          <p className="text-sm text-neutral-500">{t("unitQr.printDesc", "Cetak, gunting, lalu tempel di dekat TV tiap bilik.")}</p>
        </div>
        <Button onClick={() => window.print()} disabled={!cards || cards.length === 0}>
          {t("unitQr.printButton", "Cetak")}
        </Button>
      </div>
      {!cards ? (
        <div className="text-sm text-neutral-500">{t("unitQr.loading", "Memuat QR...")}</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-3">
          {cards.map((c) => (
            <div key={c.id} className="break-inside-avoid rounded-2xl border-2 border-neutral-300 bg-white p-4 text-center text-black">
              <div className="text-xs font-semibold uppercase tracking-widest text-neutral-500">{user?.linkedOutlets?.find((o) => o.id === user.outletId)?.name ?? "NEXBILL"}</div>
              <div className="text-2xl font-extrabold">{c.name}</div>
              <img src={c.qrDataUrl} alt={c.name} className="mx-auto my-2 h-44 w-44" />
              <div className="text-sm font-semibold">{t("unitQr.stickerLine1", "Scan untuk cek sisa waktu")}</div>
              <div className="text-xs text-neutral-600">{t("unitQr.stickerLine2", "Pesan makanan · Tambah waktu · Panggil kasir")}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
