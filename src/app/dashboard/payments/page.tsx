"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fetchJsonArray, fetchJsonObject } from "@/lib/api/fetch-json";
import { useAuth } from "@/lib/auth/client";
import { hasPermission } from "@/lib/auth/permissions";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-payments";

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

  useEffect(() => {
    fetchJsonObject("/api/outlets/default").then((o) => { if (o) setOutletId(o.id); });
  }, []);

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
