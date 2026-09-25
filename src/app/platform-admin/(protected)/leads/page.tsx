"use client";
import { useCallback, useEffect, useState } from "react";
import { clsx } from "clsx";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fetchJsonArray, fetchJsonObject } from "@/lib/api/fetch-json";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import {
  LEAD_ACTIVITY_LABEL,
  LEAD_CLOSED_STATUSES,
  LEAD_STATUSES,
  LEAD_STATUS_LABEL,
  type LeadActivityType,
  type LeadStatus,
  type PlaceResult,
} from "@/lib/leads/constants";

const inputCls = "w-full rounded-lg bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm";

const STATUS_COLOR: Record<LeadStatus, string> = {
  baru: "text-sky-300 border-sky-400/30 bg-sky-500/10",
  dihubungi: "text-cyan-300 border-cyan-400/30 bg-cyan-500/10",
  follow_up: "text-amber-300 border-amber-400/30 bg-amber-500/10",
  demo: "text-violet-300 border-violet-400/30 bg-violet-500/10",
  trial: "text-fuchsia-300 border-fuchsia-400/30 bg-fuchsia-500/10",
  closing: "text-emerald-300 border-emerald-400/30 bg-emerald-500/10",
  tidak_tertarik: "text-neutral-400 border-white/10 bg-white/5",
};

const WA_TEMPLATE = (name: string) =>
  `Halo kak, pemilik ${name}? Saya dari NEXBILL — aplikasi kasir & billing khusus rental PS: TV nyala/mati otomatis sesuai sesi, booking, member, stok F&B, dan laporan keuangan dalam satu aplikasi. Boleh saya kirim demo singkatnya?`;

const waLink = (wa: string, name: string) => `https://wa.me/${wa}?text=${encodeURIComponent(WA_TEMPLATE(name))}`;

interface Lead {
  id: string;
  name: string;
  category: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  waNumber: string | null;
  website: string | null;
  mapsUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  contactName: string | null;
  status: LeadStatus;
  nextFollowUpDate: string | null;
  lastContactedAt: string | null;
  notes: string | null;
  source: "google_maps" | "manual";
  searchQuery: string | null;
  convertedOutletId: string | null;
  createdAt: string;
}

interface Activity {
  id: string;
  type: LeadActivityType;
  content: string;
  createdByName: string | null;
  createdAt: string;
}

interface ListData {
  leads: Lead[];
  counts: Record<LeadStatus, number>;
  dueCount: number;
  cities: string[];
}

type SearchResult = PlaceResult & { existingLeadId: string | null };

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `Gagal (${res.status})`);
  return data;
}

function StatusPill({ status }: { status: LeadStatus }) {
  return <span className={clsx("inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", STATUS_COLOR[status])}>{LEAD_STATUS_LABEL[status]}</span>;
}

export default function PlatformLeadsPage() {
  const [tab, setTab] = useState<"crm" | "search">("crm");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold text-amber-300">Leads & CRM</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Cari calon pelanggan NEXBILL (rental PS, warnet, game center) dari Google Maps, simpan sebagai prospek, lalu tindak lanjuti lewat pipeline: Baru → Dihubungi → Follow Up → Demo → Trial → Closing.
        </p>
      </div>

      <div className="flex gap-2 border-b border-white/10">
        {([
          ["crm", "Pipeline CRM"],
          ["search", "Cari di Google Maps"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={clsx("px-4 py-2 text-sm -mb-px border-b-2 transition", tab === key ? "border-amber-400 text-amber-300" : "border-transparent text-neutral-500 hover:text-neutral-300")}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "crm" ? <CrmTab /> : <SearchTab onImported={() => setTab("crm")} />}
    </div>
  );
}

/* ============================== PENCARIAN GOOGLE MAPS ============================== */

function SearchTab({ onImported }: { onImported: () => void }) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [keyword, setKeyword] = useState("rental ps");
  const [location, setLocation] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJsonObject<{ configured: boolean }>("/api/platform-admin/leads/search").then((d) => setConfigured(d?.configured ?? false));
  }, []);

  const runSearch = async (textQuery: string, pageToken?: string) => {
    setBusy(true);
    setError(null);
    try {
      const data = await send("/api/platform-admin/leads/search", "POST", { textQuery, pageToken });
      const fresh = data.results as SearchResult[];
      setResults((prev) => (pageToken ? [...prev, ...fresh] : fresh));
      setNextPageToken(data.nextPageToken);
      // Otomatis pilih hasil yang belum ada di CRM.
      setSelected((prev) => {
        const next = new Set(pageToken ? prev : []);
        for (const r of fresh) if (!r.existingLeadId) next.add(r.placeId);
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = [keyword.trim(), location.trim()].filter(Boolean).join(" di ");
    if (!q) return;
    setActiveQuery(q);
    runSearch(q);
  };

  const toggle = (placeId: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });

  const importSelected = async () => {
    const places = results.filter((r) => selected.has(r.placeId) && !r.existingLeadId);
    if (places.length === 0) return;
    setBusy(true);
    try {
      const data = await send("/api/platform-admin/leads/import", "POST", { places, searchQuery: activeQuery });
      await showAlert(`${data.inserted} prospek tersimpan ke CRM${data.skipped ? `, ${data.skipped} dilewati karena sudah ada` : ""}.`);
      onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (configured === null) return <p className="text-sm text-neutral-500">Memuat...</p>;

  if (!configured) {
    return (
      <Card className="space-y-2 text-sm text-neutral-300">
        <h2 className="gm-heading font-semibold text-amber-300">Google Maps belum tersambung</h2>
        <p>Pencarian memakai Google Places API resmi (bukan scraping), jadi butuh API key:</p>
        <ol className="list-decimal pl-5 space-y-1 text-neutral-400">
          <li>Buka <span className="font-mono text-neutral-300">console.cloud.google.com</span>, buat/pilih project, aktifkan billing.</li>
          <li>APIs &amp; Services → Library → aktifkan <b>Places API (New)</b>.</li>
          <li>Credentials → Create API key → batasi (API restrictions) hanya ke Places API (New).</li>
          <li>Isi <span className="font-mono text-neutral-300">GOOGLE_MAPS_API_KEY</span> di environment Vercel (dan <span className="font-mono">.env</span> lokal), lalu redeploy.</li>
        </ol>
        <p className="text-xs text-neutral-500">Biaya: setiap halaman hasil (maks. 20 tempat) = 1 request SKU &quot;Text Search Enterprise&quot;; ada kuota gratis bulanan dari Google, setelahnya ± US$35 per 1.000 request.</p>
      </Card>
    );
  }

  const newCount = results.filter((r) => selected.has(r.placeId) && !r.existingLeadId).length;

  return (
    <div className="space-y-4">
      <Card>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
          <div className="sm:col-span-2">
            <label className="text-xs text-neutral-500">Kata kunci</label>
            <input className={inputCls} value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="rental ps / game center / warnet" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-neutral-500">Lokasi</label>
            <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="mis. Bekasi Timur, Kota Bandung" />
          </div>
          <Button type="submit" disabled={busy}>{busy && results.length === 0 ? "Mencari..." : "Cari"}</Button>
        </form>
        <p className="text-[11px] text-neutral-500 mt-2">Google membatasi 60 hasil per pencarian (3 halaman). Untuk kota besar, cari per kecamatan agar lebih lengkap.</p>
      </Card>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      {results.length > 0 && (
        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-neutral-400">
              {results.length} hasil untuk <span className="text-neutral-200">&quot;{activeQuery}&quot;</span> · {newCount} dipilih
            </div>
            <Button onClick={importSelected} disabled={busy || newCount === 0}>Simpan {newCount} ke CRM</Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-neutral-500 border-b border-white/10">
                  <th className="py-2 pr-2 w-8"></th>
                  <th className="py-2 pr-3">Nama</th>
                  <th className="py-2 pr-3">Kota</th>
                  <th className="py-2 pr-3">Telepon</th>
                  <th className="py-2 pr-3">Rating</th>
                  <th className="py-2">Link</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.placeId} className={clsx("border-b border-white/5 align-top", r.existingLeadId && "opacity-50")}>
                    <td className="py-2 pr-2">
                      <input type="checkbox" disabled={!!r.existingLeadId} checked={selected.has(r.placeId) && !r.existingLeadId} onChange={() => toggle(r.placeId)} />
                    </td>
                    <td className="py-2 pr-3">
                      <div className="text-neutral-100">{r.name}</div>
                      <div className="text-[11px] text-neutral-500">{r.category ?? "—"}{r.businessStatus && r.businessStatus !== "OPERATIONAL" ? ` · ${r.businessStatus === "CLOSED_PERMANENTLY" ? "Tutup permanen" : "Tutup sementara"}` : ""}</div>
                      {r.existingLeadId && <div className="text-[11px] text-amber-400">Sudah ada di CRM</div>}
                    </td>
                    <td className="py-2 pr-3 text-neutral-400">{r.city ?? "—"}</td>
                    <td className="py-2 pr-3 text-neutral-300 whitespace-nowrap">
                      {r.phone ?? "—"}
                      {r.waNumber && <div className="text-[11px] text-emerald-400">WhatsApp ✓</div>}
                    </td>
                    <td className="py-2 pr-3 text-neutral-300 whitespace-nowrap">{r.rating != null ? `★ ${r.rating} (${r.reviewCount ?? 0})` : "—"}</td>
                    <td className="py-2 whitespace-nowrap space-x-2 text-[12px]">
                      {r.mapsUrl && <a href={r.mapsUrl} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">Maps</a>}
                      {r.website && <a href={r.website} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">Web</a>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {nextPageToken && (
            <Button variant="secondary" onClick={() => runSearch(activeQuery, nextPageToken)} disabled={busy}>
              {busy ? "Memuat..." : "Muat 20 hasil berikutnya"}
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}

/* ============================== PIPELINE CRM ============================== */

function CrmTab() {
  const [data, setData] = useState<ListData | null>(null);
  const [status, setStatus] = useState<LeadStatus | "">("");
  const [city, setCity] = useState("");
  const [q, setQ] = useState("");
  const [due, setDue] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const query = new URLSearchParams({ ...(status && { status }), ...(city && { city }), ...(q.trim() && { q: q.trim() }), ...(due && { due: "1" }) }).toString();

  const load = useCallback(() => fetchJsonObject<ListData>(`/api/platform-admin/leads?${query}`).then(setData), [query]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const changeStatus = async (lead: Lead, next: LeadStatus) => {
    try {
      await send(`/api/platform-admin/leads/${lead.id}`, "PATCH", { status: next });
      await load();
    } catch (e) {
      showAlert(e instanceof Error ? e.message : String(e));
    }
  };

  const total = data ? Object.values(data.counts).reduce((a, b) => a + b, 0) : 0;
  const todayStr = today();

  return (
    <div className="space-y-4">
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          <button onClick={() => { setStatus(""); setDue(false); }} className={clsx("rounded-xl border p-3 text-left transition", !status && !due ? "border-amber-400/50 bg-amber-500/10" : "border-white/10 bg-white/[0.02] hover:bg-white/5")}>
            <div className="text-[10px] uppercase tracking-wide text-neutral-500">Semua</div>
            <div className="text-xl font-bold text-neutral-100">{total}</div>
          </button>
          {LEAD_STATUSES.map((s) => (
            <button key={s} onClick={() => { setStatus(s); setDue(false); }} className={clsx("rounded-xl border p-3 text-left transition", status === s ? "border-amber-400/50 bg-amber-500/10" : "border-white/10 bg-white/[0.02] hover:bg-white/5")}>
              <div className="text-[10px] uppercase tracking-wide text-neutral-500 truncate">{LEAD_STATUS_LABEL[s].replace(" (Jadi Pelanggan)", "")}</div>
              <div className="text-xl font-bold text-neutral-100">{data.counts[s]}</div>
            </button>
          ))}
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs text-neutral-500">Cari</label>
            <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="nama, alamat, telepon, kontak" />
          </div>
          <div className="w-44">
            <label className="text-xs text-neutral-500">Kota</label>
            <select className={inputCls} value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">Semua kota</option>
              {data?.cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Button variant={due ? "primary" : "secondary"} onClick={() => { setDue(!due); setStatus(""); }}>
            Jatuh Tempo Follow Up{data ? ` (${data.dueCount})` : ""}
          </Button>
          <a href={`/api/platform-admin/leads/export?${query}`} className="rounded-lg px-3 py-2 text-sm font-medium bg-white/5 border border-white/10 text-neutral-100 hover:bg-white/10">Export Excel</a>
          <Button variant="secondary" onClick={() => setShowAdd(true)}>+ Lead Manual</Button>
        </div>
      </Card>

      <Card>
        {!data ? (
          <p className="text-sm text-neutral-500">Memuat...</p>
        ) : data.leads.length === 0 ? (
          <p className="text-sm text-neutral-500">
            {total === 0 ? "Belum ada prospek. Mulai dari tab \"Cari di Google Maps\" atau tambah lead manual." : "Tidak ada prospek yang cocok dengan filter."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-neutral-500 border-b border-white/10">
                  <th className="py-2 pr-3">Usaha</th>
                  <th className="py-2 pr-3">Kota</th>
                  <th className="py-2 pr-3">Kontak</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Follow Up</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {data.leads.map((l) => {
                  const overdue = !!l.nextFollowUpDate && l.nextFollowUpDate <= todayStr && !LEAD_CLOSED_STATUSES.includes(l.status);
                  return (
                    <tr key={l.id} className="border-b border-white/5 align-top hover:bg-white/[0.02]">
                      <td className="py-2 pr-3">
                        <button onClick={() => setOpenId(l.id)} className="text-left text-neutral-100 hover:text-amber-300">{l.name}</button>
                        <div className="text-[11px] text-neutral-500">
                          {l.category ?? (l.source === "manual" ? "Input manual" : "—")}
                          {l.rating != null && ` · ★ ${l.rating} (${l.reviewCount ?? 0})`}
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-neutral-400">{l.city ?? "—"}</td>
                      <td className="py-2 pr-3 text-neutral-300 whitespace-nowrap">
                        {l.contactName && <div className="text-[11px] text-neutral-400">{l.contactName}</div>}
                        {l.phone ?? "—"}
                      </td>
                      <td className="py-2 pr-3">
                        <select value={l.status} onChange={(e) => changeStatus(l, e.target.value as LeadStatus)} className="rounded-md bg-neutral-900 border border-neutral-700 px-2 py-1 text-xs">
                          {LEAD_STATUSES.map((s) => <option key={s} value={s}>{LEAD_STATUS_LABEL[s]}</option>)}
                        </select>
                      </td>
                      <td className={clsx("py-2 pr-3 whitespace-nowrap", overdue ? "text-rose-300 font-medium" : "text-neutral-400")}>
                        {l.nextFollowUpDate ?? "—"}
                        {overdue && <div className="text-[10px]">jatuh tempo</div>}
                      </td>
                      <td className="py-2 whitespace-nowrap space-x-2 text-[12px]">
                        {l.waNumber && <a href={waLink(l.waNumber, l.name)} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">WA</a>}
                        {l.mapsUrl && <a href={l.mapsUrl} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">Maps</a>}
                        <button onClick={() => setOpenId(l.id)} className="text-amber-300 hover:underline">Detail</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {openId && <LeadDetail id={openId} onClose={() => setOpenId(null)} onChanged={load} />}
      {showAdd && <AddLeadModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}

/* ============================== DETAIL LEAD ============================== */

function LeadDetail({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [outlets, setOutlets] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [act, setAct] = useState<{ type: LeadActivityType; content: string; nextFollowUpDate: string }>({ type: "whatsapp", content: "", nextFollowUpDate: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function apply(d: { lead: Lead; activities: Activity[] } | null) {
    if (!d) return;
    setLead(d.lead);
    setActivities(d.activities);
    setForm({
      name: d.lead.name,
      contactName: d.lead.contactName ?? "",
      phone: d.lead.phone ?? "",
      city: d.lead.city ?? "",
      address: d.lead.address ?? "",
      status: d.lead.status,
      nextFollowUpDate: d.lead.nextFollowUpDate ?? "",
      notes: d.lead.notes ?? "",
      convertedOutletId: d.lead.convertedOutletId ?? "",
    });
  }

  const load = useCallback(() => fetchJsonObject<{ lead: Lead; activities: Activity[] }>(`/api/platform-admin/leads/${id}`).then(apply), [id]);

  useEffect(() => {
    load();
    fetchJsonArray<{ id: string; name: string }>("/api/platform-admin/outlets").then(setOutlets);
  }, [load]);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await send(`/api/platform-admin/leads/${id}`, "PATCH", form);
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const logActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!act.content.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await send(`/api/platform-admin/leads/${id}/activities`, "POST", {
        type: act.type,
        content: act.content,
        ...(act.nextFollowUpDate && { nextFollowUpDate: act.nextFollowUpDate }),
      });
      setAct({ ...act, content: "", nextFollowUpDate: "" });
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!(await showConfirm(`Hapus prospek "${lead?.name}" beserta seluruh riwayat aktivitasnya?`, { tone: "danger" }))) return;
    await send(`/api/platform-admin/leads/${id}`, "DELETE");
    onChanged();
    onClose();
  };

  const field = (key: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="text-xs text-neutral-500">{label}</label>
      <input className={inputCls} value={form[key] ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} {...props} />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <Card className="p-5 space-y-5">
          {!lead ? (
            <p className="text-sm text-neutral-500">Memuat detail...</p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-neutral-100">{lead.name}</div>
                  <div className="text-xs text-neutral-500">
                    {lead.category ?? "—"}
                    {lead.rating != null && ` · ★ ${lead.rating} (${lead.reviewCount ?? 0} ulasan)`}
                    {" · "}
                    {lead.source === "google_maps" ? `Google Maps: "${lead.searchQuery ?? "-"}"` : "Input manual"}
                  </div>
                  <div className="flex gap-3 mt-2 text-[12px]">
                    {lead.waNumber && <a href={waLink(lead.waNumber, lead.name)} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">Chat WhatsApp</a>}
                    {lead.phone && <a href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`} className="text-cyan-400 hover:underline">Telepon</a>}
                    {lead.mapsUrl && <a href={lead.mapsUrl} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">Google Maps</a>}
                    {lead.website && <a href={lead.website} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">Website</a>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={lead.status} />
                  <Button variant="ghost" onClick={onClose}>Tutup</Button>
                </div>
              </div>

              {error && <p className="text-xs text-rose-400">{error}</p>}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {field("name", "Nama Usaha")}
                {field("contactName", "Nama Pemilik / Kontak")}
                {field("phone", "Telepon")}
                {field("city", "Kota")}
                <div className="sm:col-span-2">{field("address", "Alamat")}</div>
                <div>
                  <label className="text-xs text-neutral-500">Status</label>
                  <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {LEAD_STATUSES.map((s) => <option key={s} value={s}>{LEAD_STATUS_LABEL[s]}</option>)}
                  </select>
                </div>
                {field("nextFollowUpDate", "Follow Up Berikutnya", { type: "date" })}
                <div>
                  <label className="text-xs text-neutral-500">Tautkan ke Outlet NEXBILL</label>
                  <select className={inputCls} value={form.convertedOutletId} onChange={(e) => setForm({ ...form, convertedOutletId: e.target.value })}>
                    <option value="">— belum jadi pelanggan —</option>
                    {outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className="text-xs text-neutral-500">Catatan</label>
                  <textarea className={inputCls} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="mis. 6 unit PS4, masih pakai stopwatch, tertarik fitur TV otomatis" />
                </div>
                <div className="sm:col-span-3 flex justify-between">
                  <Button variant="danger" onClick={remove} disabled={busy}>Hapus Prospek</Button>
                  <Button onClick={save} disabled={busy}>{busy ? "Menyimpan..." : "Simpan Perubahan"}</Button>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4 space-y-3">
                <h3 className="gm-heading font-semibold text-sm">Catat Aktivitas Follow Up</h3>
                <form onSubmit={logActivity} className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-end">
                  <div className="sm:col-span-1">
                    <label className="text-xs text-neutral-500">Jenis</label>
                    <select className={inputCls} value={act.type} onChange={(e) => setAct({ ...act, type: e.target.value as LeadActivityType })}>
                      {(["whatsapp", "telepon", "kunjungan", "demo", "email", "catatan"] as const).map((t) => <option key={t} value={t}>{LEAD_ACTIVITY_LABEL[t]}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <label className="text-xs text-neutral-500">Hasil / catatan</label>
                    <input className={inputCls} value={act.content} onChange={(e) => setAct({ ...act, content: e.target.value })} placeholder="mis. Sudah kirim brosur, minta dihubungi lagi minggu depan" />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="text-xs text-neutral-500">Follow up lagi</label>
                    <input type="date" className={inputCls} value={act.nextFollowUpDate} onChange={(e) => setAct({ ...act, nextFollowUpDate: e.target.value })} />
                  </div>
                  <Button type="submit" disabled={busy || !act.content.trim()}>Catat</Button>
                </form>

                {activities.length === 0 ? (
                  <p className="text-sm text-neutral-500">Belum ada aktivitas.</p>
                ) : (
                  <ol className="space-y-2">
                    {activities.map((a) => (
                      <li key={a.id} className="border-l-2 border-white/10 pl-3">
                        <div className="text-[11px] text-neutral-500">
                          <span className={a.type === "status" ? "text-amber-300" : "text-cyan-300"}>{LEAD_ACTIVITY_LABEL[a.type]}</span>
                          {" · "}{fmtDateTime(a.createdAt)}{a.createdByName && ` · ${a.createdByName}`}
                        </div>
                        <div className="text-sm text-neutral-200">{a.content}</div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ============================== TAMBAH LEAD MANUAL ============================== */

function AddLeadModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: "", contactName: "", phone: "", city: "", address: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await send("/api/platform-admin/leads", "POST", form);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const input = (key: keyof typeof form, label: string, placeholder = "") => (
    <div>
      <label className="text-xs text-neutral-500">{label}</label>
      <input className={inputCls} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <Card className="p-5">
          <form onSubmit={submit} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="gm-heading font-semibold">Tambah Lead Manual</h2>
              <Button type="button" variant="ghost" onClick={onClose}>Tutup</Button>
            </div>
            {error && <p className="text-xs text-rose-400">{error}</p>}
            {input("name", "Nama Usaha *", "mis. Rental PS Galaxy")}
            <div className="grid grid-cols-2 gap-2">
              {input("contactName", "Nama Pemilik / Kontak")}
              {input("phone", "Telepon / WA", "08xxx")}
            </div>
            {input("city", "Kota")}
            {input("address", "Alamat")}
            {input("notes", "Catatan", "mis. kenalan dari grup FB pengusaha rental PS")}
            <Button type="submit" disabled={busy || !form.name.trim()}>{busy ? "Menyimpan..." : "Simpan"}</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
