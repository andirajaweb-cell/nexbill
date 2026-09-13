"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fetchJsonArray, fetchJsonObject } from "@/lib/api/fetch-json";
import { useApi } from "@/lib/api/use-api";
import { useAuth } from "@/lib/auth/client";
import { hasPermission } from "@/lib/auth/permissions";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-payments";

/** Fixed, exact key <-> label pairs for the "Aktifkan Kanal iPaymu" quick-add panel — must match
 * ALLOWED_PRESET_KEYS in /api/payment-methods/route.ts and the registry in lib/payments/index.ts
 * exactly, letter for letter, or the channel silently falls back to the generic manual gateway
 * instead of actually calling iPaymu. Not derived from PAYMENT_METHOD_LABEL to avoid an accidental
 * import of a server-oriented module tree into this client page; kept as its own small, obviously
 * correct list instead. "ipaymu_crossborder" deliberately omitted — that channel is wired only for
 * the platform-billing/subscription checkout, not outlet POS/Rental.
 */
const IPAYMU_QUICK_ADD: { key: string; label: string }[] = [
  { key: "ipaymu_qris", label: "QRIS (iPaymu)" },
  { key: "ipaymu_va_bca", label: "VA BCA (iPaymu)" },
  { key: "ipaymu_va_bni", label: "VA BNI (iPaymu)" },
  { key: "ipaymu_va_mandiri", label: "VA Mandiri (iPaymu)" },
  { key: "ipaymu_va_bri", label: "VA BRI (iPaymu)" },
  { key: "ipaymu_va_permata", label: "VA Permata (iPaymu)" },
  { key: "ipaymu_dana", label: "DANA (iPaymu)" },
  { key: "ipaymu_shopeepay", label: "ShopeePay (iPaymu)" },
  { key: "ipaymu_alfamart", label: "Alfamart (iPaymu)" },
  { key: "ipaymu_indomaret", label: "Indomaret (iPaymu)" },
  { key: "ipaymu_hosted", label: "iPaymu (Pilih Kanal)" },
];

type Method = {
  id: string;
  key: string;
  label: string;
  kind: "cash" | "balance_tracked" | "info_only";
  isActive: boolean;
  sortOrder: number;
  feePercent: number;
};

// Module-level map — can't call useDashboardLang() here since hooks require a component. Each
// component that needs a kind's descriptive label resolves it via kindLabel(kind, t) below.
const KIND_LABEL_KEY: Record<Method["kind"], { key: string; fallback: string }> = {
  cash: { key: "payments.kind.cash", fallback: "Tunai (hitung fisik saat tutup shift)" },
  balance_tracked: { key: "payments.kind.balanceTracked", fallback: "Saldo Terlacak (cek saldo app saat tutup shift)" },
  info_only: { key: "payments.kind.infoOnly", fallback: "Info Saja (langsung masuk bank/EDC, tanpa cek saldo)" },
};
function kindLabel(kind: Method["kind"], t: (key: string, fallback?: string) => string) {
  const entry = KIND_LABEL_KEY[kind];
  return t(entry.key, entry.fallback);
}

export default function PaymentsPage() {
  const { t } = useDashboardLang();
  const { user } = useAuth();
  const role = (user?.role ?? "cashier") as any;
  const canManage = hasPermission(role, "manage_settings");

  const [outletId, setOutletId] = useState<string | null>(null);
  const [methods, setMethods] = useState<Method[]>([]);

  const { data: outlet } = useApi<{ id: string }>("/api/outlets/default");
  useEffect(() => {
    if (outlet) setOutletId(outlet.id);
  }, [outlet]);

  const load = () => {
    if (outletId) fetchJsonArray(`/api/payment-methods?outletId=${outletId}`).then(setMethods);
  };
  useEffect(() => { load(); }, [outletId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold gm-gradient-title">{t("payments.title", "Pembayaran")}</h1>
        <p className="text-sm text-neutral-500">{t("payments.subtitle", "Metode pembayaran yang bisa dipilih kasir di POS, Rental, dan Pendapatan Lain-lain. Tambah, ubah nama, nonaktifkan, atau hapus sesuai kebutuhan outlet — perubahan langsung berlaku di halaman kasir. Atur juga Biaya (%) per metode (mis. MDR QRIS) — biaya ini otomatis dipotong dari kas/bank setiap transaksi masuk lewat metode itu dan dibukukan sebagai beban di jurnal.")}</p>
      </div>

      {outletId && <MethodsPanel outletId={outletId} methods={methods} canManage={canManage} onChanged={load} />}

      {outletId && canManage && <IpaymuQuickAdd outletId={outletId} methods={methods} onChanged={load} />}

      <Card>
        <h2 className="font-medium mb-2">{t("payments.webhookTitle", "Webhook URLs (gateway QRIS/e-wallet live)")}</h2>
        <p className="text-xs text-neutral-500 mb-2">{t("payments.webhookDesc", "Kalau ada metode yang disambungkan ke Fastpay/BukuPay dengan kredensial live (isi env FASTPAY_*/BUKUPAY_*), daftarkan URL ini di dashboard masing-masing gateway:")}</p>
        <ul className="text-xs font-mono text-neutral-400 space-y-1">
          <li>https://domain-kamu.com/api/payments/webhook/fastpay</li>
          <li>https://domain-kamu.com/api/payments/webhook/bukupay</li>
        </ul>
      </Card>
    </div>
  );
}

function MethodsPanel({ outletId, methods, canManage, onChanged }: { outletId: string; methods: Method[]; canManage: boolean; onChanged: () => void }) {
  const { t } = useDashboardLang();
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<Method["kind"]>("info_only");
  const [isActive, setIsActive] = useState(true);
  const [feePercent, setFeePercent] = useState("0");
  const [editingId, setEditingId] = useState<string | null>(null);

  const startEdit = (m: Method) => { setEditingId(m.id); setLabel(m.label); setKind(m.kind); setIsActive(m.isActive); setFeePercent(String(m.feePercent ?? 0)); };
  const resetForm = () => { setEditingId(null); setLabel(""); setKind("info_only"); setIsActive(true); setFeePercent("0"); };

  const save = async () => {
    if (!label.trim()) return showAlert(t("payments.alertNameRequired", "Isi nama metode pembayaran."));
    const res = await fetch("/api/payment-methods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, outletId, label, kind, isActive, feePercent: Number(feePercent) || 0 }),
    });
    const out = await res.json();
    if (!res.ok) return showAlert(out.error);
    resetForm();
    onChanged();
  };

  const remove = async (m: Method) => {
    if (!await showConfirm(t("payments.confirmDelete", 'Hapus metode pembayaran "{label}"? Transaksi lama tidak berubah, hanya hilang dari pilihan kasir ke depannya.').replace("{label}", m.label))) return;
    const res = await fetch(`/api/payment-methods/${m.id}`, { method: "DELETE" });
    const out = await res.json();
    if (!res.ok) return showAlert(out.error);
    onChanged();
  };

  return (
    <Card className="space-y-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-neutral-500 border-b border-neutral-800">
            <th className="py-2">{t("payments.table.name", "Nama")}</th>
            <th>{t("payments.table.key", "Key")}</th>
            <th>{t("payments.table.kind", "Jenis")}</th>
            <th>{t("payments.table.fee", "Biaya (%)")}</th>
            <th>{t("payments.table.status", "Status")}</th>
            {canManage && <th></th>}
          </tr>
        </thead>
        <tbody>
          {methods.map((m) => (
            <tr key={m.id} className="border-b border-neutral-900 align-top">
              <td className="py-2 font-medium">{m.label}</td>
              <td className="text-xs text-neutral-500 font-mono">{m.key}</td>
              <td className="text-xs text-neutral-400">{kindLabel(m.kind, t)}</td>
              <td className="text-xs text-neutral-400">{m.feePercent > 0 ? `${m.feePercent}%` : "—"}</td>
              <td>
                <Badge status={m.isActive ? "on" : "off"}>{m.isActive ? t("payments.active", "Aktif") : t("payments.inactive", "Nonaktif")}</Badge>
              </td>
              {canManage && (
                <td className="flex gap-1 py-2 whitespace-nowrap">
                  <Button variant="ghost" className="text-xs" onClick={() => startEdit(m)}>{t("payments.edit", "Edit")}</Button>
                  {m.kind !== "cash" && <Button variant="ghost" className="text-xs text-red-400" onClick={() => remove(m)}>{t("payments.delete", "Hapus")}</Button>}
                </td>
              )}
            </tr>
          ))}
          {methods.length === 0 && (
            <tr><td colSpan={canManage ? 6 : 5} className="py-4 text-center text-neutral-500 text-xs">{t("payments.loading", "Memuat metode pembayaran…")}</td></tr>
          )}
        </tbody>
      </table>

      {canManage && (
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-2 border-t border-neutral-800 items-end">
          <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs sm:col-span-2" placeholder={t("payments.labelPlaceholder", "Nama metode (mis. OVO, ShopeePay)")} value={label} onChange={(e) => setLabel(e.target.value)} disabled={!!editingId && methods.find((m) => m.id === editingId)?.kind === "cash"} />
          <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" value={kind} onChange={(e) => setKind(e.target.value as Method["kind"])} disabled={!!editingId && methods.find((m) => m.id === editingId)?.kind === "cash"}>
            <option value="info_only">{t("payments.kindOption.infoOnly", "Info Saja")}</option>
            <option value="balance_tracked">{t("payments.kindOption.balanceTracked", "Saldo Terlacak")}</option>
          </select>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs"
            placeholder={t("payments.feePlaceholder", "Biaya % (mis. 0.7)")}
            value={feePercent}
            onChange={(e) => setFeePercent(e.target.value)}
            title={t("payments.feeTitle", "Biaya (MDR) yang dipotong dari kas/bank tiap transaksi masuk lewat metode ini, mis. 0.7 untuk QRIS. Kosongkan/0 kalau tidak ada biaya.")}
          />
          <label className="flex items-center gap-2 text-xs text-neutral-400">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={!!editingId && methods.find((m) => m.id === editingId)?.kind === "cash"}
            />
            {t("payments.active", "Aktif")}
          </label>
          <div className="flex gap-1 sm:col-span-5">
            <Button className="text-xs" onClick={save}>{editingId ? t("payments.save", "Simpan") : t("payments.addMethod", "Tambah Metode")}</Button>
            {editingId && <Button variant="ghost" className="text-xs" onClick={resetForm}>{t("payments.cancel", "Batal")}</Button>}
          </div>
        </div>
      )}
    </Card>
  );
}

function IpaymuQuickAdd({ outletId, methods, onChanged }: { outletId: string; methods: Method[]; onChanged: () => void }) {
  const { t } = useDashboardLang();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const existingKeys = new Set(methods.map((m) => m.key));

  const addChannel = async (key: string, label: string) => {
    setBusyKey(key);
    try {
      const res = await fetch("/api/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outletId, label, kind: "info_only", isActive: true, feePercent: 0, presetKey: key }),
      });
      const out = await res.json();
      if (!res.ok) return showAlert(out.error);
      onChanged();
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <Card className="space-y-2">
      <h2 className="font-medium">{t("payments.ipaymu.title", "Aktifkan Kanal iPaymu")}</h2>
      <p className="text-xs text-neutral-500">{t("payments.ipaymu.desc", "Klik untuk menambah kanal iPaymu ke daftar metode pembayaran outlet ini dengan key yang sudah pasti benar (jangan tambah manual lewat form di atas — resiko salah ketik key, kanal jadi tidak tersambung ke iPaymu). Setelah ditambah, kanal langsung muncul sebagai pilihan di kasir POS/Rental. Transaksi nyata baru berjalan setelah kredensial IPAYMU_VA/IPAYMU_API_KEY di server valid untuk mode (sandbox/produksi) yang aktif — selama belum valid, kanal ini berjalan dalam mode simulasi (mock).")}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        {IPAYMU_QUICK_ADD.map(({ key, label }) => {
          const added = existingKeys.has(key);
          return (
            <Button
              key={key}
              variant={added ? "ghost" : "secondary"}
              className="text-xs"
              disabled={added || busyKey === key}
              onClick={() => addChannel(key, label)}
              title={label}
            >
              {label} — {added ? t("payments.ipaymu.added", "Sudah ditambah") : t("payments.ipaymu.add", "+ Tambah")}
            </Button>
          );
        })}
      </div>
      <IpaymuConnectionTest />
      <IpaymuChannelStatusPanel />
    </Card>
  );
}

interface IpaymuChannelStatus {
  categoryCode: string;
  categoryName: string;
  code: string;
  name: string;
  featureStatus: string;
  healthStatus: string;
}

/**
 * "Status Kanal iPaymu" — GET /api/v2/payment-channels (see checkIpaymuChannels in
 * lib/payments/adapters/ipaymu.ts). Separate from "Test Koneksi" above: that one proves the
 * server's credentials authenticate at all; this one shows, PER CHANNEL, whether iPaymu's own
 * infrastructure currently reports it online/active — so a failing VA BCA payment can be told
 * apart as "iPaymu says BCA is offline right now" vs. an actual bug in this app's integration.
 */
function IpaymuChannelStatusPanel() {
  const { t } = useDashboardLang();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ configured: boolean; channels?: IpaymuChannelStatus[]; error?: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payment-methods/ipaymu/channels");
      const out = await res.json().catch(() => ({ error: `Server merespons status ${res.status} tanpa isi JSON.` }));
      if (!res.ok) return showAlert(out.error ?? `Gagal (status ${res.status}).`);
      setResult(out);
    } catch (err: any) {
      showAlert(`Gagal memuat status kanal: ${err?.message ?? "kesalahan tidak diketahui"}.`);
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
          {loading ? t("payments.ipaymu.channelsLoading", "Memuat status kanal...") : t("payments.ipaymu.channelsButton", "Status Kanal iPaymu")}
        </Button>
        <p className="text-[11px] text-neutral-600">{t("payments.ipaymu.channelsHint", "Menampilkan status online/aktif tiap kanal langsung dari iPaymu — bedakan kanal gagal karena iPaymu sedang gangguan vs masalah di sistem kita.")}</p>
      </div>

      {result && !result.configured && (
        <div className="text-xs rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 p-2">
          {t("payments.ipaymu.testNotConfigured", "Belum dikonfigurasi — IPAYMU_BASE_URL/IPAYMU_VA/IPAYMU_API_KEY belum diisi di environment variables server. Semua kanal iPaymu saat ini berjalan dalam mode simulasi (mock), transaksi tidak benar-benar terkirim ke iPaymu.")}
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
                      title={`${t("payments.ipaymu.channelsFeature", "Fitur")}: ${ch.featureStatus} · ${t("payments.ipaymu.channelsHealth", "Kesehatan")}: ${ch.healthStatus}`}
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
          {grouped.size === 0 && <div className="text-xs text-neutral-600">{t("payments.ipaymu.channelsEmpty", "Tidak ada data kanal dikembalikan iPaymu.")}</div>}
        </div>
      )}
    </div>
  );
}

/**
 * "Test Koneksi iPaymu" — answers "apakah iPaymu sudah pasti berjalan, bagaimana cara ceknya"
 * directly in-app: hits iPaymu's real Check Balance API through the server's configured
 * credentials (see checkIpaymuConnection's own doc comment for why this — not just "a channel was
 * added" — is the real proof of a working connection) and shows exactly one of three outcomes:
 * not configured yet (mock mode), configured and genuinely connected (with the live balance from
 * iPaymu as proof), or configured but rejected (with iPaymu's own error message, e.g. wrong
 * VA/API Key pair or sandbox/production credentials mismatched with the active base URL).
 */
function IpaymuConnectionTest() {
  const { t } = useDashboardLang();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ configured: boolean; baseUrl?: string; va?: string; merchantBalance?: string; memberBalance?: string; error?: string } | null>(null);

  const runTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      const res = await fetch("/api/payment-methods/ipaymu/test-connection", { method: "POST" });
      const out = await res.json().catch(() => ({ error: `Server merespons status ${res.status} tanpa isi JSON.` }));
      if (!res.ok) return showAlert(out.error ?? `Gagal (status ${res.status}).`);
      setResult(out);
    } catch (err: any) {
      showAlert(`Gagal menguji koneksi: ${err?.message ?? "kesalahan tidak diketahui"}. Cek koneksi internet lalu coba lagi.`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="pt-2 border-t border-neutral-800 space-y-2">
      <div className="flex items-center gap-2">
        <Button variant="secondary" className="text-xs" onClick={runTest} disabled={testing}>
          {testing ? t("payments.ipaymu.testing", "Menguji koneksi...") : t("payments.ipaymu.testButton", "Test Koneksi iPaymu")}
        </Button>
        <p className="text-[11px] text-neutral-600">{t("payments.ipaymu.testHint", "Memanggil API Check Balance iPaymu langsung — bukti nyata kredensial di server benar-benar terhubung, bukan cuma env var terisi.")}</p>
      </div>

      {result && !result.configured && (
        <div className="text-xs rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 p-2">
          {t("payments.ipaymu.testNotConfigured", "Belum dikonfigurasi — IPAYMU_BASE_URL/IPAYMU_VA/IPAYMU_API_KEY belum diisi di environment variables server. Semua kanal iPaymu saat ini berjalan dalam mode simulasi (mock), transaksi tidak benar-benar terkirim ke iPaymu.")}
        </div>
      )}
      {result && result.configured && !result.error && (
        <div className="text-xs rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 p-2 space-y-0.5">
          <div>{t("payments.ipaymu.testSuccess", "Terhubung — kredensial valid dan iPaymu merespons.")}</div>
          <div className="text-neutral-400">
            {t("payments.ipaymu.testBaseUrl", "Base URL:")} <span className="font-mono">{result.baseUrl}</span> · {t("payments.ipaymu.testVa", "VA:")} <span className="font-mono">{result.va}</span>
          </div>
          <div className="text-neutral-400">
            {t("payments.ipaymu.testMerchantBalance", "Saldo Merchant:")} Rp{Number(result.merchantBalance ?? 0).toLocaleString("id-ID")} · {t("payments.ipaymu.testMemberBalance", "Saldo Member:")} Rp{Number(result.memberBalance ?? 0).toLocaleString("id-ID")}
          </div>
        </div>
      )}
      {result && result.configured && result.error && (
        <div className="text-xs rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 p-2 space-y-0.5">
          <div>{t("payments.ipaymu.testFailed", "Gagal terhubung — kredensial terisi tapi iPaymu menolak permintaan.")}</div>
          <div className="font-mono text-[11px]">{result.error}</div>
          <div className="text-neutral-400 mt-1">
            {t(
              "payments.ipaymu.testFailedHint",
              "Cek: (1) IPAYMU_VA & IPAYMU_API_KEY sepasang dan berasal dari mode yang sama (Sandbox atau Production) dengan IPAYMU_BASE_URL, (2) tidak ada spasi/karakter tersembunyi saat menyalin dari dashboard iPaymu, (3) untuk mode Production, IP server & domain notify/return/cancel URL sudah didaftarkan & disetujui iPaymu."
            )}
          </div>
        </div>
      )}
    </div>
  );
}
