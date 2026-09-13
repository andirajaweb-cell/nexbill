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
    </Card>
  );
}
