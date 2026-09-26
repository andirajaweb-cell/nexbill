"use client";
import { useState } from "react";
import { Layers, Scale, Ban, Info } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProcessingOverlay } from "@/components/ui/ProcessingOverlay";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { useAuth } from "@/lib/auth/client";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";

/**
 * Pilihan metode harga modal (penilaian persediaan) — ditampilkan di tab Belanja Supplier.
 * Logikanya di lib/inventory/costing.ts; hanya Owner yang boleh menggantinya.
 */

export type CostMethod = "average" | "fifo";
export interface CostMethodInfo {
  method: CostMethod;
  since: string | null;
  layers: { productId: string; receivedAt: string; qtyRemaining: number; unitCost: number; source: string }[];
  drift: number;
}

const OPTIONS: { value: CostMethod | "lifo"; title: string; icon: React.ReactNode; text: string; example: string; disabled?: boolean }[] = [
  {
    value: "average",
    title: "Rata-rata tertimbang",
    icon: <Scale size={16} />,
    text: "Setiap belanja dicampur dengan stok yang ada, sehingga harga modal = rata-rata harga semua unit di gudang. Paling sederhana dan stabil — cocok untuk sebagian besar outlet.",
    example: "Stok 10 @ Rp3.000 + beli 10 @ Rp4.000 → harga modal Rp3.500. Jual 5 → HPP 5 × Rp3.500 = Rp17.500.",
  },
  {
    value: "fifo",
    title: "FIFO — masuk pertama, keluar pertama",
    icon: <Layers size={16} />,
    text: "Barang yang dibeli lebih dulu dianggap terjual lebih dulu. HPP mengikuti harga belanja terlama yang masih ada; sisa stok bernilai harga belanja terbaru. Cocok untuk barang yang harganya sering naik atau punya kedaluwarsa.",
    example: "Stok 10 @ Rp3.000 + beli 10 @ Rp4.000. Jual 12 → HPP 10 × Rp3.000 + 2 × Rp4.000 = Rp38.000; sisa 8 @ Rp4.000.",
  },
  {
    value: "lifo",
    title: "LIFO — tidak tersedia",
    icon: <Ban size={16} />,
    text: "Masuk terakhir keluar pertama tidak diperbolehkan oleh SAK EMKM / PSAK 14 dan UU PPh Pasal 10 ayat (6) — laporan keuangan dan SPT yang memakainya tidak sesuai standar dan aturan pajak.",
    example: "",
    disabled: true,
  },
];

export function CostMethodCard({ info, onChanged }: { info: CostMethodInfo | null; onChanged: () => void }) {
  const { t } = useDashboardLang();
  const { user } = useAuth();
  const role = (user?.role ?? "cashier") as StaffRole;
  const canChange = hasPermission(role, "manage_coa") && hasPermission(role, "manage_inventory_purchasing");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  if (!info) return null;
  const current = OPTIONS.find((o) => o.value === info.method)!;

  const change = async (method: CostMethod) => {
    if (method === info.method) return;
    const msg =
      method === "fifo"
        ? t(
            "inventory.costMethod.confirmFifo",
            "Ganti ke FIFO? Stok yang ada sekarang menjadi lapisan pertama sebesar stok × harga modal saat ini (nilai persediaan tidak berubah). Mulai sekarang HPP setiap penjualan dihitung dari lapisan belanja terlama. Pajak mensyaratkan metode dipakai konsisten — jangan sering berganti."
          )
        : t(
            "inventory.costMethod.confirmAverage",
            "Ganti ke rata-rata tertimbang? Harga modal saat ini menjadi titik awal rata-rata, dan HPP berikutnya memakai harga rata-rata. Pajak mensyaratkan metode dipakai konsisten — jangan sering berganti."
          );
    if (!(await showConfirm(msg))) return;
    setBusy(true);
    try {
      const res = await fetch("/api/inventory/cost-method", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ method }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return showAlert(data.error ?? "Gagal mengganti metode.");
      onChanged();
      showAlert(
        method === "fifo"
          ? t("inventory.costMethod.switchedFifo", "Metode harga modal sekarang FIFO. {n} produk ber-stok dibuatkan lapisan pembuka.").replace("{n}", String(data.layers ?? 0))
          : t("inventory.costMethod.switchedAverage", "Metode harga modal sekarang rata-rata tertimbang.")
      );
    } finally {
      setBusy(false);
    }
  };

  const reconcile = async () => {
    if (!(await showConfirm(t("inventory.costMethod.confirmReconcile", "Samakan jumlah lapisan FIFO dengan stok saat ini? Kelebihan lapisan dihabiskan dari yang tertua; kekurangan ditambah dengan harga modal sekarang.")))) return;
    setBusy(true);
    try {
      const res = await fetch("/api/inventory/cost-method", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reconcile: true }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return showAlert(data.error ?? "Gagal.");
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-3 border-sky-500/25">
      {busy && <ProcessingOverlay message={t("inventory.costMethod.processing", "Memproses metode harga modal...")} hint={t("inventory.costMethod.processingHint", "Jangan tutup halaman ini.")} />}
      <button className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setOpen((o) => !o)}>
        <div>
          <div className="text-xs text-neutral-500">{t("inventory.costMethod.label", "Metode harga modal (penilaian persediaan)")}</div>
          <div className="flex items-center gap-1.5 font-medium text-sky-300">
            {current.icon} {t(`inventory.costMethod.${current.value}`, current.title)}
          </div>
          {info.since && <div className="text-[11px] text-neutral-500">{t("inventory.costMethod.since", "Berlaku sejak {date}").replace("{date}", new Date(info.since).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }))}</div>}
        </div>
        <span className="shrink-0 text-xs text-sky-400">{open ? t("inventory.costMethod.hide", "Tutup") : t("inventory.costMethod.show", "Lihat / ubah")}</span>
      </button>

      {open && (
        <div className="space-y-3">
          <div className="grid gap-2 md:grid-cols-3">
            {OPTIONS.map((o) => {
              const active = o.value === info.method;
              return (
                <div
                  key={o.value}
                  className={`rounded-lg border p-3 text-xs space-y-1.5 ${active ? "border-emerald-500/60 bg-emerald-500/5" : o.disabled ? "border-neutral-800 opacity-60" : "border-neutral-700"}`}
                >
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    {o.icon} {o.title}
                    {active && <span className="ml-auto rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300">{t("inventory.costMethod.active", "Dipakai")}</span>}
                  </div>
                  <p className="text-neutral-400">{o.text}</p>
                  {o.example && <p className="text-neutral-500 italic">{o.example}</p>}
                  {!active && !o.disabled && canChange && (
                    <Button variant="secondary" className="text-xs px-2 py-1" disabled={busy} onClick={() => change(o.value as CostMethod)}>
                      {t("inventory.costMethod.use", "Pakai metode ini")}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          <p className="flex gap-1.5 text-[11px] text-neutral-500">
            <Info size={12} className="mt-0.5 shrink-0" />
            {t(
              "inventory.costMethod.note",
              "Metode apa pun: ongkos kirim/parkir tetap dibagi ke harga modal tiap barang, harga modal langsung tampil di tab Produk, dan HPP penjualan otomatis masuk jurnal Accounting. Hanya Owner yang dapat mengganti metode."
            )}
          </p>
          {info.method === "fifo" && info.drift > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-300">
              {t("inventory.costMethod.drift", "{n} produk: jumlah lapisan FIFO berbeda dengan stok (mis. stok diubah lewat jalur lama).").replace("{n}", String(info.drift))}
              {canChange && (
                <Button variant="secondary" className="text-xs px-2 py-1" disabled={busy} onClick={reconcile}>
                  {t("inventory.costMethod.reconcile", "Samakan lapisan")}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/** Rincian lapisan FIFO satu produk — dipakai tab Produk. */
export function FifoLayerList({ layers, unit, formatMoney }: { layers: CostMethodInfo["layers"]; unit: string; formatMoney: (n: number) => string }) {
  const SOURCE: Record<string, string> = { purchase: "Belanja", opening: "Stok awal", adjustment: "Penyesuaian", restock: "Retur/void", switch: "Saldo pindah metode" };
  if (!layers.length) return <div className="text-xs text-neutral-500">Belum ada lapisan — harga modal memakai harga terakhir.</div>;
  return (
    <div className="space-y-0.5 text-xs">
      {layers.map((l, i) => (
        <div key={i} className="flex justify-between gap-4">
          <span className="text-neutral-400">
            {i === 0 ? "▶ " : ""}
            {new Date(l.receivedAt).toLocaleDateString("id-ID")} · {SOURCE[l.source] ?? l.source}
          </span>
          <span>
            {Math.round(l.qtyRemaining * 100) / 100} {unit} × {formatMoney(l.unitCost)}
          </span>
        </div>
      ))}
      <div className="pt-1 text-[11px] text-neutral-500">▶ = lapisan yang keluar berikutnya saat terjual</div>
    </div>
  );
}
