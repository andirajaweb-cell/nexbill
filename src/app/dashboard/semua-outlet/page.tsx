"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { fetchJsonObject } from "@/lib/api/fetch-json";
import { useAuth, isSuperRole } from "@/lib/auth/client";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { Building2, Gamepad2, TrendingUp, Pencil, ArchiveRestore, Archive, Plus, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import "@/lib/i18n/dict-semua-outlet";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;
const inputCls = "w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm disabled:opacity-60";

const STATUS_BADGE: Record<string, string> = {
  active: "success",
  grace: "pending",
  trial: "pending",
  trial_expired: "failed",
  suspended: "failed",
  cancelled: "failed",
  pending_payment: "pending",
};
const STATUS_LABEL_META: Record<string, { key: string; fallback: string }> = {
  active: { key: "semuaOutlet.status.active", fallback: "Aktif" },
  grace: { key: "semuaOutlet.status.grace", fallback: "Tenggang" },
  trial: { key: "semuaOutlet.status.trial", fallback: "Trial" },
  trial_expired: { key: "semuaOutlet.status.trialExpired", fallback: "Trial Habis" },
  suspended: { key: "semuaOutlet.status.suspended", fallback: "Suspend" },
  cancelled: { key: "semuaOutlet.status.cancelled", fallback: "Batal" },
  pending_payment: { key: "semuaOutlet.status.pendingPayment", fallback: "Menunggu Bayar" },
};

interface OutletRow {
  id: string;
  name: string;
  slug: string | null;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  isHome: boolean;
  logoUrl: string | null;
  omzetToday: number;
  units: { total: number; available: number; occupied: number; maintenance: number };
  subscriptionStatus: string;
  billingGroupId: string | null;
}

interface EditForm {
  name: string;
  address: string;
  phone: string;
}

/**
 * Cross-outlet summary AND branch management hub for accounts linked to more than one outlet
 * (see outletMemberships in schema.ts) — Sidebar/TopBar only surface the link to this page when
 * user.linkedOutlets.length > 1, but the page itself also handles a single-outlet account
 * landing here directly (e.g. a bookmarked URL) by just showing the one outlet.
 *
 * Add/Edit/Nonaktifkan (archive) are Owner/Superuser-only — the same two full-authority roles
 * gated on branch creation (see POST /api/outlets) and on Reset Data. Everyone else linked to
 * multiple outlets still gets the read-only performance summary + switch button.
 *
 * "Nonaktifkan" is a soft-delete (isActive flag, see outlets.isActive in schema.ts) — never a
 * real DELETE. Historical data (transactions, staff, reports) under an outlet is never erased
 * just for archiving it; an archived outlet can always be reactivated later.
 */
export default function SemuaOutletPage() {
  const { t } = useDashboardLang();
  const { user } = useAuth();
  const canManage = user?.role === "owner" || user?.role === "superuser";
  const canHardDelete = isSuperRole(user?.role);
  const [data, setData] = useState<{ outlets: OutletRow[]; totalOmzetToday: number } | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<EditForm>({ name: "", address: "", phone: "" });
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: "", address: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Permanent delete — only offered on ARCHIVED outlets (nonaktifkan dulu, baru bisa dihapus
  // tuntas), superuser-only, requires typing the outlet's exact name + password. See
  // /api/outlets/[id]/delete-permanent + lib/admin/delete-outlet.ts for what actually happens.
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const load = () => fetchJsonObject<{ outlets: OutletRow[]; totalOmzetToday: number }>("/api/dashboard/all-outlets").then(setData);
  useEffect(() => { load(); }, []);

  const openOutlet = async (outletId: string) => {
    setSwitching(outletId);
    try {
      const res = await fetch("/api/session/switch-outlet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outletId }),
      });
      if (res.ok) {
        window.location.href = "/dashboard";
      } else {
        setSwitching(null);
      }
    } catch {
      setSwitching(null);
    }
  };

  const createOutlet = async () => {
    if (!addForm.name.trim()) return showAlert(t("semuaOutlet.branchNameRequired", "Nama cabang wajib diisi."));
    setAdding(true);
    try {
      const res = await fetch("/api/outlets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(addForm) });
      const out = await res.json();
      if (!res.ok) return showAlert(out.error);
      setAddForm({ name: "", address: "", phone: "" });
      setShowAddForm(false);
      load();
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (o: OutletRow) => {
    setEditingId(o.id);
    setEditForm({ name: o.name, address: o.address ?? "", phone: o.phone ?? "" });
  };

  const saveEdit = async (id: string) => {
    if (!editForm.name.trim()) return showAlert(t("semuaOutlet.branchNameRequired", "Nama cabang wajib diisi."));
    setSaving(true);
    try {
      const res = await fetch(`/api/outlets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const out = await res.json();
      if (!res.ok) return showAlert(out.error);
      setEditingId(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (o: OutletRow) => {
    const goingInactive = o.isActive;
    const msg = goingInactive
      ? t("semuaOutlet.confirmDeactivate", `Nonaktifkan "{name}"? Outlet ini akan disembunyikan & tidak bisa dipakai transaksi baru — data historisnya tetap aman dan bisa diaktifkan lagi kapan saja.`).replace("{name}", o.name)
      : t("semuaOutlet.confirmReactivate", `Aktifkan kembali "{name}"?`).replace("{name}", o.name);
    if (!(await showConfirm(msg))) return;
    setBusyId(o.id);
    try {
      const res = await fetch(`/api/outlets/${o.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !goingInactive }),
      });
      const out = await res.json();
      if (!res.ok) return showAlert(out.error);
      load();
    } finally {
      setBusyId(null);
    }
  };

  const startDelete = (o: OutletRow) => {
    setDeletingId(o.id);
    setDeleteConfirmName("");
    setDeletePassword("");
  };
  const cancelDelete = () => { setDeletingId(null); setDeleteConfirmName(""); setDeletePassword(""); };

  const submitDelete = async (o: OutletRow) => {
    if (deleteConfirmName.trim() !== o.name) return showAlert(t("semuaOutlet.retypeExactName", `Ketik ulang persis nama outlet: "{name}"`).replace("{name}", o.name));
    if (!deletePassword) return showAlert(t("semuaOutlet.enterYourPassword", "Masukkan password kamu."));
    if (!(await showConfirm(
      t("semuaOutlet.confirmPermanentDelete", `Ini akan MENGHAPUS PERMANEN outlet "{name}" — semua data, staf, dan riwayatnya hilang total, tidak bisa dikembalikan lewat aplikasi. Yakin lanjut?`).replace("{name}", o.name),
      { tone: "danger" }
    ))) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/outlets/${o.id}/delete-permanent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmName: deleteConfirmName.trim(), password: deletePassword }),
      });
      const out = await res.json();
      if (!res.ok) return showAlert(out.error);
      cancelDelete();
      await showAlert(t("semuaOutlet.deletedPermanently", `Outlet "{name}" sudah dihapus permanen.`).replace("{name}", o.name));
      load();
    } finally {
      setDeleting(false);
    }
  };

  // Archived outlets never show in the normal dashboard view — total omzet, the grid, and the
  // switch-outlet dropdown everywhere else all only ever count/list active outlets. The reveal
  // toggle below is the sole exception, purely so a mis-archived branch isn't a permanent
  // dead-end: it's collapsed by default (nothing archived renders until explicitly opened).
  const activeOutlets = data?.outlets.filter((o) => o.isActive) ?? [];
  const archivedOutlets = data?.outlets.filter((o) => !o.isActive) ?? [];
  const totalOmzetActive = activeOutlets.reduce((sum, o) => sum + o.omzetToday, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("semuaOutlet.title", "Ringkasan Semua Outlet")}
        subtitle={t("semuaOutlet.subtitle", "Performa tiap cabang yang terhubung ke akun Anda, berdampingan.")}
        actions={canManage && data && (
          <Button variant="secondary" onClick={() => setShowAddForm((v) => !v)}>
            <span className="flex items-center gap-1.5"><Plus size={14} /> {t("semuaOutlet.addOutlet", "Tambah Outlet")}</span>
          </Button>
        )}
      />

      {canManage && showAddForm && (
        <Card className="space-y-3">
          <h2 className="font-medium">{t("semuaOutlet.addNewTitle", "Tambah Outlet/Cabang Baru")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input className={inputCls} placeholder={t("semuaOutlet.branchName", "Nama Cabang")} value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} />
            <input className={inputCls} placeholder={t("semuaOutlet.addressOptional", "Alamat (opsional)")} value={addForm.address} onChange={(e) => setAddForm({ ...addForm, address: e.target.value })} />
            <input className={inputCls} placeholder={t("semuaOutlet.phoneOptional", "Telepon (opsional)")} value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button onClick={createOutlet} disabled={adding}>{adding ? t("semuaOutlet.adding", "Menambahkan...") : t("semuaOutlet.addOutletBtn", "Tambah Outlet")}</Button>
            <Button variant="ghost" onClick={() => setShowAddForm(false)}>{t("semuaOutlet.cancel", "Batal")}</Button>
          </div>
        </Card>
      )}

      {!data ? (
        <p className="text-sm text-neutral-500">{t("semuaOutlet.loading", "Memuat…")}</p>
      ) : data.outlets.length === 0 ? (
        <Card><p className="text-sm text-neutral-500">{t("semuaOutlet.noOutlets", "Belum ada outlet terhubung ke akun ini.")}</p></Card>
      ) : (
        <>
          <Card>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
                <TrendingUp size={18} />
              </div>
              <div>
                <div className="text-[11px] uppercase text-neutral-500">{t("semuaOutlet.totalOmzetToday", "Total Omzet Hari Ini ({n} outlet aktif)").replace("{n}", String(activeOutlets.length))}</div>
                <div className="gm-display text-xl font-bold text-emerald-300 mt-0.5">{rupiah(totalOmzetActive)}</div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeOutlets.map((o) => (
              <Card key={o.id}>
                {editingId === o.id ? (
                  <div className="space-y-2">
                    <input className={inputCls} placeholder={t("semuaOutlet.branchName", "Nama Cabang")} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                    <input className={inputCls} placeholder={t("semuaOutlet.addressOptional", "Alamat (opsional)")} value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
                    <input className={inputCls} placeholder={t("semuaOutlet.phoneOptional", "Telepon (opsional)")} value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                    <div className="flex gap-2">
                      <Button className="text-xs px-2 py-1" onClick={() => saveEdit(o.id)} disabled={saving}>{saving ? t("semuaOutlet.saving", "Menyimpan...") : t("semuaOutlet.save", "Simpan")}</Button>
                      <Button variant="ghost" className="text-xs px-2 py-1" onClick={() => setEditingId(null)}>{t("semuaOutlet.cancel", "Batal")}</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-300">
                          <Building2 size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-neutral-100 truncate">{o.name}</div>
                          {o.isHome && <div className="text-[10px] text-neutral-500">{t("semuaOutlet.mainOutlet", "Outlet utama")}</div>}
                          {o.address && <div className="text-[10px] text-neutral-600 truncate">{o.address}{o.phone ? ` · ${o.phone}` : ""}</div>}
                        </div>
                      </div>
                      <Badge status={STATUS_BADGE[o.subscriptionStatus] ?? "unknown"}>
                        {STATUS_LABEL_META[o.subscriptionStatus] ? t(STATUS_LABEL_META[o.subscriptionStatus].key, STATUS_LABEL_META[o.subscriptionStatus].fallback) : o.subscriptionStatus}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="rounded-lg border border-white/10 p-2.5">
                        <div className="text-[10px] text-neutral-500">{t("semuaOutlet.omzetToday", "Omzet Hari Ini")}</div>
                        <div className="text-sm font-semibold text-emerald-300 mt-0.5">{rupiah(o.omzetToday)}</div>
                      </div>
                      <div className="rounded-lg border border-white/10 p-2.5">
                        <div className="text-[10px] text-neutral-500 flex items-center gap-1"><Gamepad2 size={10} /> {t("semuaOutlet.unitPs", "Unit PS")}</div>
                        <div className="text-sm font-semibold text-neutral-100 mt-0.5">
                          {t("semuaOutlet.availableOfTotal", "{available} tersedia / {total} total").replace("{available}", String(o.units.available)).replace("{total}", String(o.units.total))}
                          {o.units.occupied > 0 && <span className="text-amber-300"> · {o.units.occupied} {t("semuaOutlet.playing", "main")}</span>}
                        </div>
                      </div>
                    </div>

                    {o.billingGroupId && (
                      <div className="text-[11px] text-neutral-500 mb-3">{t("semuaOutlet.billedTogether", "Ditagih bersama dalam satu invoice grup.")}</div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => openOutlet(o.id)}
                        disabled={switching === o.id}
                        className="flex-1 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20 transition disabled:opacity-60"
                      >
                        {switching === o.id ? t("semuaOutlet.opening", "Membuka…") : t("semuaOutlet.openDashboard", "Buka Dashboard Outlet Ini →")}
                      </button>
                      {canManage && (
                        <>
                          <button
                            onClick={() => startEdit(o)}
                            title={t("semuaOutlet.editOutletTitle", "Edit outlet")}
                            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-neutral-300 hover:border-cyan-400/30 hover:text-cyan-300 transition"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => toggleActive(o)}
                            disabled={busyId === o.id}
                            title={t("semuaOutlet.deactivateOutletTitle", "Nonaktifkan outlet")}
                            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-2 text-xs text-rose-300 hover:bg-rose-500/20 transition disabled:opacity-60"
                          >
                            <Archive size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </Card>
            ))}
          </div>

          {canManage && archivedOutlets.length > 0 && (
            <div className="pt-2">
              <button
                onClick={() => setShowArchived((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition"
              >
                {showArchived ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {showArchived ? t("semuaOutlet.hide", "Sembunyikan") : t("semuaOutlet.view", "Lihat")} {t("semuaOutlet.deactivatedOutletsCount", "outlet dinonaktifkan ({n})").replace("{n}", String(archivedOutlets.length))}
              </button>
            </div>
          )}

          {canManage && showArchived && archivedOutlets.length > 0 && (
            <>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mt-2">{t("semuaOutlet.archivedOutletsHeading", "Outlet Dinonaktifkan (Arsip)")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {archivedOutlets.map((o) => (
                  <Card key={o.id} className="opacity-60">
                    {editingId === o.id ? (
                      <div className="space-y-2">
                        <input className={inputCls} placeholder={t("semuaOutlet.branchName", "Nama Cabang")} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                        <input className={inputCls} placeholder={t("semuaOutlet.addressOptional", "Alamat (opsional)")} value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
                        <input className={inputCls} placeholder={t("semuaOutlet.phoneOptional", "Telepon (opsional)")} value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                        <div className="flex gap-2">
                          <Button className="text-xs px-2 py-1" onClick={() => saveEdit(o.id)} disabled={saving}>{saving ? t("semuaOutlet.saving", "Menyimpan...") : t("semuaOutlet.save", "Simpan")}</Button>
                          <Button variant="ghost" className="text-xs px-2 py-1" onClick={() => setEditingId(null)}>{t("semuaOutlet.cancel", "Batal")}</Button>
                        </div>
                      </div>
                    ) : deletingId === o.id ? (
                      <div className="space-y-2">
                        <div className="text-xs text-rose-400 font-medium">{t("semuaOutlet.deletePermanentHeading", `Hapus Permanen "{name}" — tidak bisa dibatalkan.`).replace("{name}", o.name)}</div>
                        <label className="space-y-1 block">
                          <div className="text-[10px] text-neutral-500">{t("semuaOutlet.typeExactName", "Ketik persis nama outlet:")} <span className="font-mono text-rose-400">{o.name}</span></div>
                          <input className={inputCls} value={deleteConfirmName} onChange={(e) => setDeleteConfirmName(e.target.value)} placeholder={o.name} />
                        </label>
                        <label className="space-y-1 block">
                          <div className="text-[10px] text-neutral-500">{t("semuaOutlet.yourPasswordConfirm", "Password kamu (konfirmasi ulang)")}</div>
                          <PasswordInput className={inputCls} value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
                        </label>
                        <div className="flex gap-2">
                          <Button
                            variant="danger"
                            className="text-xs px-2 py-1"
                            disabled={deleteConfirmName.trim() !== o.name || !deletePassword || deleting}
                            onClick={() => submitDelete(o)}
                          >
                            {deleting ? t("semuaOutlet.deleting", "Menghapus...") : t("semuaOutlet.deletePermanentNow", "Hapus Permanen Sekarang")}
                          </Button>
                          <Button variant="ghost" className="text-xs px-2 py-1" onClick={cancelDelete}>{t("semuaOutlet.cancel", "Batal")}</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5 min-w-0 mb-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-700/40 text-neutral-400">
                            <Building2 size={16} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-neutral-300 truncate">{o.name}</div>
                            <div className="text-[10px] text-rose-400">{t("semuaOutlet.inactive", "Nonaktif")}</div>
                          </div>
                        </div>
                        {canManage && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleActive(o)}
                              disabled={busyId === o.id}
                              className="flex-1 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 transition disabled:opacity-60 flex items-center justify-center gap-1.5"
                            >
                              <ArchiveRestore size={13} /> {busyId === o.id ? t("semuaOutlet.processing", "Memproses…") : t("semuaOutlet.reactivate", "Aktifkan Kembali")}
                            </button>
                            <button
                              onClick={() => startEdit(o)}
                              title={t("semuaOutlet.editOutletTitle", "Edit outlet")}
                              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-neutral-300 hover:border-cyan-400/30 hover:text-cyan-300 transition"
                            >
                              <Pencil size={13} />
                            </button>
                            {canHardDelete && (
                              <button
                                onClick={() => startDelete(o)}
                                title={t("semuaOutlet.deletePermanentTitle", "Hapus permanen")}
                                className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-2 text-xs text-rose-300 hover:bg-rose-500/20 transition"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
