"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Wallet, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { fetchJsonObject } from "@/lib/api/fetch-json";
import { showAlert } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-billing";

interface DepositMutation {
  id: string;
  type: "topup" | "usage" | "refund" | "adjustment";
  amount: number;
  balanceAfter: number;
  note: string | null;
  createdAt: string;
}

interface DepositOverview {
  balance: number;
  mutations: DepositMutation[];
  isGroupBalance: boolean;
}

const MUTATION_LABEL: Record<string, { key: string; fallback: string }> = {
  topup: { key: "billing.deposit.type.topup", fallback: "Top Up" },
  usage: { key: "billing.deposit.type.usage", fallback: "Pemakaian" },
  refund: { key: "billing.deposit.type.refund", fallback: "Refund" },
  adjustment: { key: "billing.deposit.type.adjustment", fallback: "Penyesuaian" },
};

/**
 * "Saldo Deposit" + "Daftar Mutasi" tab — mirrors Accurate.id's Informasi Add On / Daftar Mutasi
 * pages, but for NEXBILL this is a genuinely new feature (per the user's own admission when asked
 * — Accurate.id's deposit concept didn't exist here before). Top-up flow: this tab only *creates*
 * an unpaid deposit_topup invoice; paying it (via the normal cash/QRIS/VA/iPaymu buttons on the
 * Dashboard tab's "Tagihan Belum Lunas" card) is what actually credits the balance — see
 * confirmInvoicePayment's deposit_topup branch in lib/subscription/service.ts.
 */
export function DepositTab({ money, onTopupCreated }: { money: (idr: number) => string; onTopupCreated: () => Promise<void> }) {
  const { t } = useDashboardLang();
  const [overview, setOverview] = useState<DepositOverview | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await fetchJsonObject<DepositOverview>("/api/subscription/deposit");
    setOverview(res);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const doTopup = async () => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return showAlert(t("billing.deposit.invalidAmount", "Masukkan jumlah top up yang valid."));
    setBusy(true);
    try {
      const res = await fetch("/api/subscription/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: n }),
      });
      const out = await res.json();
      if (!res.ok) return showAlert(out.error);
      setAmount("");
      await showAlert(t("billing.deposit.invoiceCreated", "Tagihan top up dibuat — selesaikan pembayarannya di bagian Tagihan Belum Lunas."));
      await onTopupCreated();
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Card className="p-4 text-sm text-neutral-500">{t("billing.loading", "Memuat data langganan...")}</Card>;
  if (!overview) return <Card className="p-4 text-sm text-rose-400">{t("billing.deposit.loadFailed", "Gagal memuat saldo deposit.")}</Card>;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-500/10">
              <Wallet size={20} className="text-cyan-300" />
            </div>
            <div>
              <div className="text-xs text-neutral-500">
                {overview.isGroupBalance
                  ? t("billing.deposit.balanceGroupLabel", "Saldo Deposit (gabungan multi-outlet)")
                  : t("billing.deposit.balanceLabel", "Saldo Deposit")}
              </div>
              <div className="text-2xl font-bold text-cyan-300">{money(overview.balance)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              className="w-36 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
              placeholder={t("billing.deposit.amountPlaceholder", "Jumlah (Rp)")}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Button onClick={doTopup} disabled={busy}>
              {busy ? t("billing.common.processing", "Memproses...") : t("billing.deposit.topupButton", "Tambah Deposit")}
            </Button>
          </div>
        </div>
        <p className="text-xs text-neutral-500 mt-3">
          {t("billing.deposit.autoApplyNote", "Saldo deposit otomatis dipakai untuk membayar tagihan perpanjangan langganan berikutnya, sebagian atau penuh, tanpa perlu tindakan tambahan.")}
        </p>
      </Card>

      <Card className="p-4">
        <div className="font-semibold mb-2">{t("billing.deposit.mutationsHeading", "Daftar Mutasi")}</div>
        {overview.mutations.length === 0 && (
          <div className="text-sm text-neutral-600">{t("billing.deposit.noMutations", "Belum ada mutasi saldo deposit.")}</div>
        )}
        <div className="space-y-1.5">
          {overview.mutations.map((m) => (
            <div key={m.id} className="flex items-center justify-between text-sm border-b border-white/5 pb-1.5 last:border-0">
              <div className="flex items-center gap-2">
                {m.amount >= 0 ? <ArrowUpCircle size={14} className="text-emerald-400" /> : <ArrowDownCircle size={14} className="text-rose-400" />}
                <div>
                  <div className="text-neutral-300">{MUTATION_LABEL[m.type] ? t(MUTATION_LABEL[m.type].key, MUTATION_LABEL[m.type].fallback) : m.type}</div>
                  {m.note && <div className="text-xs text-neutral-600">{m.note}</div>}
                </div>
              </div>
              <div className="text-right">
                <div className={m.amount >= 0 ? "text-emerald-400 font-medium" : "text-rose-400 font-medium"}>
                  {m.amount >= 0 ? "+" : ""}
                  {money(m.amount)}
                </div>
                <div className="text-xs text-neutral-600">{t("billing.deposit.balanceAfter", "Saldo: {n}").replace("{n}", money(m.balanceAfter))}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
