"use client";
import { clsx } from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { computePanelPosition, isTriggerOffscreen, type PanelPosition, type Viewport } from "./searchable-select-position";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";

function readViewport(): Viewport {
  return {
    layoutHeight: window.innerHeight,
    visibleHeight: window.visualViewport?.height ?? window.innerHeight,
    width: window.innerWidth,
  };
}

/** Phones/tablets: auto-focusing the search box would pop the soft keyboard over the option list. */
function isTouchPrimary(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches;
}

export interface SearchableSelectOption {
  value: string;
  label: string;
  /** Extra text to match against when searching (e.g. account code, SKU). Defaults to label. */
  searchText?: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
  /** Renders a "-- clear --" first row that sets value to "". Off by default. */
  allowClear?: boolean;
  clearLabel?: string;
}

/**
 * Drop-in replacement for a plain <select> when the option list is long
 * (accounts, products, customers, staff, ...). Renders a button that looks
 * like the app's existing selects; clicking it opens a small popover with a
 * search box that filters the option list client-side.
 *
 * Keeps the same controlled value/onChange contract as a native <select>,
 * so most call sites only need the tag swapped.
 */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  className,
  disabled,
  allowClear = false,
  clearLabel,
}: SearchableSelectProps) {
  // Teks bawaan mengikuti bahasa dashboard; pemanggil yang mengirim teks sendiri tetap menang.
  const { t } = useDashboardLang();
  placeholder ??= t("select.placeholder", "Pilih...");
  searchPlaceholder ??= t("select.search", "Cari...");
  emptyText ??= t("select.empty", "Tidak ada hasil");
  clearLabel ??= t("select.clear", "-- Kosongkan --");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  // Where to render the portaled panel: viewport coordinates computed from the trigger button's
  // own bounding rect (see openDropdown()), not CSS — see the comment above the portal below for why.
  const [panelPos, setPanelPos] = useState<PanelPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => `${o.label} ${o.searchText ?? ""}`.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      // The panel is portaled to document.body (see below), so it's no longer a DOM descendant
      // of rootRef — has to be checked separately or every click inside it would look "outside".
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
      setQuery("");
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    if (open) {
      setHighlight(0);
      // Desktop only. On Android the focus opened the soft keyboard, which scrolled/resized the
      // page and (with the old close-on-scroll rule) shut the list before an option could be tapped.
      // Touch users can still tap the search box themselves.
      if (!isTouchPrimary()) requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Scroll/resize handling. This used to CLOSE the panel on any scroll or resize — which broke
  // every SearchableSelect on Android (PPOB "Diambil dari"/"Masuk ke" closed by itself right after
  // being tapped): opening the panel, or tapping its search box, brings up the soft keyboard, and
  // the browser then resizes the viewport and scrolls the focused field into view. Now the panel
  // follows its trigger button (and resizes its list to the space left above the keyboard), and
  // only closes once the trigger has actually left the screen.
  //
  // Capture phase so scrolling of ANY ancestor container is seen (scroll doesn't bubble); scroll
  // events from inside the panel (its own option list) are ignored.
  useEffect(() => {
    if (!open) return;
    let frame = 0;
    function reposition(e?: Event) {
      if (e && panelRef.current && e.target instanceof Node && panelRef.current.contains(e.target)) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = rootRef.current?.getBoundingClientRect();
        if (!rect) return;
        const vp = readViewport();
        if (isTriggerOffscreen(rect, vp)) {
          setOpen(false);
          setQuery("");
          return;
        }
        setPanelPos(computePanelPosition(rect, vp));
      });
    }
    const vv = window.visualViewport;
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    vv?.addEventListener("resize", reposition);
    vv?.addEventListener("scroll", reposition);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
      vv?.removeEventListener("resize", reposition);
      vv?.removeEventListener("scroll", reposition);
    };
  }, [open]);

  function openDropdown() {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPanelPos(computePanelPosition(rect, readViewport()));
    setOpen(true);
  }

  function choose(v: string) {
    onChange(v);
    setOpen(false);
    setQuery("");
  }

  function toggleOpen() {
    if (open) {
      setOpen(false);
      setQuery("");
    } else {
      openDropdown();
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[highlight];
      if (opt && !opt.disabled) choose(opt.value);
    }
  }

  return (
    // `className` is applied here too, not just on the <button> below: this outer div is the
    // actual grid/flex item as far as a parent `grid grid-cols-N` or `flex` layout is concerned,
    // so a caller passing a sizing class like "col-span-6" or "sm:col-span-2" needs it here to
    // have any effect. It used to land only on the button, which is just a plain block inside
    // this div's own box — so a parent CSS Grid always saw this div at its default auto (1
    // column) span no matter what col-span the caller passed to fit the button around, and the
    // button (itself `w-full` of that too-narrow box) rendered squeezed and truncated. Also
    // keeping it on the button preserves purely-visual overrides (e.g. "text-xs") exactly as
    // before.
    <div ref={rootRef} className={clsx("relative inline-block w-full", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        className={clsx(
          "flex w-full items-center justify-between gap-2 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm text-left disabled:opacity-40 disabled:cursor-not-allowed",
          className
        )}
      >
        <span className={clsx("truncate", !selected && "text-neutral-500")}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="text-neutral-500 text-xs shrink-0">▾</span>
      </button>

      {/*
        Portaled to document.body instead of rendered inline: the option cards this component is
        typically dropped into (see src/components/ui/Card.tsx) use backdrop-blur, which creates
        its own CSS stacking context — that traps an inline `position: absolute; z-index: 50`
        panel INSIDE the card's stacking context, so it paints behind any later sibling card in
        the DOM no matter how high its z-index is (this is what caused the option list to render
        underneath the "Paket 3 Jam"/"Paket 2 Jam" cards below it on the Promo page). Rendering at
        document.body via a portal, positioned with fixed viewport coordinates from the trigger
        button's own getBoundingClientRect() (see openDropdown() above), escapes that stacking
        context entirely.
      */}
      {open &&
        panelPos &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", left: panelPos.left, width: panelPos.width, top: panelPos.top, bottom: panelPos.bottom }}
            className="z-[200] rounded-lg border border-neutral-700 bg-neutral-900 shadow-xl"
          >
            <div className="p-1.5 border-b border-neutral-800">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={searchPlaceholder}
                className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400/60"
              />
            </div>
            <div className="overflow-y-auto overscroll-contain py-1" style={{ maxHeight: panelPos.listMaxHeight }}>
              {allowClear && (
                <button
                  type="button"
                  onClick={() => choose("")}
                  className="w-full text-left px-3 py-2 sm:py-1.5 text-sm text-neutral-500 hover:bg-white/5"
                >
                  {clearLabel}
                </button>
              )}
              {filtered.length === 0 && (
                <div className="px-3 py-2 text-xs text-neutral-500">{emptyText}</div>
              )}
              {filtered.map((o, i) => (
                <button
                  key={o.value}
                  type="button"
                  disabled={o.disabled}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => choose(o.value)}
                  className={clsx(
                    "w-full text-left px-3 py-2 sm:py-1.5 text-sm truncate disabled:opacity-40 disabled:cursor-not-allowed",
                    i === highlight ? "bg-cyan-500/20 text-cyan-100" : "hover:bg-white/5",
                    o.value === value && i !== highlight && "text-cyan-300"
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
