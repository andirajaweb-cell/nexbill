"use client";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Minus, Plus, ScanLine, Search, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CameraScanner } from "@/components/scanner/CameraScanner";
import { fetchJsonArray } from "@/lib/api/fetch-json";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { defaultCategoryLabel, findProductByCode, groupProductsByCategory, matchesProductQuery, sortProductsByName } from "@/lib/pos/product-search";
import "@/lib/i18n/dict-rental";
import "@/lib/i18n/dict-scanner";

export interface FnbProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  stockQty?: number | null;
  sku?: string | null;
  barcode?: string | null;
}

interface CategoryOption {
  code: string;
  label: string;
}

/**
 * Pemilih menu "+ F&B" di kartu sesi Rental PS.
 *  - Kategori sebagai chip (urut abjad), produk dikelompokkan per kategori dan urut abjad.
 *  - Kolom cari: banyak kata, SKU/barcode. Scanner barcode (alat USB/Bluetooth mengetik kode + Enter)
 *    atau tombol kamera langsung menambah 1. Enter dengan satu hasil pencarian juga menambah 1.
 *  - Jumlah per produk tetap di state milik halaman (cart), jadi "Tambah ke Bill" tidak berubah.
 */
export function FnbPicker({
  products,
  cart,
  setCart,
  onSubmit,
  formatMoney,
}: {
  products: FnbProduct[];
  cart: Record<string, number>;
  setCart: (update: (c: Record<string, number>) => Record<string, number>) => void;
  onSubmit: () => void | Promise<void>;
  formatMoney: (n: number) => string;
}) {
  const { t } = useDashboardLang();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const [scanOpen, setScanOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    fetchJsonArray<CategoryOption>("/api/product-categories")
      .then((rows) => {
        if (alive) setCategoryOptions(rows);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const id = setTimeout(() => setFeedback(null), 2500);
    return () => clearTimeout(id);
  }, [feedback]);

  const labelOf = useMemo(() => {
    const map = new Map(categoryOptions.map((c) => [c.code, c.label]));
    return (code: string) => map.get(code) ?? defaultCategoryLabel(code);
  }, [categoryOptions]);

  const allGroups = useMemo(() => groupProductsByCategory(products, labelOf), [products, labelOf]);
  const searching = search.trim().length > 0;
  const results = useMemo(() => (searching ? sortProductsByName(products.filter((p) => matchesProductQuery(p, search))) : []), [products, search, searching]);
  const groups = searching ? [] : category ? allGroups.filter((g) => g.category === category) : allGroups;

  const selectedLines = products.filter((p) => (cart[p.id] ?? 0) > 0);
  const selectedQty = selectedLines.reduce((s, p) => s + (cart[p.id] ?? 0), 0);
  const selectedTotal = selectedLines.reduce((s, p) => s + (cart[p.id] ?? 0) * p.price, 0);

  const inc = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const dec = (id: string) => setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) - 1) }));

  const addOne = (p: FnbProduct) => {
    inc(p.id);
    setFeedback({ ok: true, text: t("scanner.added", "Ditambahkan: {name}").replace("{name}", p.name) });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape" && search) {
      e.preventDefault();
      setSearch("");
      return;
    }
    if (e.key !== "Enter") return;
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    const exact = findProductByCode(products, q);
    if (exact) {
      addOne(exact);
      setSearch("");
      return;
    }
    if (results.length === 1) {
      addOne(results[0]);
      setSearch("");
      return;
    }
    if (results.length === 0) setFeedback({ ok: false, text: t("scanner.notFound", "Kode {code} tidak ditemukan di produk.").replace("{code}", q) });
  };

  const submit = async () => {
    if (selectedQty === 0 || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit();
      setSearch("");
      searchRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const row = (p: FnbProduct, showCategory: boolean) => {
    const qty = cart[p.id] ?? 0;
    const code = p.barcode || p.sku;
    return (
      <div key={p.id} className={`flex items-center gap-2 rounded-md px-1.5 py-1 text-xs ${qty > 0 ? "bg-emerald-500/10 ring-1 ring-emerald-400/30" : "hover:bg-white/5"}`}>
        <button type="button" className="flex-1 min-w-0 text-left" onClick={() => inc(p.id)}>
          <div className="truncate font-medium text-neutral-100">{p.name}</div>
          <div className="truncate text-[10px] text-neutral-500">
            {formatMoney(p.price)}
            {typeof p.stockQty === "number" ? ` · ${t("rental.fnbStock", "Stok {n}").replace("{n}", String(p.stockQty))}` : ""}
            {showCategory ? ` · ${labelOf(p.category)}` : ""}
            {code ? ` · ${code}` : ""}
          </div>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" aria-label={t("rental.fnbDecrease", "Kurangi")} className="w-7 h-7 rounded bg-white/10 flex items-center justify-center disabled:opacity-30" disabled={qty === 0} onClick={() => dec(p.id)}>
            <Minus size={12} />
          </button>
          <span className={`w-6 text-center tabular-nums ${qty > 0 ? "text-emerald-300 font-semibold" : "text-neutral-400"}`}>{qty}</span>
          <button type="button" aria-label={t("rental.fnbIncrease", "Tambah")} className="w-7 h-7 rounded bg-white/10 flex items-center justify-center" onClick={() => inc(p.id)}>
            <Plus size={12} />
          </button>
        </div>
      </div>
    );
  };

  if (products.length === 0) {
    return <div className="text-xs text-neutral-500 text-center py-3">{t("rental.fnbNoProducts", "Belum ada menu aktif. Tambahkan di Inventory.")}</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            ref={searchRef}
            autoFocus
            className="w-full rounded-lg bg-white/5 border border-white/10 pl-7 pr-7 py-1.5 text-xs"
            placeholder={t("rental.fnbSearchPlaceholder", "Cari menu / scan barcode…")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={onKeyDown}
          />
          {search && (
            <button type="button" aria-label={t("rental.fnbClearSearch", "Hapus pencarian")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-200" onClick={() => setSearch("")}>
              <X size={13} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setScanOpen(true)}
          title={t("scanner.button", "Scan kamera")}
          aria-label={t("scanner.button", "Scan kamera")}
          className="shrink-0 flex items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-2 text-cyan-200 hover:bg-cyan-500/20"
        >
          <ScanLine size={14} />
        </button>
      </div>

      <CameraScanner
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        mode="continuous"
        hint={t("scanner.hintProduct", "Arahkan kamera ke barcode produk.")}
        onCode={(code) => {
          const exact = findProductByCode(products, code);
          if (!exact) return t("scanner.notFound", "Kode {code} tidak ditemukan di produk.").replace("{code}", code);
          inc(exact.id);
          return t("scanner.added", "Ditambahkan: {name}").replace("{name}", exact.name);
        }}
      />

      {feedback && <div className={`rounded-md px-2 py-1 text-[11px] ${feedback.ok ? "bg-emerald-500/10 text-emerald-200" : "bg-rose-500/10 text-rose-200"}`}>{feedback.text}</div>}

      {!searching && allGroups.length > 1 && (
        <div className="flex gap-1 overflow-x-auto pb-0.5">
          <button type="button" onClick={() => setCategory("")} className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${category === "" ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-200" : "border-white/10 text-neutral-400 hover:text-neutral-200"}`}>
            {t("rental.fnbAllCategories", "Semua")} ({products.length})
          </button>
          {allGroups.map((g) => (
            <button
              key={g.category}
              type="button"
              onClick={() => setCategory(g.category === category ? "" : g.category)}
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] capitalize ${category === g.category ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-200" : "border-white/10 text-neutral-400 hover:text-neutral-200"}`}
            >
              {g.label} ({g.items.length})
            </button>
          ))}
        </div>
      )}

      <div className="max-h-72 overflow-y-auto space-y-2 pr-0.5">
        {searching ? (
          results.length === 0 ? (
            <div className="text-xs text-neutral-500 text-center py-3">{t("rental.fnbNoMatch", "Tidak ada menu yang cocok.")}</div>
          ) : (
            <div className="space-y-0.5">
              <div className="text-[10px] uppercase tracking-wide text-neutral-500 px-1">{t("rental.fnbResults", "Hasil pencarian ({n})").replace("{n}", String(results.length))}</div>
              {results.map((p) => row(p, true))}
            </div>
          )
        ) : (
          groups.map((g) => (
            <div key={g.category} className="space-y-0.5">
              <div className="sticky top-0 z-10 bg-neutral-950/95 px-1 py-0.5 text-[10px] uppercase tracking-wide text-neutral-500 backdrop-blur">{g.label}</div>
              {g.items.map((p) => row(p, false))}
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-2 text-[11px]">
        <span className={selectedQty > 0 ? "text-emerald-200" : "text-neutral-500"}>
          {t("rental.fnbSelectedSummary", "{n} item · {total}").replace("{n}", String(selectedQty)).replace("{total}", formatMoney(selectedTotal))}
        </span>
        {selectedQty > 0 && (
          <button type="button" className="text-neutral-500 hover:text-neutral-200 underline" onClick={() => setCart(() => ({}))}>
            {t("rental.fnbClear", "Kosongkan")}
          </button>
        )}
      </div>
      <Button className="w-full text-xs" disabled={selectedQty === 0 || submitting} onClick={submit}>
        {t("rental.addToBill", "Tambah ke Bill")}
      </Button>
    </div>
  );
}
