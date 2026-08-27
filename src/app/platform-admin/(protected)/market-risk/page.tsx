"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fetchJsonArray } from "@/lib/api/fetch-json";
import { LANG_OPTIONS } from "@/lib/i18n/registry";

const inputCls = "w-full rounded-lg bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm";

const EMPTY_FORM = { code: "", label: "", langCode: "", manualRateIdrPerUnit: "", markupPercent: "0" };

type CurrencyRow = {
  id: string;
  code: string;
  label: string;
  langCode: string | null;
  apiRateIdrPerUnit: number | null;
  manualRateIdrPerUnit: number | null;
  markupPercent: number;
  isActive: boolean;
  lastFetchedAt: string | null;
};

type Plan = { id: string; code: string; name: string; priceCurrent: number; unlimitedEntitlement: boolean; isActive: boolean };

/** Same precedence as effectiveRateIdrPerUnit() in lib/market-risk/currency.ts — duplicated here
 * (not imported) because that file also imports the Postgres db client, which can't run in the
 * browser bundle. Keep the two in sync if the rate logic ever changes. */
function effectiveRate(row: Pick<CurrencyRow, "apiRateIdrPerUnit" | "manualRateIdrPerUnit" | "markupPercent">): number | null {
  if (row.manualRateIdrPerUnit != null && row.manualRateIdrPerUnit > 0) return row.manualRateIdrPerUnit;
  if (row.apiRateIdrPerUnit != null && row.apiRateIdrPerUnit > 0) return row.apiRateIdrPerUnit * (1 + row.markupPercent / 100);
  return null;
}

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;

export default function MarketRiskPage() {
  const [rows, setRows] = useState<CurrencyRow[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [newForm, setNewForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  /** Every mutation below goes through this so a failed request (wrong/missing table, validation
   * error, etc.) actually surfaces to the admin instead of failing silently — fetch() only
   * throws on a network-level failure, never on a 4xx/5xx response, so res.ok must be checked
   * explicitly. */
  async function submitJson(url: string, method: string, body?: unknown): Promise<{ ok: boolean; data: any }> {
    try {
      const res = await fetch(url, {
        method,
        headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return { ok: false, data };
      return { ok: true, data };
    } catch (err) {
      return { ok: false, data: { error: err instanceof Error ? err.message : "Gagal menghubungi server." } };
    }
  }

  /** fetchJsonArray silently returns [] on any server error, which made a broken load (e.g. the
   * market_risk_currencies table not existing yet because `npm run db:push` hasn't been run)
   * look identical to "no currencies added yet" — check the currencies response directly so a
   * real failure is visible instead of silently indistinguishable from an empty list. */
  const load = async () => {
    try {
      const res = await fetch("/api/platform-admin/market-risk/currencies");
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFormError(`Gagal memuat daftar mata uang: ${data?.error ?? "terjadi kesalahan."} Jika ini baru pertama kali dibuka, jalankan "npm run db:push" dulu untuk membuat tabelnya di database.`);
        setRows([]);
      } else {
        setRows(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menghubungi server.");
      setRows([]);
    }
    const p = await fetchJsonArray<Plan>("/api/platform-admin/plans");
    setPlans(p);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const unlimitedPlans = plans.filter((p) => p.unlimitedEntitlement && p.isActive);

  const createCurrency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.code || !newForm.label) return;
    setBusy(true);
    setFormError(null);
    try {
      const { ok, data } = await submitJson("/api/platform-admin/market-risk/currencies", "POST", {
        ...newForm,
        langCode: newForm.langCode || null,
        manualRateIdrPerUnit: newForm.manualRateIdrPerUnit ? Number(newForm.manualRateIdrPerUnit) : null,
        markupPercent: Number(newForm.markupPercent || 0),
      });
      if (!ok) {
        setFormError(data?.error ?? "Gagal menambah mata uang.");
        return;
      }
      setNewForm(EMPTY_FORM);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (r: CurrencyRow) => { setEditing(r.id); setEditForm({ ...r }); setFormError(null); };

  const saveEdit = async () => {
    setBusy(true);
    setFormError(null);
    try {
      const { ok, data } = await submitJson(`/api/platform-admin/market-risk/currencies/${editing}`, "PATCH", {
        label: editForm.label,
        langCode: editForm.langCode || null,
        manualRateIdrPerUnit: editForm.manualRateIdrPerUnit === "" || editForm.manualRateIdrPerUnit == null ? null : Number(editForm.manualRateIdrPerUnit),
        markupPercent: Number(editForm.markupPercent || 0),
        isActive: editForm.isActive,
      });
      if (!ok) {
        setFormError(data?.error ?? "Gagal menyimpan perubahan.");
        return;
      }
      setEditing(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (r: CurrencyRow) => {
    setFormError(null);
    const { ok, data } = await submitJson(`/api/platform-admin/market-risk/currencies/${r.id}`, "PATCH", { isActive: !r.isActive });
    if (!ok) { setFormError(data?.error ?? "Gagal mengubah status."); return; }
    await load();
  };

  const deleteCurrency = async (r: CurrencyRow) => {
    if (!confirm(`Hapus mata uang ${r.code}? Tindakan ini tidak bisa dibatalkan.`)) return;
    setBusy(true);
    setFormError(null);
    try {
      const { ok, data } = await submitJson(`/api/platform-admin/market-risk/currencies/${r.id}`, "DELETE");
      if (!ok) { setFormError(data?.error ?? "Gagal menghapus mata uang."); return; }
      await load();
    } finally {
      setBusy(false);
    }
  };

  const refreshRates = async () => {
    setRefreshing(true);
    setRefreshMsg(null);
    try {
      const res = await fetch("/api/platform-admin/market-risk/refresh", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setRefreshMsg(`Gagal: ${data?.error ?? "terjadi kesalahan."}`);
      } else {
        const { updated, failed } = data as { updated: string[]; failed: string[] };
        setRefreshMsg(
          `Berhasil update: ${updated.length ? updated.join(", ") : "-"}` +
            (failed.length ? ` · Gagal: ${failed.join(", ")}` : "")
        );
      }
      await load();
    } catch {
      setRefreshMsg("Gagal menghubungi API kurs — cek koneksi/konfigurasi MARKET_RISK_FX_API_URL.");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold text-amber-300">Market Risk (Kurs Lintas Negara)</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Kelola risiko nilai tukar untuk penjualan langganan NEXBILL Standard lintas negara (MYR, USD, THB, VND, PHP) via{" "}
          <a href="https://ipaymu.com/id/cross-border-transaction/" target="_blank" rel="noreferrer" className="underline text-amber-400/80">
            iPaymu cross-border
          </a>
          . Kurs referensi diambil dari API, admin menambahkan markup% sebagai buffer risiko fluktuasi kurs — atau override manual penuh.
        </p>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="gm-heading font-semibold">Daftar Mata Uang</h2>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={refreshRates} disabled={refreshing}>{refreshing ? "Mengambil kurs..." : "Refresh Kurs dari API"}</Button>
          </div>
        </div>
        {refreshMsg && <p className="text-xs text-neutral-400 mb-3">{refreshMsg}</p>}
        {formError && <p className="text-xs text-red-400 mb-3">{formError}</p>}
        {loading ? (
          <p className="text-sm text-neutral-500">Memuat...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-neutral-500">Belum ada mata uang. Tambahkan lewat form di bawah.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const rate = effectiveRate(r);
              return (
                <div key={r.id} className="rounded-lg border border-white/10 p-3">
                  {editing === r.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div><label className="text-xs text-neutral-500">Label</label><input className={inputCls} value={editForm.label} onChange={(e) => setEditForm({ ...editForm, label: e.target.value })} /></div>
                        <div>
                          <label className="text-xs text-neutral-500">Bahasa Terkait</label>
                          <select className={inputCls} value={editForm.langCode ?? ""} onChange={(e) => setEditForm({ ...editForm, langCode: e.target.value })}>
                            <option value="">-</option>
                            {LANG_OPTIONS.filter((l) => l.code !== "id").map((l) => (
                              <option key={l.code} value={l.code}>{l.label}</option>
                            ))}
                          </select>
                        </div>
                        <div><label className="text-xs text-neutral-500">Kurs Manual (IDR/unit)</label><input type="number" className={inputCls} placeholder="kosongkan = pakai API" value={editForm.manualRateIdrPerUnit ?? ""} onChange={(e) => setEditForm({ ...editForm, manualRateIdrPerUnit: e.target.value })} /></div>
                        <div><label className="text-xs text-neutral-500">Markup (%)</label><input type="number" className={inputCls} value={editForm.markupPercent} onChange={(e) => setEditForm({ ...editForm, markupPercent: e.target.value })} /></div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={saveEdit} disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</Button>
                        <Button variant="ghost" onClick={() => setEditing(null)}>Batal</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <div className="text-sm font-medium text-neutral-100">
                          {r.code} <span className="text-neutral-600">— {r.label}</span>
                          {r.manualRateIdrPerUnit != null && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 align-middle">Manual Override</span>}
                        </div>
                        <div className="text-xs text-neutral-500 mt-0.5">
                          {rate != null ? (
                            <>Kurs efektif: {rupiah(rate)}/unit{r.apiRateIdrPerUnit != null && r.manualRateIdrPerUnit == null && ` (API ${rupiah(r.apiRateIdrPerUnit)} + markup ${r.markupPercent}%)`}</>
                          ) : (
                            <span className="text-amber-400/80">Belum ada kurs — isi manual atau klik Refresh Kurs dari API</span>
                          )}
                          {r.lastFetchedAt && <> · terakhir refresh {new Date(r.lastFetchedAt).toLocaleString("id-ID")}</>}
                        </div>
                        {rate != null && unlimitedPlans.length > 0 && (
                          <div className="text-xs text-neutral-600 mt-1">
                            {unlimitedPlans.map((p) => `${p.name}: ${r.code} ${(p.priceCurrent / rate).toLocaleString("id-ID", { maximumFractionDigits: 2 })}`).join(" · ")}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleActive(r)} className={`text-xs px-2 py-1 rounded-lg ${r.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-neutral-500"}`}>
                          {r.isActive ? "Aktif" : "Nonaktif"}
                        </button>
                        <Button variant="secondary" onClick={() => startEdit(r)}>Edit</Button>
                        <Button variant="ghost" onClick={() => deleteCurrency(r)} disabled={busy}>Hapus</Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="gm-heading font-semibold mb-3">Tambah Mata Uang</h2>
        <form onSubmit={createCurrency} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div><label className="text-xs text-neutral-500">Kode (ISO 4217)</label><input className={inputCls} value={newForm.code} onChange={(e) => setNewForm({ ...newForm, code: e.target.value.toUpperCase() })} placeholder="MYR" /></div>
          <div><label className="text-xs text-neutral-500">Label</label><input className={inputCls} value={newForm.label} onChange={(e) => setNewForm({ ...newForm, label: e.target.value })} placeholder="Ringgit Malaysia" /></div>
          <div>
            <label className="text-xs text-neutral-500">Bahasa Terkait</label>
            <select className={inputCls} value={newForm.langCode} onChange={(e) => setNewForm({ ...newForm, langCode: e.target.value })}>
              <option value="">-</option>
              {LANG_OPTIONS.filter((l) => l.code !== "id").map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>
          <div><label className="text-xs text-neutral-500">Markup (%)</label><input type="number" className={inputCls} value={newForm.markupPercent} onChange={(e) => setNewForm({ ...newForm, markupPercent: e.target.value })} /></div>
          <div className="col-span-2 sm:col-span-4"><label className="text-xs text-neutral-500">Kurs Manual (IDR/unit) — opsional, kosongkan untuk pakai API</label><input type="number" className={inputCls} value={newForm.manualRateIdrPerUnit} onChange={(e) => setNewForm({ ...newForm, manualRateIdrPerUnit: e.target.value })} /></div>
          {formError && <p className="col-span-2 sm:col-span-4 text-xs text-red-400">{formError}</p>}
          <Button type="submit" disabled={busy} className="col-span-2 sm:col-span-4 w-fit">{busy ? "Menyimpan..." : "Tambah Mata Uang"}</Button>
        </form>
      </Card>

      <Card>
        <h2 className="gm-heading font-semibold mb-2">Catatan</h2>
        <p className="text-xs text-neutral-500 leading-relaxed">
          Modul ini baru mengelola kurs &amp; harga lintas negara di panel platform-admin. Tampilan harga multi-mata-uang di landing page/halaman billing outlet (mengikuti setting bahasa dashboard) belum dibangun pada tahap ini — menyusul setelah kurs &amp; markup stabil digunakan. Pembayaran cross-border sungguhan lewat iPaymu butuh kredensial merchant iPaymu asli (lihat .env.example bagian iPaymu Cross-Border) sebelum bisa diuji end-to-end.
        </p>
      </Card>
    </div>
  );
}
