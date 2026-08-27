import { clsx } from "clsx";

const colors: Record<string, string> = {
  available: "bg-cyan-500/10 text-cyan-300 border-cyan-400/30 shadow-[0_0_8px_rgba(34,211,238,0.35)]",
  occupied: "bg-emerald-500/10 text-emerald-300 border-emerald-400/30 shadow-[0_0_8px_rgba(52,211,153,0.35)]",
  maintenance: "bg-amber-500/10 text-amber-300 border-amber-400/30 shadow-[0_0_8px_rgba(251,191,36,0.3)]",
  running: "bg-emerald-500/10 text-emerald-300 border-emerald-400/30 shadow-[0_0_8px_rgba(52,211,153,0.35)]",
  finished: "bg-white/5 text-neutral-400 border-white/10",
  success: "bg-emerald-500/10 text-emerald-300 border-emerald-400/30 shadow-[0_0_8px_rgba(52,211,153,0.35)]",
  pending: "bg-amber-500/10 text-amber-300 border-amber-400/30 shadow-[0_0_8px_rgba(251,191,36,0.3)]",
  failed: "bg-rose-500/10 text-rose-300 border-rose-400/30 shadow-[0_0_8px_rgba(244,63,94,0.35)]",
  on: "bg-emerald-500/10 text-emerald-300 border-emerald-400/30 shadow-[0_0_8px_rgba(52,211,153,0.35)]",
  off: "bg-white/5 text-neutral-400 border-white/10",
  unknown: "bg-white/5 text-neutral-400 border-white/10",
};

const dotColors: Record<string, string> = {
  available: "bg-cyan-400",
  occupied: "bg-emerald-400",
  maintenance: "bg-amber-400",
  running: "bg-emerald-400",
  finished: "bg-neutral-500",
  success: "bg-emerald-400",
  pending: "bg-amber-400",
  failed: "bg-rose-400",
  on: "bg-emerald-400",
  off: "bg-neutral-500",
  unknown: "bg-neutral-500",
};

export function Badge({ status, children }: { status: string; children: React.ReactNode }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium", colors[status] ?? colors.unknown)}>
      <span className={clsx("h-1.5 w-1.5 rounded-full", dotColors[status] ?? dotColors.unknown)} />
      {children}
    </span>
  );
}
