"use client";
import { useEffect, useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, ListChecks, Lightbulb } from "lucide-react";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { getPageGuideBook } from "@/lib/guides/page-guides-book";
import type { PageGuideKey } from "@/lib/guides/page-guides";

const STORAGE_KEY = "nexbill.pageGuide.open";

function readOpenMap(): Record<string, boolean> {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

/**
 * Panduan singkat yang bisa dibuka-tutup di atas menu harian — pola yang sama dengan TabGuide di
 * Akuntansi. Ringkasan satu kalimat selalu terlihat; langkah dan catatan tampil saat dibuka. Status
 * buka/tutup diingat per halaman di localStorage. Disembunyikan saat mencetak.
 */
export function PageGuide({ page, title }: { page: PageGuideKey; title: string }) {
  const { lang } = useDashboardLang();
  const book = getPageGuideBook(lang);
  const guide = book.pages[page];
  const ui = book.ui;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(Boolean(readOpenMap()[page]));
  }, [page]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readOpenMap(), [page]: next }));
    } catch {
      /* storage diblokir — panduan hanya tidak mengingat statusnya */
    }
  };

  return (
    <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 print:hidden">
      <button type="button" onClick={toggle} className="flex w-full items-start gap-3 px-4 py-3 text-left" aria-expanded={open}>
        <BookOpen size={18} className="mt-0.5 shrink-0 text-sky-400" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-sky-300">
            {ui.guidePrefix}: {title}
          </div>
          <div className="text-xs text-neutral-400">{guide.summary}</div>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-xs text-sky-400">
          {open ? ui.close : ui.open}
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>
      {open && (
        <div className="grid gap-5 border-t border-sky-500/20 px-4 py-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-violet-300">
              <ListChecks size={14} />
              {ui.steps}
            </div>
            <ol className="space-y-1.5 text-sm text-neutral-300">
              {guide.steps.map((s, i) => (
                <li key={s} className="flex gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-[10px] font-bold text-violet-300">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-300">
              <Lightbulb size={14} />
              {ui.tips}
            </div>
            <ul className="space-y-1 text-sm text-neutral-300">
              {guide.tips.map((s) => (
                <li key={s} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-neutral-500" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
