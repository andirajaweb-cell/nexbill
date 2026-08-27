"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fetchJsonArray } from "@/lib/api/fetch-json";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-promo";

interface Promo {
  id: string;
  name: string;
  type: string;
  consoleType?: string;
  durationMinutes?: number;
  packagePrice?: number;
  discountPercent?: number;
  isActive: boolean;
}

const rupiah = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;

const emptyForm = { name: "", type: "rental_package", consoleType: "any", durationMinutes: 60, packagePrice: 0 };

export default function PromoPage() {
  const { t } = useDashboardLang();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const load = () => fetchJsonArray("/api/promos").then(setPromos);
  useEffect(() => { load(); }, []);

  const addPromo = async () => {
    if (!form.name) return;
    const res = await fetch("/api/promos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, outletId: (await getOutletId()) }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setForm(emptyForm);
    load();
  };

  const toggleActive = async (p: Promo) => {
    const res = await fetch(`/api/promos/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    load();
  };

  const startEdit = (p: Promo) => {
    setEditingId(p.id);
    setEditForm({
      name: p.name,
      type: p.type,
      consoleType: p.consoleType ?? "any",
      durationMinutes: p.durationMinutes ?? 60,
      packagePrice: p.packagePrice ?? 0,
    });
  };
  const cancelEdit = () => { setEditingId(null); setEditForm(emptyForm); };

  const saveEdit = async (id: string) => {
    if (!editForm.name) return showAlert(t("promo.nameRequired", "Nama paket wajib diisi."));
    const res = await fetch(`/api/promos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    cancelEdit();
    load();
  };

  const deletePromo = async (p: Promo) => {
    if (!await showConfirm(t("promo.confirmDelete", 'Hapus promo "{name}"?').replace("{name}", p.name))) return;
    const res = await fetch(`/api/promos/${p.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    if (data.softDeleted) showAlert(t("promo.softDeletedNotice", '"{name}" pernah dipakai di transaksi, jadi dinonaktifkan (bukan dihapus permanen) agar riwayat transaksi tetap aman.').replace("{name}", p.name));
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold gm-gradient-title">{t("promo.title", "Promo & Paket Rental")}</h1>
        <p className="text-sm text-neutral-500">{t("promo.subtitle", "Paket harga tetap untuk durasi tertentu, dipakai juga oleh AI agent saat menjawab chat.")}</p>
      </div>

      <Card>
        <h2 className="font-medium mb-3">{t("promo.createHeading", "Buat Paket Rental")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <input className="col-span-2 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("promo.namePlaceholder", "Nama paket (mis. Paket 3 Jam PS4)")}
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm"
            value={form.consoleType} onChange={(e) => setForm({ ...form, consoleType: e.target.value })}>
            <option value="any">{t("promo.consoleAll", "Semua Konsol")}</option>
            <option value="ps3">PS3</option>
            <option value="ps4">PS4</option>
            <option value="ps5">PS5</option>
          </select>
          <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("promo.durationPlaceholder", "Durasi (menit)")}
            value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} />
          <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("promo.pricePlaceholder", "Harga paket")}
            value={form.packagePrice || ""} onChange={(e) => setForm({ ...form, packagePrice: Number(e.target.value) })} />
        </div>
        <Button className="mt-2" onClick={addPromo}>{t("promo.saveButton", "Simpan Paket")}</Button>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {promos.map((p) => (
          <Card key={p.id} className="space-y-2">
            {editingId === p.id ? (
              <div className="space-y-2">
                <input className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("promo.editNamePlaceholder", "Nama paket")}
                  value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm"
                    value={editForm.consoleType} onChange={(e) => setEditForm({ ...editForm, consoleType: e.target.value })}>
                    <option value="any">{t("promo.consoleAll", "Semua Konsol")}</option>
                    <option value="ps3">PS3</option>
                    <option value="ps4">PS4</option>
                    <option value="ps5">PS5</option>
                  </select>
                  <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("promo.durationPlaceholder", "Durasi (menit)")}
                    value={editForm.durationMinutes} onChange={(e) => setEditForm({ ...editForm, durationMinutes: Number(e.target.value) })} />
                </div>
                <input type="number" className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("promo.pricePlaceholder", "Harga paket")}
                  value={editForm.packagePrice || ""} onChange={(e) => setEditForm({ ...editForm, packagePrice: Number(e.target.value) })} />
                <div className="flex gap-2">
                  <Button className="flex-1 text-xs" onClick={() => saveEdit(p.id)}>{t("promo.save", "Simpan")}</Button>
                  <Button variant="ghost" className="flex-1 text-xs" onClick={cancelEdit}>{t("promo.cancel", "Batal")}</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="font-medium">{p.name}</div>
                  <Badge status={p.isActive ? "available" : "maintenance"}>{p.isActive ? t("promo.statusActive", "Aktif") : t("promo.statusInactive", "Nonaktif")}</Badge>
                </div>
                <div className="text-sm text-neutral-400">
                  {p.durationMinutes ? t("promo.durationMinutesLabel", "{n} menit").replace("{n}", String(p.durationMinutes)) : ""} {p.packagePrice ? `· ${rupiah(p.packagePrice)}` : ""}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1 text-xs" onClick={() => startEdit(p)}>{t("promo.edit", "Edit")}</Button>
                  <Button variant="secondary" className="flex-1 text-xs" onClick={() => toggleActive(p)}>
                    {p.isActive ? t("promo.deactivate", "Nonaktifkan") : t("promo.activate", "Aktifkan")}
                  </Button>
                  <Button variant="ghost" className="text-xs text-red-400 px-2" onClick={() => deletePromo(p)}>{t("promo.delete", "Hapus")}</Button>
                </div>
              </>
            )}
          </Card>
        ))}
        {promos.length === 0 && <p className="text-sm text-neutral-500">{t("promo.emptyState", "Belum ada paket promo.")}</p>}
      </div>
    </div>
  );
}

async function getOutletId() {
  const res = await fetch("/api/outlets/default");
  return (await res.json()).id;
}
