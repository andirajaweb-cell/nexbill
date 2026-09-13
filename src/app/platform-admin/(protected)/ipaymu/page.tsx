"use client";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/**
 * Moved here from dashboard/payments/page.tsx on 2026-09-13, per the same "ONE shared account, not
 * outlet-scoped" reasoning as platform-admin/tuya: IPAYMU_VA/IPAYMU_API_KEY/IPAYMU_BASE_URL are a
 * single set of env vars used by every outlet's POS/rental checkout AND NEXBILL's own subscription
 * billing (see lib/payments/adapters/ipaymu.ts). An individual outlet Owner testing this connection
 * was really testing/seeing NEXBILL's platform-wide merchant account, not anything of their own —
 * this belongs here instead. Adding a NEW payment channel to a specific outlet's own POS/rental
 * method list (the "+ Tambah" buttons) IS legitimately outlet-scoped and stays on
 * dashboard/payments/page.tsx unchanged; only these two diagnostic panels moved.
 */

interface IpaymuChannelStatus {
  categoryCode: string;
  categoryName: string;
  code: string;
  name: string;
  featureStatus: string;
  healthStatus: string;
}

export default function PlatformIpaymuPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold text-amber-300">iPaymu (Gateway)</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Satu akun iPaymu yang sama dipakai untuk checkout POS/Rental semua outlet dan untuk tagihan langganan NEXBILL sendiri (IPAYMU_VA/IPAYMU_API_KEY/IPAYMU_BASE_URL di environment server) — bukan sesuatu yang diatur per outlet, makanya pengecekannya di sini.
        </p>
      </div>

      <Card className="space-y-2">
        <IpaymuConnectionTest />
        <IpaymuChannelStatusPanel />
      </Card>

      <Card>
        <h2 className="font-medium mb-2">Webhook URLs (gateway lain — Fastpay/BukuPay)</h2>
        <p className="text-xs text-neutral-500 mb-2">
          Moved here from dashboard/payments/page.tsx on 2026-09-13 — outlets can never act on this (registering a URL in Fastpay/BukuPay's own merchant dashboard, and setting FASTPAY_*/BUKUPAY_* server env vars, are both platform-level tasks), so it never belonged on an outlet-facing page. Kalau ada gateway alternatif yang disambungkan dengan kredensial live, daftarkan URL ini di dashboard masing-masing gateway:
        </p>
        <ul className="text-xs font-mono text-neutral-400 space-y-1">
          <li>https://dashboard.nexbill.id/api/payments/webhook/fastpay</li>
          <li>https://dashboard.nexbill.id/api/payments/webhook/bukupay</li>
        </ul>
      </Card>
    </div>
  );
}

function IpaymuConnectionTest() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ configured: boolean; baseUrl?: string; va?: string; merchantBalance?: string; memberBalance?: string; error?: string } | null>(null);

  const runTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      const res = await fetch("/api/platform-admin/ipaymu/test-connection", { method: "POST" });
      const out = await res.json().catch(() => ({ error: `Server merespons status ${res.status} tanpa isi JSON.` }));
      setResult(out);
    } catch (err: any) {
      setResult({ configured: true, error: `Gagal menguji koneksi: ${err?.message ?? "kesalahan tidak diketahui"}.` });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button variant="secondary" className="text-xs" onClick={runTest} disabled={testing}>
          {testing ? "Menguji koneksi..." : "Test Koneksi iPaymu"}
        </Button>
        <p className="text-[11px] text-neutral-600">Memanggil API Check Balance iPaymu langsung — bukti nyata kredensial di server benar-benar terhubung, bukan cuma env var terisi.</p>
      </div>

      {result && !result.configured && (
        <div className="text-xs rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 p-2">
          Belum dikonfigurasi — IPAYMU_BASE_URL/IPAYMU_VA/IPAYMU_API_KEY belum diisi di environment variables server. Semua kanal iPaymu saat ini berjalan dalam mode simulasi (mock), transaksi tidak benar-benar terkirim ke iPaymu.
        </div>
      )}
      {result && result.configured && !result.error && (
        <div className="text-xs rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 p-2 space-y-0.5">
          <div>Terhubung — kredensial valid dan iPaymu merespons.</div>
          <div className="text-neutral-400">
            Base URL: <span className="font-mono">{result.baseUrl}</span> · VA: <span className="font-mono">{result.va}</span>
          </div>
          <div className="text-neutral-400">
            Saldo Merchant: Rp{Number(result.merchantBalance ?? 0).toLocaleString("id-ID")} · Saldo Member: Rp{Number(result.memberBalance ?? 0).toLocaleString("id-ID")}
          </div>
        </div>
      )}
      {result && result.configured && result.error && (
        <div className="text-xs rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 p-2 space-y-0.5">
          <div>Gagal terhubung — kredensial terisi tapi iPaymu menolak permintaan.</div>
          <div className="font-mono text-[11px]">{result.error}</div>
          <div className="text-neutral-400 mt-1">
            Cek: (1) IPAYMU_VA &amp; IPAYMU_API_KEY sepasang dan berasal dari mode yang sama (Sandbox atau Production) dengan IPAYMU_BASE_URL, (2) tidak ada spasi/karakter tersembunyi saat menyalin dari dashboard iPaymu, (3) untuk mode Production, IP server &amp; domain notify/return/cancel URL sudah didaftarkan &amp; disetujui iPaymu.
          </div>
        </div>
      )}
    </div>
  );
}

function IpaymuChannelStatusPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ configured: boolean; channels?: IpaymuChannelStatus[]; error?: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform-admin/ipaymu/channels");
      const out = await res.json().catch(() => ({ error: `Server merespons status ${res.status} tanpa isi JSON.` }));
      setResult(out);
    } catch (err: any) {
      setResult({ configured: true, error: `Gagal memuat status kanal: ${err?.message ?? "kesalahan tidak diketahui"}.` });
    } finally {
      setLoading(false);
    }
  };

  const grouped = new Map<string, IpaymuChannelStatus[]>();
  for (const ch of result?.channels ?? []) {
    const list = grouped.get(ch.categoryName) ?? [];
    list.push(ch);
    grouped.set(ch.categoryName, list);
  }

  return (
    <div className="pt-2 border-t border-neutral-800 space-y-2">
      <div className="flex items-center gap-2">
        <Button variant="secondary" className="text-xs" onClick={load} disabled={loading}>
          {loading ? "Memuat status kanal..." : "Status Kanal iPaymu"}
        </Button>
        <p className="text-[11px] text-neutral-600">Menampilkan status online/aktif tiap kanal langsung dari iPaymu — bedakan kanal gagal karena iPaymu sedang gangguan vs masalah di sistem kita.</p>
      </div>

      {result && !result.configured && (
        <div className="text-xs rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 p-2">
          Belum dikonfigurasi — IPAYMU_BASE_URL/IPAYMU_VA/IPAYMU_API_KEY belum diisi di environment variables server. Semua kanal iPaymu saat ini berjalan dalam mode simulasi (mock), transaksi tidak benar-benar terkirim ke iPaymu.
        </div>
      )}
      {result && result.configured && result.error && (
        <div className="text-xs rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 p-2 font-mono">{result.error}</div>
      )}
      {result && result.configured && !result.error && (
        <div className="space-y-2">
          {[...grouped.entries()].map(([categoryName, channels]) => (
            <div key={categoryName} className="text-xs">
              <div className="text-neutral-500 uppercase tracking-wide text-[10px] mb-1">{categoryName}</div>
              <div className="flex flex-wrap gap-1.5">
                {channels.map((ch) => {
                  const online = ch.healthStatus.toLowerCase() === "online" && ch.featureStatus.toLowerCase() === "active";
                  return (
                    <span
                      key={ch.code}
                      title={`Fitur: ${ch.featureStatus} · Kesehatan: ${ch.healthStatus}`}
                      className={`px-2 py-1 rounded-lg border flex items-center gap-1.5 ${online ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${online ? "bg-emerald-400" : "bg-red-400"}`} />
                      {ch.name}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
          {grouped.size === 0 && <div className="text-xs text-neutral-600">Tidak ada data kanal dikembalikan iPaymu.</div>}
        </div>
      )}
    </div>
  );
}
