"use client";
import { useCallback, useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import "@/lib/i18n/dict-wa-support";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";

interface WaStatus {
  available: boolean;
  online?: boolean;
  botPhone?: string;
  chatUrl?: string;
  linkedPhone?: string | null;
  outletPhone?: string | null;
}

const pretty = (p: string) => `+${p}`;

/**
 * Kartu "Support 24 jam di WhatsApp": staf menautkan nomor WhatsApp-nya dengan mengirim kode ke bot
 * NEXBILL (membuktikan nomor itu miliknya). Owner yang nomornya sama dengan nomor di Profil Outlet bisa
 * langsung chat. Tidak tampil bila bot WhatsApp belum pernah tersambung.
 */
export function WhatsAppSupportCard() {
  const { t } = useDashboardLang();
  const [status, setStatus] = useState<WaStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ code: string; url: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp-support/link", { cache: "no-store" });
      if (!res.ok) return;
      const d = (await res.json()) as WaStatus;
      setStatus(d);
      if (d.linkedPhone) setPending(null);
    } catch {
      // diam: kartu ini pelengkap
    }
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/whatsapp-support/link", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<WaStatus>) : null))
      .then((d) => {
        if (alive && d) setStatus(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Setelah kode dibuat, cek tiap 4 detik sampai tertaut (maks. 15 menit — umur kode).
  useEffect(() => {
    if (!pending) return;
    const started = Date.now();
    const h = window.setInterval(() => {
      if (Date.now() - started > 15 * 60_000) {
        setPending(null);
        return;
      }
      void load();
    }, 4000);
    return () => window.clearInterval(h);
  }, [pending, load]);

  if (!status?.available) return null;

  const connect = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/whatsapp-support/link", { method: "POST" });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d?.url) {
        await showAlert(d?.error || t("waSupport.failed", "Gagal menyiapkan kode WhatsApp."));
        return;
      }
      setPending({ code: d.code, url: d.url });
      window.open(d.url, "_blank", "noopener");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!(await showConfirm(t("waSupport.disconnectConfirm", "Lepas nomor WhatsApp dari akunmu? Bot tidak akan mengenali nomor itu sampai ditautkan lagi."), { tone: "danger", confirmLabel: t("waSupport.disconnect", "Lepas") }))) return;
    setBusy(true);
    try {
      await fetch("/api/whatsapp-support/link", { method: "DELETE" });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const ready = status.linkedPhone ?? status.outletPhone ?? null;

  return (
    <Card className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="h-10 w-10 rounded-full bg-emerald-500/15 text-emerald-300 flex items-center justify-center shrink-0">
        <MessageCircle size={18} />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="font-medium text-neutral-100">{t("waSupport.title", "Support 24 jam di WhatsApp")}</div>
        <p className="text-xs text-neutral-400">
          {t("waSupport.desc", "Tanya kapan saja lewat WhatsApp ke nomor NEXBILL {phone}. Bot menjawab dari Panduan NEXBILL dan status akunmu; yang perlu tim langsung jadi tiket di halaman ini, dan balasan tim ikut masuk ke WhatsApp.").replace("{phone}", pretty(status.botPhone ?? ""))}
        </p>
        {status.linkedPhone ? (
          <p className="text-xs text-emerald-300">{t("waSupport.linkedAs", "Terhubung dengan nomor {phone}").replace("{phone}", pretty(status.linkedPhone))}</p>
        ) : status.outletPhone ? (
          <p className="text-xs text-emerald-300">{t("waSupport.outletPhone", "Nomor di Profil Outlet ({phone}) dikenali sebagai Owner — langsung chat saja.").replace("{phone}", pretty(status.outletPhone))}</p>
        ) : pending ? (
          <p className="text-xs text-emerald-200">
            {t("waSupport.waiting", "WhatsApp sudah dibuka dengan pesan \"NEXBILL KODE {code}\" — tekan Kirim. Halaman ini memperbarui otomatis. Kode berlaku 15 menit.").replace("{code}", pending.code)}{" "}
            <a href={pending.url} target="_blank" rel="noopener noreferrer" className="underline">
              {t("waSupport.openLinkAgain", "WhatsApp tidak terbuka? Buka link ini")}
            </a>
          </p>
        ) : (
          <p className="text-[11px] text-neutral-500">{t("waSupport.perUser", "Setiap staf menautkan nomor WhatsApp masing-masing (sekali saja).")}</p>
        )}
        {!status.online && <p className="text-[11px] text-amber-300">{t("waSupport.offline", "Bot WhatsApp sedang tersambung ulang — pesan tetap dibalas begitu online. Darurat? Pakai Telegram atau tiket di halaman ini.")}</p>}
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        {ready && status.chatUrl && (
          <a href={status.chatUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary">{t("waSupport.openChat", "Buka WhatsApp")}</Button>
          </a>
        )}
        {status.linkedPhone ? (
          <Button variant="ghost" onClick={disconnect} disabled={busy}>
            {t("waSupport.disconnect", "Lepas")}
          </Button>
        ) : (
          <Button onClick={connect} disabled={busy} variant={ready ? "ghost" : "primary"}>
            {busy ? t("waSupport.connecting", "Menyiapkan…") : ready ? t("waSupport.connectOther", "Tautkan nomor lain") : t("waSupport.connect", "Hubungkan WhatsApp")}
          </Button>
        )}
      </div>
    </Card>
  );
}
