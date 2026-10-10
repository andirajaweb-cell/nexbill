"use client";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { showAlert } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { useCurrency } from "@/lib/currency/client";
import "@/lib/i18n/dict-setup";

export interface QuickRateUnit {
  id: string;
  name: string;
  consoleType: string;
  hourlyRate: number;
  isActive?: boolean;
}

/**
 * "Atur tarif semua unit" dalam satu layar. Unit hasil pendaftaran dibuat dengan tarif Rp0 dan konsol
 * "PS4" sebagai isian sementara; sebelumnya pemilik harus membuka Kelola Unit lalu mengedit unit satu
 * per satu. Di sini semua unit aktif tampil sebagai tabel: ganti tipe konsol & tarif per baris, atau
 * isi sekaligus per tipe konsol ("Semua PS4 = Rp10.000"), lalu simpan sekali.
 */
export function QuickRateEditor({
  units,
  consoleTypes,
  onClose,
  onSaved,
}: {
  units: QuickRateUnit[];
  consoleTypes: { value: string; label: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useDashboardLang();
  const { formatMoney } = useCurrency();
  const active = useMemo(() => units.filter((u) => u.isActive !== false), [units]);
  const [rows, setRows] = useState(() => active.map((u) => ({ id: u.id, name: u.name, consoleType: u.consoleType, rate: String(u.hourlyRate || "") })));
  const [bulkType, setBulkType] = useState(consoleTypes[2]?.value ?? consoleTypes[0]?.value ?? "ps4");
  const [bulkRate, setBulkRate] = useState("");
  const [saving, setSaving] = useState(false);

  const original = useMemo(() => new Map(active.map((u) => [u.id, u])), [active]);
  const changed = rows.filter((r) => {
    const o = original.get(r.id);
    return o && (o.consoleType !== r.consoleType || Number(o.hourlyRate) !== Number(r.rate || 0));
  });
  const zeroCount = rows.filter((r) => !(Number(r.rate) > 0)).length;

  const setRow = (id: string, patch: Partial<{ consoleType: string; rate: string }>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const applyBulk = () => {
    if (!(Number(bulkRate) > 0)) return showAlert(t("setup.rates.bulkRateRequired", "Isi tarif per jam lebih dari 0."));
    setRows((prev) => prev.map((r) => (r.consoleType === bulkType ? { ...r, rate: bulkRate } : r)));
  };

  const save = async () => {
    if (changed.length === 0) return onClose();
    setSaving(true);
    try {
      for (const r of changed) {
        const res = await fetch(`/api/rental-units/${r.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ consoleType: r.consoleType, hourlyRate: Math.max(0, Math.round(Number(r.rate || 0))) }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          showAlert(`${r.name}: ${err.error ?? res.statusText}`);
          return;
        }
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const input = "rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-sm";

  return (
    <Card className="space-y-4 border border-cyan-500/20">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="gm-heading font-semibold">{t("setup.rates.title", "Atur tarif semua unit")}</h2>
          <p className="text-xs text-neutral-500">
            {t("setup.rates.subtitle", "Pilih tipe konsol dan tarif per jam tiap unit, atau isi sekaligus per tipe konsol. Tarif Rp0 membuat sesi tertagih Rp0.")}
          </p>
        </div>
        {zeroCount > 0 && (
          <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
            {t("setup.rates.zeroBadge", "{n} unit masih Rp0").replace("{n}", String(zeroCount))}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <label className="space-y-1">
          <div className="text-[11px] text-neutral-500">{t("setup.rates.bulkType", "Semua unit bertipe")}</div>
          <select className={input} value={bulkType} onChange={(e) => setBulkType(e.target.value)}>
            {consoleTypes.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <div className="text-[11px] text-neutral-500">{t("setup.rates.ratePerHour", "Tarif per jam")}</div>
          <input type="number" inputMode="numeric" min={0} className={`${input} w-32`} placeholder="10000" value={bulkRate} onChange={(e) => setBulkRate(e.target.value)} />
        </label>
        <Button variant="secondary" className="text-xs" onClick={applyBulk}>
          {t("setup.rates.applyBulk", "Terapkan ke tipe ini")}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-neutral-500">
              <th className="py-2 pr-3">{t("setup.rates.colUnit", "Unit")}</th>
              <th className="py-2 pr-3">{t("setup.rates.colConsole", "Tipe konsol")}</th>
              <th className="py-2 pr-3">{t("setup.rates.colRate", "Tarif per jam")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const zero = !(Number(r.rate) > 0);
              return (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="py-2 pr-3 font-medium">{r.name}</td>
                  <td className="py-2 pr-3">
                    <select className={input} value={r.consoleType} onChange={(e) => setRow(r.id, { consoleType: e.target.value })}>
                      {consoleTypes.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      className={`${input} w-32 ${zero ? "border-amber-500/60" : ""}`}
                      placeholder="0"
                      value={r.rate}
                      onChange={(e) => setRow(r.id, { rate: e.target.value })}
                    />
                    {!zero && <span className="ml-2 text-xs text-neutral-500">{formatMoney(Number(r.rate))}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="text-xs text-neutral-500 mr-auto">
          {t("setup.rates.changedCount", "{n} unit berubah").replace("{n}", String(changed.length))}
        </span>
        <Button variant="secondary" onClick={onClose} disabled={saving}>{t("setup.common.cancel", "Batal")}</Button>
        <Button onClick={save} disabled={saving}>{saving ? t("setup.common.saving", "Menyimpan...") : t("setup.rates.save", "Simpan tarif")}</Button>
      </div>
    </Card>
  );
}
