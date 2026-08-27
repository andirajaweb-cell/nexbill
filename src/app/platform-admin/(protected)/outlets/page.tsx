"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { fetchJsonArray } from "@/lib/api/fetch-json";
import { showAlert } from "@/lib/ui/dialog";
import { ChevronDown, ChevronRight, Building2, Plus } from "lucide-react";

const STATUS_BADGE: Record<string, string> = { active: "success", grace: "pending", trial: "pending", trial_expired: "failed", suspended: "failed", cancelled: "failed", pending_payment: "pending" };
const STATUS_LABEL: Record<string, string> = { active: "Aktif", grace: "Tenggang", trial: "Trial", trial_expired: "Trial Habis", suspended: "Suspend", cancelled: "Batal", pending_payment: "Menunggu Bayar" };
const inputCls = "w-full rounded-lg bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm";
const EMPTY_FORM = { name: "", address: "", phone: "", ownerName: "", email: "", password: "" };

interface Row {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  createdAt: string;
  subscriptionStatus: string;
  staffCount: number;
  unitCount: number;
  isActive: boolean;
  // Branch/cabang tree fields — see /api/platform-admin/outlets for how these are derived from
  // outletMemberships (a merchant opening a new branch links the same owner account to it).
  clusterRootId: string;
  isRoot: boolean;
  ownerName: string | null;
  branchCount: number;
}

interface TreeNode {
  root: Row;
  branches: Row[];
}

export default function PlatformOutletsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  const load = () => fetchJsonArray<Row>("/api/platform-admin/outlets").then((r) => { setRows(r); setLoading(false); });
  useEffect(() => { load(); }, []);

  const createOutlet = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/platform-admin/outlets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          address: form.address || undefined,
          phone: form.phone || undefined,
          owner: { name: form.ownerName, email: form.email, password: form.password },
        }),
      });
      const data = await res.json();
      if (!res.ok) { await showAlert(data.error ?? "Gagal membuat outlet."); return; }
      setForm(EMPTY_FORM);
      setShowCreate(false);
      load();
    } finally {
      setBusy(false);
    }
  };

  // Group the flat, RLS-style-scoped row list into a tree: one node per root/pusat outlet, with
  // its cabang nested underneath. An outlet that isn't part of any multi-branch owner is simply
  // its own root with an empty branches array — renders identically to the old flat list.
  const tree = useMemo<TreeNode[]>(() => {
    const byId = new Map(rows.map((r) => [r.id, r]));
    const nodes = new Map<string, TreeNode>();
    for (const r of rows) {
      if (!r.isRoot) continue;
      nodes.set(r.id, { root: r, branches: [] });
    }
    for (const r of rows) {
      if (r.isRoot) continue;
      const parent = nodes.get(r.clusterRootId) ?? (byId.get(r.clusterRootId) ? nodes.get(r.clusterRootId) : undefined);
      if (parent) parent.branches.push(r);
      else nodes.set(r.id, { root: r, branches: [] }); // orphan safety net — should not normally happen
    }
    for (const node of nodes.values()) node.branches.sort((a, b) => a.name.localeCompare(b.name));
    return Array.from(nodes.values()).sort((a, b) => new Date(b.root.createdAt).getTime() - new Date(a.root.createdAt).getTime());
  }, [rows]);

  const matches = (r: Row) => r.name.toLowerCase().includes(q.toLowerCase());
  const visibleTree = tree.filter((node) => matches(node.root) || node.branches.some(matches));

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="gm-display text-2xl font-bold text-amber-300">Outlet / Merchant</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Direktori semua outlet terdaftar, dikelompokkan per merchant — outlet yang membuka cabang (akun owner yang sama tertaut ke beberapa outlet) tampil sebagai satu pohon: pusat + cabang. Data tiap outlet tetap terisolasi satu sama lain, hanya bisa dilihat lintas-outlet dari sini (platform superuser).
          </p>
        </div>
        <Button variant="secondary" onClick={() => setShowCreate((s) => !s)} className="shrink-0 flex items-center gap-1.5">
          <Plus size={14} /> {showCreate ? "Batal" : "Tambah Outlet"}
        </Button>
      </div>

      {showCreate && (
        <Card className="space-y-3">
          <div>
            <h2 className="gm-heading font-semibold">Tambah Outlet Manual</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Untuk keperluan layanan pelanggan — bikin outlet + akun Owner langsung, tanpa lewat alur daftar mandiri (/daftar). Owner bisa login langsung pakai email/password ini setelah dibuat.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className={inputCls} placeholder="Nama Outlet" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <input className={inputCls} placeholder="No. Telepon (opsional)" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            <input className={`${inputCls} sm:col-span-2`} placeholder="Alamat (opsional)" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            <input className={inputCls} placeholder="Nama Owner" value={form.ownerName} onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))} />
            <input className={inputCls} type="email" placeholder="Email Owner" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <input className={inputCls} type="password" placeholder="Password (min. 8 karakter)" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          </div>
          <Button onClick={createOutlet} disabled={busy}>{busy ? "Memproses..." : "Buat Outlet"}</Button>
        </Card>
      )}

      <input
        className="w-full max-w-sm rounded-lg bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm"
        placeholder="Cari nama outlet/merchant..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <Card>
        {loading ? (
          <p className="text-sm text-neutral-500">Memuat...</p>
        ) : visibleTree.length === 0 ? (
          <p className="text-sm text-neutral-500">Tidak ada outlet.</p>
        ) : (
          <div className="space-y-1">
            {visibleTree.map((node) => {
              const isCollapsed = collapsed.has(node.root.id);
              const hasBranches = node.branches.length > 0;
              return (
                <div key={node.root.id} className="border-b border-white/5 last:border-0 pb-1 last:pb-0">
                  <div className="flex items-center gap-1.5 -mx-2 px-2 py-1.5 rounded hover:bg-white/5 transition">
                    {hasBranches ? (
                      <button onClick={() => toggle(node.root.id)} className="shrink-0 text-neutral-500 hover:text-neutral-300 p-0.5">
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                      </button>
                    ) : (
                      <span className="shrink-0 w-[18px]" />
                    )}
                    <Link href={`/platform-admin/outlets/${node.root.id}`} className="flex-1 flex items-center justify-between gap-2 text-sm min-w-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {hasBranches && <Building2 size={12} className="text-amber-400 shrink-0" />}
                          <span className="text-neutral-100 font-medium truncate">{node.root.name}</span>
                          {hasBranches && (
                            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300">
                              Pusat · {node.branches.length} cabang
                            </span>
                          )}
                          {!node.root.isActive && <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-neutral-500">Nonaktif</span>}
                        </div>
                        <div className="text-[11px] text-neutral-500 truncate">
                          {node.root.address ?? "—"} · {node.root.phone ?? "—"} · {node.root.staffCount} staf · {node.root.unitCount} unit
                          {node.root.ownerName && ` · Owner: ${node.root.ownerName}`}
                        </div>
                      </div>
                      <Badge status={STATUS_BADGE[node.root.subscriptionStatus] ?? "unknown"}>{STATUS_LABEL[node.root.subscriptionStatus] ?? node.root.subscriptionStatus}</Badge>
                    </Link>
                  </div>

                  {hasBranches && !isCollapsed && (
                    <div className="ml-6 border-l border-white/10 pl-3 space-y-0.5 mt-0.5">
                      {node.branches.map((b) => (
                        <Link
                          key={b.id}
                          href={`/platform-admin/outlets/${b.id}`}
                          className="flex items-center justify-between gap-2 text-sm -mx-2 px-2 py-1.5 rounded hover:bg-white/5 transition"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-neutral-200 truncate">{b.name}</span>
                              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-neutral-500">Cabang</span>
                              {!b.isActive && <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-neutral-500">Nonaktif</span>}
                            </div>
                            <div className="text-[11px] text-neutral-500 truncate">{b.address ?? "—"} · {b.phone ?? "—"} · {b.staffCount} staf · {b.unitCount} unit</div>
                          </div>
                          <Badge status={STATUS_BADGE[b.subscriptionStatus] ?? "unknown"}>{STATUS_LABEL[b.subscriptionStatus] ?? b.subscriptionStatus}</Badge>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
