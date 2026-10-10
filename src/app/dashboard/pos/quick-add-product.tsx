"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { showAlert } from "@/lib/ui/dialog";
import { fetchJsonArray } from "@/lib/api/fetch-json";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-setup";

interface CategoryOption {
  id: string;
  code: string;
  label: string;
}

/** Kategori yang tidak dijual lewat Kasir (sewa perangkat, bahan baku, sparepart). */
const HIDDEN_CATEGORIES = new Set(["device_rental", "raw_material", "sparepart"]);

export interface QuickAddedProduct {
  id: string;
  name: string;
  price: number;
}

/**
 * "Tambah menu cepat" langsung dari Kasir: cukup nama, harga jual, kategori, dan (opsional) stok awal.
 * Sebelumnya produk hanya bisa dibuat di Inventory, sehingga kasir di hari pertama berhenti di layar
 * kosong. Harga modal, barcode, minimum stok, dan supplier tetap dilengkapi di Inventory.
 * Server (POST /api/products) mewajibkan izin Inventori atau Harga & Promo.
 */
export function QuickAddProduct({ onClose, onCreated }: { onClose: () => void; onCreated: (p: QuickAddedProduct) => void }) {
  const { t } = useDashboardLang();
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("drink");
  const [stock, setStock] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchJsonArray<CategoryOption>("/api/product-categories").then((rows) => {
      const usable = rows.filter((c) => !HIDDEN_CATEGORIES.has(c.code));
      setCategories(usable);
      if (usable.length && !usable.some((c) => c.code === "drink")) setCategory(usable[0].code);
    });
  }, []);

  const save = async () => {
    if (!name.trim()) return showAlert(t("setup.quickProduct.nameRequired", "Isi nama menu."));
    if (!(Number(price) > 0)) return showAlert(t("setup.quickProduct.priceRequired", "Isi harga jual lebih dari 0."));
    setSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          price: Math.round(Number(price)),
          category,
          stockQty: Math.max(0, Math.round(Number(stock || 0))),
          costPrice: 0,
          unit: "pcs",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return showAlert(data.error ?? res.statusText);
      onCreated({ id: data.id, name: data.name, price: Number(data.price) });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const input = "w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-3" onClick={onClose}>
      <div className="w-full max-w-md space-y-3 rounded-2xl border border-white/10 bg-neutral-950 p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-semibold">{t("setup.quickProduct.title", "Tambah menu cepat")}</h2>
            <p className="text-xs text-neutral-500">
              {t("setup.quickProduct.subtitle", "Menu langsung bisa dijual. Harga modal, barcode, dan minimum stok bisa dilengkapi nanti di Inventory.")}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-neutral-500 hover:text-neutral-200" aria-label={t("setup.common.cancel", "Batal")}>
            <X size={18} />
          </button>
        </div>
        <label className="block space-y-1">
          <span className="text-[11px] text-neutral-500">{t("setup.quickProduct.name", "Nama menu")}</span>
          <input autoFocus className={input} placeholder={t("setup.quickProduct.namePlaceholder", "mis. Es Teh Manis")} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block space-y-1">
            <span className="text-[11px] text-neutral-500">{t("setup.quickProduct.price", "Harga jual")}</span>
            <input type="number" inputMode="numeric" min={0} className={input} placeholder="5000" value={price} onChange={(e) => setPrice(e.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] text-neutral-500">{t("setup.quickProduct.category", "Kategori")}</span>
            <select className={input} value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.code}>{c.label}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="block space-y-1">
          <span className="text-[11px] text-neutral-500">{t("setup.quickProduct.stock", "Stok awal (opsional)")}</span>
          <input type="number" inputMode="numeric" min={0} className={input} placeholder="0" value={stock} onChange={(e) => setStock(e.target.value)} />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <Link href="/dashboard/inventory" className="text-xs text-cyan-300 hover:underline">
            {t("setup.quickProduct.importLink", "Banyak menu? Import dari Excel")}
          </Link>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={saving}>{t("setup.common.cancel", "Batal")}</Button>
            <Button onClick={save} disabled={saving}>{saving ? t("setup.common.saving", "Menyimpan...") : t("setup.quickProduct.save", "Simpan & tambah ke keranjang")}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
