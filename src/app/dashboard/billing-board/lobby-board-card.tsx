"use client";
import { useEffect, useState } from "react";
import { MonitorPlay, Copy, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useApi } from "@/lib/api/use-api";
import { showAlert } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-lobby";

interface LobbyInfo {
  slug: string;
  enabled: boolean;
  announcement: string | null;
  canEdit: boolean;
  migrationMissing?: boolean;
}

/**
 * Papan lobi pelanggan (/lobi/[slug]) di halaman Billing Board: link untuk dibuka di TV/monitor lobi,
 * aktif/nonaktif, dan teks pengumuman berjalan. Papan publik itu tidak menampilkan nama pelanggan
 * atau tagihan — hanya status unit dan waktunya.
 */
export function LobbyBoardCard() {
  const { t, lang } = useDashboardLang();
  const { data, mutate } = useApi<LobbyInfo>("/api/lobby-settings");
  const [enabled, setEnabled] = useState(true);
  const [announcement, setAnnouncement] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!data) return;
    setEnabled(data.enabled);
    setAnnouncement(data.announcement ?? "");
  }, [data]);

  if (!data) return null;
  const url = typeof window !== "undefined" ? `${window.location.origin}/lobi/${data.slug}?lang=${lang}` : `/lobi/${data.slug}`;

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/lobby-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled, announcement }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return showAlert(body.error ?? t("lobby.saveFailed", "Gagal menyimpan."));
      setSaved(true);
      await mutate();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="space-y-3 border border-sky-500/25">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300">
            <MonitorPlay size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="font-medium">{t("lobby.title", "Papan lobi untuk pelanggan")}</h2>
            <p className="text-xs text-neutral-500">
              {t("lobby.desc", "Buka link ini di TV atau monitor lobi. Pelanggan melihat unit yang kosong, sisa waktu, unit yang segera kosong, dan QR booking — tanpa nama pelanggan atau tagihan.")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-xs font-medium text-sky-200 hover:bg-sky-500/20">
            <ExternalLink size={14} /> {t("lobby.open", "Buka papan")}
          </a>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(url).then(() => showAlert(t("lobby.copied", "Link papan disalin.")))}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-neutral-200 hover:bg-white/10"
          >
            <Copy size={14} /> {t("lobby.copy", "Salin link")}
          </button>
        </div>
      </div>
      <div className="break-all rounded-lg bg-white/[0.03] px-3 py-2 font-mono text-xs text-neutral-400">{url}</div>

      {data.migrationMissing && (
        <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          {t("lobby.migrationMissing", "Pengaturan papan belum bisa disimpan (pembaruan database belum dijalankan). Papan tetap tampil dengan pengaturan bawaan.")}
        </div>
      )}

      {data.canEdit && !data.migrationMissing && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 accent-sky-500" />
            {t("lobby.enabled", "Tampilkan papan lobi")}
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-neutral-400">{t("lobby.announcement", "Pengumuman berjalan (opsional)")}</span>
            <input
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm"
              maxLength={300}
              value={announcement}
              placeholder={t("lobby.announcementPlaceholder", "mis. Happy hour 13.00–16.00: main 2 jam bayar 1,5 jam")}
              onChange={(e) => setAnnouncement(e.target.value)}
            />
          </label>
          <div className="flex items-center gap-3">
            <Button onClick={save} disabled={saving}>{saving ? t("lobby.saving", "Menyimpan...") : t("lobby.save", "Simpan")}</Button>
            {saved && <span className="text-xs text-emerald-400">{t("lobby.saved", "Tersimpan — papan diperbarui dalam 10 detik.")}</span>}
          </div>
        </div>
      )}
    </Card>
  );
}
