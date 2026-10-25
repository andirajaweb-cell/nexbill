"use client";
import { useEffect, useState } from "react";
import { Hourglass } from "lucide-react";
import { IntegerInput } from "@/components/ui/IntegerInput";
import { fetchJsonObject } from "@/lib/api/fetch-json";
import { showAlert } from "@/lib/ui/dialog";
import { useCurrency } from "@/lib/currency/client";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-time-credit";

/**
 * Saldo waktu member di halaman Rental (lib/rental/time-credit.ts):
 *  - TimeCreditStartOption: di dialog mulai sesi — pakai N menit saldo (ditambahkan ke durasi, tidak ditagih).
 *  - SaveLeftoverCredit: di kartu "Sesi Selesai" — simpan sisa menit sesi paket/durasi tetap ke saldo.
 */

interface Balance {
  minutes: number;
  value: number;
  migrationMissing?: boolean;
}

export function TimeCreditStartOption({
  customerId,
  promoSelected,
  value,
  onChange,
}: {
  customerId: string | null;
  promoSelected: boolean;
  value: number;
  onChange: (minutes: number) => void;
}) {
  const { t } = useDashboardLang();
  const [balance, setBalance] = useState<Balance | null>(null);

  useEffect(() => {
    setBalance(null);
    onChange(0);
    if (!customerId) return;
    let alive = true;
    fetchJsonObject<Balance>(`/api/customers/${customerId}/time-credit`).then((b) => alive && setBalance(b));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  useEffect(() => {
    if (promoSelected && value) onChange(0);
  }, [promoSelected, value, onChange]);

  if (!balance || balance.migrationMissing || balance.minutes <= 0) return null;
  const on = value > 0;

  return (
    <div className="space-y-1.5 rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-2">
      <label className={`flex items-center gap-2 text-xs ${promoSelected ? "opacity-50" : ""}`}>
        <input
          type="checkbox"
          className="h-3.5 w-3.5 accent-violet-500"
          disabled={promoSelected}
          checked={on}
          onChange={(e) => onChange(e.target.checked ? balance.minutes : 0)}
        />
        <Hourglass size={13} className="text-violet-300" />
        <span>{t("timeCredit.useLabel", "Pakai saldo waktu member ({n} menit tersedia)").replace("{n}", String(balance.minutes))}</span>
      </label>
      {promoSelected ? (
        <p className="text-[10px] text-neutral-400">{t("timeCredit.notWithPromo", "Saldo waktu tidak bisa digabung dengan paket promo — pilih Per Jam atau durasi tetap.")}</p>
      ) : on ? (
        <div className="flex items-center gap-2 text-[11px] text-violet-100">
          <IntegerInput
            className="w-20 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs"
            value={value}
            min={1}
            max={balance.minutes}
            onValueChange={onChange}
          />
          <span>{t("timeCredit.useNote", "menit ditambahkan ke durasi sesi dan tidak ditagih. Sesi menjadi durasi tetap.")}</span>
        </div>
      ) : null}
    </div>
  );
}

interface Leftover {
  eligible: boolean;
  reason?: string;
  minutes: number;
  value: number;
}

export function SaveLeftoverCredit({ sessionId }: { sessionId: string }) {
  const { t } = useDashboardLang();
  const { formatMoney } = useCurrency();
  const [info, setInfo] = useState<Leftover | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetchJsonObject<Leftover>(`/api/rental-sessions/${sessionId}/time-credit`).then((d) => alive && setInfo(d));
    return () => {
      alive = false;
    };
  }, [sessionId]);

  if (saved !== null) {
    return (
      <div className="mb-3 rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs text-violet-100">
        {t("timeCredit.savedToast", "{n} menit disimpan ke saldo waktu member.").replace("{n}", String(saved))}
      </div>
    );
  }
  if (!info?.eligible) return null;

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/rental-sessions/${sessionId}/time-credit`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return showAlert(body.error ?? t("timeCredit.saveFailed", "Gagal menyimpan saldo waktu."));
      setSaved(body.minutes ?? info.minutes);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-2">
      <div className="flex items-start gap-2 text-xs text-violet-100">
        <Hourglass size={14} className="mt-0.5 shrink-0 text-violet-300" />
        <span>
          {t("timeCredit.leftoverPrompt", "Sesi selesai lebih awal — sisa {n} menit (senilai {value}) bisa disimpan ke saldo waktu member untuk kunjungan berikutnya.")
            .replace("{n}", String(info.minutes))
            .replace("{value}", formatMoney(info.value))}
        </span>
      </div>
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="shrink-0 rounded-lg bg-violet-500/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
      >
        {saving ? t("timeCredit.saving", "Menyimpan...") : t("timeCredit.saveButton", "Simpan sisa {n} menit").replace("{n}", String(info.minutes))}
      </button>
    </div>
  );
}

const TYPE_KEYS: Record<string, { key: string; fallback: string }> = {
  save: { key: "timeCredit.type.save", fallback: "Disimpan dari sesi" },
  use: { key: "timeCredit.type.use", fallback: "Dipakai" },
  refund: { key: "timeCredit.type.refund", fallback: "Dikembalikan" },
  reverse: { key: "timeCredit.type.reverse", fallback: "Koreksi (tagihan dibatalkan)" },
  adjust: { key: "timeCredit.type.adjust", fallback: "Koreksi" },
};

interface HistoryRow {
  id: string;
  type: string;
  minutes: number;
  value: number;
  createdAt: string;
}

/** Saldo waktu + riwayat di detail member (halaman Membership). */
export function MemberTimeCreditPanel({ customerId }: { customerId: string }) {
  const { t } = useDashboardLang();
  const { formatMoney } = useCurrency();
  const [data, setData] = useState<(Balance & { history: HistoryRow[] }) | null>(null);

  useEffect(() => {
    let alive = true;
    fetchJsonObject<Balance & { history: HistoryRow[] }>(`/api/customers/${customerId}/time-credit`).then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, [customerId]);

  if (!data || data.migrationMissing) return null;
  return (
    <div className="space-y-2 rounded-xl border border-violet-400/25 bg-violet-500/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Hourglass size={15} className="text-violet-300" /> {t("timeCredit.panelTitle", "Saldo waktu")}
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-violet-200">{t("timeCredit.minutesValue", "{n} menit").replace("{n}", String(data.minutes))}</div>
          <div className="text-[10px] text-neutral-500">{t("timeCredit.valueLabel", "Nilai {value}").replace("{value}", formatMoney(data.value))}</div>
        </div>
      </div>
      <p className="text-[11px] text-neutral-500">
        {t("timeCredit.panelHelp", "Sisa sesi paket/durasi tetap yang berhenti lebih awal bisa disimpan di kartu \"Sesi Selesai\" halaman Rental, lalu dipakai saat mulai sesi berikutnya.")}
      </p>
      {data.history.length > 0 && (
        <ul className="divide-y divide-white/5 text-xs">
          {data.history.slice(0, 10).map((h) => {
            const k = TYPE_KEYS[h.type] ?? TYPE_KEYS.adjust;
            const sign = h.type === "use" ? "−" : h.minutes < 0 ? "−" : "+";
            return (
              <li key={h.id} className="flex items-center justify-between gap-2 py-1.5">
                <span className="text-neutral-300">{t(k.key, k.fallback)}</span>
                <span className="text-neutral-500">{new Date(h.createdAt).toLocaleDateString()}</span>
                <span className={sign === "+" ? "text-emerald-300" : "text-amber-300"}>
                  {sign}
                  {t("timeCredit.minutesValue", "{n} menit").replace("{n}", String(Math.abs(h.minutes)))}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
