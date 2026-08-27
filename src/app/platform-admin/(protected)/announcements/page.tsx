"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fetchJsonObject } from "@/lib/api/fetch-json";
import { showAlert } from "@/lib/ui/dialog";

const inputCls = "w-full rounded-lg bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm";

const SEVERITY_LABEL: Record<string, string> = { info: "Info", warning: "Peringatan", critical: "Kritis/Penting" };
const SEVERITY_BADGE: Record<string, string> = {
  info: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  warning: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  critical: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

interface Announcement {
  id: string;
  title: string;
  message: string;
  imageUrl: string | null;
  severity: "info" | "warning" | "critical";
  outletId: string | null;
  outletName: string | null;
  showAsPopup: boolean;
  isActive: boolean;
  createdAt: string;
}

interface OutletOption {
  id: string;
  name: string;
}

const emptyForm = { title: "", message: "", imageUrl: "", severity: "info" as const, outletId: "", showAsPopup: true };

export default function PlatformAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [outlets, setOutlets] = useState<OutletOption[]>([]);
  const [form, setForm] = useState<any>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = () =>
    fetchJsonObject<{ announcements: Announcement[]; outlets: OutletOption[] }>("/api/platform-admin/announcements").then((d) => {
      if (!d) return;
      setAnnouncements(d.announcements);
      setOutlets(d.outlets);
    });
  useEffect(() => {
    load();
  }, []);

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/platform-admin/announcements/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      setForm((prev: any) => ({ ...prev, imageUrl: data.url }));
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/platform-admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, outletId: form.outletId || null }),
      });
      if (res.ok) setForm(emptyForm);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (a: Announcement) => {
    await fetch(`/api/platform-admin/announcements/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !a.isActive }),
    });
    await load();
  };

  const remove = async (id: string) => {
    await fetch(`/api/platform-admin/announcements/${id}`, { method: "DELETE" });
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold text-amber-300">Pengumuman</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Kirim pengumuman ke outlet/merchant — tampil sebagai popup sekali muncul ke tiap staf (kalau "Tampilkan sebagai popup" dicentang) DAN sebagai item di
          lonceng notifikasi mereka. Kosongkan "Outlet Tujuan" untuk broadcast ke semua outlet.
        </p>
      </div>

      <Card>
        <h2 className="gm-heading font-semibold mb-3">Buat Pengumuman Baru</h2>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2">
              <label className="text-xs text-neutral-500">Judul</label>
              <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="mis. Maintenance server 21 Agustus" />
            </div>
            <div>
              <label className="text-xs text-neutral-500">Tingkat</label>
              <select className={inputCls} value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                {Object.entries(SEVERITY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-neutral-500">Isi Pesan</label>
            <textarea className={inputCls + " min-h-[90px]"} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tulis isi pengumuman lengkap di sini..." />
          </div>

          <div>
            <label className="text-xs text-neutral-500">Gambar (opsional, rasio 16:9)</label>
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3 mt-1 text-xs text-neutral-400 space-y-1">
              <p>
                Rasio <span className="text-neutral-200">16:9</span> — resolusi disarankan minimal <span className="text-neutral-200">1280×720px</span>, idealnya{" "}
                <span className="text-neutral-200">1920×1080px</span>. Format PNG/JPG/WEBP, maksimal <span className="text-neutral-200">3MB</span>.
              </p>
              <p>Video belum didukung — menyusul di fitur berikutnya.</p>
            </div>
            <div className="mt-2 flex items-start gap-3">
              {form.imageUrl ? (
                <div className="w-48 aspect-video rounded-lg overflow-hidden border border-neutral-700 shrink-0 bg-neutral-900">
                  <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-48 aspect-video rounded-lg border border-dashed border-neutral-700 shrink-0 flex items-center justify-center text-[10px] text-neutral-600">
                  Belum ada gambar
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs">
                  <span className="inline-block rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 cursor-pointer hover:bg-neutral-700">
                    {uploading ? "Mengunggah..." : form.imageUrl ? "Ganti Gambar" : "Upload Gambar"}
                  </span>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadImage(f);
                    }}
                  />
                </label>
                {form.imageUrl && (
                  <button type="button" className="block text-xs text-neutral-500 hover:text-rose-400" onClick={() => setForm({ ...form, imageUrl: "" })}>
                    Hapus gambar
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
            <div className="sm:col-span-2">
              <label className="text-xs text-neutral-500">Outlet Tujuan (kosongkan = semua outlet)</label>
              <select className={inputCls} value={form.outletId} onChange={(e) => setForm({ ...form, outletId: e.target.value })}>
                <option value="">— Semua Outlet (broadcast) —</option>
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-300">
              <input type="checkbox" checked={form.showAsPopup} onChange={(e) => setForm({ ...form, showAsPopup: e.target.checked })} />
              Tampilkan sebagai popup
            </label>
          </div>
          <Button type="submit" disabled={busy}>{busy ? "Mengirim..." : "Kirim Pengumuman"}</Button>
        </form>
      </Card>

      <Card>
        <h2 className="gm-heading font-semibold mb-3">Riwayat Pengumuman</h2>
        {announcements.length === 0 ? (
          <p className="text-sm text-neutral-500">Belum ada pengumuman dikirim.</p>
        ) : (
          <div className="space-y-2">
            {announcements.map((a) => (
              <div key={a.id} className={`rounded-lg border p-3 space-y-1.5 flex gap-3 ${a.isActive ? "border-white/10" : "border-white/5 opacity-50"}`}>
                {a.imageUrl && (
                  <div className="w-24 aspect-video rounded-lg overflow-hidden border border-neutral-800 shrink-0 bg-neutral-900">
                    <img src={a.imageUrl} alt={a.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${SEVERITY_BADGE[a.severity]}`}>{SEVERITY_LABEL[a.severity]}</span>
                    <span className="text-sm font-medium text-neutral-200">{a.title}</span>
                    {!a.showAsPopup && <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-500">Notifikasi saja</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" className="text-xs" onClick={() => toggleActive(a)}>{a.isActive ? "Nonaktifkan" : "Aktifkan"}</Button>
                    <button onClick={() => remove(a.id)} className="text-xs text-neutral-500 hover:text-rose-400">Hapus</button>
                  </div>
                </div>
                <p className="text-xs text-neutral-400 whitespace-pre-line">{a.message}</p>
                <div className="text-[11px] text-neutral-600">
                  Tujuan: {a.outletName ?? "Semua Outlet"} · {new Date(a.createdAt).toLocaleString("id-ID")}
                </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
