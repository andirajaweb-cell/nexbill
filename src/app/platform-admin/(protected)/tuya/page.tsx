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
  maxControllableDevices: number;
  usedDevices: number;
  hasAccessSecret: boolean;
  updatedAt: string;
}

export default function PlatformTuyaPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ accessId: "", accessSecret: "", projectCode: "", region: "sg", maxControllableDevices: 10 });
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
    setForm({ accessId: data.accessId ?? "", accessSecret: "", projectCode: data.projectCode ?? "", region: data.region ?? "sg", maxControllableDevices: data.maxControllableDevices ?? 10 });
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
      setForm({ accessId: data.accessId ?? "", accessSecret: "", projectCode: data.projectCode ?? "", region: data.region ?? "sg", maxControllableDevices: data.maxControllableDevices ?? 10 });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold text-amber-300">Tuya Cloud API (Akun Bersama — Legacy)</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Sejak 2026-09-15, akun/Cloud Project di halaman ini BUKAN lagi default untuk outlet baru — setiap outlet baru wajib mengisi Tuya Cloud API miliknya SENDIRI di Settings mereka (lihat lib/devices/adapters/tuya.ts). Akun bersama ini hanya dipakai oleh outlet yang secara eksplisit ditandai "tuyaUseSharedPlatformAccount" dari halaman detail outlet masing-masing (mis. Xtream Playstation) — pengecualian legacy, bukan jalur utama. Access Secret tidak pernah ditampilkan setelah disimpan, hanya bisa diganti.
        </p>
      </div>

      <Card className="space-y-2">
        <p className="text-xs text-neutral-500">
          <span className="text-neutral-300 font-medium">Region Singapore (sg)</span> mencakup: {SG_DC_COUNTRIES}. Kredensial di bawah hanya berlaku untuk outlet yang ditandai memakai akun bersama ini. Outlet lain mengatur Tuya Cloud API-nya sendiri lewat Pengaturan mereka masing-masing, tidak lewat halaman ini.
        </p>
      </Card>

      {account && (
        <Card className={`space-y-1 border ${account.usedDevices >= account.maxControllableDevices ? "border-red-700/50 bg-red-950/20" : account.usedDevices >= account.maxControllableDevices * 0.8 ? "border-amber-700/50 bg-amber-950/20" : "border-white/10"}`}>
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Kapasitas Device Terpakai (Pool Bersama)</h2>
            <span className={`text-lg font-bold ${account.usedDevices >= account.maxControllableDevices ? "text-red-400" : account.usedDevices >= account.maxControllableDevices * 0.8 ? "text-amber-400" : "text-emerald-400"}`}>
              {account.usedDevices} / {account.maxControllableDevices}
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            Jumlah device dengan protokol Tuya milik outlet-outlet yang ditandai memakai akun bersama ini (pengecualian legacy). Kalau sudah penuh, penambahan device Tuya baru lewat akun ini akan ditolak otomatis (lihat assertSharedTuyaCapacityAvailable di lib/devices/adapters/tuya.ts) — pindahkan outlet ke akun Tuya sendiri, atau naikkan angka "Kapasitas Maksimal" di bawah kalau sudah upgrade tier langganan Tuya.
          </p>
        </Card>
      )}

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
              <div>
                <label className="text-xs text-neutral-500">Kapasitas Maksimal Device (sesuai tier Tuya — Trial=10)</label>
                <input
                  type="number"
                  min={0}
                  className={inputCls}
                  value={form.maxControllableDevices}
                  onChange={(e) => setForm({ ...form, maxControllableDevices: Math.max(0, Number(e.target.value) || 0) })}
                />
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
