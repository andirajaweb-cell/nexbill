"use client";

import { useEffect, useState } from "react";
import { Volume, Volume1, Volume2, VolumeX } from "lucide-react";
import { getNotificationVolume, setNotificationVolume } from "@/lib/ui/notification-sound";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";

// Server-rendered/pre-hydration placeholder — real value is read from localStorage in the effect
// below, matching the "start at a safe default, sync on mount" pattern used for dashboard theme.
const DEFAULT_UNTIL_MOUNTED = 70;

/** Compact speaker-icon + slider used to raise/lower the volume of the dashboard's notification
 * beeps (Rental PS time-warning alarm, Kitchen Display order beeps) — see notification-sound.ts
 * for the shared storage. `onPreview` fires once per drag release so the caller can play a sample
 * beep at the new level immediately (system-volume-slider convention). */
export function NotificationVolumeControl({ onPreview, className }: { onPreview?: () => void; className?: string }) {
  const { t } = useDashboardLang();
  const [volume, setVolume] = useState(DEFAULT_UNTIL_MOUNTED);

  useEffect(() => {
    setVolume(getNotificationVolume());
  }, []);

  const commit = (next: number) => setVolume(setNotificationVolume(next));
  const isMuted = volume === 0;
  const Icon = isMuted ? VolumeX : volume < 34 ? Volume : volume < 67 ? Volume1 : Volume2;
  const toggleLabel = isMuted ? t("notifSound.unmute", "Bunyikan lagi") : t("notifSound.mute", "Bisukan");

  return (
    <div className={`flex items-center gap-1.5 ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => commit(isMuted ? DEFAULT_UNTIL_MOUNTED : 0)}
        title={toggleLabel}
        aria-label={toggleLabel}
        className="text-neutral-400 hover:text-cyan-300 transition"
      >
        <Icon size={15} />
      </button>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={volume}
        onChange={(e) => commit(Number(e.target.value))}
        onMouseUp={onPreview}
        onTouchEnd={onPreview}
        className="w-20 h-1 accent-cyan-400 cursor-pointer"
        aria-label={t("notifSound.volumeLabel", "Volume notifikasi suara")}
        title={t("notifSound.volumeLabel", "Volume notifikasi suara")}
      />
      <span className="text-[10px] text-neutral-500 w-7 text-right tabular-nums">{volume}%</span>
    </div>
  );
}
