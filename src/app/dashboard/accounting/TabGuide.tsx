"use client";
import { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, Lightbulb, AlertTriangle, ListChecks, Target, Route, X } from "lucide-react";
import { ACCOUNTING_TAB_GUIDES, ACCOUNTING_WORKFLOW, GOLDEN_RULES } from "./guides";

/**
 * Panduan yang bisa dibuka-tutup di atas setiap tab Accounting, plus panel "Panduan Alur Kerja".
 * Status buka/tutup disimpan per penampil di localStorage (kenyamanan saja — kalau storage tidak
 * tersedia, panduan tetap tampil dalam keadaan tertutup). Disembunyikan saat mencetak.
 */

const STORAGE_KEY = "nexbill.accounting.guideOpen";

function readOpenMap(): Record<string, boolean> {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") ?? {};
  } catch {
    return {};
  }
}
function writeOpen(tab: string, open: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readOpenMap(), [tab]: open }));
  } catch {
    // storage blocked — the guide just won't remember its state
  }
}

function Section({ icon, title, items, tone }: { icon: React.ReactNode; title: string; items: string[]; tone: string }) {
  if (!items.length) return null;
  return (
    <div className="space-y-1.5">
      <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${tone}`}>
        {icon}
        {title}
      </div>
      <ul className="space-y-1 text-sm text-neutral-300">
        {items.map((it) => (
          <li key={it} className="flex gap-2">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-neutral-500" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TabGuide({ tab, label }: { tab: string; label?: string }) {
  const guide = ACCOUNTING_TAB_GUIDES[tab];
  const [open, setOpen] = useState<boolean>(() => (typeof window === "undefined" ? false : Boolean(readOpenMap()[tab])));
  if (!guide) return null;

  const toggle = () => {
    setOpen((o) => {
      writeOpen(tab, !o);
      return !o;
    });
  };

  return (
    <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 print:hidden">
      <button onClick={toggle} className="flex w-full items-start gap-3 px-4 py-3 text-left" aria-expanded={open}>
        <BookOpen size={18} className="mt-0.5 shrink-0 text-sky-400" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-sky-300">Panduan: {label ?? tab}</div>
          <div className="text-xs text-neutral-400">{guide.summary}</div>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-xs text-sky-400">
          {open ? "Tutup" : "Baca panduan"}
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>
      {open && (
        <div className="grid gap-5 border-t border-sky-500/20 px-4 py-4 md:grid-cols-2">
          <Section icon={<Lightbulb size={14} />} title="Konsep akuntansinya" items={guide.concept} tone="text-sky-300" />
          <Section icon={<Target size={14} />} title="Kegunaan" items={guide.uses} tone="text-emerald-300" />
          <Section icon={<AlertTriangle size={14} />} title="Yang harus diperhatikan" items={guide.watch} tone="text-amber-300" />
          <Section icon={<ListChecks size={14} />} title="Langkah kerja" items={guide.steps} tone="text-violet-300" />
        </div>
      )}
    </div>
  );
}

export function WorkflowGuide({ onClose, onOpenTab, shortcuts = [] }: { onClose: () => void; onOpenTab?: (tab: string) => void; shortcuts?: string[] }) {
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-4 print:hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Route size={18} className="mt-0.5 text-emerald-400" />
          <div>
            <div className="font-semibold text-emerald-300">Panduan Alur Kerja Akuntansi Outlet</div>
            <div className="text-xs text-neutral-400">
              Hampir semua jurnal dibuat otomatis dari kasir, rental, expense, belanja supplier, dan aset. Tugas Anda: memastikan setiap transaksi tercatat di menunya, lalu memeriksa dan menutup buku secara rutin.
            </div>
          </div>
        </div>
        <button onClick={onClose} className="text-neutral-500 hover:text-neutral-300" aria-label="Tutup panduan">
          <X size={18} />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {ACCOUNTING_WORKFLOW.map((stage, i) => (
          <div key={stage.when} className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-[11px] text-emerald-300">{i + 1}</span>
              {stage.when}
            </div>
            <ol className="space-y-1.5 text-xs text-neutral-300">
              {stage.items.map((it) => (
                <li key={it} className="flex gap-1.5">
                  <span className="text-neutral-600">•</span>
                  <span>{it}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3">
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-amber-300">Aturan emas pembukuan</div>
        <ul className="space-y-1 text-sm text-neutral-300">
          {GOLDEN_RULES.map((r) => (
            <li key={r} className="flex gap-2">
              <span className="text-amber-400">✓</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>

      {onOpenTab && shortcuts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
          <span>Mulai dari:</span>
          {shortcuts.map((tb) => (
            <button key={tb} onClick={() => onOpenTab(tb)} className="rounded-full border border-neutral-700 px-2.5 py-1 hover:border-emerald-500 hover:text-emerald-300">
              {tb}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
