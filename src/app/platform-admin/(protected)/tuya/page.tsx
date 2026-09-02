"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";

const inputCls = "w-full rounded-lg bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm";
const REGIONS: { value: string; label: string }[] = [
  { value: "sg", label: "sg — Singapore Data Center (Indonesia & Asia Tenggara)" },
  { value: "cn", label: "cn — China Data Center" },
  { value: "us", label: "us — Western America Data Center" },
  { value: "us_e", label: "us_e — Eastern America Data Center" },
  { value: "eu", label: "eu — Central Europe Data Center" },
  { value: "eu_w", label: "eu_w — Western Europe Data Center" },
  { value: "in", label: "in — India Data Center" },
];

const SG_DC_COUNTRIES = "Indonesia, Vietnam, Laos, Kamboja, Thailand, Myanmar, Malaysia, Singapura, Filipina, Brunei, Timor-Leste, Papua Nugini, Kepulauan Solomon, Hong Kong, Macau, Taipei";

interface Account {
  id: string;
  accessId: string;
  accessSecret: string; // masked
  projectCode: string;
  region: string;
  hasAccessSecret: boolean;
  updatedAt: string;
}

export default function PlatformTuyaPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ accessId: "", accessSecret: "", projectCode: "", region: "sg" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/platform-admin/tuya");
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "Gagal memuat akun Tuya Cloud API.");
      setLoading(false);
      return;
    }
    setAccount(data);
    setForm({ accessId: data.accessId ?? "", accessSecret: "", projectCode: data.projectCode ?? "", region: data.region ?? "sg" });
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/platform-admin/tuya", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Gagal menyimpan akun Tuya Cloud API.");
        return;
      }
      setAccount(data);
      setForm({ accessId: data.accessId ?? "", accessSecret: "", projectCode: data.projectCode ?? "", region: data.region ?? "sg" });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold text-amber-300">Tuya Cloud API</h1>
        <p className="text-sm text-neutral-500 mt-1">
          SATU akun/Cloud Project Tuya bersama, dipakai untuk mengendalikan smart plug di SEMUA outlet/merchant — domestik Indonesia maupun negara lain — bukan lagi kredensial per-outlet. Access Secret tidak pernah ditampilkan setelah disimpan, hanya bisa diganti.
        </p>
      </div>

      <Card className="space-y-2">
        <p className="text-xs text-neutral-500">
          <span className="text-neutral-300 font-medium">Region Singapore (sg)</span> mencakup: {SG_DC_COUNTRIES}. Selama akun Tuya Smart/Smart Life setiap merchant didaftarkan dengan negara yang termasuk daftar ini, satu akun ini cukup untuk menghubungkan device mereka semua. Merchant di negara di luar cakupan data center ini (mis. jauh di luar Asia Tenggara) butuh Cloud Project terpisah — belum didukung modul ini.
        </p>
      </Card>

      <Card className="space-y-3">
        {loading ? (
          <p className="text-sm text-neutral-500">Memuat...</p>
        ) : (
          <>
            {error && <p className="text-xs text-red-400">{error}</p>}
            {account && (
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-1 rounded-lg ${account.hasAccessSecret ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-neutral-500"}`}>
                  {account.hasAccessSecret ? "Terhubung" : "Belum dikonfigurasi"}
                </span>
                {account.hasAccessSecret && account.accessSecret && <span className="text-xs text-neutral-500 font-mono">Secret: {account.accessSecret}</span>}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-500">Access ID / Client ID</label>
                <input className={inputCls} value={form.accessId} onChange={(e) => setForm({ ...form, accessId: e.target.value })} placeholder="mis. qvn7v5spkfa8ykc4f9vc" />
              </div>
              <div>
                <label className="text-xs text-neutral-500">Access Secret / Client Secret (kosongkan jika tidak diganti)</label>
                <PasswordInput className={inputCls} value={form.accessSecret} onChange={(e) => setForm({ ...form, accessSecret: e.target.value })} placeholder="••••••••" />
              </div>
              <div>
                <label className="text-xs text-neutral-500">Project Code</label>
                <input className={inputCls} value={form.projectCode} onChange={(e) => setForm({ ...form, projectCode: e.target.value })} placeholder="mis. p1786788401221w9c4g9" />
              </div>
              <div>
                <label className="text-xs text-neutral-500">Region / Data Center</label>
                <select className={inputCls} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>
                  {REGIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={save} disabled={busy}>{busy ? "Menyimpan..." : saved ? "Tersimpan!" : "Simpan"}</Button>
              {account?.updatedAt && <span className="text-xs text-neutral-600">Terakhir diubah: {new Date(account.updatedAt).toLocaleString("id-ID")}</span>}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
