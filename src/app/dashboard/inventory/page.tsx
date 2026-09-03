"use client";
import { Fragment, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fetchJsonArray, fetchJsonObject } from "@/lib/api/fetch-json";
import { useAuth, isSuperRole } from "@/lib/auth/client";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-inventory";

interface Product {
  id: string; name: string; category: string; price: number; costPrice: number;
  stockQty: number; lowStockThreshold: number; unit: string; isActive: boolean;
  preferredSupplierId: string | null;
}

interface SupplierOption { id: string; name: string }

interface UnitOption { id: string; code: string; label: string; isActive: boolean }

/** Shared unit-of-measure dropdown, sourced from Settings > Satuan. Used by Produk and Resep/BOM so both draw from the same option list instead of free-typed text. */
function UnitSelect({ units, value, onChange, className }: { units: UnitOption[]; value: string; onChange: (code: string) => void; className?: string }) {
  return (
    <select className={className ?? "rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-sm"} value={value} onChange={(e) => onChange(e.target.value)}>
      {!units.some((u) => u.code === value) && value && <option value={value}>{value}</option>}
      {units.map((u) => <option key={u.id} value={u.code}>{u.label}</option>)}
    </select>
  );
}

const rupiah = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;
const TABS = ["Produk", "Resep / BOM", "Supplier", "Belanja Supplier", "Purchase Order", "Stock Opname"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABEL_KEYS: Record<Tab, { key: string; fallback: string }> = {
  "Produk": { key: "inventory.tab.products", fallback: "Produk" },
  "Resep / BOM": { key: "inventory.tab.recipe", fallback: "Resep / BOM" },
  "Supplier": { key: "inventory.tab.supplier", fallback: "Supplier" },
  "Belanja Supplier": { key: "inventory.tab.supplierPurchase", fallback: "Belanja Supplier" },
  "Purchase Order": { key: "inventory.tab.purchaseOrder", fallback: "Purchase Order" },
  "Stock Opname": { key: "inventory.tab.stockOpname", fallback: "Stock Opname" },
};

export default function InventoryPage() {
  const { t } = useDashboardLang();
  const [tab, setTab] = useState<Tab>("Produk");
  const [outletId, setOutletId] = useState<string | null>(null);

  useEffect(() => {
    fetchJsonObject("/api/outlets/default").then((o) => { if (o) setOutletId(o.id); });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold gm-gradient-title">{t("inventory.pageTitle", "Inventory Control")}</h1>
        <p className="text-sm text-neutral-500">{t("inventory.pageSubtitle", "Stok, supplier, purchase order, dan stock opname — semua otomatis terhubung ke akuntansi.")}</p>
      </div>

      <div className="flex gap-1 border-b border-neutral-800 overflow-x-auto">
        {TABS.map((tb) => (
          <button key={tb} onClick={() => setTab(tb)} className={`px-3 py-2 text-sm whitespace-nowrap ${tab === tb ? "border-b-2 border-emerald-500 text-emerald-400" : "text-neutral-500 hover:text-neutral-300"}`}>{t(TAB_LABEL_KEYS[tb].key, TAB_LABEL_KEYS[tb].fallback)}</button>
        ))}
      </div>

      {!outletId ? null : tab === "Produk" ? <ProductTab outletId={outletId} /> : tab === "Resep / BOM" ? <RecipeTab outletId={outletId} /> : tab === "Supplier" ? <SupplierTab outletId={outletId} /> : tab === "Belanja Supplier" ? <SupplierPurchaseTab outletId={outletId} /> : tab === "Purchase Order" ? <PurchaseOrderTab outletId={outletId} /> : <StockOpnameTab outletId={outletId} />}
    </div>
  );
}

const CATEGORY_LABEL_KEYS: Record<string, { key: string; fallback: string }> = {
  food: { key: "inventory.category.food", fallback: "Makanan" },
  drink: { key: "inventory.category.drink", fallback: "Minuman" },
  coffee: { key: "inventory.category.coffee", fallback: "Kopi" },
  snack: { key: "inventory.category.snack", fallback: "Snack" },
  dessert: { key: "inventory.category.dessert", fallback: "Dessert" },
  merchandise: { key: "inventory.category.merchandise", fallback: "Merchandise" },
  accessory: { key: "inventory.category.accessory", fallback: "Aksesoris (Jual)" },
  raw_material: { key: "inventory.category.rawMaterial", fallback: "Bahan Baku" },
  device_rental: { key: "inventory.category.deviceRental", fallback: "Sewa Perangkat" },
  other: { key: "inventory.category.other", fallback: "Lainnya" },
};

function CategorySelect({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  const { t } = useDashboardLang();
  return (
    <select className={className ?? "rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm"} value={value} onChange={(e) => onChange(e.target.value)}>
      {Object.entries(CATEGORY_LABEL_KEYS).map(([v, meta]) => <option key={v} value={v}>{t(meta.key, meta.fallback)}</option>)}
    </select>
  );
}

type AdjustMode = "add" | "subtract" | "set";
type AdjustReason = "normal" | "waste";

function ProductTab({ outletId }: { outletId: string }) {
  const { t } = useDashboardLang();
  const { user } = useAuth();
  // Was isSuperRole (Superuser-only) — deactivating your own outlet's product is a routine
  // day-to-day inventory task, not something that should require NEXBILL's internal account.
  // manage_inventory_purchasing is the same permission that already covers everything else on
  // this page (owner + manager get it by default — see DEFAULT_ROLE_PERMISSIONS in permissions.ts).
  const canDelete = hasPermission((user?.role ?? "cashier") as StaffRole, "manage_inventory_purchasing");
  const [products, setProducts] = useState<Product[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [form, setForm] = useState({ name: "", category: "food", price: 0, costPrice: 0, stockQty: 0, unit: "pcs", lowStockThreshold: 5, preferredSupplierId: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ category: string; price: number; costPrice: number; unit: string; lowStockThreshold: number; preferredSupplierId: string } | null>(null);

  // "Penyesuaian Barang" — replaces the old costed Restock shortcut. Pure quantity tool (no
  // harga beli input): Tambah Unit / Kurangi Unit / Set ke Jumlah Tertentu, all posted via
  // POST /api/inventory as type "adjustment" (or "waste" for a Kurangi Unit with reason
  // Rusak/Waste). Stock that should move HPP/harga modal still goes through Belanja Supplier or
  // Purchase Order → Terima Barang, never here.
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustMode, setAdjustMode] = useState<AdjustMode>("add");
  const [adjustValue, setAdjustValue] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<AdjustReason>("normal");
  const [adjustNote, setAdjustNote] = useState("");

  const load = () => fetchJsonArray("/api/products").then(setProducts);
  useEffect(() => {
    load();
    fetchJsonArray<UnitOption>(`/api/units?outletId=${outletId}`).then((rows) => setUnits(rows.filter((u) => u.isActive)));
    fetchJsonArray<SupplierOption>(`/api/suppliers?outletId=${outletId}`).then(setSuppliers);
  }, [outletId]);

  const addProduct = async () => {
    if (!form.name) return;
    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, preferredSupplierId: form.preferredSupplierId || null, outletId: await getOutletId() }),
    });
    setForm({ name: "", category: "food", price: 0, costPrice: 0, stockQty: 0, unit: units[0]?.code ?? "pcs", lowStockThreshold: 5, preferredSupplierId: "" });
    load();
  };

  const deleteProduct = async (p: Product) => {
    if (!await showConfirm(t('inventory.product.confirmDeactivate', 'Nonaktifkan produk "{name}"? Riwayat order tetap tersimpan.').replace("{name}", p.name))) return;
    // Was /api/admin/products/${p.id} — that route never existed, so this button silently 404'd
    // and never actually deactivated anything. The real route lives at /api/products/[id] (same
    // one PATCH/edit already uses) — see its DELETE handler for why this is a soft
    // deactivate (isActive: false) rather than a real row delete.
    const res = await fetch(`/api/products/${p.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    load();
  };

  const reactivateProduct = async (p: Product) => {
    const res = await fetch(`/api/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    load();
  };

  const startEdit = (p: Product) => {
    setAdjustingId(null);
    setEditingId(p.id);
    setEditForm({ category: p.category, price: p.price, costPrice: p.costPrice, unit: p.unit, lowStockThreshold: p.lowStockThreshold, preferredSupplierId: p.preferredSupplierId ?? "" });
  };
  const cancelEdit = () => { setEditingId(null); setEditForm(null); };
  const toggleEdit = (p: Product) => (editingId === p.id ? cancelEdit() : startEdit(p));

  const saveEdit = async (id: string) => {
    if (!editForm) return;
    const res = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editForm, preferredSupplierId: editForm.preferredSupplierId || null }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    cancelEdit();
    load();
  };

  const toggleAdjust = (p: Product) => {
    if (adjustingId === p.id) { setAdjustingId(null); return; }
    cancelEdit();
    setAdjustingId(p.id);
    setAdjustMode("add");
    setAdjustValue(0);
    setAdjustReason("normal");
    setAdjustNote("");
  };

  const submitAdjust = async (p: Product) => {
    let qty: number;
    let type: string;
    if (adjustMode === "add") {
      if (!adjustValue || adjustValue <= 0) return showAlert(t("inventory.product.qtyMustBePositive", "Qty harus lebih dari 0."));
      qty = adjustValue;
      type = "adjustment";
    } else if (adjustMode === "subtract") {
      if (!adjustValue || adjustValue <= 0) return showAlert(t("inventory.product.qtyMustBePositive", "Qty harus lebih dari 0."));
      if (adjustReason === "waste") { qty = adjustValue; type = "waste"; } // route negates waste automatically
      else { qty = -adjustValue; type = "adjustment"; }
    } else {
      const delta = adjustValue - p.stockQty;
      if (delta === 0) return showAlert(t("inventory.product.noChangeSameQty", "Jumlah sama dengan stok saat ini — tidak ada perubahan."));
      qty = delta;
      type = "adjustment";
    }
    await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: p.id, type, qty, note: adjustNote || undefined }),
    });
    setAdjustingId(null);
    load();
  };

  const adjustPillCls = (active: boolean) => `px-3 py-1.5 rounded-lg text-xs ${active ? "bg-emerald-600 text-white" : "bg-neutral-800 text-neutral-400"}`;
  const smallInputCls = "w-full rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs";

  return (
    <div className="space-y-6">
      <ImportProductsCard outletId={outletId} onImported={load} />

      <Card>
        <h2 className="font-medium mb-3">{t("inventory.product.addNew", "Tambah Produk Baru")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <input className="col-span-2 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("inventory.product.namePlaceholder", "Nama produk")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <CategorySelect value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
          <UnitSelect units={units} value={form.unit} onChange={(v) => setForm({ ...form, unit: v })} className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" />
          <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("inventory.product.sellPricePlaceholder", "Harga jual")} value={form.price || ""} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("inventory.product.costPricePlaceholder", "Harga modal (opsional, bisa otomatis dari Belanja Supplier)")} value={form.costPrice || ""} onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })} />
          <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("inventory.product.initialStockPlaceholder", "Stok awal")} value={form.stockQty || ""} onChange={(e) => setForm({ ...form, stockQty: Number(e.target.value) })} />
          <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("inventory.product.minStockPlaceholder", "Minimum stok")} value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: Number(e.target.value) })} />
          <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.preferredSupplierId} onChange={(e) => setForm({ ...form, preferredSupplierId: e.target.value })}>
            <option value="">{t("inventory.product.preferredSupplierOption", "Supplier utama (opsional)")}</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Button onClick={addProduct}>{t("inventory.action.add", "Tambah")}</Button>
        </div>
        <p className="text-xs text-neutral-600 mt-2">{t("inventory.product.unitSettingsPrefix", "Satuan bisa diatur di ")}<a href="/dashboard/settings" className="text-emerald-400 underline">{t("inventory.product.unitSettingsLinkLabel", "Pengaturan > Satuan")}</a>{t("inventory.product.unitSettingsSuffix", ". Harga modal produk resep (F&B olahan) diatur lewat tab Resep/BOM, bukan di sini. Supplier utama dipakai untuk auto-buat draft Purchase Order saat stok mencapai minimum (lihat tab Purchase Order).")}</p>
      </Card>

      <Card>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-neutral-500 border-b border-neutral-800"><th className="py-2">{t("inventory.product.table.name", "Produk")}</th><th>{t("inventory.product.table.category", "Kategori")}</th><th>{t("inventory.product.table.price", "Harga")}</th><th>{t("inventory.product.table.cost", "Modal")}</th><th>{t("inventory.product.table.stock", "Stok")}</th><th>{t("inventory.product.table.supplier", "Supplier Utama")}</th><th></th></tr></thead>
          <tbody>
            {products.map((p) => (
              <Fragment key={p.id}>
                <tr className={`border-b border-neutral-900 align-top ${p.isActive === false ? "opacity-50" : ""}`}>
                  <td className="py-2">
                    {p.name}
                    {p.isActive === false && <span className="text-xs text-rose-400 ml-2">{t("inventory.product.inactiveTag", "(nonaktif)")}</span>}
                  </td>
                  <td className="capitalize text-neutral-400">{CATEGORY_LABEL_KEYS[p.category] ? t(CATEGORY_LABEL_KEYS[p.category].key, CATEGORY_LABEL_KEYS[p.category].fallback) : p.category.replace("_", " ")}</td>
                  <td>{rupiah(p.price)}</td>
                  <td className="text-neutral-500">{rupiah(p.costPrice)}</td>
                  <td className={p.stockQty <= p.lowStockThreshold ? "text-amber-400 font-medium" : ""}>
                    {p.stockQty} {p.unit}
                    <div className="text-[10px] text-neutral-600 font-normal">{t("inventory.product.minLabel", "min")} {p.lowStockThreshold}</div>
                  </td>
                  <td className="text-xs text-neutral-500">{suppliers.find((s) => s.id === p.preferredSupplierId)?.name ?? "-"}</td>
                  <td className="text-right whitespace-nowrap">
                    {p.isActive === false ? (
                      canDelete && <Button variant="ghost" className="text-xs px-2 py-1" onClick={() => reactivateProduct(p)}>{t("inventory.product.reactivateButton", "Aktifkan")}</Button>
                    ) : (
                      <>
                        <Button variant="secondary" className="text-xs px-2 py-1 mr-1" onClick={() => toggleAdjust(p)}>{t("inventory.product.adjustButton", "Penyesuaian")}</Button>
                        <Button variant="ghost" className="text-xs px-2 py-1" onClick={() => toggleEdit(p)}>{t("inventory.action.edit", "Edit")}</Button>
                        {canDelete && <Button variant="ghost" className="text-xs px-2 py-1 text-red-400" onClick={() => deleteProduct(p)}>{t("inventory.product.deleteButton", "Hapus")}</Button>}
                      </>
                    )}
                  </td>
                </tr>

                {editingId === p.id && editForm && (
                  <tr className="border-b border-neutral-900 bg-neutral-900/40">
                    <td colSpan={7} className="py-3">
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                        <div><label className="text-xs text-neutral-500">{t("inventory.product.editForm.category", "Kategori")}</label><CategorySelect value={editForm.category} onChange={(v) => setEditForm({ ...editForm, category: v })} className={smallInputCls} /></div>
                        <div><label className="text-xs text-neutral-500">{t("inventory.product.editForm.sellPrice", "Harga Jual")}</label><input type="number" className={smallInputCls} value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })} /></div>
                        <div><label className="text-xs text-neutral-500">{t("inventory.product.editForm.costPrice", "Harga Modal")}</label><input type="number" className={smallInputCls} value={editForm.costPrice} onChange={(e) => setEditForm({ ...editForm, costPrice: Number(e.target.value) })} /></div>
                        <div><label className="text-xs text-neutral-500">{t("inventory.product.editForm.unit", "Satuan")}</label><UnitSelect units={units} value={editForm.unit} onChange={(v) => setEditForm({ ...editForm, unit: v })} className={smallInputCls} /></div>
                        <div><label className="text-xs text-neutral-500">{t("inventory.product.editForm.minStock", "Minimum Stok")}</label><input type="number" className={smallInputCls} value={editForm.lowStockThreshold} onChange={(e) => setEditForm({ ...editForm, lowStockThreshold: Number(e.target.value) })} /></div>
                        <div>
                          <label className="text-xs text-neutral-500">{t("inventory.product.editForm.supplier", "Supplier Utama")}</label>
                          <select className={smallInputCls} value={editForm.preferredSupplierId} onChange={(e) => setEditForm({ ...editForm, preferredSupplierId: e.target.value })}>
                            <option value="">-</option>
                            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button className="text-xs px-2 py-1" onClick={() => saveEdit(p.id)}>{t("inventory.action.save", "Simpan")}</Button>
                        <Button variant="ghost" className="text-xs px-2 py-1" onClick={cancelEdit}>{t("inventory.action.cancel", "Batal")}</Button>
                      </div>
                    </td>
                  </tr>
                )}

                {adjustingId === p.id && (
                  <tr className="border-b border-neutral-900 bg-neutral-900/40">
                    <td colSpan={7} className="py-3">
                      <div className="space-y-2 max-w-2xl">
                        <div className="flex gap-2">
                          <button className={adjustPillCls(adjustMode === "add")} onClick={() => setAdjustMode("add")}>{t("inventory.product.adjustAddUnit", "+ Tambah Unit")}</button>
                          <button className={adjustPillCls(adjustMode === "subtract")} onClick={() => setAdjustMode("subtract")}>{t("inventory.product.adjustSubtractUnit", "- Kurangi Unit")}</button>
                          <button className={adjustPillCls(adjustMode === "set")} onClick={() => setAdjustMode("set")}>{t("inventory.product.adjustSetQty", "Set ke Jumlah Tertentu")}</button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <label className="text-xs text-neutral-500">{adjustMode === "set" ? t("inventory.product.actualQtyLabel", "Jumlah stok sebenarnya") : t("inventory.placeholder.qty", "Qty")}</label>
                            <input type="number" className={smallInputCls} value={adjustValue || ""} onChange={(e) => setAdjustValue(Number(e.target.value))} />
                          </div>
                          {adjustMode === "subtract" && (
                            <div>
                              <label className="text-xs text-neutral-500">{t("inventory.product.reasonLabel", "Alasan")}</label>
                              <select className={smallInputCls} value={adjustReason} onChange={(e) => setAdjustReason(e.target.value as AdjustReason)}>
                                <option value="normal">{t("inventory.product.reasonNormal", "Penyesuaian / Selisih")}</option>
                                <option value="waste">{t("inventory.product.reasonWaste", "Rusak / Waste")}</option>
                              </select>
                            </div>
                          )}
                          <div className="col-span-2">
                            <label className="text-xs text-neutral-500">{t("inventory.product.noteLabel", "Catatan (opsional)")}</label>
                            <input className={smallInputCls} value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} placeholder={t("inventory.product.notePlaceholder", "mis. hasil cek gudang")} />
                          </div>
                        </div>
                        {adjustMode === "set" && (
                          <div className="text-xs">
                            {(() => {
                              const d = adjustValue - p.stockQty;
                              if (!adjustValue && adjustValue !== 0) return null;
                              if (d === 0) return <span className="text-neutral-500">{t("inventory.product.diffNoChange", "Selisih: tidak ada perubahan.")}</span>;
                              return <span className={d > 0 ? "text-emerald-400" : "text-red-400"}>{t("inventory.product.diffPrefix", "Selisih:")} {d > 0 ? `+${d} (${t("inventory.product.diffMoreSuffix", "lebih")})` : `${d} (${t("inventory.product.diffLessSuffix", "kurang")})`}</span>;
                            })()}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button className="text-xs px-2 py-1" onClick={() => submitAdjust(p)}>{t("inventory.product.submitAdjust", "Simpan Penyesuaian")}</Button>
                          <Button variant="ghost" className="text-xs px-2 py-1" onClick={() => setAdjustingId(null)}>{t("inventory.action.cancel", "Batal")}</Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function ImportProductsCard({ outletId, onImported }: { outletId: string; onImported: () => void }) {
  const { t } = useDashboardLang();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const upload = async () => {
    if (!file) return showAlert(t("inventory.import.chooseFileAlert", "Pilih file Excel (.xlsx) dulu."));
    setUploading(true);
    setResult(null);
    const fd = new FormData();
    fd.append("outletId", outletId);
    fd.append("file", file);
    const res = await fetch("/api/products/import", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) { showAlert(data.error); return; }
    setResult(data);
    setFile(null);
    onImported();
  };

  const errorRows = (result?.details ?? []).filter((d: any) => d.action === "error");

  return (
    <Card className="space-y-3 border-emerald-500/30">
      <div>
        <h2 className="font-medium">{t("inventory.import.title", "Import Produk dari Excel")}</h2>
        <p className="text-xs text-neutral-500">{t("inventory.import.description", "Tambah banyak produk sekaligus. Download template, isi datanya, lalu upload kembali. Produk dengan SKU yang sudah ada akan di-update (harga/kategori/dll) tanpa mengubah stok — pakai Penyesuaian Barang di tab Produk untuk stok.")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <a href="/api/products/import/template" className="text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 px-3 py-2 font-medium transition">{t("inventory.import.downloadTemplate", "Download Template Excel")}</a>
        <input
          type="file"
          accept=".xlsx,.xls"
          className="text-xs text-neutral-400 file:mr-2 file:rounded-lg file:border-0 file:bg-neutral-800 file:px-3 file:py-2 file:text-xs file:text-neutral-200 file:cursor-pointer"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <Button onClick={upload} disabled={!file || uploading}>{uploading ? t("inventory.import.uploading", "Mengimport...") : t("inventory.import.uploadButton", "Upload & Import")}</Button>
      </div>

      {result && (
        <div className="rounded-lg border border-neutral-800 p-3 text-xs space-y-2">
          <div className="flex gap-4">
            <span>{t("inventory.import.totalRows", "Total baris:")} <b>{result.totalRows}</b></span>
            <span className="text-emerald-400">{t("inventory.import.created", "Dibuat:")} <b>{result.created}</b></span>
            <span className="text-amber-400">{t("inventory.import.updated", "Diupdate:")} <b>{result.updated}</b></span>
            <span className="text-red-400">{t("inventory.import.failed", "Gagal:")} <b>{result.errors}</b></span>
          </div>
          {errorRows.length > 0 && (
            <div className="space-y-1">
              <div className="text-neutral-500">{t("inventory.import.problemRows", "Baris bermasalah:")}</div>
              {errorRows.map((d: any) => (
                <div key={d.row} className="text-red-400">{t("inventory.import.rowPrefix", "Baris")} {d.row}{d.name ? ` (${d.name})` : ""}: {d.error}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

interface IngredientRow { ingredientProductId: string; qtyPerYield: number; unit: string }
const emptyIngredientRow: IngredientRow = { ingredientProductId: "", qtyPerYield: 0, unit: "pcs" };

/**
 * Recipe/BOM builder — the finished product a recipe produces is always forced into the "food"
 * category (per business decision: this feature is specifically for olahan/masakan like Mie
 * Goreng, not snack/merchandise which cost straight off the purchase price). Selling the
 * finished product then deducts each ingredient's own stock and computes HPP from ingredient
 * cost automatically (see lib/inventory/stock.ts deductStockForItem and
 * lib/accounting/postings.ts computeItemCogs) — nothing else to wire once the recipe exists.
 */
function RecipeTab({ outletId }: { outletId: string }) {
  const { t } = useDashboardLang();
  const { user } = useAuth();
  const canManage = isSuperRole(user?.role);
  const [products, setProducts] = useState<Product[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState(0);
  const [newProductUnit, setNewProductUnit] = useState("pcs");
  const [existingProductId, setExistingProductId] = useState("");
  const [recipeName, setRecipeName] = useState("");
  const [yieldQty, setYieldQty] = useState(1);
  const [rows, setRows] = useState<IngredientRow[]>([{ ...emptyIngredientRow }]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editYieldQty, setEditYieldQty] = useState(1);
  const [editRows, setEditRows] = useState<IngredientRow[]>([]);

  const load = () => fetchJsonArray("/api/recipes").then(setRecipes);
  useEffect(() => {
    load();
    fetchJsonArray("/api/products").then(setProducts);
    fetchJsonArray<UnitOption>(`/api/units?outletId=${outletId}`).then((rows) => setUnits(rows.filter((u) => u.isActive)));
  }, [outletId]);

  const recipeProductIds = new Set(recipes.map((r) => r.productId));
  const foodProductsNoRecipe = products.filter((p) => p.category === "food" && p.isActive && !recipeProductIds.has(p.id));
  const ingredientOptions = products.filter((p) => p.isActive);

  const addRow = (setter: typeof setRows) => setter((prev) => [...prev, { ...emptyIngredientRow }]);
  const removeRow = (setter: typeof setRows, i: number) => setter((prev) => prev.filter((_, idx) => idx !== i));
  const updateRow = (setter: typeof setRows, i: number, patch: Partial<IngredientRow>) =>
    setter((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const resetForm = () => {
    setMode("new");
    setNewProductName("");
    setNewProductPrice(0);
    setNewProductUnit(units[0]?.code ?? "pcs");
    setExistingProductId("");
    setRecipeName("");
    setYieldQty(1);
    setRows([{ ...emptyIngredientRow }]);
  };

  const create = async () => {
    const validRows = rows.filter((r) => r.ingredientProductId && r.qtyPerYield > 0);
    if (!recipeName) return showAlert(t("inventory.recipe.nameRequired", "Nama resep wajib diisi."));
    if (validRows.length === 0) return showAlert(t("inventory.recipe.needIngredient", "Tambah minimal 1 bahan baku dengan qty > 0."));

    let productId = existingProductId;
    if (mode === "new") {
      if (!newProductName) return showAlert(t("inventory.recipe.newProductNameRequired", "Nama produk baru wajib diisi."));
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProductName, category: "food", price: newProductPrice, costPrice: 0, stockQty: 0, unit: newProductUnit, outletId }),
      });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      productId = data.id;
    } else if (!productId) {
      return showAlert(t("inventory.recipe.chooseFoodProduct", "Pilih produk food yang mau dikasih resep."));
    }

    const res = await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, name: recipeName, yieldQty, ingredients: validRows }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    resetForm();
    load();
    fetchJsonArray("/api/products").then(setProducts);
  };

  const startEdit = (r: any) => {
    setEditingId(r.id);
    setEditYieldQty(r.yieldQty);
    setEditRows(r.ingredients.map((i: any) => ({ ingredientProductId: i.ingredientProductId, qtyPerYield: i.qtyPerYield, unit: i.unit })));
  };
  const cancelEdit = () => { setEditingId(null); setEditRows([]); };

  const saveEdit = async (id: string) => {
    const validRows = editRows.filter((r) => r.ingredientProductId && r.qtyPerYield > 0);
    if (validRows.length === 0) return showAlert(t("inventory.recipe.needIngredientEdit", "Minimal 1 bahan baku dengan qty > 0."));
    const res = await fetch(`/api/recipes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ yieldQty: editYieldQty, ingredients: validRows }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    cancelEdit();
    load();
  };

  const remove = async (r: any) => {
    if (!await showConfirm(t('inventory.recipe.confirmDelete', 'Hapus resep "{name}"? Produk "{product}" jadi tidak punya BOM lagi (HPP balik ke harga modal manual).').replace("{name}", r.name).replace("{product}", r.product?.name ?? ""))) return;
    const res = await fetch(`/api/recipes/${r.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    load();
  };

  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? "-";
  const hppEstimate = (r: any) => {
    const total = (r.ingredients as any[]).reduce((s, i) => s + (i.ingredientProduct?.costPrice ?? 0) * i.qtyPerYield, 0);
    return total / Math.max(1, r.yieldQty);
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div>
          <h2 className="font-medium">{t("inventory.recipe.createTitle", "Buat Resep / BOM Baru")}</h2>
          <p className="text-xs text-neutral-500">{t("inventory.recipe.descPrefix", "Produk hasil resep otomatis masuk kategori ")}<b>{t("inventory.recipe.descBold", "Makanan (food)")}</b>{t("inventory.recipe.descSuffix", ". Saat terjual, stok bahan baku di bawah ini yang berkurang, bukan stok produk jadinya — HPP dihitung otomatis dari harga modal tiap bahan.")}</p>
        </div>

        <div className="flex gap-2 text-xs">
          <button className={`px-3 py-1.5 rounded-lg ${mode === "new" ? "bg-emerald-600 text-white" : "bg-neutral-800 text-neutral-400"}`} onClick={() => setMode("new")}>{t("inventory.recipe.modeNew", "Produk Baru")}</button>
          <button className={`px-3 py-1.5 rounded-lg ${mode === "existing" ? "bg-emerald-600 text-white" : "bg-neutral-800 text-neutral-400"}`} onClick={() => setMode("existing")}>{t("inventory.recipe.modeExisting", "Produk Food yang Sudah Ada")}</button>
        </div>

        {mode === "new" ? (
          <div className="grid grid-cols-3 gap-2">
            <input className="col-span-2 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("inventory.recipe.newNamePlaceholder", "Nama produk (mis. Mie Goreng)")} value={newProductName} onChange={(e) => setNewProductName(e.target.value)} />
            <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("inventory.product.sellPricePlaceholder", "Harga jual")} value={newProductPrice || ""} onChange={(e) => setNewProductPrice(Number(e.target.value))} />
            <UnitSelect units={units} value={newProductUnit} onChange={setNewProductUnit} className="col-span-3 sm:col-span-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" />
          </div>
        ) : (
          <select className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={existingProductId} onChange={(e) => setExistingProductId(e.target.value)}>
            <option value="">{t("inventory.recipe.chooseExistingOption", "Pilih produk food (belum punya resep)")}</option>
            {foodProductsNoRecipe.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}

        <div className="grid grid-cols-2 gap-2">
          <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("inventory.recipe.namePlaceholder", "Nama resep (mis. Resep Mie Goreng)")} value={recipeName} onChange={(e) => setRecipeName(e.target.value)} />
          <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("inventory.recipe.yieldPlaceholder", "Yield (porsi per batch resep)")} value={yieldQty} onChange={(e) => setYieldQty(Number(e.target.value))} />
        </div>

        <div className="space-y-2">
          <div className="text-xs text-neutral-500">{t("inventory.recipe.ingredientsLabel", "Bahan Baku")}</div>
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-8 gap-2 items-center">
              <select className="col-span-4 rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-sm" value={row.ingredientProductId} onChange={(e) => updateRow(setRows, i, { ingredientProductId: e.target.value })}>
                <option value="">{t("inventory.recipe.chooseIngredientOption", "Pilih bahan")}</option>
                {ingredientOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="number" className="col-span-2 rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-sm" placeholder={t("inventory.recipe.qtyPerYieldPlaceholder", "Qty per yield")} value={row.qtyPerYield || ""} onChange={(e) => updateRow(setRows, i, { qtyPerYield: Number(e.target.value) })} />
              <UnitSelect units={units} value={row.unit} onChange={(v) => updateRow(setRows, i, { unit: v })} className="col-span-1 rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-sm" />
              <button className="col-span-1 text-xs text-red-400" onClick={() => removeRow(setRows, i)}>{t("inventory.action.removeRow", "Hapus")}</button>
            </div>
          ))}
          <button className="text-xs text-emerald-400" onClick={() => addRow(setRows)}>{t("inventory.recipe.addIngredient", "+ Tambah Bahan")}</button>
        </div>

        <Button onClick={create}>{t("inventory.recipe.saveButton", "Simpan Resep")}</Button>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {recipes.map((r) => (
          <Card key={r.id} className="space-y-2">
            {editingId === r.id ? (
              <div className="space-y-2">
                <div className="font-medium">{r.product?.name} <span className="text-xs text-neutral-500">({r.name})</span></div>
                <input type="number" className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-sm" placeholder={t("inventory.recipe.yieldPlaceholder", "Yield (porsi per batch resep)")} value={editYieldQty} onChange={(e) => setEditYieldQty(Number(e.target.value))} />
                {editRows.map((row, i) => (
                  <div key={i} className="grid grid-cols-8 gap-2 items-center">
                    <select className="col-span-4 rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs" value={row.ingredientProductId} onChange={(e) => updateRow(setEditRows, i, { ingredientProductId: e.target.value })}>
                      <option value="">{t("inventory.recipe.chooseIngredientOption", "Pilih bahan")}</option>
                      {ingredientOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input type="number" className="col-span-2 rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs" value={row.qtyPerYield || ""} onChange={(e) => updateRow(setEditRows, i, { qtyPerYield: Number(e.target.value) })} />
                    <UnitSelect units={units} value={row.unit} onChange={(v) => updateRow(setEditRows, i, { unit: v })} className="col-span-1 rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs" />
                    <button className="col-span-1 text-xs text-red-400" onClick={() => removeRow(setEditRows, i)}>X</button>
                  </div>
                ))}
                <button className="text-xs text-emerald-400" onClick={() => addRow(setEditRows)}>{t("inventory.recipe.addIngredient", "+ Tambah Bahan")}</button>
                <div className="flex gap-2">
                  <Button className="text-xs" onClick={() => saveEdit(r.id)}>{t("inventory.action.save", "Simpan")}</Button>
                  <button className="text-xs text-neutral-400" onClick={cancelEdit}>{t("inventory.action.cancel", "Batal")}</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{r.product?.name ?? t("inventory.recipe.deletedProduct", "(produk terhapus)")}</div>
                    <div className="text-xs text-neutral-500">{r.name} · Yield {r.yieldQty}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge status="available">food</Badge>
                    {canManage && (
                      <div className="flex gap-2 text-xs">
                        <button className="text-emerald-400" onClick={() => startEdit(r)}>{t("inventory.action.edit", "Edit")}</button>
                        <button className="text-red-400" onClick={() => remove(r)}>{t("inventory.recipe.deleteButton", "Hapus")}</button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-xs text-neutral-400 space-y-0.5">
                  {r.ingredients.map((i: any) => (
                    <div key={i.id} className="flex justify-between">
                      <span>{i.ingredientProduct?.name ?? productName(i.ingredientProductId)}</span>
                      <span>-{i.qtyPerYield} {i.unit}</span>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-emerald-400 pt-1 border-t border-neutral-800">{t("inventory.recipe.hppPerServing", "HPP per porsi:")} {rupiah(hppEstimate(r))}</div>
              </>
            )}
          </Card>
        ))}
        {recipes.length === 0 && <div className="text-sm text-neutral-500">{t("inventory.recipe.emptyState", "Belum ada resep. Buat resep pertama di atas.")}</div>}
      </div>
    </div>
  );
}

function SupplierTab({ outletId }: { outletId: string }) {
  const { t } = useDashboardLang();
  const { user } = useAuth();
  const canDelete = isSuperRole(user?.role);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", phone: "", address: "", paymentTermsDays: 0 });

  const load = () => fetchJsonArray(`/api/suppliers?outletId=${outletId}`).then(setSuppliers);
  useEffect(() => { load(); }, [outletId]);

  const create = async () => {
    if (!form.name) return;
    await fetch("/api/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, outletId }) });
    setForm({ name: "", phone: "", address: "", paymentTermsDays: 0 });
    load();
  };

  const deleteSupplier = async (s: any) => {
    if (!await showConfirm(t('inventory.supplier.confirmDelete', 'Hapus supplier "{name}"? Hanya bisa jika tidak punya invoice/PO terkait.').replace("{name}", s.name))) return;
    const res = await fetch(`/api/admin/suppliers/${s.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    load();
  };

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="font-medium mb-3">{t("inventory.supplier.addTitle", "Tambah Supplier")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("inventory.supplier.namePlaceholder", "Nama supplier")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("inventory.supplier.phonePlaceholder", "No. HP")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("inventory.supplier.addressPlaceholder", "Alamat")} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("inventory.supplier.termsPlaceholder", "Termin (hari)")} value={form.paymentTermsDays || ""} onChange={(e) => setForm({ ...form, paymentTermsDays: Number(e.target.value) })} />
        </div>
        <Button className="mt-2" onClick={create}>{t("inventory.supplier.saveButton", "Simpan Supplier")}</Button>
      </Card>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map((s) => (
          <Card key={s.id} className="space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium">{s.name}</div>
              {canDelete && <button className="text-xs text-red-400 shrink-0" onClick={() => deleteSupplier(s)}>{t("inventory.supplier.deleteButton", "Hapus")}</button>}
            </div>
            <div className="text-xs text-neutral-500">{s.phone}</div>
            <div className="text-xs text-neutral-500">{s.address}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/** Quick supplier purchase for finished/resale F&B products (no recipe/BOM) — transport/parking/other costs get prorated into landed cost, which updates products.costPrice so HPP reflects true cost. */
function SupplierPurchaseTab({ outletId }: { outletId: string }) {
  const { t } = useDashboardLang();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [recipeProductIds, setRecipeProductIds] = useState<Set<string>>(new Set());
  const [supplierId, setSupplierId] = useState("");
  const [itemForm, setItemForm] = useState({ productId: "", qty: 1, unitCost: 0 });
  const [cart, setCart] = useState<{ productId: string; qty: number; unitCost: number }[]>([]);
  const [transportCost, setTransportCost] = useState(0);
  const [parkingCost, setParkingCost] = useState(0);
  const [otherCost, setOtherCost] = useState(0);
  const [paidNow, setPaidNow] = useState(true);
  const [lastResult, setLastResult] = useState<any>(null);

  const load = () => fetchJsonArray(`/api/purchase-invoices?outletId=${outletId}`).then(setInvoices);
  useEffect(() => {
    load();
    fetchJsonArray(`/api/suppliers?outletId=${outletId}`).then(setSuppliers);
    fetchJsonArray("/api/products").then(setProducts);
    fetchJsonArray("/api/recipes").then((rows) => setRecipeProductIds(new Set(rows.map((r: any) => r.productId))));
  }, [outletId]);

  // "Produk bukan olahan": F&B/retail products bought ready-to-sell, i.e. no recipe/BOM attached.
  const resaleProducts = products.filter((p) => ["food", "drink", "coffee", "snack", "dessert", "merchandise", "accessory"].includes(p.category) && !recipeProductIds.has(p.id) && p.isActive);

  const itemsSubtotal = cart.reduce((s, c) => s + c.qty * c.unitCost, 0);
  const grandTotal = itemsSubtotal + transportCost + parkingCost + otherCost;

  const addToCart = () => {
    if (!itemForm.productId || !itemForm.qty || itemForm.unitCost <= 0) return;
    setCart((prev) => [...prev, { ...itemForm }]);
    setItemForm({ productId: "", qty: 1, unitCost: 0 });
  };

  const removeFromCart = (i: number) => setCart((prev) => prev.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!supplierId) return showAlert(t("inventory.supplierPurchase.chooseSupplierAlert", "Pilih supplier dulu."));
    if (cart.length === 0) return showAlert(t("inventory.supplierPurchase.needItemAlert", "Tambah minimal 1 item belanja."));
    const res = await fetch("/api/supplier-purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outletId, supplierId, items: cart, transportCost, parkingCost, otherCost, paidNow }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setLastResult(data);
    setCart([]);
    setTransportCost(0);
    setParkingCost(0);
    setOtherCost(0);
    load();
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h2 className="font-medium">{t("inventory.supplierPurchase.title", "Belanja Supplier — Makanan & Minuman (Produk Bukan Olahan)")}</h2>
        <p className="text-xs text-neutral-500">{t("inventory.supplierPurchase.description", "Untuk produk siap jual yang dibeli langsung dari supplier/toko (bukan bahan baku resep). Ongkos transport, parkir, dan lain-lain otomatis dibagi rata ke harga modal (HPP) tiap item.")}</p>

        <select className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
          <option value="">{t("inventory.option.chooseSupplier", "Pilih supplier")}</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {suppliers.length === 0 && <div className="text-xs text-amber-400">{t("inventory.supplierPurchase.noSupplierHint", 'Belum ada supplier — tambah dulu di tab "Supplier".')}</div>}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select className="col-span-2 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={itemForm.productId} onChange={(e) => setItemForm({ ...itemForm, productId: e.target.value })}>
            <option value="">{t("inventory.option.chooseProduct", "Pilih produk")}</option>
            {resaleProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("inventory.placeholder.qty", "Qty")} value={itemForm.qty} onChange={(e) => setItemForm({ ...itemForm, qty: Number(e.target.value) })} />
          <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("inventory.placeholder.unitCost", "Harga beli/unit")} value={itemForm.unitCost || ""} onChange={(e) => setItemForm({ ...itemForm, unitCost: Number(e.target.value) })} />
        </div>
        <Button variant="secondary" className="text-xs" onClick={addToCart}>{t("inventory.action.addItem", "+ Tambah Item")}</Button>

        {cart.length > 0 && (
          <div className="rounded-lg border border-neutral-700 p-2 space-y-1 text-xs">
            {cart.map((c, i) => (
              <div key={i} className="flex justify-between items-center">
                <span>{products.find((p) => p.id === c.productId)?.name} x{c.qty} {products.find((p) => p.id === c.productId)?.unit} @ {rupiah(c.unitCost)} = {rupiah(c.qty * c.unitCost)}</span>
                <button className="text-red-400" onClick={() => removeFromCart(i)}>{t("inventory.cart.removeItem", "Hapus")}</button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("inventory.placeholder.transportCost", "Ongkos transport")}
            value={transportCost || ""} onChange={(e) => setTransportCost(Number(e.target.value))} />
          <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("inventory.placeholder.parkingCost", "Parkir")}
            value={parkingCost || ""} onChange={(e) => setParkingCost(Number(e.target.value))} />
          <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("inventory.placeholder.otherCost", "Lain-lain")}
            value={otherCost || ""} onChange={(e) => setOtherCost(Number(e.target.value))} />
        </div>

        <div className="rounded-lg bg-neutral-800/60 px-3 py-2 text-xs space-y-1">
          <div className="flex justify-between"><span className="text-neutral-500">{t("inventory.supplierPurchase.subtotalLabel", "Subtotal barang")}</span><span>{rupiah(itemsSubtotal)}</span></div>
          <div className="flex justify-between"><span className="text-neutral-500">{t("inventory.supplierPurchase.costsLabel", "Ongkos (transport+parkir+lain-lain)")}</span><span>{rupiah(transportCost + parkingCost + otherCost)}</span></div>
          <div className="flex justify-between font-semibold pt-1 border-t border-neutral-700"><span>{t("inventory.supplierPurchase.totalLabel", "Total Belanja")}</span><span>{rupiah(grandTotal)}</span></div>
        </div>

        <label className="flex items-center gap-2 text-xs text-neutral-400">
          <input type="checkbox" checked={paidNow} onChange={(e) => setPaidNow(e.target.checked)} /> {t("inventory.supplierPurchase.paidNowLabel", "Dibayar cash sekarang (uncheck = hutang ke supplier)")}
        </label>

        <Button onClick={submit}>{t("inventory.supplierPurchase.saveButton", "Simpan Belanja — {amount}").replace("{amount}", rupiah(grandTotal))}</Button>
      </Card>

      {lastResult && (
        <Card className="border-emerald-500/40 text-xs space-y-1">
          <div className="font-medium text-sm mb-1">{t("inventory.supplierPurchase.savedResult", "Belanja tersimpan — {invoiceNumber}").replace("{invoiceNumber}", lastResult.invoice.invoiceNumber)}</div>
          {lastResult.lineBreakdown.map((l: any, i: number) => (
            <div key={i} className="flex justify-between">
              <span>{products.find((p) => p.id === l.productId)?.name} {t("inventory.supplierPurchase.newCostSuffix", "— HPP baru per unit")}</span>
              <span>{rupiah(l.landedUnitCost)}</span>
            </div>
          ))}
        </Card>
      )}

      <div className="space-y-2">
        {invoices.map((inv) => (
          <Card key={inv.id} className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{inv.invoiceNumber ?? `INV #${inv.id.slice(0, 8)}`} — {rupiah(inv.amount)}</div>
              <div className="text-xs text-neutral-500">{new Date(inv.invoiceDate).toLocaleDateString("id-ID")}</div>
            </div>
            <Badge status={inv.status === "paid" ? "available" : inv.status === "partial" ? "pending" : "maintenance"}>{inv.status}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PurchaseOrderTab({ outletId }: { outletId: string }) {
  const { t } = useDashboardLang();
  const [pos, setPos] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ supplierId: "", productId: "", qty: 1, unitCost: 0 });
  const [cart, setCart] = useState<{ productId: string; qtyOrdered: number; unitCost: number }[]>([]);
  const [autoFilling, setAutoFilling] = useState(false);
  const [autoFillMsg, setAutoFillMsg] = useState<string | null>(null);

  const load = () => fetchJsonArray(`/api/purchase-orders?outletId=${outletId}`).then(setPos);
  useEffect(() => {
    load();
    fetchJsonArray<SupplierOption>(`/api/suppliers?outletId=${outletId}`).then(setSuppliers);
    fetchJsonArray("/api/products").then(setProducts);
  }, [outletId]);

  // "purchase order akan terisi otomatis apabila produk inventory berada di minimum stok" — this
  // list is the always-visible half of that (every under-minimum product, supplier or not);
  // autoFillLowStockPurchaseOrders (triggered by the button below, or automatically after a
  // stock adjustment/opname elsewhere) is the half that actually creates draft POs, but only for
  // products that have a Supplier Utama set on the Produk tab.
  const lowStockProducts = products.filter((p) => p.stockQty <= p.lowStockThreshold);

  const supplierName = (id: string | null) => suppliers.find((s) => s.id === id)?.name;

  const quickAddToCart = (p: Product) => {
    const suggestedQty = Math.max(1, p.lowStockThreshold - p.stockQty);
    setForm((f) => ({ ...f, productId: p.id, qty: suggestedQty, unitCost: p.costPrice || f.unitCost, supplierId: p.preferredSupplierId ?? f.supplierId }));
  };

  const runAutoFill = async () => {
    setAutoFilling(true);
    setAutoFillMsg(null);
    try {
      const res = await fetch("/api/purchase-orders/auto-fill", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setAutoFillMsg(`${t("inventory.po.autoFillFailedPrefix", "Gagal:")} ${data?.error ?? t("inventory.po.genericError", "terjadi kesalahan.")}`);
      } else {
        const { poCreated, poReused, itemsAdded } = data as { poCreated: number; poReused: number; itemsAdded: number };
        setAutoFillMsg(
          itemsAdded === 0
            ? t("inventory.po.autoFillNoneNeeded", "Tidak ada produk yang perlu di-PO otomatis saat ini (semua produk di bawah minimum belum punya Supplier Utama, atau sudah tercakup di PO yang masih terbuka).")
            : `${t("inventory.po.autoFillResult", "{items} item ditambahkan ke {poCreated} PO baru").replace("{items}", String(itemsAdded)).replace("{poCreated}", String(poCreated))}${poReused > 0 ? t("inventory.po.autoFillReusedSuffix", " + {poReused} PO draft yang sudah ada").replace("{poReused}", String(poReused)) : ""}.`
        );
      }
      await load();
    } finally {
      setAutoFilling(false);
    }
  };

  const addToCart = () => {
    if (!form.productId || !form.qty || !form.unitCost) return;
    setCart((prev) => [...prev, { productId: form.productId, qtyOrdered: form.qty, unitCost: form.unitCost }]);
    setForm({ ...form, productId: "", qty: 1, unitCost: 0 });
  };

  const createPo = async () => {
    if (!form.supplierId || cart.length === 0) return showAlert(t("inventory.po.needSupplierAndItemAlert", "Pilih supplier dan tambah minimal 1 item."));
    await fetch("/api/purchase-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ outletId, supplierId: form.supplierId, items: cart }) });
    setCart([]);
    load();
  };

  const receive = async (poId: string) => {
    const res = await fetch(`/api/purchase-orders/${poId}/receive`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ createInvoice: true }) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    showAlert(t("inventory.po.receivedMsg", "Diterima. Invoice AP dibuat: {amount}").replace("{amount}", data.invoice ? rupiah(data.invoice.amount) : "-"));
    load();
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-medium">{t("inventory.po.restockTitle", "Produk Perlu Restock (di bawah/sama minimum stok)")}</h2>
          <Button variant="secondary" className="text-xs" onClick={runAutoFill} disabled={autoFilling}>{autoFilling ? t("inventory.po.checking", "Memeriksa...") : t("inventory.po.autoFillButton", "Cek & Buat PO Otomatis")}</Button>
        </div>
        {autoFillMsg && <p className="text-xs text-neutral-400 mb-2">{autoFillMsg}</p>}
        {lowStockProducts.length === 0 ? (
          <p className="text-sm text-neutral-500">{t("inventory.po.noLowStock", "Tidak ada produk di bawah minimum stok saat ini.")}</p>
        ) : (
          <div className="space-y-1">
            {lowStockProducts.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span>
                  {p.name} <span className="text-amber-400">({p.stockQty}/{p.lowStockThreshold} {p.unit})</span>
                  {" — "}
                  <span className="text-xs text-neutral-500">{supplierName(p.preferredSupplierId) ?? t("inventory.po.noPreferredSupplier", "belum ada supplier utama")}</span>
                </span>
                <button className="text-xs text-emerald-400" onClick={() => quickAddToCart(p)}>{t("inventory.po.fillFormButton", "+ Isi ke form PO")}</button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="font-medium mb-3">{t("inventory.po.createTitle", "Buat Purchase Order")}</h2>
        <select className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm mb-2" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
          <option value="">{t("inventory.option.chooseSupplier", "Pilih supplier")}</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select className="col-span-2 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
            <option value="">{t("inventory.option.chooseProduct", "Pilih produk")}</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("inventory.placeholder.qty", "Qty")} value={form.qty} onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })} />
          <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("inventory.placeholder.unitCost", "Harga beli/unit")} value={form.unitCost || ""} onChange={(e) => setForm({ ...form, unitCost: Number(e.target.value) })} />
        </div>
        <Button variant="secondary" className="mt-2 text-xs" onClick={addToCart}>{t("inventory.action.addItem", "+ Tambah Item")}</Button>
        {cart.length > 0 && (
          <div className="mt-2 text-xs space-y-1">
            {cart.map((c, i) => <div key={i}>{products.find((p) => p.id === c.productId)?.name} x{c.qtyOrdered} {products.find((p) => p.id === c.productId)?.unit} @ {rupiah(c.unitCost)}</div>)}
          </div>
        )}
        <Button className="mt-3" onClick={createPo}>{t("inventory.po.createButton", "Buat PO")}</Button>
      </Card>

      <div className="space-y-2">
        {pos.map((po) => (
          <Card key={po.id} className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">
                PO #{po.id.slice(0, 8)} — {rupiah(po.totalAmount)}
                {po.notes?.includes("Auto-generated") && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 align-middle">{t("inventory.po.autoBadge", "Auto: Stok Minimum")}</span>}
              </div>
              <div className="text-xs text-neutral-500">{po.items.length} {t("inventory.po.itemUnit", "item")} · {new Date(po.orderDate).toLocaleDateString("id-ID")}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge status={po.status === "received" ? "available" : "pending"}>{po.status.replace("_", " ")}</Badge>
              {po.status !== "received" && <Button className="text-xs" onClick={() => receive(po.id)}>{t("inventory.po.receiveButton", "Terima Barang")}</Button>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StockOpnameTab({ outletId }: { outletId: string }) {
  const { t } = useDashboardLang();
  const [opnames, setOpnames] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = () => fetchJsonArray(`/api/stock-opnames?outletId=${outletId}`).then(setOpnames);
  useEffect(() => {
    load();
    fetchJsonArray("/api/products").then(setProducts);
  }, [outletId]);

  const submit = async () => {
    const items = Object.entries(counts).filter(([, v]) => v !== undefined).map(([productId, actualQty]) => ({ productId, actualQty }));
    if (items.length === 0) return;
    await fetch("/api/stock-opnames", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ outletId, items }) });
    setCounts({});
    load();
  };

  const complete = async (id: string) => {
    const res = await fetch(`/api/stock-opnames/${id}/complete`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    showAlert(t("inventory.opname.completeMsg", "Selesai. {n} item disesuaikan.").replace("{n}", String(data.itemsApplied)));
    load();
  };

  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? t("inventory.recipe.deletedProduct", "(produk terhapus)");

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="font-medium mb-3">{t("inventory.opname.title", "Hitung Stok Fisik")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {products.map((p) => {
            const counted = counts[p.id];
            const diff = counted !== undefined && !Number.isNaN(counted) ? counted - p.stockQty : null;
            return (
              <div key={p.id} className="flex items-center justify-between text-sm gap-2">
                <span className="min-w-0">
                  {p.name} <span className="text-neutral-500">{t("inventory.opname.systemQtyLabel", "(sistem: {qty})").replace("{qty}", String(p.stockQty))}</span>
                  {diff !== null && diff !== 0 && (
                    <span className={diff > 0 ? "text-emerald-400 text-xs ml-1" : "text-red-400 text-xs ml-1"}>{diff > 0 ? `+${diff}` : diff}</span>
                  )}
                </span>
                <input type="number" className="w-20 shrink-0 rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs" placeholder={String(p.stockQty)}
                  value={counts[p.id] ?? ""} onChange={(e) => setCounts({ ...counts, [p.id]: Number(e.target.value) })} />
              </div>
            );
          })}
        </div>
        <Button className="mt-3" onClick={submit}>{t("inventory.opname.saveCountButton", "Simpan Hasil Hitung")}</Button>
      </Card>

      <div className="space-y-2">
        {opnames.map((o) => {
          const items = (o.items ?? []) as { id: string; productId: string; systemQty: number; actualQty: number; differenceQty: number }[];
          const over = items.filter((i) => i.differenceQty > 0);
          const under = items.filter((i) => i.differenceQty < 0);
          const expanded = expandedId === o.id;
          return (
            <Card key={o.id}>
              <div className="flex items-center justify-between gap-2">
                <button className="text-left flex-1" onClick={() => setExpandedId(expanded ? null : o.id)}>
                  <div className="text-sm">{t("inventory.opname.headerLine", "Opname {date} — {n} item").replace("{date}", new Date(o.opnameDate).toLocaleString("id-ID")).replace("{n}", String(items.length))}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    {over.length > 0 && <span className="text-emerald-400">{t("inventory.opname.overCount", "{n} selisih lebih").replace("{n}", String(over.length))}</span>}
                    {over.length > 0 && under.length > 0 && " · "}
                    {under.length > 0 && <span className="text-red-400">{t("inventory.opname.underCount", "{n} selisih kurang").replace("{n}", String(under.length))}</span>}
                    {over.length === 0 && under.length === 0 && t("inventory.opname.noDifference", "Tidak ada selisih")}
                  </div>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge status={o.status === "completed" ? "available" : "pending"}>{o.status}</Badge>
                  {o.status !== "completed" && <Button className="text-xs" onClick={() => complete(o.id)}>{t("inventory.opname.applyButton", "Terapkan Penyesuaian")}</Button>}
                </div>
              </div>
              {expanded && items.length > 0 && (
                <div className="mt-3 pt-3 border-t border-neutral-800 space-y-1">
                  {items.filter((i) => i.differenceQty !== 0).length === 0 && <div className="text-xs text-neutral-500">{t("inventory.opname.allMatch", "Semua item cocok dengan stok sistem — tidak ada selisih.")}</div>}
                  {items.map((i) => i.differenceQty === 0 ? null : (
                    <div key={i.id} className="flex items-center justify-between text-xs">
                      <span>{productName(i.productId)}</span>
                      <span className="text-neutral-500">{t("inventory.opname.compareLine", "sistem {system} → fisik {actual}").replace("{system}", String(i.systemQty)).replace("{actual}", String(i.actualQty))}</span>
                      <span className={i.differenceQty > 0 ? "text-emerald-400 font-medium" : "text-red-400 font-medium"}>
                        {i.differenceQty > 0 ? t("inventory.opname.diffMore", "+{d} (lebih)").replace("{d}", String(i.differenceQty)) : t("inventory.opname.diffLess", "{d} (kurang)").replace("{d}", String(i.differenceQty))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

async function getOutletId() {
  const res = await fetch("/api/outlets/default");
  return (await res.json()).id;
}
