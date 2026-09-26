"use client";
import { useEffect, useMemo, useState } from "react";
import { Archive, ArchiveRestore, Pencil, Search, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fetchJsonArray } from "@/lib/api/fetch-json";
import { useAuth } from "@/lib/auth/client";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";

/**
 * Tab Supplier (Inventory Control): tambah, edit, arsipkan/pulihkan, dan hapus supplier.
 * Supplier yang sudah dipakai transaksi tidak bisa dihapus — hanya diarsipkan (lihat
 * lib/inventory/suppliers.ts); tombol Hapus hanya muncul untuk supplier yang belum pernah dipakai.
 */

interface SupplierRow {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  paymentTermsDays: number;
  notes: string | null;
  archivedAt: string | null;
  usageCount: number;
}
interface SupplierForm { name: string; phone: string; address: string; paymentTermsDays: string; notes: string }
const emptyForm: SupplierForm = { name: "", phone: "", address: "", paymentTermsDays: "", notes: "" };
const inputCls = "rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm w-full";
type View = "active" | "archived" | "all";

function SupplierFields({ form, setForm }: { form: SupplierForm; setForm: (f: SupplierForm) => void }) {
  const { t } = useDashboardLang();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
      <input className={inputCls} placeholder={t("inventory.supplier.namePlaceholder", "Nama supplier")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <input className={inputCls} placeholder={t("inventory.supplier.phonePlaceholder", "No. HP")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      <input className={inputCls} placeholder={t("inventory.supplier.addressPlaceholder", "Alamat")} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      <input type="number" min={0} className={inputCls} placeholder={t("inventory.supplier.termsPlaceholder", "Termin (hari)")} value={form.paymentTermsDays} onChange={(e) => setForm({ ...form, paymentTermsDays: e.target.value })} />
      <input className={`${inputCls} sm:col-span-2 lg:col-span-4`} placeholder={t("inventory.supplier.notesPlaceholder", "Catatan (opsional) — mis. no. rekening, nama sales, jam kirim")} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
    </div>
  );
}

const toBody = (f: SupplierForm) => ({ name: f.name, phone: f.phone, address: f.address, notes: f.notes, paymentTermsDays: Number(f.paymentTermsDays) || 0 });

export function SupplierTab() {
  const { t } = useDashboardLang();
  const { user } = useAuth();
  const canManage = hasPermission((user?.role ?? "cashier") as StaffRole, "manage_inventory_purchasing");
  const [rows, setRows] = useState<SupplierRow[] | null>(null);
  const [form, setForm] = useState<SupplierForm>(emptyForm);
  const [editing, setEditing] = useState<{ id: string; form: SupplierForm } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [view, setView] = useState<View>("active");
  const [query, setQuery] = useState("");

  const load = () => {
    fetchJsonArray<SupplierRow>("/api/suppliers").then(setRows);
  };
  useEffect(load, []);

  const send = async (key: string, url: string, method: string, body?: unknown) => {
    setBusy(key);
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await showAlert(data.error ?? t("inventory.supplier.failed", "Gagal menyimpan."));
        return false;
      }
      load();
      return true;
    } finally {
      setBusy(null);
    }
  };

  const create = async () => {
    if (!form.name.trim()) return showAlert(t("inventory.supplier.nameRequired", "Nama supplier wajib diisi."));
    if (await send("create", "/api/suppliers", "POST", toBody(form))) setForm(emptyForm);
  };
  const saveEdit = async () => {
    if (!editing) return;
    if (!editing.form.name.trim()) return showAlert(t("inventory.supplier.nameRequired", "Nama supplier wajib diisi."));
    if (await send(`edit:${editing.id}`, `/api/suppliers/${editing.id}`, "PATCH", toBody(editing.form))) setEditing(null);
  };
  const archive = async (s: SupplierRow, archived: boolean) => {
    const msg = archived
      ? t("inventory.supplier.confirmArchive", "Arsipkan \"{name}\"? Supplier tidak muncul lagi di pilihan Belanja Supplier, PO, Expense, dan Aset. Riwayat transaksinya tetap utuh dan bisa dipulihkan kapan saja.")
      : t("inventory.supplier.confirmUnarchive", "Pulihkan \"{name}\" agar bisa dipilih lagi di transaksi baru?");
    if (!(await showConfirm(msg.replace("{name}", s.name)))) return;
    await send(`archive:${s.id}`, `/api/suppliers/${s.id}`, "PATCH", { archived });
  };
  const remove = async (s: SupplierRow) => {
    if (!(await showConfirm(t("inventory.supplier.confirmDeletePermanent", "Hapus permanen \"{name}\"? Supplier ini belum pernah dipakai transaksi apa pun. Tindakan ini tidak bisa dibatalkan.").replace("{name}", s.name)))) return;
    await send(`delete:${s.id}`, `/api/suppliers/${s.id}`, "DELETE");
  };

  const counts = useMemo(() => ({ active: (rows ?? []).filter((r) => !r.archivedAt).length, archived: (rows ?? []).filter((r) => r.archivedAt).length }), [rows]);
  const visible = useMemo(() => {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    return (rows ?? [])
      .filter((r) => (view === "all" ? true : view === "active" ? !r.archivedAt : Boolean(r.archivedAt)))
      .filter((r) => {
        const hay = [r.name, r.phone, r.address, r.notes].filter(Boolean).join(" ").toLowerCase();
        return tokens.every((tok) => hay.includes(tok));
      });
  }, [rows, view, query]);
  // Same name twice among active suppliers — likely a duplicate entry worth merging/archiving.
  const duplicateNames = useMemo(() => {
    const seen = new Map<string, number>();
    for (const r of rows ?? []) if (!r.archivedAt) seen.set(r.name.toLowerCase(), (seen.get(r.name.toLowerCase()) ?? 0) + 1);
    return new Set([...seen].filter(([, n]) => n > 1).map(([k]) => k));
  }, [rows]);

  return (
    <div className="space-y-4">
      {canManage && (
        <Card className="space-y-2">
          <h2 className="font-medium">{t("inventory.supplier.addTitle", "Tambah Supplier")}</h2>
          <SupplierFields form={form} setForm={setForm} />
          <Button onClick={create} disabled={busy === "create"}>{busy === "create" ? t("inventory.supplier.saving", "Menyimpan...") : t("inventory.supplier.saveButton", "Simpan Supplier")}</Button>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-neutral-700 overflow-hidden text-sm">
          {([
            ["active", t("inventory.supplier.viewActive", "Aktif"), counts.active],
            ["archived", t("inventory.supplier.viewArchived", "Diarsipkan"), counts.archived],
            ["all", t("inventory.supplier.viewAll", "Semua"), counts.active + counts.archived],
          ] as [View, string, number][]).map(([v, label, n]) => (
            <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 ${view === v ? "bg-emerald-500/20 text-emerald-300" : "text-neutral-400 hover:text-neutral-200"}`}>
              {label} ({n})
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input className={`${inputCls} pl-8`} placeholder={t("inventory.supplier.search", "Cari nama, no. HP, alamat, catatan...")} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      {duplicateNames.size > 0 && view !== "archived" && (
        <p className="text-xs text-amber-400">
          {t("inventory.supplier.duplicateHint", "Ada supplier aktif dengan nama sama. Arsipkan yang dobel (atau hapus bila belum pernah dipakai) supaya pilihan supplier tidak membingungkan.")}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((s) =>
          editing?.id === s.id ? (
            <Card key={s.id} className="space-y-2 sm:col-span-2 lg:col-span-3 border-emerald-500/40">
              <h3 className="text-sm font-medium">{t("inventory.supplier.editTitle", "Edit Supplier")}</h3>
              <SupplierFields form={editing.form} setForm={(f) => setEditing({ id: s.id, form: f })} />
              {s.usageCount > 0 && (
                <p className="text-[11px] text-neutral-500">{t("inventory.supplier.editHint", "Perubahan nama ikut tampil di semua transaksi lama supplier ini — nominal dan jurnalnya tidak berubah.")}</p>
              )}
              <div className="flex gap-2">
                <Button onClick={saveEdit} disabled={busy === `edit:${s.id}`}>{busy === `edit:${s.id}` ? t("inventory.supplier.saving", "Menyimpan...") : t("inventory.supplier.saveChanges", "Simpan Perubahan")}</Button>
                <Button variant="ghost" onClick={() => setEditing(null)}>{t("inventory.supplier.cancel", "Batal")}</Button>
              </div>
            </Card>
          ) : (
            <Card key={s.id} className={`space-y-1 ${s.archivedAt ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium break-words">
                    {s.name}
                    {duplicateNames.has(s.name.toLowerCase()) && !s.archivedAt && <span className="ml-1.5 text-[10px] rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-300">{t("inventory.supplier.duplicate", "nama dobel")}</span>}
                    {s.archivedAt && <span className="ml-1.5 text-[10px] rounded bg-neutral-700 px-1.5 py-0.5 text-neutral-300">{t("inventory.supplier.archivedBadge", "Diarsipkan")}</span>}
                  </div>
                </div>
                {canManage && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      title={t("inventory.supplier.edit", "Edit")}
                      className="p-1 text-neutral-400 hover:text-emerald-300"
                      onClick={() =>
                        setEditing({ id: s.id, form: { name: s.name, phone: s.phone ?? "", address: s.address ?? "", paymentTermsDays: s.paymentTermsDays ? String(s.paymentTermsDays) : "", notes: s.notes ?? "" } })
                      }
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      title={s.archivedAt ? t("inventory.supplier.unarchive", "Pulihkan") : t("inventory.supplier.archive", "Arsipkan")}
                      className="p-1 text-neutral-400 hover:text-amber-300 disabled:opacity-40"
                      disabled={busy === `archive:${s.id}`}
                      onClick={() => archive(s, !s.archivedAt)}
                    >
                      {s.archivedAt ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                    </button>
                    {s.usageCount === 0 && (
                      <button title={t("inventory.supplier.deleteButton", "Hapus")} className="p-1 text-neutral-400 hover:text-red-400 disabled:opacity-40" disabled={busy === `delete:${s.id}`} onClick={() => remove(s)}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
              {s.phone && <div className="text-xs text-neutral-500">{s.phone}</div>}
              {s.address && <div className="text-xs text-neutral-500">{s.address}</div>}
              <div className="text-xs text-neutral-500">
                {t("inventory.supplier.terms", "Termin")}: {s.paymentTermsDays ? t("inventory.supplier.termsDays", "{n} hari").replace("{n}", String(s.paymentTermsDays)) : t("inventory.supplier.termsCash", "tunai")}
                {" · "}
                {s.usageCount > 0
                  ? t("inventory.supplier.usage", "dipakai di {n} transaksi").replace("{n}", String(s.usageCount))
                  : t("inventory.supplier.unused", "belum pernah dipakai")}
              </div>
              {s.notes && <div className="text-xs text-neutral-400">{s.notes}</div>}
            </Card>
          )
        )}
      </div>
      {rows && visible.length === 0 && (
        <div className="text-sm text-neutral-500 py-4 text-center">
          {rows.length === 0 ? t("inventory.supplier.empty", "Belum ada supplier.") : t("inventory.supplier.noMatch", "Tidak ada supplier yang cocok.")}
        </div>
      )}
      {!rows && <div className="text-sm text-neutral-500 py-4 text-center">{t("inventory.supplier.loading", "Memuat...")}</div>}
    </div>
  );
}
