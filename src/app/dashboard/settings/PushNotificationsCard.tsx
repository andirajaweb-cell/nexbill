"use client";
import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { showAlert } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { useIsAndroidApp } from "@/lib/app-mode";
import { isPushSupported, currentPushSubscription, enablePush, disablePush } from "@/lib/push/client";
import type { PushCategory } from "@/lib/push/rules";
import "@/lib/i18n/dict-push";

const CATEGORY_FALLBACK: Record<PushCategory, string> = {
  session: "Sesi bilik hampir habis / sudah habis",
  customer_request: "Permintaan QR pelanggan (pesan F&B, tambah waktu, panggil kasir)",
  booking: "Booking online masuk",
  payment: "Pembayaran QRIS/online diterima",
  fraud: "Shift ditandai berisiko (anti-fraud)",
  low_stock: "Stok menipis",
  shift_summary: "Ringkasan omzet saat tutup shift",
};

/**
 * Notifikasi push per perangkat (aktif/nonaktif) + pilihan kategori per akun. Di aplikasi NEXBILL
 * Android notifikasi tampil sebagai notifikasi aplikasi walau aplikasi ditutup.
 */
export function PushNotificationsCard() {
  const { t } = useDashboardLang();
  const isAndroidApp = useIsAndroidApp();
  const [supported, setSupported] = useState(true);
  const [enabledHere, setEnabledHere] = useState(false);
  const [prefs, setPrefs] = useState<{ allowed: PushCategory[]; enabled: PushCategory[]; devices: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const loadPrefs = () =>
    fetch("/api/push/preferences")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setPrefs(d))
      .catch(() => {});

  useEffect(() => {
    const ok = isPushSupported();
    setSupported(ok);
    if (ok) currentPushSubscription().then((s) => setEnabledHere(!!s && Notification.permission === "granted")).catch(() => {});
    loadPrefs();
  }, []);

  const turnOn = async () => {
    setBusy(true);
    try {
      const r = await enablePush(isAndroidApp);
      if (r === "enabled") {
        setEnabledHere(true);
        await loadPrefs();
      } else if (r === "denied") showAlert(t("push.denied", "Izin notifikasi ditolak."));
      else if (r === "not_configured") showAlert(t("push.notConfigured", "Notifikasi push belum diaktifkan di server NEXBILL."));
      else showAlert(t("push.unsupported", "Perangkat ini tidak mendukung notifikasi push."));
    } catch (e) {
      showAlert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    try {
      await disablePush();
      setEnabledHere(false);
      await loadPrefs();
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const out = await res.json();
      if (!res.ok) return showAlert(out.error ?? "Gagal.");
      showAlert(t("push.testSent", "Notifikasi uji dikirim ke {n} perangkat.").replace("{n}", String(out.delivered ?? 0)));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (c: PushCategory) => {
    if (!prefs) return;
    const next = prefs.enabled.includes(c) ? prefs.enabled.filter((x) => x !== c) : [...prefs.enabled, c];
    setPrefs({ ...prefs, enabled: next });
    await fetch("/api/push/preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categories: next }) }).catch(() => {});
  };

  return (
    <Card className="space-y-3">
      <h2 className="font-medium flex items-center gap-2">
        <BellRing size={16} className="text-cyan-300" /> {t("push.heading", "Notifikasi di HP")}
      </h2>
      <p className="text-xs text-neutral-500">{t("push.desc", "Terima notifikasi walau aplikasi ditutup.")}</p>

      {!supported ? (
        <p className="text-xs text-amber-300">{t("push.unsupported", "Perangkat atau browser ini tidak mendukung notifikasi push.")}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {enabledHere ? (
            <>
              <span className="text-xs rounded bg-emerald-500/15 px-2 py-1 text-emerald-300">✓ {t("push.enabledHere", "Aktif di perangkat ini")}</span>
              <Button variant="secondary" className="text-xs" onClick={sendTest} disabled={busy}>{t("push.test", "Kirim Notifikasi Uji")}</Button>
              <Button variant="ghost" className="text-xs" onClick={turnOff} disabled={busy}>{t("push.disable", "Matikan di Perangkat Ini")}</Button>
            </>
          ) : (
            <Button className="text-xs" onClick={turnOn} disabled={busy}>{t("push.enable", "Aktifkan Notifikasi di Perangkat Ini")}</Button>
          )}
        </div>
      )}
      {prefs && prefs.devices > 0 && <p className="text-[11px] text-neutral-600">{t("push.devices", "{n} perangkat terdaftar untuk akun ini").replace("{n}", String(prefs.devices))}</p>}

      {prefs && prefs.allowed.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="text-xs font-medium text-neutral-300">{t("push.categories", "Jenis notifikasi untuk akun ini")}</div>
          {prefs.allowed.map((c) => (
            <label key={c} className="flex items-center gap-2 text-xs text-neutral-400">
              <input type="checkbox" checked={prefs.enabled.includes(c)} onChange={() => toggle(c)} />
              {t(`push.cat.${c}`, CATEGORY_FALLBACK[c])}
            </label>
          ))}
        </div>
      )}
    </Card>
  );
}
