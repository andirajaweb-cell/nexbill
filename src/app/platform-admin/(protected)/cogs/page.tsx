"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fetchJsonObject } from "@/lib/api/fetch-json";

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;
const inputCls = "w-full rounded-lg bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm";

const CATEGORY_LABEL: Record<string, string> = {
  hosting: "Hosting/Server Lainnya",
  database: "Database Lainnya",
  vercel: "Vercel (Hosting)",
  supabase: "Supabase (Database)",
  tuya_cloud: "Tuya Cloud API",
  whatsapp_ai: "WhatsApp Gateway/AI Lainnya",
  openai: "OpenAI (ChatGPT API)",
  claude: "Claude (Anthropic API)",
  payment_gateway: "Payment Gateway",
  domain: "Domain",
  lainnya: "Lainnya",
};

interface Data {
  costs: any[];
  margin: { month: string; revenue: number; cost: number; margin: number }[];
}

export default function PlatformCogsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [form, setForm] = useState({ periodMonth: new Date().toISOString().slice(0, 7), category: "hosting", description: "", amount: "" });
  const [busy, setBusy] = useState(false);

  const load = () => fetchJsonObject<Data>("/api/platform-admin/cogs").then(setData);
  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description || !form.amount) return;
    setBusy(true);
    try {
      await fetch("/api/platform-admin/cogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      });
      setForm({ ...form, description: "", amount: "" });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await fetch(`/api/platform-admin/cogs/${id}`, { method: "DELETE" });
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold text-amber-300">COGS Aplikasi</h1>
        <p className="text-sm text-neutral-500 mt-1">Biaya operasional NEXBILL sebagai aplikasi — hosting/pay-as-you-go (Vercel, Supabase, Tuya, OpenAI, Claude, dll) dan biaya lain — bukan biaya outlet manapun. Untuk pembelian barang fisik (smart plug/produk lain), catat di halaman Pembelian — otomatis ikut dihitung di margin bawah ini.</p>
      </div>

      {data && data.margin.length > 0 && (
        <Card>
          <h2 className="gm-heading font-semibold mb-3">Margin per Bulan (Revenue Langganan − COGS Aplikasi − Pembelian Produk)</h2>
          <div className="space-y-2">
            {data.margin.map((m) => (
              <div key={m.month} className="flex items-center justify-between text-sm border-b border-white/5 pb-2 last:border-0">
                <span className="text-neutral-400">{m.month}</span>
                <span className="text-neutral-500">Rev {rupiah(m.revenue)} − COGS {rupiah(m.cost)} =</span>
                <span className={m.margin >= 0 ? "text-emerald-300 font-semibold" : "text-rose-300 font-semibold"}>{rupiah(m.margin)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="gm-heading font-semibold mb-3">Catat Biaya Baru</h2>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
          <div>
            <label className="text-xs text-neutral-500">Periode</label>
            <input type="month" className={inputCls} value={form.periodMonth} onChange={(e) => setForm({ ...form, periodMonth: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Kategori</label>
            <select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-neutral-500">Deskripsi</label>
            <input className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="mis. Supabase Pro bulan Agustus" />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Jumlah (Rp)</label>
            <input type="number" className={inputCls} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <Button type="submit" disabled={busy} className="sm:col-span-5 w-fit">{busy ? "Menyimpan..." : "Tambah Biaya"}</Button>
        </form>
      </Card>

      <Card>
        <h2 className="gm-heading font-semibold mb-3">Riwayat Biaya</h2>
        {!data ? (
          <p className="text-sm text-neutral-500">Memuat...</p>
        ) : data.costs.length === 0 ? (
          <p className="text-sm text-neutral-500">Belum ada biaya dicatat.</p>
        ) : (
          <div className="space-y-1.5">
            {data.costs.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm border-b border-white/5 pb-2 last:border-0">
                <div>
                  <div className="text-neutral-200">{c.periodMonth} — {CATEGORY_LABEL[c.category] ?? c.category}</div>
                  <div className="text-[11px] text-neutral-500">{c.description}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-rose-300">{rupiah(c.amount)}</span>
                  <button onClick={() => remove(c.id)} className="text-[11px] text-neutral-500 hover:text-rose-400">Hapus</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
