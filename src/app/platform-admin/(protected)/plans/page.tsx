"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fetchJsonArray } from "@/lib/api/fetch-json";

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;
const inputCls = "w-full rounded-lg bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm";

/**
 * Katalog paket NEXBILL (struktur harga 2026-10 — lihat src/lib/subscription/pricing.ts):
 *  - tier "starter" + model "per_unit": Harga = per unit PS aktif per bulan, minimal Min. Unit.
 *    Fitur operasional saja (akuntansi, aset, PPOB, anti-fraud, multi-cabang, rental ke rumah dikunci).
 *  - tier "pro" + model "flat": Harga = per outlet per bulan, unit tak terbatas, semua fitur + AI.
 * Bulan Tagih Tahunan = berapa bulan yang dibayar untuk 12 bulan aktif. Diskon Cabang = potongan
 * untuk outlet Pro ke-2 dst dalam satu grup penagihan.
 */
const EMPTY_FORM = {
  code: "",
  name: "",
  tier: "pro",
  pricingModel: "flat",
  priceOriginal: "",
  priceCurrent: "",
  minUnits: "1",
  annualMonthsCharged: "10",
  multiOutletDiscountPct: "20",
  smartPlugPrice: "275000",
  setupServicePrice: "125000",
  aiAddonPriceMonthly: "149000",
  unlimitedEntitlement: false,
};

const NUMERIC = ["priceOriginal", "priceCurrent", "minUnits", "annualMonthsCharged", "multiOutletDiscountPct", "smartPlugPrice", "setupServicePrice", "aiAddonPriceMonthly"];

function PlanFields({ form, setForm }: { form: any; setForm: (f: any) => void }) {
  const num = (key: string, label: string) => (
    <div>
      <label className="text-xs text-neutral-500">{label}</label>
      <input type="number" className={inputCls} value={form[key] ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </div>
  );
  const perUnit = form.pricingModel === "per_unit";
  return (
    <>
      <div>
        <label className="text-xs text-neutral-500">Nama</label>
        <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div>
        <label className="text-xs text-neutral-500">Tier (batas fitur)</label>
        <select className={inputCls} value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>
          <option value="starter">Starter — operasional saja</option>
          <option value="pro">Pro — semua fitur + AI</option>
        </select>
      </div>
      <div>
        <label className="text-xs text-neutral-500">Model Harga</label>
        <select className={inputCls} value={form.pricingModel} onChange={(e) => setForm({ ...form, pricingModel: e.target.value })}>
          <option value="per_unit">Per unit PS / bulan</option>
          <option value="flat">Flat per outlet / bulan</option>
        </select>
      </div>
      {num("priceCurrent", perUnit ? "Harga per unit / bulan" : "Harga per outlet / bulan")}
      {num("priceOriginal", "Harga coret (opsional, = harga jika tidak ada)")}
      {perUnit && num("minUnits", "Minimal unit ditagih")}
      {num("annualMonthsCharged", "Bulan ditagih utk tahunan (aktif 12)")}
      {!perUnit && num("multiOutletDiscountPct", "Diskon cabang ke-2 dst (%)")}
      {num("aiAddonPriceMonthly", "Harga AI Add-on / bulan")}
      {num("smartPlugPrice", "Harga Smart Plug")}
      {num("setupServicePrice", "Harga Jasa Setup")}
    </>
  );
}

function toPayload(form: any) {
  const out: Record<string, unknown> = { ...form };
  for (const k of NUMERIC) if (out[k] !== undefined && out[k] !== "") out[k] = Number(out[k]);
  if (!out.priceOriginal) out.priceOriginal = out.priceCurrent;
  return out;
}

export default function PlatformPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newForm, setNewForm] = useState<any>(EMPTY_FORM);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => fetchJsonArray<any>("/api/platform-admin/plans").then((p) => { setPlans(p); setLoading(false); });
  useEffect(() => { load(); }, []);

  const send = async (url: string, method: string, body: unknown) => {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error ?? "Gagal menyimpan.");
    }
  };

  const createPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.code || !newForm.name) return;
    setBusy(true);
    setError(null);
    try {
      await send("/api/platform-admin/plans", "POST", toPayload(newForm));
      setNewForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (p: any) => { setEditing(p.id); setEditForm({ ...p }); };

  const saveEdit = async () => {
    setBusy(true);
    setError(null);
    try {
      await send(`/api/platform-admin/plans/${editing}`, "PATCH", toPayload(editForm));
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (p: any) => {
    await send(`/api/platform-admin/plans/${p.id}`, "PATCH", { isActive: !p.isActive }).catch((err) => setError(String(err?.message ?? err)));
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold text-amber-300">Produk Langganan</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Katalog paket yang tampil di checkout outlet dan landing page. Struktur standar: <b>Starter</b> (per unit, minimal unit, fitur operasional) dan{" "}
          <b>Pro</b> (flat per outlet, semua fitur + AI). Tahunan = bayar N bulan, aktif 12 bulan. Outlet berstatus gratis selamanya tidak terpengaruh.
        </p>
      </div>

      {error && <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</div>}

      <Card>
        <h2 className="gm-heading font-semibold mb-3">Paket Terdaftar</h2>
        {loading ? (
          <p className="text-sm text-neutral-500">Memuat...</p>
        ) : plans.length === 0 ? (
          <p className="text-sm text-neutral-500">Belum ada paket.</p>
        ) : (
          <div className="space-y-3">
            {plans.map((p) => (
              <div key={p.id} className="rounded-lg border border-white/10 p-3">
                {editing === p.id ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <PlanFields form={editForm} setForm={setEditForm} />
                    </div>
                    <label className="flex items-center gap-2 text-xs text-neutral-400">
                      <input type="checkbox" checked={!!editForm.unlimitedEntitlement} onChange={(e) => setEditForm({ ...editForm, unlimitedEntitlement: e.target.checked })} />
                      Tandai &quot;Unlimited&quot; (semua flag fitur modul aktif setelah bayar — biasanya hanya untuk Pro)
                    </label>
                    <div className="flex gap-2">
                      <Button onClick={saveEdit} disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</Button>
                      <Button variant="ghost" onClick={() => setEditing(null)}>Batal</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="text-sm font-medium text-neutral-100">
                        {p.name} <span className="text-neutral-600">({p.code})</span>
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 align-middle uppercase">{p.tier}</span>
                        {p.unlimitedEntitlement && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 align-middle">Unlimited</span>}
                      </div>
                      <div className="text-xs text-neutral-500 mt-0.5">
                        {p.pricingModel === "per_unit"
                          ? `${rupiah(p.priceCurrent)}/unit/bulan · minimal ${p.minUnits} unit`
                          : `${rupiah(p.priceCurrent)}/outlet/bulan · diskon cabang ke-2 dst ${p.multiOutletDiscountPct}%`}
                        {p.priceOriginal > p.priceCurrent ? ` (coret ${rupiah(p.priceOriginal)})` : ""} · tahunan bayar {p.annualMonthsCharged} bln · AI Add-on{" "}
                        {rupiah(p.aiAddonPriceMonthly)} · smart plug {rupiah(p.smartPlugPrice)} · setup {rupiah(p.setupServicePrice)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleActive(p)} className={`text-xs px-2 py-1 rounded-lg ${p.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-neutral-500"}`}>
                        {p.isActive ? "Aktif" : "Nonaktif"}
                      </button>
                      <Button variant="secondary" onClick={() => startEdit(p)}>Edit</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="gm-heading font-semibold mb-3">Tambah Paket Baru</h2>
        <form onSubmit={createPlan} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <label className="text-xs text-neutral-500">Kode (unik)</label>
            <input className={inputCls} value={newForm.code} onChange={(e) => setNewForm({ ...newForm, code: e.target.value })} placeholder="pro-promo" />
          </div>
          <PlanFields form={newForm} setForm={setNewForm} />
          <label className="col-span-2 sm:col-span-4 flex items-center gap-2 text-xs text-neutral-400">
            <input type="checkbox" checked={newForm.unlimitedEntitlement} onChange={(e) => setNewForm({ ...newForm, unlimitedEntitlement: e.target.checked })} />
            Tandai &quot;Unlimited&quot; (semua flag fitur modul aktif setelah bayar — biasanya hanya untuk Pro)
          </label>
          <Button type="submit" disabled={busy} className="col-span-2 sm:col-span-4 w-fit">{busy ? "Menyimpan..." : "Tambah Paket"}</Button>
        </form>
      </Card>
    </div>
  );
}
