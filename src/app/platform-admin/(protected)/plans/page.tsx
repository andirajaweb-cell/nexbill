"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fetchJsonArray } from "@/lib/api/fetch-json";

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;
const inputCls = "w-full rounded-lg bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm";

const EMPTY_FORM = {
  code: "", name: "", priceOriginal: "", priceCurrent: "", includedConsoles: "10",
  extraConsolePrice: "20000", smartPlugPrice: "275000", setupServicePrice: "125000",
  unlimitedEntitlement: false,
};

export default function PlatformPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newForm, setNewForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = () => fetchJsonArray<any>("/api/platform-admin/plans").then((p) => { setPlans(p); setLoading(false); });
  useEffect(() => { load(); }, []);

  const createPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.code || !newForm.name) return;
    setBusy(true);
    try {
      await fetch("/api/platform-admin/plans", {
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
      await fetch(`/api/platform-admin/plans/${editing}`, {
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
    await fetch(`/api/platform-admin/plans/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold text-amber-300">Produk Langganan</h1>
        <p className="text-sm text-neutral-500 mt-1">Katalog paket langganan NEXBILL yang tampil di checkout outlet — hanya paket dengan status Aktif yang bisa dipilih outlet.</p>
      </div>

      <Card>
        <h2 className="gm-heading font-semibold mb-3">Paket Terdaftar</h2>
        {loading ? (
          <p className="text-sm text-neutral-500">Memuat...</p>
        ) : plans.length === 0 ? (
          <p className="text-sm text-neutral-500">Belum ada paket.</p>
        ) : (
          <div className="space-y-3">
            {plans.map((p) => (
              <div key={p.id} className="rounded-lg border border-white/10 p-3">
                {editing === p.id ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div><label className="text-xs text-neutral-500">Nama</label><input className={inputCls} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
                      <div><label className="text-xs text-neutral-500">Harga Asli</label><input type="number" className={inputCls} value={editForm.priceOriginal} onChange={(e) => setEditForm({ ...editForm, priceOriginal: Number(e.target.value) })} /></div>
                      <div><label className="text-xs text-neutral-500">Harga Promo</label><input type="number" className={inputCls} value={editForm.priceCurrent} onChange={(e) => setEditForm({ ...editForm, priceCurrent: Number(e.target.value) })} /></div>
                      <div><label className="text-xs text-neutral-500">Konsol Termasuk</label><input type="number" className={inputCls} value={editForm.includedConsoles} onChange={(e) => setEditForm({ ...editForm, includedConsoles: Number(e.target.value) })} /></div>
                      <div><label className="text-xs text-neutral-500">Harga Konsol Extra</label><input type="number" className={inputCls} value={editForm.extraConsolePrice} onChange={(e) => setEditForm({ ...editForm, extraConsolePrice: Number(e.target.value) })} /></div>
                      <div><label className="text-xs text-neutral-500">Harga Smart Plug</label><input type="number" className={inputCls} value={editForm.smartPlugPrice} onChange={(e) => setEditForm({ ...editForm, smartPlugPrice: Number(e.target.value) })} /></div>
                      <div><label className="text-xs text-neutral-500">Harga Jasa Setup</label><input type="number" className={inputCls} value={editForm.setupServicePrice} onChange={(e) => setEditForm({ ...editForm, setupServicePrice: Number(e.target.value) })} /></div>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-neutral-400">
                      <input type="checkbox" checked={!!editForm.unlimitedEntitlement} onChange={(e) => setEditForm({ ...editForm, unlimitedEntitlement: e.target.checked })} />
                      Bayar paket ini langsung memberi akses unlimited konsol, semua fitur, dan unlimited cabang
                    </label>
                    <div className="flex gap-2">
                      <Button onClick={saveEdit} disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</Button>
                      <Button variant="ghost" onClick={() => setEditing(null)}>Batal</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="text-sm font-medium text-neutral-100">
                        {p.name} <span className="text-neutral-600">({p.code})</span>
                        {p.unlimitedEntitlement && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 align-middle">Unlimited</span>}
                      </div>
                      <div className="text-xs text-neutral-500 mt-0.5">
                        {rupiah(p.priceCurrent)}/bulan (asli {rupiah(p.priceOriginal)}) · {p.includedConsoles} konsol termasuk · extra {rupiah(p.extraConsolePrice)}/konsol · smart plug {rupiah(p.smartPlugPrice)} · setup {rupiah(p.setupServicePrice)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleActive(p)} className={`text-xs px-2 py-1 rounded-lg ${p.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-neutral-500"}`}>
                        {p.isActive ? "Aktif" : "Nonaktif"}
                      </button>
                      <Button variant="secondary" onClick={() => startEdit(p)}>Edit</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="gm-heading font-semibold mb-3">Tambah Paket Baru</h2>
        <form onSubmit={createPlan} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div><label className="text-xs text-neutral-500">Kode (unik)</label><input className={inputCls} value={newForm.code} onChange={(e) => setNewForm({ ...newForm, code: e.target.value })} placeholder="pro" /></div>
          <div><label className="text-xs text-neutral-500">Nama</label><input className={inputCls} value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} placeholder="NEXBILL Pro" /></div>
          <div><label className="text-xs text-neutral-500">Harga Asli</label><input type="number" className={inputCls} value={newForm.priceOriginal} onChange={(e) => setNewForm({ ...newForm, priceOriginal: e.target.value })} /></div>
          <div><label className="text-xs text-neutral-500">Harga Promo</label><input type="number" className={inputCls} value={newForm.priceCurrent} onChange={(e) => setNewForm({ ...newForm, priceCurrent: e.target.value })} /></div>
          <div><label className="text-xs text-neutral-500">Konsol Termasuk</label><input type="number" className={inputCls} value={newForm.includedConsoles} onChange={(e) => setNewForm({ ...newForm, includedConsoles: e.target.value })} /></div>
          <div><label className="text-xs text-neutral-500">Harga Konsol Extra</label><input type="number" className={inputCls} value={newForm.extraConsolePrice} onChange={(e) => setNewForm({ ...newForm, extraConsolePrice: e.target.value })} /></div>
          <div><label className="text-xs text-neutral-500">Harga Smart Plug</label><input type="number" className={inputCls} value={newForm.smartPlugPrice} onChange={(e) => setNewForm({ ...newForm, smartPlugPrice: e.target.value })} /></div>
          <div><label className="text-xs text-neutral-500">Harga Jasa Setup</label><input type="number" className={inputCls} value={newForm.setupServicePrice} onChange={(e) => setNewForm({ ...newForm, setupServicePrice: e.target.value })} /></div>
          <label className="col-span-2 sm:col-span-4 flex items-center gap-2 text-xs text-neutral-400">
            <input type="checkbox" checked={newForm.unlimitedEntitlement} onChange={(e) => setNewForm({ ...newForm, unlimitedEntitlement: e.target.checked })} />
            Bayar paket ini langsung memberi akses unlimited konsol, semua fitur, dan unlimited cabang
          </label>
          <Button type="submit" disabled={busy} className="col-span-2 sm:col-span-4 w-fit">{busy ? "Menyimpan..." : "Tambah Paket"}</Button>
        </form>
      </Card>
    </div>
  );
}
