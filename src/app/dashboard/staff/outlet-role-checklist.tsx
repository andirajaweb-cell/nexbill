"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ShieldCheck, RotateCcw, Lock, AlertTriangle, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { showConfirm } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { roleLabel, PERMISSION_GROUPS, PERMISSION_LABEL, PERMISSION_LABEL_KEY, SENSITIVE_PERMISSIONS, type Permission, type StaffRole } from "@/lib/auth/permissions";
import "@/lib/i18n/dict-staff-outlet-roles";

interface Cell {
  role: StaffRole;
  permission: Permission;
  granted: boolean;
  defaultGranted: boolean;
  customized: boolean;
  locked: boolean;
}
interface ChecklistResponse {
  canEdit: boolean;
  roles: StaffRole[];
  cells: Cell[];
  staffByRole: Record<string, string[]>;
}

/**
 * Checklist izin karyawan yang dibuat Owner untuk outletnya sendiri (Staf › Role & Izin).
 * Pilih role → centang apa saja yang boleh dilakukan. Hanya berlaku di outlet yang sedang aktif;
 * bawaan NEXBILL tetap jadi titik awal dan bisa dikembalikan kapan saja.
 */
export function OutletRoleChecklist() {
  const { t } = useDashboardLang();
  const [data, setData] = useState<ChecklistResponse | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [role, setRole] = useState<StaffRole>("cashier");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/outlet-role-permissions");
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return setError(body.error ?? t("staff.outletRoles.loadError", "Gagal memuat checklist izin."));
      setError("");
      setData(body as ChecklistResponse);
    } catch {
      setError(t("staff.outletRoles.loadError", "Gagal memuat checklist izin."));
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const cellsOf = useCallback((r: StaffRole) => data?.cells.filter((c) => c.role === r) ?? [], [data]);
  const current = useMemo(() => new Map(cellsOf(role).map((c) => [c.permission, c])), [cellsOf, role]);
  const anyCustomized = !!data?.cells.some((c) => c.customized);
  const roleCustomized = cellsOf(role).some((c) => c.customized);

  const toggle = async (cell: Cell) => {
    if (!data?.canEdit || cell.locked) return;
    const granted = !cell.granted;
    if (granted && SENSITIVE_PERMISSIONS.includes(cell.permission)) {
      const ok = await showConfirm(
        t("staff.outletRoles.sensitiveConfirm", 'Izin "{perm}" berisiko tinggi. Yakin memberikannya ke semua {role} di outlet ini? Semua pemakaiannya tetap tercatat di Audit Log.')
          .replace("{perm}", t(PERMISSION_LABEL_KEY[cell.permission], PERMISSION_LABEL[cell.permission]))
          .replace("{role}", roleLabel(cell.role, t))
      );
      if (!ok) return;
    }
    const key = `${cell.role}:${cell.permission}`;
    setBusy(key);
    setMsg("");
    const patch = (g: boolean) =>
      setData((prev) =>
        prev
          ? {
              ...prev,
              cells: prev.cells.map((c) => (c.role === cell.role && c.permission === cell.permission ? { ...c, granted: g, customized: g !== c.defaultGranted } : c)),
            }
          : prev
      );
    patch(granted);
    try {
      const res = await fetch("/api/outlet-role-permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: cell.role, permission: cell.permission, granted }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        patch(!granted);
        setMsg(body.error ?? t("staff.outletRoles.saveError", "Gagal menyimpan perubahan."));
      }
    } catch {
      patch(!granted);
      setMsg(t("staff.outletRoles.saveError", "Gagal menyimpan perubahan."));
    } finally {
      setBusy(null);
    }
  };

  const reset = async (target?: StaffRole) => {
    const ok = await showConfirm(
      target
        ? t("staff.outletRoles.resetRoleConfirm", "Kembalikan semua izin {role} di outlet ini ke bawaan NEXBILL?").replace("{role}", roleLabel(target, t))
        : t("staff.outletRoles.resetAllConfirm", "Kembalikan izin SEMUA role di outlet ini ke bawaan NEXBILL?")
    );
    if (!ok) return;
    setBusy("reset");
    setMsg("");
    try {
      const res = await fetch("/api/outlet-role-permissions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(target ? { role: target } : {}),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setMsg(body.error ?? t("staff.outletRoles.saveError", "Gagal menyimpan perubahan."));
      await load();
    } finally {
      setBusy(null);
    }
  };

  if (error) return <Card className="text-sm text-amber-300">{error}</Card>;
  if (!data) return <Card className="text-sm text-neutral-500">{t("staff.outletRoles.loading", "Memuat checklist izin…")}</Card>;

  const people = data.staffByRole[role] ?? [];

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
            <ShieldCheck size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="font-medium">{t("staff.outletRoles.title", "Checklist izin karyawan outlet ini")}</h2>
            <p className="text-xs text-neutral-500">
              {t(
                "staff.outletRoles.desc",
                "Pilih role, lalu centang apa saja yang boleh dilakukan karyawan dengan role itu. Hanya berlaku di outlet ini — outlet lain tidak terpengaruh. Owner selalu memegang semua izin."
              )}
            </p>
          </div>
        </div>
        {data.canEdit && anyCustomized && (
          <Button variant="secondary" className="text-xs" disabled={busy === "reset"} onClick={() => reset()}>
            <span className="inline-flex items-center gap-1.5">
              <RotateCcw size={13} /> {t("staff.outletRoles.resetAll", "Kembalikan semua ke bawaan")}
            </span>
          </Button>
        )}
      </div>

      {!data.canEdit && (
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-neutral-400">
          {t("staff.outletRoles.readOnly", "Hanya Owner yang bisa mengubah checklist ini. Kamu bisa melihatnya saja.")}
        </div>
      )}

      <div className="flex flex-wrap gap-2" role="tablist">
        {data.roles.map((r) => {
          const cells = cellsOf(r);
          const count = cells.filter((c) => c.granted).length;
          const changed = cells.some((c) => c.customized);
          const active = r === role;
          return (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setRole(r)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                active ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200" : "border-white/10 bg-white/5 text-neutral-300 hover:border-white/20"
              }`}
            >
              {roleLabel(r, t)}
              <span className="rounded-full bg-black/30 px-1.5 text-[10px] text-neutral-300">{count}</span>
              {changed && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title={t("staff.outletRoles.changedDot", "Sudah diubah dari bawaan")} />}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-xs">
        <span className="inline-flex items-center gap-1.5 text-neutral-400">
          <Users size={13} />
          {people.length > 0
            ? t("staff.outletRoles.appliesTo", "Berlaku untuk: {names}").replace("{names}", people.join(", "))
            : t("staff.outletRoles.noStaff", "Belum ada karyawan aktif dengan role ini.")}
        </span>
        {data.canEdit && roleCustomized && (
          <button type="button" disabled={busy === "reset"} onClick={() => reset(role)} className="inline-flex items-center gap-1 text-neutral-400 underline underline-offset-2 hover:text-emerald-300">
            <RotateCcw size={12} /> {t("staff.outletRoles.resetRole", "Kembalikan {role} ke bawaan").replace("{role}", roleLabel(role, t))}
          </button>
        )}
      </div>

      {msg && <div className="text-xs text-amber-400">{msg}</div>}

      <div className="grid gap-3 lg:grid-cols-2">
        {PERMISSION_GROUPS.map((group) => (
          <div key={group.group} className="rounded-xl border border-neutral-800 p-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{t(group.groupKey, group.group)}</div>
            <ul className="space-y-1.5">
              {group.permissions.map((permission) => {
                const cell = current.get(permission);
                if (!cell) return null;
                const key = `${cell.role}:${cell.permission}`;
                const disabled = !data.canEdit || cell.locked || busy === key;
                return (
                  <li key={permission}>
                    <label className={`flex items-start gap-2 rounded-lg px-1.5 py-1 text-sm ${disabled ? "" : "cursor-pointer hover:bg-white/[0.03]"}`}>
                      <input
                        type="checkbox"
                        checked={cell.granted}
                        disabled={disabled}
                        onChange={() => toggle(cell)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500 disabled:opacity-40"
                      />
                      <span className="min-w-0">
                        <span className="text-neutral-200">{t(PERMISSION_LABEL_KEY[permission], PERMISSION_LABEL[permission])}</span>
                        <span className="ml-1 inline-flex flex-wrap gap-1 align-middle">
                          {cell.locked && (
                            <span className="inline-flex items-center gap-0.5 rounded border border-white/10 px-1 text-[10px] text-neutral-400">
                              <Lock size={10} /> {t("staff.outletRoles.ownerOnly", "Khusus Owner")}
                            </span>
                          )}
                          {!cell.locked && SENSITIVE_PERMISSIONS.includes(permission) && (
                            <span className="inline-flex items-center gap-0.5 rounded border border-rose-400/30 px-1 text-[10px] text-rose-300">
                              <AlertTriangle size={10} /> {t("staff.outletRoles.sensitive", "Sensitif")}
                            </span>
                          )}
                          {cell.customized && (
                            <span className="rounded border border-amber-400/40 bg-amber-500/10 px-1 text-[10px] text-amber-200">
                              {cell.defaultGranted
                                ? t("staff.outletRoles.changedOff", "Diubah · bawaan: boleh")
                                : t("staff.outletRoles.changedOn", "Diubah · bawaan: tidak")}
                            </span>
                          )}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-neutral-500">
        {t(
          "staff.outletRoles.footer",
          "Perubahan langsung dipakai untuk setiap aksi baru (paling lambat ±30 detik). Karyawan yang sedang login sebaiknya memuat ulang halaman agar menu ikut berubah. Setiap perubahan tercatat di Audit Log."
        )}
      </p>
    </Card>
  );
}
