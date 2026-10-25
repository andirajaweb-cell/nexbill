"use client";
import { useEffect, useState } from "react";
import { ShieldBan, ShieldCheck, UserX } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IntegerInput } from "@/components/ui/IntegerInput";
import { useApi } from "@/lib/api/use-api";
import { showAlert, showConfirm, showPrompt } from "@/lib/ui/dialog";
import { DATE_LOCALE, useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-booking-blacklist";

/**
 * Blacklist no-show booking PS (lib/booking/no-show.ts): nomor WhatsApp yang berulang kali tidak datang
 * tidak bisa booking online. Kasir tetap bisa membuat booking manual — hanya diberi peringatan.
 */

interface Verdict {
  blocked: boolean;
  source: "manual" | "auto" | null;
  countedNoShows: number;
  reason: string | null;
}
interface Row {
  phone: string;
  names: string[];
  noShows: number;
  lastNoShowAt: string | null;
  bookingCodes: string[];
  verdict: Verdict;
}
interface ListData {
  policy: { enabled: boolean; threshold: number; windowDays: number; migrationMissing?: boolean };
  rows: Row[];
  canEditPolicy: boolean;
}

/** Peringatan di form Booking Baru saat nomor yang diketik sedang diblokir / sering no-show. */
export function NoShowPhoneWarning({ phone }: { phone: string }) {
  const { t } = useDashboardLang();
  const [v, setV] = useState<Verdict | null>(null);
  useEffect(() => {
    setV(null);
    if (phone.replace(/[^0-9]/g, "").length < 8) return;
    let alive = true;
    const id = setTimeout(() => {
      fetch(`/api/booking-blacklist/check?phone=${encodeURIComponent(phone)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => alive && d && setV(d))
        .catch(() => {});
    }, 500);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [phone]);
  if (!v || (!v.blocked && v.countedNoShows === 0)) return null;
  return (
    <div className={`col-span-full rounded-lg border px-3 py-2 text-xs ${v.blocked ? "border-red-400/40 bg-red-500/10 text-red-200" : "border-amber-400/40 bg-amber-500/10 text-amber-100"}`}>
      {v.blocked
        ? t("noShowList.warnBlocked", "Nomor ini diblokir dari booking online ({n}x no-show). Booking dari kasir tetap bisa — pertimbangkan minta DP.").replace("{n}", String(v.countedNoShows))
        : t("noShowList.warnHistory", "Catatan: nomor ini pernah {n}x tidak datang (no-show).").replace("{n}", String(v.countedNoShows))}
    </div>
  );
}

export function NoShowBlacklistCard() {
  const { t, lang } = useDashboardLang();
  const { data, error, mutate } = useApi<ListData>("/api/booking-blacklist");
  const [enabled, setEnabled] = useState(true);
  const [threshold, setThreshold] = useState(3);
  const [windowDays, setWindowDays] = useState(90);
  const [saving, setSaving] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!data) return;
    setEnabled(data.policy.enabled);
    setThreshold(data.policy.threshold);
    setWindowDays(data.policy.windowDays);
  }, [data]);

  if (error || !data) return null;
  const dateFmt = new Intl.DateTimeFormat(DATE_LOCALE[lang], { dateStyle: "medium" });

  const savePolicy = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/booking-blacklist", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled, threshold, windowDays }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return showAlert(body.error ?? t("noShowList.saveFailed", "Gagal menyimpan."));
      await mutate();
    } finally {
      setSaving(false);
    }
  };

  const act = async (action: "block" | "lift", phone: string, reason?: string | null) => {
    const res = await fetch("/api/booking-blacklist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, phone, reason }) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return showAlert(body.error ?? t("noShowList.saveFailed", "Gagal menyimpan."));
    await mutate();
  };

  const block = async (phone: string) => {
    const reason = await showPrompt(t("noShowList.blockReasonPrompt", "Alasan blokir? (opsional, hanya terlihat oleh staf)"), { multiline: true, confirmLabel: t("noShowList.blockButton", "Blokir") });
    if (reason === null) return;
    await act("block", phone, reason || null);
  };

  const lift = async (phone: string) => {
    if (!(await showConfirm(t("noShowList.liftConfirm", "Lepas blokir {phone}? No-show sebelumnya tidak dihitung lagi.").replace("{phone}", phone)))) return;
    await act("lift", phone);
  };

  const rows = showAll ? data.rows : data.rows.slice(0, 8);
  const blockedCount = data.rows.filter((r) => r.verdict.blocked).length;

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-300">
            <UserX size={18} />
          </div>
          <div>
            <h2 className="font-medium">{t("noShowList.title", "Blacklist no-show")}</h2>
            <p className="text-xs text-neutral-500">
              {t("noShowList.desc", "Nomor WhatsApp yang berulang kali tidak datang otomatis tidak bisa booking online. Kasir tetap bisa membuat booking manual.")}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-xs text-red-200">{t("noShowList.blockedCount", "{n} nomor diblokir").replace("{n}", String(blockedCount))}</span>
      </div>

      {data.policy.migrationMissing ? (
        <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          {t("noShowList.migrationMissing", "Blokir no-show belum aktif (pembaruan database belum dijalankan). Daftar di bawah hanya catatan.")}
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-3 rounded-lg bg-white/[0.03] px-3 py-2 text-xs">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 accent-red-500" checked={enabled} disabled={!data.canEditPolicy} onChange={(e) => setEnabled(e.target.checked)} />
            {t("noShowList.enabled", "Blokir otomatis")}
          </label>
          <label className="flex items-center gap-1.5">
            {t("noShowList.after", "setelah")}
            <IntegerInput className="w-14 rounded-md border border-white/10 bg-white/5 px-2 py-1" value={threshold} min={1} max={20} disabled={!data.canEditPolicy} onValueChange={setThreshold} />
            {t("noShowList.timesWithin", "kali no-show dalam")}
            <IntegerInput className="w-16 rounded-md border border-white/10 bg-white/5 px-2 py-1" value={windowDays} min={7} max={730} disabled={!data.canEditPolicy} onValueChange={setWindowDays} />
            {t("noShowList.days", "hari")}
          </label>
          {data.canEditPolicy && (
            <Button variant="secondary" className="text-xs" onClick={savePolicy} disabled={saving}>
              {saving ? t("noShowList.saving", "Menyimpan...") : t("noShowList.save", "Simpan aturan")}
            </Button>
          )}
        </div>
      )}

      {data.rows.length === 0 ? (
        <p className="text-xs text-neutral-500">{t("noShowList.empty", "Belum ada pelanggan no-show dalam periode ini.")}</p>
      ) : (
        <div className="divide-y divide-white/5 text-sm">
          {rows.map((r) => (
            <div key={r.phone} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs">{r.phone}</span>
                  {r.names.length > 0 && <span className="truncate text-xs text-neutral-400">{r.names.slice(0, 2).join(", ")}</span>}
                  {r.verdict.blocked ? (
                    <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-200">
                      {r.verdict.source === "manual" ? t("noShowList.statusManual", "Diblokir manual") : t("noShowList.statusAuto", "Diblokir otomatis")}
                    </span>
                  ) : (
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-200">{t("noShowList.statusWatch", "Dipantau")}</span>
                  )}
                </div>
                <div className="text-[11px] text-neutral-500">
                  {t("noShowList.counted", "{n}x no-show dihitung").replace("{n}", String(r.verdict.countedNoShows))}
                  {r.lastNoShowAt && ` · ${t("noShowList.last", "terakhir {date}").replace("{date}", dateFmt.format(new Date(r.lastNoShowAt)))}`}
                  {r.verdict.reason && ` · ${r.verdict.reason}`}
                </div>
              </div>
              {!data.policy.migrationMissing &&
                (r.verdict.blocked ? (
                  <Button variant="ghost" className="text-xs text-emerald-300" onClick={() => lift(r.phone)}>
                    <ShieldCheck size={13} className="mr-1 inline" /> {t("noShowList.liftButton", "Lepas blokir")}
                  </Button>
                ) : (
                  <Button variant="ghost" className="text-xs text-red-300" onClick={() => block(r.phone)}>
                    <ShieldBan size={13} className="mr-1 inline" /> {t("noShowList.blockButton", "Blokir")}
                  </Button>
                ))}
            </div>
          ))}
          {data.rows.length > 8 && (
            <button type="button" className="pt-2 text-xs text-cyan-300 underline" onClick={() => setShowAll((v) => !v)}>
              {showAll ? t("noShowList.showLess", "Tampilkan lebih sedikit") : t("noShowList.showAll", "Tampilkan semua ({n})").replace("{n}", String(data.rows.length))}
            </button>
          )}
        </div>
      )}

      {!data.policy.migrationMissing && (
        <div className="flex flex-wrap gap-2">
          <input
            className="min-w-[180px] flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm"
            placeholder={t("noShowList.manualPlaceholder", "Blokir nomor lain, mis. 0812xxxx")}
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
          />
          <Button
            variant="secondary"
            className="text-xs"
            disabled={newPhone.replace(/[^0-9]/g, "").length < 8}
            onClick={async () => {
              await block(newPhone);
              setNewPhone("");
            }}
          >
            {t("noShowList.blockButton", "Blokir")}
          </Button>
        </div>
      )}
    </Card>
  );
}
