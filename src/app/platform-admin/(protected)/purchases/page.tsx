"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fetchJsonObject, fetchJsonArray } from "@/lib/api/fetch-json";

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;
const inputCls = "w-full rounded-lg bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm";

const CATEGORY_LABEL: Record<string, string> = {
  smart_plug: "Smart Plug",
  other_product: "Produk Lainnya",
};

interface PurchasesData {
  purchases: any[];
  totalThisMonth: number;
}

const emptyForm = {
  purchaseDate: new Date().toISOString().slice(0, 10),
  category: "smart_plug",
  productId: "",
  itemName: "",
  supplierName: "",
  qty: "1",
  unitCost: "",
  note: "",
};

export default function PlatformPurchasesPage() {
  const [data, setData] = useState<PurchasesData | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [form, setForm] = useState<any>(emptyForm);
  const [busy, setBusy] = useState(false);

  const load = () => fetchJsonObject<PurchasesData>("/api/platform-admin/purchases").then(setData);
  useEffect(() => {
    load();
    fetchJsonArray("/api/platform-admin/products").then(setProducts);
  }, []);

  const qtyNum = Number(form.qty) || 0;
  const unitCostNum = Number(form.unitCost) || 0;
  const totalPreview = qtyNum * unitCostNum;

  const pickProduct = (productId: string) => {
    const p = products.find((x) => x.id === productId);
    setForm({ ...form, productId, itemName: p ? p.name : form.itemName, category: p?.category === "smart_plug" ? "smart_plug" : form.category });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.itemName || !form.unitCost) return;
    setBusy(true);
    try {
      const res = await fetch("/api/platform-admin/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, productId: form.productId || null, qty: qtyNum || 1, unitCost: unitCostNum }),
      });
      if (res.ok) setForm(emptyForm);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await fetch(`/api/platform-admin/purchases/${id}`, { method: "DELETE" });
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold text-amber-300">Pembelian</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Pembelian NEXBILL sendiri dari supplier — smart plug &amp; produk lain yang dijual balik ke outlet lewat Etalah Produk. Ini COGS platform,
          bukan pembelian outlet manapun. Otomatis ikut dihitung di margin bulanan halaman COGS Aplikasi.
        </p>
      </div>

      {data && (
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-400">Total Pembelian Bulan Ini</span>
            <span className="text-xl font-bold text-rose-300">{rupiah(data.totalThisMonth)}</span>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="gm-heading font-semibold mb-3">Catat Pembelian Baru</h2>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-end">
          <div>
            <label className="text-xs text-neutral-500">Tanggal</label>
            <input type="date" className={inputCls} value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Kategori</label>
            <select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-neutral-500">Link ke Produk Katalog (opsional)</label>
            <select className={inputCls} value={form.productId} onChange={(e) => pickProduct(e.target.value)}>
              <option value="">— Tidak terkait —</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-neutral-500">Nama Barang</label>
            <input className={inputCls} value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} placeholder="mis. Smart Plug BARDI Basic" />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Supplier</label>
            <input className={inputCls} value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} placeholder="mis. Toko ABC" />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Qty</label>
            <input type="number" min={1} className={inputCls} value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Harga Satuan (Rp)</label>
            <input type="number" min={0} className={inputCls} value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-neutral-500">Catatan (opsional)</label>
            <input className={inputCls} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <div className="sm:col-span-2 text-sm text-neutral-400">
            Total: <span className="font-semibold text-neutral-200">{rupiah(totalPreview)}</span>
          </div>
          <Button type="submit" disabled={busy} className="sm:col-span-6 w-fit">{busy ? "Menyimpan..." : "Tambah Pembelian"}</Button>
        </form>
      </Card>

      <Card>
        <h2 className="gm-heading font-semibold mb-3">Riwayat Pembelian</h2>
        {!data ? (
          <p className="text-sm text-neutral-500">Memuat...</p>
        ) : data.purchases.length === 0 ? (
          <p className="text-sm text-neutral-500">Belum ada pembelian dicatat.</p>
        ) : (
          <div className="space-y-1.5">
            {data.purchases.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm border-b border-white/5 pb-2 last:border-0">
                <div>
                  <div className="text-neutral-200">{p.purchaseDate} — {p.itemName} <span className="text-neutral-500">({CATEGORY_LABEL[p.category] ?? p.category})</span></div>
                  <div className="text-[11px] text-neutral-500">
                    {p.qty}x @ {rupiah(p.unitCost)}{p.supplierName ? ` · ${p.supplierName}` : ""}{p.note ? ` · ${p.note}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-rose-300">{rupiah(p.totalCost)}</span>
                  <button onClick={() => remove(p.id)} className="text-[11px] text-neutral-500 hover:text-rose-400">Hapus</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
