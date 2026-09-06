"use client";
import { clsx } from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";

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
  const rootRef = useRef<HTMLDivElement>(null);
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
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
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

  function choose(v: string) {
    onChange(v);
    setOpen(false);
    setQuery("");
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
        onClick={() => setOpen((o) => !o)}
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

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[220px] rounded-lg border border-neutral-700 bg-neutral-900 shadow-xl">
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
        </div>
      )}
    </div>
  );
}
