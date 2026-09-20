"use client";
import { useEffect, useRef, useState } from "react";
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

      <SandboxTestPanel />

      <Card>
        <h2 className="font-medium mb-2">Webhook URL (gateway lain — BukuPay)</h2>
        <p className="text-xs text-neutral-500 mb-2">
          Moved here from dashboard/payments/page.tsx on 2026-09-13 — outlets can never act on this (registering a URL in BukuPay&apos;s own merchant dashboard, and setting BUKUPAY_* server env vars, are both platform-level tasks), so it never belonged on an outlet-facing page. Fastpay was removed entirely on 2026-09-16: NEXBILL holds no Fastpay merchant account, and outlet-side QRIS/e-wallet payments are now staff-confirmed into the outlet&apos;s own account rather than routed through an aggregator. Kalau ada gateway alternatif yang disambungkan dengan kredensial live, daftarkan URL ini di dashboard gateway tersebut:
        </p>
        <ul className="text-xs font-mono text-neutral-400 space-y-1">
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

type SandboxTestState = { referenceId: string; amount: number; status: "pending" | "success" | "failed"; rawCallback?: string | null } | null;

/**
 * "Ujicoba Transaksi Sandbox" — runs a REAL checkout->pay->webhook round trip against
 * sandbox.ipaymu.com using the separate IPAYMU_SANDBOX_* credentials (see
 * createIpaymuSandboxTestCheckout's doc comment in lib/payments/adapters/ipaymu.ts). Never touches
 * IPAYMU_VA/IPAYMU_API_KEY, never creates a real order/subscription-invoice row — safe to run any
 * time, as many times as needed, independent of whatever Production is doing.
 */
function SandboxTestPanel() {
  const [starting, setStarting] = useState(false);
  const [test, setTest] = useState<SandboxTestState>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const start = async () => {
    setStarting(true);
    setStartError(null);
    setTest(null);
    if (pollRef.current) clearInterval(pollRef.current);
    try {
      const res = await fetch("/api/platform-admin/ipaymu/sandbox-test/checkout", { method: "POST" });
      const out = await res.json().catch(() => ({ error: `Server merespons status ${res.status} tanpa isi JSON.` }));
      if (!res.ok) {
        setStartError(out.error ?? "Gagal membuat transaksi test.");
        return;
      }
      setTest({ referenceId: out.referenceId, amount: out.amount, status: "pending" });
      window.open(out.checkoutUrl, "_blank", "noopener,noreferrer");

      pollRef.current = setInterval(async () => {
        const pollRes = await fetch(`/api/platform-admin/ipaymu/sandbox-test?referenceId=${encodeURIComponent(out.referenceId)}`);
        const pollOut = await pollRes.json().catch(() => null);
        if (pollRes.ok && pollOut) {
          setTest({ referenceId: out.referenceId, amount: out.amount, status: pollOut.status, rawCallback: pollOut.rawCallback });
          if (pollOut.status === "success" || pollOut.status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
          }
        }
      }, 3000);
    } catch (err: any) {
      setStartError(`Gagal menghubungi server: ${err?.message ?? "kesalahan tidak diketahui"}.`);
    } finally {
      setStarting(false);
    }
  };

  return (
    <Card className="space-y-3 border border-cyan-600/30">
      <div>
        <h2 className="font-medium">Ujicoba Transaksi Sandbox</h2>
        <p className="text-xs text-neutral-500 mt-1">
          Membuat transaksi test Rp10.000 sungguhan lewat <span className="font-mono">sandbox.ipaymu.com</span>, pakai kredensial{" "}
          <span className="font-mono">IPAYMU_SANDBOX_*</span> yang sepenuhnya terpisah dari kredensial Production di atas — tidak akan pernah membuat order/tagihan
          langganan asli, dan tidak butuh VPS proxy (sandbox tidak mensyaratkan IP statis). Perlu env var{" "}
          <span className="font-mono">IPAYMU_SANDBOX_BASE_URL</span>, <span className="font-mono">IPAYMU_SANDBOX_VA</span>, dan{" "}
          <span className="font-mono">IPAYMU_SANDBOX_API_KEY</span> (daftar terpisah di sandbox.ipaymu.com — beda akun dari Production).
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" className="text-xs" onClick={start} disabled={starting}>
          {starting ? "Membuat transaksi..." : "Buat Transaksi Test (Sandbox)"}
        </Button>
        {test && test.status === "pending" && <span className="text-[11px] text-neutral-500">Menunggu pembayaran di tab baru & webhook...</span>}
      </div>

      {startError && <div className="text-xs rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 p-2">{startError}</div>}

      {test && (
        <div className="text-xs space-y-1">
          <div className="text-neutral-400">
            Referensi: <span className="font-mono">{test.referenceId}</span> · Nominal: Rp{test.amount.toLocaleString("id-ID")}
          </div>
          {test.status === "pending" && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 p-2">
              Menunggu — selesaikan pembayaran di tab yang baru terbuka (pakai metode dummy/simulator sandbox iPaymu), status di sini akan otomatis update begitu webhook diterima.
            </div>
          )}
          {test.status === "success" && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 p-2">
              Berhasil — checkout, pembayaran, dan webhook sandbox semuanya jalan sesuai alur.
            </div>
          )}
          {test.status === "failed" && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 p-2">
              Gagal/dibatalkan — cek detail mentah di bawah untuk tahu sebabnya.
            </div>
          )}
          {test.rawCallback && (
            <details className="text-neutral-500">
              <summary className="cursor-pointer hover:text-neutral-300">Lihat payload webhook mentah</summary>
              <pre className="mt-1 whitespace-pre-wrap break-all font-mono text-[10px] text-neutral-400">{test.rawCallback}</pre>
            </details>
          )}
        </div>
      )}
    </Card>
  );
}
