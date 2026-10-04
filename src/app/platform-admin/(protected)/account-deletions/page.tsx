"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { showAlert, showConfirm } from "@/lib/ui/dialog";

/**
 * Permintaan hapus akun dari Owner outlet (Kebijakan Privasi bagian 9). Purge otomatis 30 hari
 * setelah dikonfirmasi (scheduler + setiap halaman ini dibuka); di sini bisa dipercepat atau
 * dibatalkan (aktifkan kembali) bila Owner menghubungi support sebelum tanggal purge.
 */
interface Row {
  id: string;
  email: string;
  outletNames: string | null;
  reason: string | null;
  status: "pending_verification" | "confirmed" | "purged" | "cancelled";
  createdAt: string;
  confirmedAt: string | null;
  scheduledPurgeAt: string | null;
  purgedAt: string | null;
  cancelledAt: string | null;
  handledBy: string | null;
}

const STATUS_LABEL: Record<Row["status"], { label: string; cls: string }> = {
  pending_verification: { label: "Menunggu kode", cls: "bg-white/10 text-neutral-300" },
  confirmed: { label: "Dikonfirmasi — nonaktif", cls: "bg-amber-500/15 text-amber-300" },
  purged: { label: "Data dihapus", cls: "bg-rose-500/15 text-rose-300" },
  cancelled: { label: "Dibatalkan", cls: "bg-emerald-500/15 text-emerald-300" },
};

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("id-ID") : "-");

export default function AccountDeletionsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/platform-admin/account-deletions");
    const out = await res.json();
    if (!res.ok) return showAlert(out.error ?? "Gagal memuat.");
    setRows(out.rows);
    if (out.purgedNow) showAlert(`${out.purgedNow} permintaan yang sudah jatuh tempo baru saja dihapus permanen.`);
  };
  useEffect(() => {
    load();
  }, []);

  const act = async (row: Row, action: "purge" | "cancel") => {
    const msg =
      action === "purge"
        ? `Hapus permanen data pribadi ${row.outletNames ?? ""} sekarang? Tindakan ini tidak bisa dibatalkan.`
        : `Batalkan penghapusan dan aktifkan kembali akun & outlet ${row.outletNames ?? ""}?`;
    if (!(await showConfirm(msg))) return;
    setBusy(row.id);
    try {
      const res = await fetch(`/api/platform-admin/account-deletions/${row.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const out = await res.json();
      if (!res.ok) return showAlert(out.error ?? "Gagal.");
      await load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold text-amber-300">Permintaan Hapus Akun</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Owner meminta dari Pengaturan → Akun Saya (kode via email), atau lewat email/WhatsApp. Setelah dikonfirmasi, akun & outlet langsung
          nonaktif dan data pribadi dihapus/dianonimkan otomatis paling lambat 30 hari. Catatan transaksi & invoice tetap disimpan tanpa identitas.
        </p>
      </div>
      <Card>
        {!rows ? (
          <p className="text-sm text-neutral-500">Memuat...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-neutral-500">Belum ada permintaan.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-500 border-b border-white/10">
                  <th className="py-2">Outlet</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Diminta</th>
                  <th>Jadwal hapus</th>
                  <th>Alasan</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 align-top">
                    <td className="py-2 pr-3">{r.outletNames ?? "-"}</td>
                    <td className="pr-3">{r.email}</td>
                    <td className="pr-3">
                      <span className={`text-[11px] px-1.5 py-0.5 rounded ${STATUS_LABEL[r.status].cls}`}>{STATUS_LABEL[r.status].label}</span>
                      {r.handledBy && <div className="text-[10px] text-neutral-600 mt-0.5">{r.handledBy}</div>}
                    </td>
                    <td className="pr-3 text-xs">{fmt(r.createdAt)}</td>
                    <td className="pr-3 text-xs">{r.status === "purged" ? `Selesai ${fmt(r.purgedAt)}` : fmt(r.scheduledPurgeAt)}</td>
                    <td className="pr-3 text-xs text-neutral-400 max-w-[220px]">{r.reason ?? "-"}</td>
                    <td className="whitespace-nowrap">
                      {r.status === "confirmed" && (
                        <div className="flex gap-1">
                          <Button variant="secondary" className="text-xs" disabled={busy === r.id} onClick={() => act(r, "cancel")}>Aktifkan lagi</Button>
                          <Button className="text-xs bg-rose-600 hover:bg-rose-500" disabled={busy === r.id} onClick={() => act(r, "purge")}>Hapus sekarang</Button>
                        </div>
                      )}
                      {r.status === "pending_verification" && (
                        <Button variant="ghost" className="text-xs" disabled={busy === r.id} onClick={() => act(r, "cancel")}>Batalkan</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
