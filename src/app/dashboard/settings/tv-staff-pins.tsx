"use client";
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { showAlert, showConfirm, showPrompt } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-tv-staff-pins";

interface StaffPinRow {
  staffUserId: string;
  name: string;
  role: string;
  hasPin: boolean;
  updatedAt: string | null;
}

/**
 * PIN per staf untuk NEXBILL TV: tiap kasir punya PIN sendiri, sehingga sesi yang dimulai/diubah dari
 * TV tercatat atas namanya (bukan Owner). PIN layar bersama di atas tetap berlaku sebagai cadangan.
 */
export function TvStaffPinsCard({ canManage }: { canManage: boolean }) {
  const { t } = useDashboardLang();
  const [rows, setRows] = useState<StaffPinRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/tv/staff-pins", { cache: "no-store" });
    if (!res.ok) return setRows([]);
    const d = await res.json();
    setRows(d.staff ?? []);
  }, []);

  useEffect(() => {
    if (canManage) void load();
  }, [canManage, load]);

  if (!canManage) return null;

  const setPin = async (r: StaffPinRow) => {
    const pin = await showPrompt(t("tvStaffPin.prompt", "PIN TV untuk {name} (4–6 digit, tidak boleh sama dengan staf lain):").replace("{name}", r.name), {
      placeholder: "4–6",
      required: true,
      confirmLabel: t("tvStaffPin.save", "Simpan"),
    });
    if (!pin) return;
    setBusy(r.staffUserId);
    try {
      const res = await fetch("/api/tv/staff-pins", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ staffUserId: r.staffUserId, pin: pin.trim() }) });
      const d = await res.json().catch(() => null);
      if (!res.ok) await showAlert(d?.error ?? t("tvStaffPin.failed", "Gagal menyimpan PIN."));
      await load();
    } finally {
      setBusy(null);
    }
  };

  const removePin = async (r: StaffPinRow) => {
    if (!(await showConfirm(t("tvStaffPin.confirmRemove", "Hapus PIN TV {name}? Staf ini tidak bisa lagi memulai sesi dari TV.").replace("{name}", r.name), { tone: "danger" }))) return;
    setBusy(r.staffUserId);
    try {
      await fetch(`/api/tv/staff-pins?staffUserId=${encodeURIComponent(r.staffUserId)}`, { method: "DELETE" });
      await load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="space-y-3">
      <h2 className="font-medium">{t("tvStaffPin.title", "PIN per Staf (NEXBILL TV)")}</h2>
      <p className="text-xs text-neutral-500">
        {t(
          "tvStaffPin.text",
          "Setiap kasir punya PIN sendiri. Di TV, kasir menekan OK → mengetik PIN-nya → sesi yang dimulai, diperpanjang, atau diakhiri dari TV tercatat atas namanya (juga saat internet putus). PIN Staf di atas tetap bisa dipakai Owner sebagai cadangan."
        )}
      </p>
      {rows === null ? (
        <p className="text-xs text-neutral-500">{t("tvStaffPin.loading", "Memuat…")}</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-neutral-500">{t("tvStaffPin.empty", "Belum ada staf aktif yang bisa diberi PIN TV.")}</p>
      ) : (
        <div className="divide-y divide-white/5">
          {rows.map((r) => (
            <div key={r.staffUserId} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div className="min-w-0">
                <div className="text-neutral-200 truncate">{r.name}</div>
                <div className="text-xs text-neutral-500">
                  {r.role} ·{" "}
                  {r.hasPin ? <span className="text-emerald-400">{t("tvStaffPin.hasPin", "PIN aktif")}</span> : t("tvStaffPin.noPin", "Belum ada PIN")}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="secondary" disabled={busy === r.staffUserId} onClick={() => setPin(r)}>
                  {r.hasPin ? t("tvStaffPin.change", "Ganti PIN") : t("tvStaffPin.set", "Atur PIN")}
                </Button>
                {r.hasPin && (
                  <Button variant="ghost" disabled={busy === r.staffUserId} onClick={() => removePin(r)}>
                    {t("tvStaffPin.remove", "Hapus")}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-neutral-600">
        {t("tvStaffPin.note", "PIN harus 4–6 digit, bukan angka sama semua atau berurutan (0000, 1234). TV mengingat PIN yang pernah benar supaya tetap bisa dipakai saat internet putus.")}
      </p>
    </Card>
  );
}
