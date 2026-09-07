"use client";
import { clsx } from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  placeholder = "Pilih...",
  searchPlaceholder = "Cari...",
  emptyText = "Tidak ada hasil",
  className,
  disabled,
  allowClear = false,
  clearLabel = "-- Kosongkan --",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  // Where to render the portaled panel: viewport coordinates computed from the trigger button's
  // own bounding rect (see openDropdown()), not CSS — see the comment above the portal below for why.
  const [panelPos, setPanelPos] = useState<{ left: number; width: number; top?: number; bottom?: number } | null>(null);
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
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Closing on scroll/resize (rather than tracking and repositioning) keeps this simple and safe:
  // a fixed-position portal has no way to know a container scrolled short of a scroll listener,
  // and for a short-lived search popover, closing is a perfectly normal UX (same as most native
  // comboboxes) instead of risking a dropdown that's silently drifted away from its button.
  //
  // Listening in the capture phase is what lets this catch scrolling on ANY ancestor container
  // (scroll events don't bubble, so a plain bubble-phase window listener would miss them) — but
  // that same capture-phase listener also fires for scrolling the option list's own internal
  // `overflow-y-auto` div, since capture happens on the way down to the target regardless of
  // bubbling. Without excluding that case, scrolling the list itself instantly closed the
  // dropdown before the scroll could register — the "can't scroll the options" bug. Guard by
  // ignoring scroll events whose target is inside the panel itself.
  useEffect(() => {
    if (!open) return;
    function onScrollOrResize(e: Event) {
      if (panelRef.current && e.target instanceof Node && panelRef.current.contains(e.target)) return;
      setOpen(false);
      setQuery("");
    }
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  function openDropdown() {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Flip above the button when there isn't room below (search box + up to ~8 rows, ~300px) but
    // there IS more room above — otherwise keep the normal below placement.
    const estimatedHeight = 300;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < estimatedHeight && rect.top > spaceBelow;
    setPanelPos({
      left: rect.left,
      width: Math.max(rect.width, 220),
      ...(placeAbove ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
    });
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
    <div ref={rootRef} className="relative inline-block w-full">
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
            <div className="max-h-56 overflow-y-auto py-1">
              {allowClear && (
                <button
                  type="button"
                  onClick={() => choose("")}
                  className="w-full text-left px-3 py-1.5 text-sm text-neutral-500 hover:bg-white/5"
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
                    "w-full text-left px-3 py-1.5 text-sm truncate disabled:opacity-40 disabled:cursor-not-allowed",
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
