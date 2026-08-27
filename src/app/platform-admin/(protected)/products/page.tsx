"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fetchJsonArray } from "@/lib/api/fetch-json";

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;
const inputCls = "w-full rounded-lg bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm";

const CATEGORY_LABEL: Record<string, string> = {
  smart_plug: "Produk",
  installation_service: "Jasa Instalasi",
  extra_console: "Konsol Tambahan",
};

const EMPTY_FORM = { category: "smart_plug", name: "", description: "", price: "", sortOrder: "0", imageUrl: "", weightGrams: "200", lengthCm: "", widthCm: "", heightCm: "" };

export default function PlatformProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newForm, setNewForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [uploadingNew, setUploadingNew] = useState(false);
  const [uploadingEdit, setUploadingEdit] = useState(false);

  const load = () => fetchJsonArray<any>("/api/platform-admin/products").then((p) => { setProducts(p); setLoading(false); });
  useEffect(() => { load(); }, []);

  const uploadPhoto = async (file: File): Promise<string | null> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/platform-admin/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) { alert(data.error ?? "Gagal upload foto."); return null; }
    return data.url as string;
  };

  const onNewPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingNew(true);
    try {
      const url = await uploadPhoto(file);
      if (url) setNewForm((f) => ({ ...f, imageUrl: url }));
    } finally {
      setUploadingNew(false);
      e.target.value = "";
    }
  };

  const onEditPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingEdit(true);
    try {
      const url = await uploadPhoto(file);
      if (url) setEditForm((f: any) => ({ ...f, imageUrl: url }));
    } finally {
      setUploadingEdit(false);
      e.target.value = "";
    }
  };

  const createProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.name || !newForm.price) return;
    setBusy(true);
    try {
      await fetch("/api/platform-admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newForm),
      });
      setNewForm(EMPTY_FORM);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (p: any) => { setEditing(p.id); setEditForm({ ...p }); };

  const saveEdit = async () => {
    setBusy(true);
    try {
      await fetch(`/api/platform-admin/products/${editing}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      setEditing(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (p: any) => {
    await fetch(`/api/platform-admin/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    await load();
  };

  const removeProduct = async (p: any) => {
    if (!confirm(`Hapus produk "${p.name}"? Produk akan disembunyikan dari etalase (histori invoice lama tetap aman).`)) return;
    await fetch(`/api/platform-admin/products/${p.id}`, { method: "DELETE" });
    await load();
  };

  const grouped = products.reduce<Record<string, any[]>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold text-amber-300">Etalase Produk</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Katalog belanja di halaman Langganan outlet (Smart Plug, Jasa Instalasi, Konsol Tambahan) — outlet/merchant hanya bisa melihat &amp; menambah ke keranjang, tidak bisa mengubah katalog ini sendiri.
        </p>
      </div>

      <Card>
        <h2 className="gm-heading font-semibold mb-3">Produk Terdaftar</h2>
        {loading ? (
          <p className="text-sm text-neutral-500">Memuat...</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-neutral-500">Belum ada produk.</p>
        ) : (
          <div className="space-y-5">
            {Object.entries(CATEGORY_LABEL).map(([cat, label]) => (
              (grouped[cat] ?? []).length > 0 && (
                <div key={cat} className="space-y-2">
                  <div className="text-xs uppercase tracking-widest text-neutral-500">{label}</div>
                  {grouped[cat].map((p) => (
                    <div key={p.id} className="rounded-lg border border-white/10 p-3">
                      {editing === p.id ? (
                        <div className="space-y-2">
                          <div className="flex items-start gap-3">
                            {editForm.category === "smart_plug" && (
                              <div className="shrink-0">
                                {editForm.imageUrl ? (
                                  <img src={editForm.imageUrl} alt={editForm.name} className="w-20 h-20 object-cover rounded-lg border border-white/10" />
                                ) : (
                                  <div className="w-20 h-20 rounded-lg border border-dashed border-white/10 flex items-center justify-center text-[10px] text-neutral-600 text-center px-1">Belum ada foto</div>
                                )}
                                <label className="mt-1 block text-[11px] text-cyan-400 hover:text-cyan-300 cursor-pointer text-center">
                                  {uploadingEdit ? "Mengunggah..." : "Ganti foto"}
                                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onEditPhotoChange} disabled={uploadingEdit} />
                                </label>
                              </div>
                            )}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
                              <div className="col-span-2"><label className="text-xs text-neutral-500">Nama</label><input className={inputCls} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
                              <div><label className="text-xs text-neutral-500">Harga</label><input type="number" className={inputCls} value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })} /></div>
                              <div><label className="text-xs text-neutral-500">Urutan</label><input type="number" className={inputCls} value={editForm.sortOrder} onChange={(e) => setEditForm({ ...editForm, sortOrder: Number(e.target.value) })} /></div>
                              {editForm.category === "smart_plug" && (
                                <>
                                  <div><label className="text-xs text-neutral-500">Berat (gram)</label><input type="number" className={inputCls} value={editForm.weightGrams ?? 200} onChange={(e) => setEditForm({ ...editForm, weightGrams: Number(e.target.value) })} /></div>
                                  <div><label className="text-xs text-neutral-500">Panjang (cm)</label><input type="number" className={inputCls} value={editForm.lengthCm ?? ""} onChange={(e) => setEditForm({ ...editForm, lengthCm: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                                  <div><label className="text-xs text-neutral-500">Lebar (cm)</label><input type="number" className={inputCls} value={editForm.widthCm ?? ""} onChange={(e) => setEditForm({ ...editForm, widthCm: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                                  <div><label className="text-xs text-neutral-500">Tinggi (cm)</label><input type="number" className={inputCls} value={editForm.heightCm ?? ""} onChange={(e) => setEditForm({ ...editForm, heightCm: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                                </>
                              )}
                              <div className="col-span-2 sm:col-span-4"><label className="text-xs text-neutral-500">Deskripsi</label><input className={inputCls} value={editForm.description ?? ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={saveEdit} disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</Button>
                            <Button variant="ghost" onClick={() => setEditing(null)}>Batal</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            {p.category === "smart_plug" && (
                              p.imageUrl ? (
                                <img src={p.imageUrl} alt={p.name} className="w-12 h-12 object-cover rounded-lg border border-white/10 shrink-0" />
                              ) : (
                                <div className="w-12 h-12 rounded-lg border border-dashed border-white/10 shrink-0" />
                              )
                            )}
                            <div>
                              <div className="text-sm font-medium text-neutral-100">{p.name}</div>
                              <div className="text-xs text-neutral-500 mt-0.5">{rupiah(p.price)}{p.description ? ` — ${p.description}` : ""}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => toggleActive(p)} className={`text-xs px-2 py-1 rounded-lg ${p.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-neutral-500"}`}>
                              {p.isActive ? "Aktif" : "Nonaktif"}
                            </button>
                            <Button variant="secondary" onClick={() => startEdit(p)}>Edit</Button>
                            <Button variant="danger" onClick={() => removeProduct(p)}>Hapus</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="gm-heading font-semibold mb-3">Tambah Produk Baru</h2>
        <form onSubmit={createProduct} className="space-y-3">
          <div className="flex items-start gap-3">
            {newForm.category === "smart_plug" && (
              <div className="shrink-0">
                {newForm.imageUrl ? (
                  <img src={newForm.imageUrl} alt="Preview" className="w-24 h-24 object-cover rounded-lg border border-white/10" />
                ) : (
                  <div className="w-24 h-24 rounded-lg border border-dashed border-white/10 flex items-center justify-center text-[10px] text-neutral-600 text-center px-1">Belum ada foto</div>
                )}
                <label className="mt-1 block text-[11px] text-cyan-400 hover:text-cyan-300 cursor-pointer text-center">
                  {uploadingNew ? "Mengunggah..." : "Upload Foto"}
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onNewPhotoChange} disabled={uploadingNew} />
                </label>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
              <div>
                <label className="text-xs text-neutral-500">Kategori</label>
                <select className={inputCls} value={newForm.category} onChange={(e) => setNewForm({ ...newForm, category: e.target.value })}>
                  {Object.entries(CATEGORY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1"><label className="text-xs text-neutral-500">Nama</label><input className={inputCls} value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} placeholder="Smart Plug BARDI Basic" /></div>
              <div><label className="text-xs text-neutral-500">Harga</label><input type="number" className={inputCls} value={newForm.price} onChange={(e) => setNewForm({ ...newForm, price: e.target.value })} /></div>
              <div><label className="text-xs text-neutral-500">Urutan</label><input type="number" className={inputCls} value={newForm.sortOrder} onChange={(e) => setNewForm({ ...newForm, sortOrder: e.target.value })} /></div>
              {newForm.category === "smart_plug" && (
                <>
                  <div><label className="text-xs text-neutral-500">Berat (gram)</label><input type="number" className={inputCls} value={newForm.weightGrams} onChange={(e) => setNewForm({ ...newForm, weightGrams: e.target.value })} /></div>
                  <div><label className="text-xs text-neutral-500">Panjang (cm)</label><input type="number" className={inputCls} value={newForm.lengthCm} onChange={(e) => setNewForm({ ...newForm, lengthCm: e.target.value })} placeholder="opsional" /></div>
                  <div><label className="text-xs text-neutral-500">Lebar (cm)</label><input type="number" className={inputCls} value={newForm.widthCm} onChange={(e) => setNewForm({ ...newForm, widthCm: e.target.value })} placeholder="opsional" /></div>
                  <div><label className="text-xs text-neutral-500">Tinggi (cm)</label><input type="number" className={inputCls} value={newForm.heightCm} onChange={(e) => setNewForm({ ...newForm, heightCm: e.target.value })} placeholder="opsional" /></div>
                </>
              )}
              <div className="col-span-2 sm:col-span-4"><label className="text-xs text-neutral-500">Deskripsi (opsional)</label><input className={inputCls} value={newForm.description} onChange={(e) => setNewForm({ ...newForm, description: e.target.value })} /></div>
            </div>
          </div>
          <Button type="submit" disabled={busy} className="w-fit">{busy ? "Menyimpan..." : "Tambah Produk"}</Button>
        </form>
      </Card>
    </div>
  );
}
