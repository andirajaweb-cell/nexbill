"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fetchJsonObject } from "@/lib/api/fetch-json";
import { useApi } from "@/lib/api/use-api";
import { useAuth } from "@/lib/auth/client";
import { hasPermission, StaffRole } from "@/lib/auth/permissions";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { Wrench, PlayCircle, CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-maintenance";

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;

const STATUS_BADGE: Record<string, string> = { queued: "pending", in_progress: "available", done: "success" };
const STATUS_FILTERS = ["Semua", "queued", "in_progress", "done"] as const;

const inputCls = "rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm";

/**
 * Repair/maintenance ticket workflow for fixed assets (TV, PlayStation/Console, Controller &
 * other accessories) — separate from the Fixed Asset & Depreciation page (which stays focused on
 * accounting: acquisition, depreciation runs, disposal). This page is the day-to-day operational
 * view: what's currently broken, who's fixing it, and how far along it is, plus a per-category
 * summary of the fleet (data langsung dari modul Aset) vs. how much of it is currently down for
 * repair. Every ticket here is the same underlying assetMaintenanceLogs row the Assets page's
 * "+ Maintenance" shortcut creates — see lib/accounting/asset.ts.
 */
export default function MaintenancePage() {
  const { t } = useDashboardLang();
  const CATEGORY_LABEL: Record<string, string> = {
    playstation: t("maintenance.category.playstation", "PlayStation / Konsol"),
    tv: t("maintenance.category.tv", "TV"),
    controller: t("maintenance.category.controller", "Controller / Aksesoris"),
    furniture: t("maintenance.category.furniture", "Furniture"),
    vehicle: t("maintenance.category.vehicle", "Kendaraan"),
    other: t("maintenance.category.other", "Lainnya"),
  };
  const STATUS_LABEL: Record<string, string> = {
    queued: t("maintenance.status.queued", "Masuk Maintenance"),
    in_progress: t("maintenance.status.inProgress", "Proses"),
    done: t("maintenance.status.done", "Selesai"),
  };
  const [outletId, setOutletId] = useState<string | null>(null);
  const [bundle, setBundle] = useState<any>({ assets: [], tickets: [], cashBankAccounts: [] });
  const [expenseAccounts, setExpenseAccounts] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("Semua");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ fixedAssetId: "", description: "", cost: 0, createExpenseFor: false, accountId: "", cashBankAccountId: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ description: string; cost: number } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { user } = useAuth();
  const role = (user?.role ?? "cashier") as StaffRole;
  const canManage = hasPermission(role, "manage_assets");

  const { data: outlet } = useApi<{ id: string }>("/api/outlets/default");
  useEffect(() => {
    if (outlet) setOutletId(outlet.id);
  }, [outlet]);

  const load = () => {
    fetchJsonObject("/api/maintenance").then((d) => d && setBundle(d));
    fetchJsonObject("/api/expenses").then((d: any) => d && setExpenseAccounts(d.accounts ?? []));
  };
  useEffect(() => { if (outletId) load(); }, [outletId]);

  const assets: any[] = bundle.assets ?? [];
  const tickets: any[] = bundle.tickets ?? [];

  const summary = useMemo(() => {
    const nonDisposed = assets.filter((a) => a.status !== "disposed");
    const byCategory: Record<string, { total: number; underMaintenance: number }> = {};
    for (const a of nonDisposed) {
      byCategory[a.category] ??= { total: 0, underMaintenance: 0 };
      byCategory[a.category].total += 1;
      if (a.status === "under_maintenance") byCategory[a.category].underMaintenance += 1;
    }
    return byCategory;
  }, [assets]);

  const assetName = (id: string) => assets.find((a) => a.id === id)?.name ?? t("maintenance.deletedAsset", "(aset terhapus)");
  const assetCategory = (id: string) => assets.find((a) => a.id === id)?.category;

  const visibleTickets = tickets
    .filter((ticket) => statusFilter === "Semua" || ticket.status === statusFilter)
    .sort((a, b) => new Date(b.maintenanceDate).getTime() - new Date(a.maintenanceDate).getTime());

  const availableAssetsForNewTicket = assets.filter((a) => a.status !== "disposed");

  const submitCreate = async () => {
    if (!form.fixedAssetId) return showAlert(t("maintenance.alertSelectAsset", "Pilih aset yang mau di-maintenance."));
    if (!form.description) return showAlert(t("maintenance.alertDescriptionRequired", "Deskripsi maintenance wajib diisi."));
    if (form.createExpenseFor && form.cost > 0 && !form.accountId) return showAlert(t("maintenance.alertSelectExpenseAccount", "Pilih akun beban untuk membuat expense maintenance."));
    const res = await fetch("/api/maintenance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setForm({ fixedAssetId: "", description: "", cost: 0, createExpenseFor: false, accountId: "", cashBankAccountId: "" });
    setShowForm(false);
    load();
  };

  const advanceStatus = async (ticket: any, nextStatus: "in_progress" | "done") => {
    setBusyId(ticket.id);
    try {
      const res = await fetch(`/api/maintenance/${ticket.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      load();
    } finally {
      setBusyId(null);
    }
  };

  const startEdit = (ticket: any) => { setEditingId(ticket.id); setEditForm({ description: ticket.description, cost: ticket.cost }); };

  const saveEdit = async () => {
    if (!editingId || !editForm) return;
    setBusyId(editingId);
    try {
      const res = await fetch(`/api/maintenance/${editingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      setEditingId(null);
      setEditForm(null);
      load();
    } finally {
      setBusyId(null);
    }
  };

  const removeTicket = async (ticket: any) => {
    if (!(await showConfirm(t("maintenance.confirmDeleteTicket", 'Hapus tiket maintenance "{desc}"? Tindakan ini permanen.').replace("{desc}", ticket.description)))) return;
    setBusyId(ticket.id);
    try {
      const res = await fetch(`/api/maintenance/${ticket.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      load();
    } finally {
      setBusyId(null);
    }
  };

  if (!outletId) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold gm-gradient-title">{t("maintenance.title", "Maintenance / Perbaikan")}</h1>
        <p className="text-sm text-neutral-500">
          {t("maintenance.subtitlePrefix", "Alur perbaikan TV, konsol, controller & aksesoris lain: Masuk Maintenance → Proses → Selesai. Data aset diambil langsung dari halaman")}{" "}
          <a href="/dashboard/assets" className="text-emerald-400 underline">{t("maintenance.assetsLinkText", "Aset")}</a>.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Object.entries(CATEGORY_LABEL).map(([cat, label]) => {
          const s = summary[cat];
          if (!s || s.total === 0) return null;
          return (
            <Card key={cat} className="p-3 space-y-1">
              <div className="text-xs text-neutral-500">{label}</div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-neutral-100">{s.total - s.underMaintenance}</span>
                <span className="text-xs text-neutral-500">{t("maintenance.availableOfTotal", "tersedia / {total} total").replace("{total}", String(s.total))}</span>
              </div>
              {s.underMaintenance > 0 && (
                <div className="text-xs text-amber-400">{t("maintenance.underMaintenanceCount", "{n} sedang maintenance").replace("{n}", String(s.underMaintenance))}</div>
              )}
            </Card>
          );
        })}
        {Object.values(summary).length === 0 && (
          <Card className="p-3 col-span-full">
            <p className="text-sm text-neutral-500">{t("maintenance.noAssetsRegistered", "Belum ada aset terdaftar — tambahkan dulu di halaman Aset.")}</p>
          </Card>
        )}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 border-b border-neutral-800 overflow-x-auto">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 text-sm whitespace-nowrap ${statusFilter === s ? "border-b-2 border-emerald-500 text-emerald-400" : "text-neutral-500 hover:text-neutral-300"}`}
            >
              {s === "Semua" ? t("maintenance.filterAll", "Semua") : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        {canManage && <Button onClick={() => setShowForm((s) => !s)}>{showForm ? t("maintenance.closeForm", "Tutup Form") : t("maintenance.addMaintenance", "+ Tambah Maintenance")}</Button>}
      </div>

      {showForm && (
        <Card className="space-y-3">
          <h2 className="font-medium flex items-center gap-2"><Wrench size={16} className="text-amber-400" /> {t("maintenance.newTicketHeading", "Tiket Maintenance Baru")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <select className={inputCls + " col-span-2"} value={form.fixedAssetId} onChange={(e) => setForm({ ...form, fixedAssetId: e.target.value })}>
              <option value="">{t("maintenance.selectAssetPlaceholder", "Pilih aset...")}</option>
              {availableAssetsForNewTicket.map((a) => (
                <option key={a.id} value={a.id}>{a.name} — {CATEGORY_LABEL[a.category] ?? a.category}{a.status === "under_maintenance" ? t("maintenance.ticketAlreadyRunning", " (sudah ada tiket berjalan)") : ""}</option>
              ))}
            </select>
            <input type="number" className={inputCls} placeholder={t("maintenance.costPlaceholder", "Biaya (Rp, 0 jika belum tahu)")} value={form.cost || ""} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} />
            <input className={inputCls + " col-span-2 sm:col-span-4"} placeholder={t("maintenance.descriptionPlaceholder", "Deskripsi kerusakan (mis. Layar TV bergaris)")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <label className="flex items-center gap-2 text-xs text-neutral-400 col-span-2">
              <input type="checkbox" checked={form.createExpenseFor} onChange={(e) => setForm({ ...form, createExpenseFor: e.target.checked })} /> {t("maintenance.createExpenseCheckbox", "Buat Expense (Beban Maintenance) sekarang")}
            </label>
            {form.createExpenseFor && (
              <>
                <select className={inputCls} value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
                  <option value="">{t("maintenance.expenseAccountPlaceholder", "Akun Beban (COA)")}</option>
                  {expenseAccounts.map((a: any) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
                </select>
                <select className={inputCls} value={form.cashBankAccountId} onChange={(e) => setForm({ ...form, cashBankAccountId: e.target.value })}>
                  <option value="">{t("maintenance.cashBankAccountPlaceholder", "Akun Kas/Bank (kosongkan = hutang)")}</option>
                  {(bundle.cashBankAccounts ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </>
            )}
          </div>
          <Button onClick={submitCreate}>{t("maintenance.saveTicket", "Simpan Tiket")}</Button>
        </Card>
      )}

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500 border-b border-neutral-800">
              <th className="py-2">{t("maintenance.col.asset", "Aset")}</th><th>{t("maintenance.col.category", "Kategori")}</th><th>{t("maintenance.col.description", "Deskripsi")}</th><th>{t("maintenance.col.cost", "Biaya")}</th><th>{t("maintenance.col.status", "Status")}</th><th>{t("maintenance.col.dateIn", "Masuk")}</th><th></th>
            </tr>
          </thead>
          <tbody>
            {visibleTickets.map((ticket) => (
              <tr key={ticket.id} className="border-b border-neutral-900 align-top">
                <td className="py-2 text-xs font-medium">{assetName(ticket.fixedAssetId)}</td>
                <td className="text-xs">{CATEGORY_LABEL[assetCategory(ticket.fixedAssetId) ?? ""] ?? "-"}</td>
                <td className="text-xs max-w-[220px]">
                  {editingId === ticket.id ? (
                    <input className={inputCls + " w-full"} value={editForm?.description ?? ""} onChange={(e) => setEditForm({ ...(editForm as any), description: e.target.value })} />
                  ) : (
                    ticket.description
                  )}
                </td>
                <td className="text-xs">
                  {editingId === ticket.id ? (
                    <input
                      type="number"
                      className={inputCls + " w-24"}
                      value={editForm?.cost ?? 0}
                      disabled={!!ticket.expenseId}
                      title={ticket.expenseId ? t("maintenance.recordedAsExpenseTitle", "Sudah tercatat sebagai Expense — ubah lewat halaman Expense.") : ""}
                      onChange={(e) => setEditForm({ ...(editForm as any), cost: Number(e.target.value) })}
                    />
                  ) : (
                    rupiah(ticket.cost)
                  )}
                </td>
                <td><Badge status={STATUS_BADGE[ticket.status]}>{STATUS_LABEL[ticket.status]}</Badge></td>
                <td className="text-xs whitespace-nowrap">{new Date(ticket.maintenanceDate).toLocaleDateString("id-ID")}</td>
                <td className="text-right">
                  <div className="flex flex-col items-end gap-1">
                    {canManage && editingId === ticket.id ? (
                      <div className="flex gap-1">
                        <Button className="text-xs px-2 py-1" disabled={busyId === ticket.id} onClick={saveEdit}>{t("maintenance.save", "Simpan")}</Button>
                        <Button variant="ghost" className="text-xs px-2 py-1" onClick={() => { setEditingId(null); setEditForm(null); }}>{t("maintenance.cancel", "Batal")}</Button>
                      </div>
                    ) : (
                      <>
                        {canManage && ticket.status === "queued" && (
                          <Button variant="secondary" className="text-xs px-2 py-1 gap-1" disabled={busyId === ticket.id} onClick={() => advanceStatus(ticket, "in_progress")}>
                            <PlayCircle size={12} /> {t("maintenance.startProcess", "Mulai Proses")}
                          </Button>
                        )}
                        {canManage && ticket.status === "in_progress" && (
                          <Button variant="secondary" className="text-xs px-2 py-1 gap-1" disabled={busyId === ticket.id} onClick={() => advanceStatus(ticket, "done")}>
                            <CheckCircle2 size={12} /> {t("maintenance.markDone", "Tandai Selesai")}
                          </Button>
                        )}
                        {canManage && (
                          <div className="flex gap-1">
                            <Button variant="ghost" className="text-xs px-2 py-1 gap-1" onClick={() => startEdit(ticket)}><Pencil size={12} /> {t("maintenance.edit", "Edit")}</Button>
                            <Button variant="ghost" className="text-xs px-2 py-1 gap-1 text-red-400" disabled={busyId === ticket.id} onClick={() => removeTicket(ticket)}><Trash2 size={12} /> {t("maintenance.delete", "Hapus")}</Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visibleTickets.length === 0 && <div className="text-sm text-neutral-500 py-4 text-center">{t("maintenance.noTickets", "Belum ada tiket maintenance.")}</div>}
      </Card>
    </div>
  );
}
