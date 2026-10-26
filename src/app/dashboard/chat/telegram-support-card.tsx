"use client";
import { useCallback, useEffect, useState } from "react";
import { Send } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import "@/lib/i18n/dict-telegram";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";

interface LinkStatus {
  available: boolean;
  botUsername?: string | null;
  linked?: boolean;
  telegramUsername?: string | null;
}

/**
 * Kartu "Support 24 jam di Telegram": staf menautkan Telegram-nya ke bot NEXBILL. Tidak tampil sama
 * sekali bila bot belum diaktifkan tim NEXBILL (env / migrasi belum siap).
 */
export function TelegramSupportCard() {
  const { t } = useDashboardLang();
  const [status, setStatus] = useState<LinkStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/telegram/link", { cache: "no-store" });
      if (!res.ok) return;
      const d = (await res.json()) as LinkStatus;
      setStatus(d);
      if (d.linked) setPendingUrl(null);
    } catch {
      // diam: kartu ini pelengkap, bukan inti halaman
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Setelah link dibuka, cek tiap 4 detik sampai tertaut (maks. 15 menit — umur kode).
  useEffect(() => {
    if (!pendingUrl) return;
    const started = Date.now();
    const h = window.setInterval(() => {
      if (Date.now() - started > 15 * 60_000) {
        setPendingUrl(null);
        return;
      }
      void load();
    }, 4000);
    return () => window.clearInterval(h);
  }, [pendingUrl, load]);

  if (!status?.available) return null;

  const connect = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/telegram/link", { method: "POST" });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d?.url) {
        await showAlert(d?.error || t("tgSupport.failed", "Gagal menyiapkan tautan Telegram."));
        return;
      }
      setPendingUrl(d.url);
      window.open(d.url, "_blank", "noopener");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!(await showConfirm(t("tgSupport.disconnectConfirm", "Putuskan Telegram dari akunmu? Bot tidak akan menjawab dari Telegram itu sampai ditautkan lagi."), { tone: "danger", confirmLabel: t("tgSupport.disconnect", "Putuskan") }))) return;
    setBusy(true);
    try {
      await fetch("/api/telegram/link", { method: "DELETE" });
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="h-10 w-10 rounded-full bg-sky-500/15 text-sky-300 flex items-center justify-center shrink-0">
        <Send size={18} />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="font-medium text-neutral-100">{t("tgSupport.title", "Support 24 jam di Telegram")}</div>
        <p className="text-xs text-neutral-400">{t("tgSupport.desc", "Tanya kapan saja lewat Telegram. Bot menjawab dari Panduan NEXBILL dan status akunmu; yang perlu tim langsung jadi tiket di halaman ini, dan balasan tim ikut masuk ke Telegram.")}</p>
        {status.linked ? (
          <p className="text-xs text-emerald-300">
            {status.telegramUsername
              ? t("tgSupport.linkedAs", "Terhubung sebagai {user}").replace("{user}", `@${status.telegramUsername}`)
              : t("tgSupport.linkedNoUser", "Telegram terhubung")}
          </p>
        ) : pendingUrl ? (
          <p className="text-xs text-sky-200">
            {t("tgSupport.waiting", "Telegram sudah dibuka — tekan Start di chat bot. Halaman ini memperbarui otomatis. Link berlaku 15 menit.")}{" "}
            <a href={pendingUrl} target="_blank" rel="noopener noreferrer" className="underline">
              {t("tgSupport.openLinkAgain", "Telegram tidak terbuka? Buka link ini")}
            </a>
          </p>
        ) : (
          <p className="text-[11px] text-neutral-500">{t("tgSupport.perUser", "Tautan berlaku untuk akunmu sendiri di outlet ini. Setiap staf menautkan Telegram masing-masing.")}</p>
        )}
      </div>
      <div className="flex gap-2 shrink-0">
        {status.linked ? (
          <>
            {status.botUsername && (
              <a href={`https://t.me/${status.botUsername}`} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary">{t("tgSupport.openChat", "Buka chat bot")}</Button>
              </a>
            )}
            <Button variant="ghost" onClick={disconnect} disabled={busy}>
              {t("tgSupport.disconnect", "Putuskan")}
            </Button>
          </>
        ) : (
          <Button onClick={connect} disabled={busy}>
            {busy ? t("tgSupport.connecting", "Menyiapkan…") : t("tgSupport.connect", "Hubungkan Telegram")}
          </Button>
        )}
      </div>
    </Card>
  );
}
