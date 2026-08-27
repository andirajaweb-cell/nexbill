"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fetchJsonArray } from "@/lib/api/fetch-json";

const inputCls = "w-full rounded-lg bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm";

const CATEGORY_SUGGESTIONS = [
  "Aksesoris Konsol",
  "Kabel & Elektronik",
  "Jaringan & WiFi",
  "Kebersihan & Perawatan",
  "Perlengkapan Outlet",
  "Lainnya",
];

const EMPTY_FORM = { title: "", description: "", shopeeUrl: "", priceLabel: "", category: CATEGORY_SUGGESTIONS[0], sortOrder: "0", imageUrl: "" };

export default function PlatformAffiliatePage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newForm, setNewForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [uploadingNew, setUploadingNew] = useState(false);
  const [uploadingEdit, setUploadingEdit] = useState(false);

  const load = () => fetchJsonArray<any>("/api/platform-admin/affiliate-products").then((p) => { setItems(p); setLoading(false); });
  useEffect(() => { load(); }, []);

  const uploadPhoto = async (file: File): Promise<string | null> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/platform-admin/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) { setFormError(data.error ?? "Gagal upload foto."); return null; }
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

  const createItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!newForm.title || !newForm.shopeeUrl) { setFormError("Nama produk dan link produk wajib diisi."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/platform-admin/affiliate-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newForm),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "Gagal menambah produk."); return; }
      setNewForm(EMPTY_FORM);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (p: any) => { setEditing(p.id); setEditForm({ ...p }); setFormError(""); };

  const saveEdit = async () => {
    setBusy(true);
    setFormError("");
    try {
      const res = await fetch(`/api/platform-admin/affiliate-products/${editing}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "Gagal menyimpan perubahan."); return; }
      setEditing(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (p: any) => {
    await fetch(`/api/platform-admin/affiliate-products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    await load();
  };

  const removeItem = async (p: any) => {
    if (!confirm(`Hapus produk "${p.title}" dari daftar rekomendasi? Tindakan ini permanen.`)) return;
    await fetch(`/api/platform-admin/affiliate-products/${p.id}`, { method: "DELETE" });
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold text-amber-300">Rekomendasi Produk</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Daftar link affiliate untuk perlengkapan rental yang ditampilkan di halaman &quot;Rekomendasi Produk&quot; outlet (diakses dari halaman Langganan). Ini murni link keluar ke toko online — tidak masuk ke keranjang/checkout aplikasi sama sekali.
        </p>
      </div>

      {formError && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{formError}</div>
      )}

      <Card>
        <h2 className="gm-heading font-semibold mb-3">Produk Terdaftar</h2>
        {loading ? (
          <p className="text-sm text-neutral-500">Memuat...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-neutral-500">Belum ada produk rekomendasi.</p>
        ) : (
          <div className="space-y-2">
            {items.map((p) => (
              <div key={p.id} className="rounded-lg border border-white/10 p-3">
                {editing === p.id ? (
                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0">
                        {editForm.imageUrl ? (
                          <img src={editForm.imageUrl} alt={editForm.title} className="w-20 h-20 object-cover rounded-lg border border-white/10" />
                        ) : (
                          <div className="w-20 h-20 rounded-lg border border-dashed border-white/10 flex items-center justify-center text-[10px] text-neutral-600 text-center px-1">Belum ada foto</div>
                        )}
                        <label className="mt-1 block text-[11px] text-cyan-400 hover:text-cyan-300 cursor-pointer text-center">
                          {uploadingEdit ? "Mengunggah..." : "Ganti foto"}
                          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onEditPhotoChange} disabled={uploadingEdit} />
                        </label>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
                        <div className="col-span-2"><label className="text-xs text-neutral-500">Nama Produk</label><input className={inputCls} value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} /></div>
                        <div>
                          <label className="text-xs text-neutral-500">Kategori</label>
                          <select className={inputCls} value={editForm.category ?? ""} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}>
                            {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div><label className="text-xs text-neutral-500">Urutan</label><input type="number" className={inputCls} value={editForm.sortOrder} onChange={(e) => setEditForm({ ...editForm, sortOrder: Number(e.target.value) })} /></div>
                        <div className="col-span-2"><label className="text-xs text-neutral-500">Harga (tampilan, opsional)</label><input className={inputCls} value={editForm.priceLabel ?? ""} onChange={(e) => setEditForm({ ...editForm, priceLabel: e.target.value })} placeholder="Rp85.000" /></div>
                        <div className="col-span-2 sm:col-span-4"><label className="text-xs text-neutral-500">Link Produk</label><input className={inputCls} value={editForm.shopeeUrl} onChange={(e) => setEditForm({ ...editForm, shopeeUrl: e.target.value })} placeholder="https://..." /></div>
                        <div className="col-span-2 sm:col-span-4"><label className="text-xs text-neutral-500">Deskripsi (opsional)</label><input className={inputCls} value={editForm.description ?? ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></div>
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
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.title} className="w-12 h-12 object-cover rounded-lg border border-white/10 shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg border border-dashed border-white/10 shrink-0" />
                      )}
                      <div>
                        <div className="text-sm font-medium text-neutral-100">{p.title}</div>
                        <div className="text-xs text-neutral-500 mt-0.5">
                          {p.category ? `${p.category} — ` : ""}{p.priceLabel || "Tanpa harga tampilan"}
                        </div>
                        <a href={p.shopeeUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-cyan-400 hover:text-cyan-300 break-all">{p.shopeeUrl}</a>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleActive(p)} className={`text-xs px-2 py-1 rounded-lg ${p.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-neutral-500"}`}>
                        {p.isActive ? "Aktif" : "Nonaktif"}
                      </button>
                      <Button variant="secondary" onClick={() => startEdit(p)}>Edit</Button>
                      <Button variant="danger" onClick={() => removeItem(p)}>Hapus</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="gm-heading font-semibold mb-3">Tambah Produk Rekomendasi</h2>
        <form onSubmit={createItem} className="space-y-3">
          <div className="flex items-start gap-3">
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
              <div className="col-span-2"><label className="text-xs text-neutral-500">Nama Produk</label><input className={inputCls} value={newForm.title} onChange={(e) => setNewForm({ ...newForm, title: e.target.value })} placeholder="Stick PS5 DualSense" /></div>
              <div>
                <label className="text-xs text-neutral-500">Kategori</label>
                <select className={inputCls} value={newForm.category} onChange={(e) => setNewForm({ ...newForm, category: e.target.value })}>
                  {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-neutral-500">Urutan</label><input type="number" className={inputCls} value={newForm.sortOrder} onChange={(e) => setNewForm({ ...newForm, sortOrder: e.target.value })} /></div>
              <div className="col-span-2"><label className="text-xs text-neutral-500">Harga (tampilan, opsional)</label><input className={inputCls} value={newForm.priceLabel} onChange={(e) => setNewForm({ ...newForm, priceLabel: e.target.value })} placeholder="Rp85.000" /></div>
              <div className="col-span-2 sm:col-span-4"><label className="text-xs text-neutral-500">Link Produk</label><input className={inputCls} value={newForm.shopeeUrl} onChange={(e) => setNewForm({ ...newForm, shopeeUrl: e.target.value })} placeholder="https://..." /></div>
              <div className="col-span-2 sm:col-span-4"><label className="text-xs text-neutral-500">Deskripsi (opsional)</label><input className={inputCls} value={newForm.description} onChange={(e) => setNewForm({ ...newForm, description: e.target.value })} /></div>
            </div>
          </div>
          <Button type="submit" disabled={busy} className="w-fit">{busy ? "Menyimpan..." : "Tambah Produk"}</Button>
        </form>
      </Card>
    </div>
  );
}
