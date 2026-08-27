"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { fetchJsonObject } from "@/lib/api/fetch-json";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { Pencil } from "lucide-react";

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;
const inputCls = "w-full rounded-lg bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm";
const STATUS_BADGE: Record<string, string> = { active: "success", grace: "pending", trial: "pending", trial_expired: "failed", suspended: "failed", cancelled: "failed", pending_payment: "pending" };
const STATUS_LABEL: Record<string, string> = { active: "Aktif", grace: "Tenggang", trial: "Trial", trial_expired: "Trial Habis", suspended: "Suspend", cancelled: "Batal", pending_payment: "Menunggu Bayar" };
const ROLE_LABEL: Record<string, string> = { superuser: "Superuser", owner: "Owner", manager: "Manager", cashier: "Kasir", accountant: "Akuntan", kitchen: "Dapur", supervisor: "Supervisor" };

interface Detail {
  outlet: { id: string; name: string; address: string | null; phone: string | null; createdAt: string; isActive: boolean };
  subscription: { status: string; trialEndsAt: string } | null;
  plan: { name: string; priceCurrent: number } | null;
  staff: { id: string; name: string; email: string; role: string; isActive: boolean }[];
  units: { id: string; name: string; status: string }[];
  unitStatusCounts: { available: number; occupied: number; booked: number; maintenance: number };
  omzet30d: number;
  transactionsCount30d: number;
  lifetimePaidToNexbill: number;
  unpaidToNexbill: number;
}

export default function PlatformOutletDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [data, setData] = useState<Detail | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", address: "", phone: "" });
  const [busy, setBusy] = useState(false);

  const load = () => {
    if (id) fetchJsonObject<Detail>(`/api/platform-admin/outlets/${id}`).then(setData);
  };
  useEffect(load, [id]);

  const startEdit = () => {
    if (!data) return;
    setEditForm({ name: data.outlet.name, address: data.outlet.address ?? "", phone: data.outlet.phone ?? "" });
    setEditing(true);
  };

  const saveEdit = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/platform-admin/outlets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editForm.name, address: editForm.address || null, phone: editForm.phone || null }),
      });
      const d = await res.json();
      if (!res.ok) { await showAlert(d.error ?? "Gagal menyimpan."); return; }
      setEditing(false);
      load();
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async () => {
    if (!data) return;
    const nextActive = !data.outlet.isActive;
    const ok = await showConfirm(
      nextActive
        ? `Aktifkan kembali outlet "${data.outlet.name}"?`
        : `Nonaktifkan (arsipkan) outlet "${data.outlet.name}"? Owner/staf outlet ini tidak akan bisa login selama nonaktif. Ini reversible — bisa diaktifkan lagi kapan saja.`,
      { tone: nextActive ? "default" : "danger" }
    );
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/platform-admin/outlets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });
      const d = await res.json();
      if (!res.ok) { await showAlert(d.error ?? "Gagal mengubah status."); return; }
      load();
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <p className="text-sm text-neutral-500">Memuat...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="min-w-0">
          <Link href="/platform-admin/outlets" className="text-xs text-neutral-500 hover:text-amber-300">&larr; Kembali ke Outlet</Link>
          {editing ? (
            <div className="mt-2 space-y-2 max-w-md">
              <input className={inputCls} value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nama outlet" />
              <input className={inputCls} value={editForm.address} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} placeholder="Alamat" />
              <input className={inputCls} value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} placeholder="No. Telepon" />
              <div className="flex gap-2">
                <Button onClick={saveEdit} disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</Button>
                <Button variant="secondary" onClick={() => setEditing(false)} disabled={busy}>Batal</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mt-1">
                <h1 className="gm-display text-2xl font-bold text-amber-300">{data.outlet.name}</h1>
                <button onClick={startEdit} className="text-neutral-500 hover:text-amber-300 p-1" title="Edit outlet">
                  <Pencil size={16} />
                </button>
                {!data.outlet.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300">Nonaktif</span>}
              </div>
              <p className="text-sm text-neutral-500 mt-1">{data.outlet.address ?? "—"} · {data.outlet.phone ?? "—"} · Terdaftar {new Date(data.outlet.createdAt).toLocaleDateString("id-ID")}</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge status={STATUS_BADGE[data.subscription?.status ?? "trial"] ?? "unknown"}>{STATUS_LABEL[data.subscription?.status ?? "trial"] ?? "Trial"}</Badge>
          <Button variant={data.outlet.isActive ? "danger" : "secondary"} onClick={toggleActive} disabled={busy}>
            {data.outlet.isActive ? "Nonaktifkan" : "Aktifkan"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><div className="text-[11px] uppercase text-neutral-500">Omzet 30 Hari Terakhir</div><div className="gm-display text-xl font-bold text-emerald-300 mt-1">{rupiah(data.omzet30d)}</div><div className="text-[11px] text-neutral-500 mt-1">{data.transactionsCount30d} transaksi</div></Card>
        <Card><div className="text-[11px] uppercase text-neutral-500">Total Dibayar ke NEXBILL</div><div className="gm-display text-xl font-bold text-cyan-300 mt-1">{rupiah(data.lifetimePaidToNexbill)}</div></Card>
        <Card><div className="text-[11px] uppercase text-neutral-500">Tagihan Belum Lunas</div><div className="gm-display text-xl font-bold text-amber-300 mt-1">{rupiah(data.unpaidToNexbill)}</div></Card>
        <Card><div className="text-[11px] uppercase text-neutral-500">Paket Langganan</div><div className="gm-display text-xl font-bold text-purple-300 mt-1">{data.plan?.name ?? "—"}</div></Card>
      </div>

      <Card>
        <h2 className="gm-heading font-semibold mb-3">Status Unit PS</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border border-white/10 p-3"><div className="text-[11px] text-neutral-500">Tersedia</div><div className="text-lg font-semibold text-emerald-300">{data.unitStatusCounts.available}</div></div>
          <div className="rounded-lg border border-white/10 p-3"><div className="text-[11px] text-neutral-500">Bermain</div><div className="text-lg font-semibold text-amber-300">{data.unitStatusCounts.occupied}</div></div>
          <div className="rounded-lg border border-white/10 p-3"><div className="text-[11px] text-neutral-500">Dibooking</div><div className="text-lg font-semibold text-purple-300">{data.unitStatusCounts.booked}</div></div>
          <div className="rounded-lg border border-white/10 p-3"><div className="text-[11px] text-neutral-500">Maintenance</div><div className="text-lg font-semibold text-rose-300">{data.unitStatusCounts.maintenance}</div></div>
        </div>
      </Card>

      <Card>
        <h2 className="gm-heading font-semibold mb-3">Staf ({data.staff.length})</h2>
        {data.staff.length === 0 ? (
          <p className="text-sm text-neutral-500">Belum ada staf.</p>
        ) : (
          <div className="space-y-1.5">
            {data.staff.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm border-b border-white/5 pb-2 last:border-0">
                <div>
                  <span className="text-neutral-200">{s.name}</span>
                  <span className="text-neutral-500 text-xs ml-2">{s.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400">{ROLE_LABEL[s.role] ?? s.role}</span>
                  {!s.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300">Nonaktif</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
