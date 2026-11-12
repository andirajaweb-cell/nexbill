"use client";
import { clsx } from "clsx";
import { Loader2, Power } from "lucide-react";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { elapsedParts, type DeviceHealth } from "@/lib/devices/console";
import "@/lib/i18n/dict-devices";
import "@/lib/i18n/dict-devices-console";

/** Komponen tampilan "konsol" halaman Kontrol Perangkat (2026-11-12) — tanpa logika data. */

export type Tone = "neutral" | "cyan" | "emerald" | "amber" | "rose";

const TONE_ICON: Record<Tone, string> = {
  neutral: "bg-white/5 text-neutral-300",
  cyan: "bg-cyan-400/15 text-cyan-200",
  emerald: "bg-emerald-400/15 text-emerald-200",
  amber: "bg-amber-400/15 text-amber-200",
  rose: "bg-rose-400/15 text-rose-200",
};
const TONE_VALUE: Record<Tone, string> = {
  neutral: "text-neutral-100",
  cyan: "text-cyan-100",
  emerald: "text-emerald-200",
  amber: "text-amber-200",
  rose: "text-rose-200",
};

/** Kotak angka di kepala halaman; bisa diklik untuk menyaring/pindah sub-halaman. */
export function StatTile({
  icon,
  label,
  value,
  sub,
  tone = "neutral",
  active,
  progress,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: Tone;
  active?: boolean;
  /** 0–1: garis kemajuan tipis di bawah angka (mis. unit terhubung). */
  progress?: number | null;
  onClick?: () => void;
}) {
  const body = (
    <>
      <div className="flex items-center gap-2">
        <span className={clsx("grid h-7 w-7 shrink-0 place-items-center rounded-lg", TONE_ICON[tone])}>{icon}</span>
        <span className="truncate text-[11px] font-medium uppercase tracking-wide text-neutral-500">{label}</span>
      </div>
      <div className={clsx("mt-2 text-2xl font-bold tabular-nums leading-none", TONE_VALUE[tone])}>{value}</div>
      {progress != null && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
          <div className={clsx("h-full rounded-full", progress >= 1 ? "bg-emerald-400/80" : "bg-amber-400/80")} style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }} />
        </div>
      )}
      {sub && <div className="mt-1.5 truncate text-[11px] text-neutral-500">{sub}</div>}
    </>
  );
  const cls = clsx(
    "rounded-xl border p-3 text-left transition",
    active
      ? "border-cyan-400/50 bg-gradient-to-b from-cyan-500/15 to-transparent shadow-[0_0_0_1px_rgba(34,211,238,0.15),0_12px_30px_-18px_rgba(34,211,238,0.6)]"
      : "border-white/10 bg-white/[0.02]",
    onClick && !active && "hover:border-white/20 hover:bg-white/[0.04]"
  );
  return onClick ? (
    <button type="button" onClick={onClick} aria-pressed={!!active} className={cls}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

const HEALTH_PILL: Record<DeviceHealth, string> = {
  on: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300 shadow-[0_0_10px_-2px_rgba(52,211,153,0.45)]",
  off: "border-white/10 bg-white/5 text-neutral-400",
  attention: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  unknown: "border-white/10 bg-white/5 text-neutral-500",
};
const HEALTH_DOT: Record<DeviceHealth, string> = {
  on: "bg-emerald-400",
  off: "bg-neutral-500",
  attention: "bg-amber-400 animate-pulse",
  unknown: "bg-neutral-600",
};

export function useHealthLabel() {
  const { t } = useDashboardLang();
  return (h: DeviceHealth) =>
    h === "on"
      ? t("devices.console.health.on", "Menyala")
      : h === "off"
        ? t("devices.console.health.off", "Mati")
        : h === "attention"
          ? t("devices.console.health.attention", "Tidak merespons")
          : t("devices.console.health.unknown", "Belum diketahui");
}

export function HealthPill({ health }: { health: DeviceHealth }) {
  const label = useHealthLabel();
  return (
    <span className={clsx("inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium", HEALTH_PILL[health])}>
      <span className={clsx("h-1.5 w-1.5 rounded-full", HEALTH_DOT[health])} />
      {label(health)}
    </span>
  );
}

/**
 * Saklar dua tombol Nyalakan | Matikan. Sengaja bukan toggle tunggal: status terakhir bisa belum
 * diketahui atau tidak sinkron (TV dimatikan dari remote), jadi kedua perintah selalu tersedia;
 * tombol yang sesuai status terakhir disorot.
 */
export function PowerSwitch({ state, busy, onToggle, compact }: { state: string; busy: "on" | "off" | null; onToggle: (on: boolean) => void; compact?: boolean }) {
  const { t } = useDashboardLang();
  const btn = (on: boolean) => {
    const active = state === (on ? "on" : "off");
    const loading = busy === (on ? "on" : "off");
    return (
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => onToggle(on)}
        aria-pressed={active}
        className={clsx(
          "inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-semibold transition disabled:cursor-wait disabled:opacity-60",
          compact ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
          active && on && "bg-emerald-500/20 text-emerald-200 shadow-[0_0_0_1px_rgba(52,211,153,0.45),0_0_14px_-2px_rgba(52,211,153,0.5)]",
          active && !on && "bg-white/10 text-neutral-100 shadow-[0_0_0_1px_rgba(255,255,255,0.18)]",
          !active && "text-neutral-400 hover:bg-white/5 hover:text-neutral-100"
        )}
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <Power size={13} />}
        {on ? t("devices.action.turnOn", "Nyalakan") : t("devices.action.turnOff", "Matikan")}
      </button>
    );
  };
  return (
    <div role="group" className="flex gap-1 rounded-lg border border-white/10 bg-black/20 p-1">
      {btn(true)}
      {btn(false)}
    </div>
  );
}

/** "3 mnt lalu" dalam bahasa dashboard. */
export function useAgo() {
  const { t } = useDashboardLang();
  return (iso: string | null | undefined, now?: number): string | null => {
    const p = elapsedParts(iso, now);
    if (!p) return null;
    if (p.unit === "now") return t("devices.console.ago.now", "baru saja");
    const n = String(p.value);
    if (p.unit === "minute") return t("devices.console.ago.minute", "{n} mnt lalu").replace("{n}", n);
    if (p.unit === "hour") return t("devices.console.ago.hour", "{n} jam lalu").replace("{n}", n);
    return t("devices.console.ago.day", "{n} hari lalu").replace("{n}", n);
  };
}

/** Pilihan berbentuk pil (filter jenis/status). */
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string; count?: number }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex gap-1 overflow-x-auto rounded-full border border-white/10 bg-white/[0.02] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={clsx(
            "whitespace-nowrap rounded-full px-3 py-1 text-xs transition",
            value === o.value ? "bg-cyan-400/15 text-cyan-200 shadow-[0_0_0_1px_rgba(34,211,238,0.35)]" : "text-neutral-400 hover:text-neutral-100"
          )}
        >
          {o.label}
          {o.count != null && <span className="ml-1.5 tabular-nums text-neutral-500">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

const PANEL_BORDER: Record<Tone, string> = {
  neutral: "border-white/10",
  cyan: "border-cyan-400/40",
  emerald: "border-emerald-400/25",
  amber: "border-amber-400/30",
  rose: "border-rose-400/30",
};

/**
 * Kartu dengan warna tepi sesuai nada. Sama rupa dengan <Card>, tetapi warna tepi & padding
 * ditentukan di sini (bukan ditimpa lewat className) supaya tidak bergantung urutan kelas CSS.
 */
export function Panel({ tone = "neutral", flush, className, children }: { tone?: Tone; flush?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div
      className={clsx(
        "rounded-xl border bg-[#0f1426]/70 backdrop-blur-md shadow-[0_0_0_1px_rgba(56,189,248,0.04),0_8px_24px_-8px_rgba(0,0,0,0.6)]",
        PANEL_BORDER[tone],
        flush ? "overflow-hidden" : "p-4",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Kepala bagian di dalam sub-halaman. */
export function SectionHeading({ icon, title, desc, right }: { icon?: React.ReactNode; title: string; desc?: string; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        {icon && <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/5 text-cyan-300">{icon}</div>}
        <div className="min-w-0">
          <h2 className="font-medium text-neutral-100">{title}</h2>
          {desc && <p className="mt-0.5 text-xs text-neutral-500">{desc}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}
