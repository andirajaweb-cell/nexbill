"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { roleLabel, hasPermission, StaffRole, Permission, PERMISSION_GROUPS, PERMISSION_LABEL } from "@/lib/auth/permissions";
import { useAuth, isSuperRole } from "@/lib/auth/client";
import { fetchJsonArray, fetchJsonObject } from "@/lib/api/fetch-json";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import "@/lib/i18n/dict-staff";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;
const ROLES: StaffRole[] = ["superuser", "owner", "manager", "cashier", "accountant", "kitchen", "supervisor"];
// "superuser" is reserved — never selectable/assignable from this outlet-facing page (server
// enforces this too, see /api/staff and /api/staff/[id]). "owner" is the self-service top role
// a merchant picks for full control of its own outlet.
const ASSIGNABLE_ROLES: StaffRole[] = ROLES.filter((r) => r !== "superuser");

interface MatrixCell { role: StaffRole; permission: Permission; granted: boolean }

export default function StaffPage() {
  const { t } = useDashboardLang();
  const { user } = useAuth();
  const [outletId, setOutletId] = useState<string | null>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [tab, setTab] = useState<"staff" | "approvals" | "audit" | "roles">("staff");

  const [newStaff, setNewStaff] = useState({ name: "", email: "", password: "", role: "cashier" as StaffRole });
  const [voidOrderId, setVoidOrderId] = useState("");
  const [voidReason, setVoidReason] = useState("");
  const [voidMsg, setVoidMsg] = useState("");

  const [matrix, setMatrix] = useState<MatrixCell[] | null>(null);
  const [matrixMsg, setMatrixMsg] = useState("");
  const [matrixBusyKey, setMatrixBusyKey] = useState<string | null>(null);

  const meId = user?.id ?? "";
  const myRole: StaffRole = (user?.role ?? "cashier") as StaffRole;

  const load = (oid: string) => {
    fetchJsonArray(`/api/staff?outletId=${oid}`).then(setStaff);
    fetchJsonArray(`/api/approvals?outletId=${oid}`).then(setApprovals);
    fetchJsonArray(`/api/audit-logs?outletId=${oid}`).then(setAudit);
  };

  useEffect(() => {
    fetchJsonObject<{ id: string }>("/api/outlets/default").then((o) => { if (o) { setOutletId(o.id); load(o.id); } });
  }, []);

  const loadMatrix = () => {
    fetch("/api/role-permissions")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setMatrixMsg(data.error ?? t("staff.matrix.loadError", "Gagal memuat matriks izin.")); return; }
        setMatrix(data.matrix as MatrixCell[]);
      })
      .catch(() => setMatrixMsg(t("staff.matrix.loadError", "Gagal memuat matriks izin.")));
  };

  useEffect(() => {
    if (tab === "roles" && matrix === null) loadMatrix();
  }, [tab, matrix]);

  const isCellGranted = (role: StaffRole, permission: Permission) =>
    matrix?.find((c) => c.role === role && c.permission === permission)?.granted ?? false;

  const toggleCell = async (role: StaffRole, permission: Permission) => {
    const key = `${role}:${permission}`;
    const granted = !isCellGranted(role, permission);
    setMatrixBusyKey(key);
    setMatrixMsg("");
    // optimistic update
    setMatrix((prev) => prev?.map((c) => (c.role === role && c.permission === permission ? { ...c, granted } : c)) ?? prev);
    const res = await fetch("/api/role-permissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, permission, granted }),
    });
    const data = await res.json();
    setMatrixBusyKey(null);
    if (!res.ok) {
      // revert on failure (e.g. blocked because it would lock superuser out of manage_staff)
      setMatrix((prev) => prev?.map((c) => (c.role === role && c.permission === permission ? { ...c, granted: !granted } : c)) ?? prev);
      setMatrixMsg(data.error ?? t("staff.matrix.toggleError", "Gagal mengubah izin."));
    }
  };

  const resetRole = async (role: StaffRole) => {
    if (!await showConfirm(t("staff.confirm.resetRole", 'Kembalikan izin role "{role}" ke pengaturan bawaan aplikasi?').replace("{role}", roleLabel(role)))) return;
    setMatrixMsg("");
    const res = await fetch("/api/role-permissions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (!res.ok) return setMatrixMsg(data.error ?? t("staff.matrix.resetError", "Gagal reset."));
    loadMatrix();
  };

  const createStaff = async () => {
    if (!outletId) return;
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outletId, ...newStaff, actorStaffUserId: meId }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setNewStaff({ name: "", email: "", password: "", role: "cashier" });
    load(outletId);
  };

  const toggleActive = async (s: any) => {
    await fetch(`/api/staff/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !s.isActive, actorStaffUserId: meId }),
    });
    if (outletId) load(outletId);
  };

  const deleteStaff = async (s: any) => {
    if (s.id === meId) return showAlert(t("staff.alert.cannotDeleteSelf", "Tidak bisa menghapus akun sendiri yang sedang login."));
    if (!await showConfirm(t("staff.confirm.deleteStaff", 'Hapus staf "{name}"? Data histori (order, jurnal) tetap tersimpan.').replace("{name}", s.name))) return;
    const res = await fetch(`/api/admin/staff/${s.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    if (outletId) load(outletId);
  };

  const changeRole = async (s: any, role: string) => {
    await fetch(`/api/staff/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, actorStaffUserId: meId }),
    });
    if (outletId) load(outletId);
  };

  const submitVoidRequest = async () => {
    setVoidMsg("");
    const res = await fetch(`/api/orders/${voidOrderId}/void-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffUserId: meId, role: myRole, reason: voidReason }),
    });
    const data = await res.json();
    if (!res.ok) return setVoidMsg(`${t("staff.void.failedPrefix", "Gagal: ")}${data.error}`);
    setVoidMsg(data.pending ? t("staff.void.pendingMsg", "Permintaan void dikirim, menunggu persetujuan owner/manager.") : t("staff.void.successMsg", "Order berhasil dibatalkan langsung (jurnal & stok sudah disesuaikan)."));
    setVoidOrderId("");
    setVoidReason("");
    if (outletId) load(outletId);
  };

  const decide = async (id: string, action: "approve" | "reject") => {
    const res = await fetch(`/api/approvals/${id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewerId: meId }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    if (outletId) load(outletId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold gm-gradient-title">{t("staff.title", "Staf & Hak Akses (RBAC)")}</h1>
        <p className="text-sm text-neutral-500">{t("staff.subtitle", "Kelola staf, role, permintaan void/refund yang butuh approval, dan jejak audit.")}</p>
      </div>

      <div className="flex gap-2 border-b border-neutral-800">
        {(isSuperRole(myRole) ? (["staff", "approvals", "audit", "roles"] as const) : (["staff", "approvals", "audit"] as const)).map((tabKey) => {
          const pendingCount = approvals.filter((a) => a.status === "pending").length;
          const label =
            tabKey === "staff" ? t("staff.tabs.staffList", "Daftar Staf")
            : tabKey === "approvals" ? `${t("staff.tabs.approvals", "Approval")}${pendingCount ? ` (${pendingCount})` : ""}`
            : tabKey === "audit" ? t("staff.tabs.audit", "Audit Log")
            : t("staff.tabs.roles", "Role & Izin");
          return (
            <button key={tabKey} onClick={() => setTab(tabKey)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${tab === tabKey ? "border-emerald-400 text-emerald-400" : "border-transparent text-neutral-500 hover:text-neutral-200"}`}>
              {label}
            </button>
          );
        })}
      </div>

      {tab === "staff" && (
        <>
          {hasPermission(myRole, "manage_staff") ? (
            <Card>
              <h2 className="font-medium mb-3">{t("staff.addStaff.title", "Tambah Staf")}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("staff.addStaff.namePlaceholder", "Nama")} value={newStaff.name} onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} />
                <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("staff.addStaff.emailPlaceholder", "Email")} value={newStaff.email} onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} />
                <PasswordInput wrapperClassName="w-full" className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("staff.addStaff.passwordPlaceholder", "Password")} value={newStaff.password} onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })} />
                <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={newStaff.role} onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value as StaffRole })}>
                  {ASSIGNABLE_ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                </select>
                <Button onClick={createStaff}>{t("staff.addStaff.addBtn", "Tambah")}</Button>
              </div>
            </Card>
          ) : (
            <div className="text-xs text-neutral-500 italic">{t("staff.addStaff.noPermission", "Role kamu ({role}) tidak punya izin menambah staf.").replace("{role}", roleLabel(myRole))}</div>
          )}

          <Card>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-neutral-500 border-b border-neutral-800"><th className="py-2">{t("staff.table.name", "Nama")}</th><th>{t("staff.table.email", "Email")}</th><th>{t("staff.table.role", "Role")}</th><th>{t("staff.table.status", "Status")}</th><th></th></tr></thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id} className="border-b border-neutral-900">
                    <td className="py-2">{s.name}</td>
                    <td className="text-neutral-400">{s.email}</td>
                    <td>
                      {hasPermission(myRole, "manage_staff") ? (
                        <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs" value={s.role} onChange={(e) => changeRole(s, e.target.value)}>
                          {/* Legacy Superuser accounts keep showing their real role so the select isn't forced onto a wrong value —
                              it's not a real option to switch TO though (disabled), matching the server-side block on promoting to superuser. */}
                          {s.role === "superuser" && <option value="superuser" disabled>{t("staff.table.superuserReserved", "Superuser (reserved)")}</option>}
                          {ASSIGNABLE_ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                        </select>
                      ) : roleLabel(s.role)}
                    </td>
                    <td><Badge status={s.isActive ? "available" : "maintenance"}>{s.isActive ? t("staff.status.active", "Aktif") : t("staff.status.inactive", "Nonaktif")}</Badge></td>
                    <td className="text-right space-x-1">
                      {hasPermission(myRole, "manage_staff") && (
                        <Button variant="ghost" onClick={() => toggleActive(s)}>{s.isActive ? t("staff.action.deactivate", "Nonaktifkan") : t("staff.action.activate", "Aktifkan")}</Button>
                      )}
                      {hasPermission(myRole, "manage_admin_data") && (
                        <Button variant="ghost" className="text-red-400" onClick={() => deleteStaff(s)}>{t("staff.action.delete", "Hapus")}</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {tab === "approvals" && (
        <>
          <Card>
            <h2 className="font-medium mb-3">{t("staff.void.title", "Ajukan Void / Batalkan Order")}</h2>
            <p className="text-xs text-neutral-500 mb-3">
              {hasPermission(myRole, "void_order_direct")
                ? t("staff.void.directPermissionNote", "Role kamu bisa void langsung tanpa approval.")
                : t("staff.void.needApprovalNote", "Role kamu perlu persetujuan owner/manager sebelum order dibatalkan.")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm sm:col-span-2" placeholder={t("staff.void.orderIdPlaceholder", "ID Order yang mau dibatalkan")} value={voidOrderId} onChange={(e) => setVoidOrderId(e.target.value)} />
              <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("staff.void.reasonPlaceholder", "Alasan")} value={voidReason} onChange={(e) => setVoidReason(e.target.value)} />
              <Button variant="danger" onClick={submitVoidRequest} disabled={!voidOrderId}>{t("staff.void.submitBtn", "Ajukan Void")}</Button>
            </div>
            {voidMsg && <div className="text-xs mt-2 text-amber-400">{voidMsg}</div>}
          </Card>

          <Card>
            <h2 className="font-medium mb-3">{t("staff.approvalsList.title", "Daftar Permintaan")}</h2>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-neutral-500 border-b border-neutral-800"><th className="py-2">{t("staff.approvalsList.type", "Tipe")}</th><th>{t("staff.approvalsList.ref", "Referensi")}</th><th>{t("staff.approvalsList.requestedBy", "Diajukan Oleh")}</th><th>{t("staff.approvalsList.reason", "Alasan")}</th><th>{t("staff.approvalsList.status", "Status")}</th><th></th></tr></thead>
              <tbody>
                {approvals.map((a) => (
                  <tr key={a.id} className="border-b border-neutral-900">
                    <td className="py-2">{a.type}</td>
                    <td>{a.refLabel}</td>
                    <td>{a.requesterName}</td>
                    <td className="text-neutral-400">{a.reason}</td>
                    <td><Badge status={a.status === "approved" ? "success" : a.status === "rejected" ? "failed" : "pending"}>{a.status}</Badge></td>
                    <td className="text-right space-x-1">
                      {a.status === "pending" && hasPermission(myRole, "approve_requests") && (
                        <>
                          <Button variant="secondary" onClick={() => decide(a.id, "approve")}>{t("staff.approvalsList.approveBtn", "Setujui")}</Button>
                          <Button variant="ghost" onClick={() => decide(a.id, "reject")}>{t("staff.approvalsList.rejectBtn", "Tolak")}</Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {tab === "audit" && (
        <Card>
          <h2 className="font-medium mb-3">{t("staff.audit.title", "Jejak Audit (Audit Log)")}</h2>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-neutral-500 border-b border-neutral-800"><th className="py-2">{t("staff.audit.time", "Waktu")}</th><th>{t("staff.audit.action", "Aksi")}</th><th>{t("staff.audit.entity", "Entitas")}</th><th>{t("staff.audit.detail", "Detail")}</th></tr></thead>
            <tbody>
              {audit.map((a) => (
                <tr key={a.id} className="border-b border-neutral-900">
                  <td className="py-2 whitespace-nowrap">{new Date(a.createdAt).toLocaleString("id-ID")}</td>
                  <td>{a.action}</td>
                  <td className="text-neutral-400">{a.entityType}{a.entityId ? ` #${String(a.entityId).slice(0, 8)}` : ""}</td>
                  <td className="text-xs text-neutral-500 max-w-xs truncate" title={a.afterData}>{a.afterData}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "roles" && (
        <Card>
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-medium">{t("staff.roles.title", "Checklist Izin per Role")}</h2>
          </div>
          <p className="text-xs text-neutral-500 mb-4">
            {t("staff.roles.description", 'Centang untuk memberi izin, hapus centang untuk mencabut. Perubahan berlaku langsung untuk seluruh staf dengan role tersebut. Superuser dan Owner tidak bisa kehilangan izin "Kelola Staf & Role" agar tidak ada yang terkunci dari halaman ini.')}
          </p>
          {matrixMsg && <div className="text-xs mb-3 text-amber-400">{matrixMsg}</div>}

          {!matrix ? (
            <div className="text-sm text-neutral-500">{t("staff.roles.loading", "Memuat matriks izin…")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="text-sm border-collapse">
                <thead>
                  <tr className="text-left text-neutral-500 border-b border-neutral-800">
                    <th className="py-2 pr-4 sticky left-0 bg-neutral-950">{t("staff.roles.permissionCol", "Izin")}</th>
                    {ROLES.map((r) => (
                      <th key={r} className="px-3 py-2 text-center whitespace-nowrap">
                        <div>{roleLabel(r)}</div>
                        <button onClick={() => resetRole(r)} className="text-[10px] font-normal text-neutral-500 hover:text-emerald-400 underline underline-offset-2">
                          {t("staff.roles.resetBtn", "reset")}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_GROUPS.map((group) => (
                    <FragmentGroup key={group.group} groupLabel={group.group} colSpan={ROLES.length + 1}>
                      {group.permissions.map((permission) => (
                        <tr key={permission} className="border-b border-neutral-900">
                          <td className="py-2 pr-4 sticky left-0 bg-neutral-950 text-neutral-300">{PERMISSION_LABEL[permission]}</td>
                          {ROLES.map((role) => {
                            const key = `${role}:${permission}`;
                            const locked = role === "superuser" && permission === "manage_staff";
                            return (
                              <td key={key} className="px-3 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={isCellGranted(role, permission)}
                                  disabled={locked || matrixBusyKey === key}
                                  title={locked ? t("staff.roles.lockedTitle", "Wajib aktif agar Superuser tidak terkunci dari halaman ini.") : undefined}
                                  onChange={() => toggleCell(role, permission)}
                                  className="h-4 w-4 accent-emerald-500 disabled:opacity-40"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </FragmentGroup>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

/** Renders a group-header row followed by its children rows — kept as a tiny local component so PERMISSION_GROUPS can render as flat <tbody> rows (required for a <table>) while still visually separating groups. */
function FragmentGroup({ groupLabel, colSpan, children }: { groupLabel: string; colSpan: number; children: React.ReactNode }) {
  return (
    <>
      <tr>
        <td colSpan={colSpan} className="pt-4 pb-1 text-xs font-semibold text-neutral-500 uppercase tracking-wide sticky left-0 bg-neutral-950">
          {groupLabel}
        </td>
      </tr>
      {children}
    </>
  );
}
