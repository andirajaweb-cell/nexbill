"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { VendorRecommendationView } from "@/components/dashboard/VendorRecommendationCard";
import { isLive, type VendorRecPublic, type VendorRecStats, type VendorRecTarget } from "@/lib/vendor-recommendations/core";

const inputCls = "w-full rounded-lg bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm";
const pct = (x: number | null | undefined) => (x == null ? "—" : `${(x * 100).toFixed(1)}%`);
const fmt = (n: number) => n.toLocaleString("id-ID");

type Period = "d7" | "d30" | "d90" | "allTime";
const PERIODS: { key: Period; label: string }[] = [
  { key: "d7", label: "7 hari" },
  { key: "d30", label: "30 hari" },
  { key: "d90", label: "90 hari" },
  { key: "allTime", label: "Sepanjang waktu" },
];
const PLACEMENT_LABEL: Record<string, string> = { ppob: "Halaman PPOB" };
const TARGET_LABEL: Record<VendorRecTarget, string> = { primary: "Tombol utama", secondary: "Tautan kedua", info: "Tautan info" };

interface Item {
  id: string;
  placement: string;
  vendorName: string;
  badge: string | null;
  headline: string;
  body: string | null;
  benefits: string[];
  promoText: string | null;
  primaryLabel: string;
  primaryUrl: string;
  secondaryLabel: string | null;
  secondaryUrl: string | null;
  infoLabel: string | null;
  infoUrl: string | null;
  logoUrl: string | null;
  footnote: string | null;
  disclosure: string | null;
  countries: string;
  isActive: boolean;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
  confirmedSignups: number;
  updatedAt: string;
  stats: {
    d7: VendorRecStats;
    d30: VendorRecStats;
    d90: VendorRecStats;
    allTime: { impressions: number; outletsSeen: number; clicks: number; outletsClicked: number; dismisses: number };
    conversion: number | null;
    daily: { day: string; seen: number; clicked: number }[];
    recentClickers: { outletId: string | null; outletName: string; last: string; clicks: number }[];
  };
}

type Form = {
  placement: string;
  vendorName: string;
  badge: string;
  headline: string;
  body: string;
  benefits: string;
  promoText: string;
  primaryLabel: string;
  primaryUrl: string;
  secondaryLabel: string;
  secondaryUrl: string;
  infoLabel: string;
  infoUrl: string;
  logoUrl: string;
  footnote: string;
  disclosure: string;
  countries: string;
  sortOrder: string;
  startsAt: string;
  endsAt: string;
};

const EMPTY: Form = {
  placement: "ppob",
  vendorName: "",
  badge: "",
  headline: "",
  body: "",
  benefits: "",
  promoText: "",
  primaryLabel: "",
  primaryUrl: "",
  secondaryLabel: "",
  secondaryUrl: "",
  infoLabel: "",
  infoUrl: "",
  logoUrl: "",
  footnote: "",
  disclosure: "Rekomendasi mitra NEXBILL. NEXBILL dapat menerima komisi referral bila Anda mendaftar lewat tautan ini — harga untuk Anda tidak bertambah.",
  countries: "ID",
  sortOrder: "0",
  startsAt: "",
  endsAt: "",
};

const toLocalInput = (iso: string | null) => (iso ? new Date(Date.parse(iso) + 7 * 3600_000).toISOString().slice(0, 16) : "");
const fromLocalInput = (v: string) => (v ? new Date(`${v}:00+07:00`).toISOString() : "");

function formOf(i: Item): Form {
  return {
    placement: i.placement,
    vendorName: i.vendorName,
    badge: i.badge ?? "",
    headline: i.headline,
    body: i.body ?? "",
    benefits: i.benefits.join("\n"),
    promoText: i.promoText ?? "",
    primaryLabel: i.primaryLabel,
    primaryUrl: i.primaryUrl,
    secondaryLabel: i.secondaryLabel ?? "",
    secondaryUrl: i.secondaryUrl ?? "",
    infoLabel: i.infoLabel ?? "",
    infoUrl: i.infoUrl ?? "",
    logoUrl: i.logoUrl ?? "",
    footnote: i.footnote ?? "",
    disclosure: i.disclosure ?? "",
    countries: i.countries,
    sortOrder: String(i.sortOrder),
    startsAt: toLocalInput(i.startsAt),
    endsAt: toLocalInput(i.endsAt),
  };
}

function previewOf(f: Form): VendorRecPublic {
  const ctas: VendorRecPublic["ctas"] = [];
  if (f.primaryLabel) ctas.push({ target: "primary", label: f.primaryLabel });
  if (f.secondaryLabel && f.secondaryUrl) ctas.push({ target: "secondary", label: f.secondaryLabel });
  if (f.infoLabel && f.infoUrl) ctas.push({ target: "info", label: f.infoLabel });
  return {
    id: "preview",
    vendorName: f.vendorName || "Vendor",
    badge: f.badge || null,
    headline: f.headline || "Judul rekomendasi",
    body: f.body || null,
    benefits: f.benefits.split("\n").map((x) => x.trim()).filter(Boolean),
    promoText: f.promoText || null,
    logoUrl: f.logoUrl || null,
    footnote: f.footnote || null,
    disclosure: f.disclosure || null,
    ctas,
  };
}

function payloadOf(f: Form) {
  return { ...f, startsAt: fromLocalInput(f.startsAt), endsAt: fromLocalInput(f.endsAt), sortOrder: Number(f.sortOrder) || 0 };
}

/** Status tayang untuk label. */
function statusOf(i: Item): { label: string; cls: string } {
  if (!i.isActive) return { label: "Nonaktif", cls: "border-white/10 text-neutral-400" };
  const now = Date.now();
  if (i.startsAt && Date.parse(i.startsAt) > now) return { label: "Terjadwal", cls: "border-sky-400/40 text-sky-300" };
  if (i.endsAt && Date.parse(i.endsAt) < now) return { label: "Berakhir", cls: "border-amber-400/40 text-amber-300" };
  return isLive(i) ? { label: "Tayang", cls: "border-emerald-400/40 text-emerald-300" } : { label: "—", cls: "border-white/10 text-neutral-400" };
}

/**
 * Patokan internal (bukan standar industri) untuk membaca CTR kartu: dihitung dari outlet unik
 * yang mengeklik ÷ outlet unik yang melihat. Dipakai hanya sebagai penanda warna.
 */
function ctrHealth(ctr: number | null, seen: number): { label: string; cls: string } {
  if (ctr == null || seen < 10) return { label: "Data belum cukup (< 10 outlet melihat)", cls: "text-neutral-400" };
  if (ctr >= 0.05) return { label: "Baik", cls: "text-emerald-300" };
  if (ctr >= 0.02) return { label: "Sedang — coba ubah judul/manfaat", cls: "text-amber-300" };
  return { label: "Rendah — perlu evaluasi isi/penawaran", cls: "text-red-300" };
}

export default function VendorRecommendationsAdminPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [migrationMissing, setMigrationMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("d30");
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    const res = await fetch("/api/platform-admin/vendor-recommendations");
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return setErr(data.error ?? "Gagal memuat.");
    setMigrationMissing(!!data.migrationMissing);
    setItems(data.items ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  const totals = useMemo(() => {
    const live = items.filter((i) => isLive(i)).length;
    let seen = 0;
    let clicked = 0;
    for (const i of items) {
      const s = period === "allTime" ? i.stats.allTime : i.stats[period];
      seen += s.outletsSeen;
      clicked += s.outletsClicked;
    }
    return { live, seen, clicked };
  }, [items, period]);

  const startNew = () => {
    setEditing("new");
    setForm(EMPTY);
    setErr("");
  };
  const startEdit = (i: Item) => {
    setEditing(i.id);
    setForm(formOf(i));
    setErr("");
  };

  const save = async () => {
    setBusy(true);
    setErr("");
    try {
      const isNew = editing === "new";
      const res = await fetch(isNew ? "/api/platform-admin/vendor-recommendations" : `/api/platform-admin/vendor-recommendations/${editing}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadOf(form)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setErr(data.error ?? "Gagal menyimpan.");
      setEditing(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/platform-admin/vendor-recommendations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) showAlert(data.error ?? "Gagal menyimpan.");
    await load();
  };

  const remove = async (i: Item) => {
    if (!(await showConfirm(`Hapus rekomendasi "${i.vendorName}" beserta seluruh riwayat performanya? Untuk berhenti sementara, cukup nonaktifkan.`, { tone: "danger", confirmLabel: "Hapus" }))) return;
    const res = await fetch(`/api/platform-admin/vendor-recommendations/${i.id}`, { method: "DELETE" });
    if (!res.ok) showAlert("Gagal menghapus.");
    await load();
  };

  const uploadLogo = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/platform-admin/upload", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setErr(data.error ?? "Gagal upload logo.");
    setForm((f) => ({ ...f, logoUrl: data.url }));
  };

  const editorFor = (title: string) => (
    <Card className="space-y-4 border border-emerald-500/30">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        <Button variant="ghost" onClick={() => setEditing(null)}>Tutup</Button>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="grid gap-2 text-xs sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-neutral-400">Halaman tujuan</span>
            <select className={inputCls} value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value })}>
              <option value="ppob">Halaman PPOB</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-neutral-400">Nama vendor *</span>
            <input className={inputCls} value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-neutral-400">Judul (headline) *</span>
            <input className={inputCls} value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
          </label>
          <label className="space-y-1">
            <span className="text-neutral-400">Label kecil (badge)</span>
            <input className={inputCls} value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} />
          </label>
          <label className="space-y-1">
            <span className="text-neutral-400">Logo (unggah file milik vendor)</span>
            <div className="flex gap-2">
              <input className={inputCls} value={form.logoUrl} placeholder="https://…" onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} />
              <label className="shrink-0 cursor-pointer rounded-lg border border-neutral-700 px-2 py-2 text-neutral-300 hover:bg-white/5">
                Unggah
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = ""; }} />
              </label>
            </div>
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-neutral-400">Isi / alasan bisnis</span>
            <textarea rows={4} className={inputCls} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-neutral-400">Manfaat (satu per baris)</span>
            <textarea rows={4} className={inputCls} value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-neutral-400">Promo (kotak kuning)</span>
            <input className={inputCls} value={form.promoText} onChange={(e) => setForm({ ...form, promoText: e.target.value })} />
          </label>
          <label className="space-y-1">
            <span className="text-neutral-400">Label tombol utama *</span>
            <input className={inputCls} value={form.primaryLabel} onChange={(e) => setForm({ ...form, primaryLabel: e.target.value })} />
          </label>
          <label className="space-y-1">
            <span className="text-neutral-400">Tautan tombol utama *</span>
            <input className={inputCls} value={form.primaryUrl} placeholder="https://" onChange={(e) => setForm({ ...form, primaryUrl: e.target.value })} />
          </label>
          <label className="space-y-1">
            <span className="text-neutral-400">Label tautan kedua</span>
            <input className={inputCls} value={form.secondaryLabel} onChange={(e) => setForm({ ...form, secondaryLabel: e.target.value })} />
          </label>
          <label className="space-y-1">
            <span className="text-neutral-400">Tautan kedua</span>
            <input className={inputCls} value={form.secondaryUrl} placeholder="https://" onChange={(e) => setForm({ ...form, secondaryUrl: e.target.value })} />
          </label>
          <label className="space-y-1">
            <span className="text-neutral-400">Label tautan info</span>
            <input className={inputCls} value={form.infoLabel} onChange={(e) => setForm({ ...form, infoLabel: e.target.value })} />
          </label>
          <label className="space-y-1">
            <span className="text-neutral-400">Tautan info</span>
            <input className={inputCls} value={form.infoUrl} placeholder="https://" onChange={(e) => setForm({ ...form, infoUrl: e.target.value })} />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-neutral-400">Catatan kaki (mis. harga dapat berubah)</span>
            <input className={inputCls} value={form.footnote} onChange={(e) => setForm({ ...form, footnote: e.target.value })} />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-neutral-400">Keterangan tautan mitra (transparansi komisi — disarankan tetap diisi)</span>
            <input className={inputCls} value={form.disclosure} onChange={(e) => setForm({ ...form, disclosure: e.target.value })} />
          </label>
          <label className="space-y-1">
            <span className="text-neutral-400">Negara outlet (kode, pisahkan koma; * = semua)</span>
            <input className={inputCls} value={form.countries} onChange={(e) => setForm({ ...form, countries: e.target.value })} />
          </label>
          <label className="space-y-1">
            <span className="text-neutral-400">Urutan</span>
            <input type="number" className={inputCls} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
          </label>
          <label className="space-y-1">
            <span className="text-neutral-400">Mulai tayang (WIB, opsional)</span>
            <input type="datetime-local" className={inputCls} value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
          </label>
          <label className="space-y-1">
            <span className="text-neutral-400">Selesai tayang (WIB, opsional)</span>
            <input type="datetime-local" className={inputCls} value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
          </label>
        </div>
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Pratinjau di dashboard outlet</div>
          <div className="rounded-2xl bg-neutral-950 p-3">
            <VendorRecommendationView rec={previewOf(form)} placement={form.placement} preview onDismiss={() => {}} />
          </div>
          <p className="text-[11px] text-neutral-500">
            Kartu hanya tampil untuk Owner/Manager outlet di negara yang dipilih, bisa disembunyikan outlet selama 30 hari, dan setiap klik
            diarahkan lewat NEXBILL dulu supaya tercatat sebelum diteruskan ke tautan vendor.
          </p>
        </div>
      </div>
      {err && <div className="text-sm text-red-300">{err}</div>}
      <div className="flex gap-2">
        <Button onClick={save} disabled={busy}>{busy ? "Menyimpan…" : "Simpan"}</Button>
        <Button variant="ghost" onClick={() => setEditing(null)}>Batal</Button>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Rekomendasi Vendor</h1>
          <p className="text-sm text-neutral-500">
            Kartu "solusi tambahan" di dashboard outlet (mis. Fastpay di halaman PPOB) beserta indikator performanya.
          </p>
        </div>
        <Button onClick={startNew}>+ Rekomendasi baru</Button>
      </div>

      {migrationMissing && (
        <Card className="border border-amber-400/40 bg-amber-500/10 text-sm text-amber-100">
          Tabel belum ada. Jalankan <code>supabase/migrations/0034_vendor_recommendations.sql</code> di Supabase SQL Editor — migrasi itu juga
          membuat rekomendasi Fastpay awal. Sampai itu dijalankan, kartu tidak tampil di dashboard outlet (halaman PPOB tetap normal).
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPeriod(p.key)}
            className={`rounded-full border px-3 py-1 text-xs ${period === p.key ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200" : "border-white/10 text-neutral-400 hover:text-neutral-200"}`}
          >
            {p.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-neutral-500">
          {totals.live} tayang · {fmt(totals.seen)} outlet melihat · {fmt(totals.clicked)} outlet klik ({PERIODS.find((p) => p.key === period)?.label})
        </span>
      </div>

      {editing === "new" && editorFor("Rekomendasi baru")}

      {loading ? (
        <div className="text-sm text-neutral-500">Memuat…</div>
      ) : items.length === 0 && !migrationMissing ? (
        <Card className="text-sm text-neutral-400">Belum ada rekomendasi.</Card>
      ) : (
        items.map((i) => {
          if (editing === i.id) return <div key={i.id}>{editorFor(`Ubah: ${i.vendorName}`)}</div>;
          const st = statusOf(i);
          const s = period === "allTime" ? null : i.stats[period];
          const all = i.stats.allTime;
          const seen = s ? s.outletsSeen : all.outletsSeen;
          const clicked = s ? s.outletsClicked : all.outletsClicked;
          const ctr = s ? s.ctr : all.outletsSeen ? all.outletsClicked / all.outletsSeen : null;
          const health = ctrHealth(ctr, seen);
          const maxDay = Math.max(1, ...i.stats.daily.map((d) => d.seen));
          return (
            <Card key={i.id} className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{i.vendorName}</h2>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${st.cls}`}>{st.label}</span>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-neutral-400">{PLACEMENT_LABEL[i.placement] ?? i.placement}</span>
                    <span className="text-[11px] text-neutral-500">Negara: {i.countries}</span>
                  </div>
                  <p className="text-sm text-neutral-300">{i.headline}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => patch(i.id, { isActive: !i.isActive })}>{i.isActive ? "Nonaktifkan" : "Aktifkan"}</Button>
                  <Button variant="secondary" onClick={() => startEdit(i)}>Ubah</Button>
                  <Button variant="ghost" onClick={() => remove(i)}>Hapus</Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
                <Kpi label="Outlet melihat" value={fmt(seen)} hint={s ? `${fmt(s.impressions)} tayangan` : `${fmt(all.impressions)} tayangan`} />
                <Kpi label="Outlet mengeklik" value={fmt(clicked)} hint={s ? `${fmt(s.clicks)} klik total` : `${fmt(all.clicks)} klik total`} />
                <Kpi label="CTR (outlet)" value={pct(ctr)} hint={health.label} hintCls={health.cls} />
                <Kpi
                  label="Disembunyikan"
                  value={fmt(s ? s.dismisses : all.dismisses)}
                  hint={s ? `${pct(s.dismissRate)} dari yang melihat` : "sepanjang waktu"}
                  hintCls={s && s.dismissRate != null && s.dismissRate > 0.3 ? "text-red-300" : undefined}
                />
                <div className="rounded-xl border border-neutral-800 p-3">
                  <div className="text-[11px] text-neutral-500">Pendaftaran terkonfirmasi</div>
                  <input
                    type="number"
                    min={0}
                    defaultValue={i.confirmedSignups}
                    onBlur={(e) => Number(e.target.value) !== i.confirmedSignups && patch(i.id, { confirmedSignups: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md bg-neutral-900 border border-neutral-700 px-2 py-1 text-lg font-semibold"
                  />
                  <div className="text-[11px] text-neutral-500">isi dari dasbor vendor (mis. Fastpay › Mitra Anda)</div>
                </div>
                <Kpi label="Konversi (sepanjang waktu)" value={pct(i.stats.conversion)} hint={`${i.confirmedSignups} daftar ÷ ${fmt(all.outletsClicked)} outlet klik`} />
              </div>

              {s && (
                <div className="flex flex-wrap gap-3 text-xs text-neutral-400">
                  {(Object.keys(TARGET_LABEL) as VendorRecTarget[]).map((k) => (
                    <span key={k}>
                      {TARGET_LABEL[k]}: <b className="text-neutral-200">{fmt(s.clicksByTarget[k])}</b> klik
                    </span>
                  ))}
                </div>
              )}

              <div>
                <div className="mb-1 flex items-center justify-between text-[11px] text-neutral-500">
                  <span>30 hari terakhir (WIB) — abu-abu: outlet melihat, hijau: outlet klik</span>
                </div>
                <div className="flex h-24 items-end gap-[3px]">
                  {i.stats.daily.map((d) => (
                    <div key={d.day} className="relative flex-1" title={`${d.day}: ${d.seen} melihat, ${d.clicked} klik`}>
                      <div className="w-full rounded-t bg-neutral-700/70" style={{ height: `${(d.seen / maxDay) * 88}px` }} />
                      <div className="absolute bottom-0 w-full rounded-t bg-emerald-400" style={{ height: `${(d.clicked / maxDay) * 88}px` }} />
                    </div>
                  ))}
                </div>
              </div>

              {i.stats.recentClickers.length > 0 && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-neutral-300">Outlet yang mengeklik (terbaru) — {i.stats.recentClickers.length}</summary>
                  <table className="mt-2 w-full text-xs">
                    <thead>
                      <tr className="text-left text-neutral-500">
                        <th className="py-1">Outlet</th>
                        <th>Klik</th>
                        <th>Terakhir</th>
                      </tr>
                    </thead>
                    <tbody>
                      {i.stats.recentClickers.map((c) => (
                        <tr key={`${c.outletId}`} className="border-t border-neutral-900">
                          <td className="py-1">{c.outletName}</td>
                          <td>{c.clicks}</td>
                          <td>{new Date(c.last).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}

function Kpi({ label, value, hint, hintCls }: { label: string; value: string; hint?: string; hintCls?: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 p-3">
      <div className="text-[11px] text-neutral-500">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
      {hint && <div className={`text-[11px] ${hintCls ?? "text-neutral-500"}`}>{hint}</div>}
    </div>
  );
}
