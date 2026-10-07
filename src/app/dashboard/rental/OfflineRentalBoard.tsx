"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { WifiOff, RefreshCw, Play, Pause, PlayCircle, Square, Plus, Minus, UtensilsCrossed, AlertTriangle, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/auth/client";
import { useCurrency } from "@/lib/currency/client";
import { DATE_LOCALE, useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-offline";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { useOfflineData, useSyncing } from "@/lib/offline/hooks";
import { deriveLocalState, estimateSession, type LocalUnit, type FinishedLocal } from "@/lib/offline/engine";
import { discardActions, enqueue, getClock, newUuid, serverNowMs } from "@/lib/offline/store";
import { syncQueue } from "@/lib/offline/sync-client";
import type { OfflineAction } from "@/lib/offline/protocol";

/**
 * Papan kasir rental Mode Offline — tampil menggantikan halaman Rental PS biasa selama internet
 * putus (dan selama masih ada transaksi offline yang belum terkirim). Semua aksi direkam ke antrean
 * di perangkat ini (lib/offline/store.ts) dan dikirim otomatis ke server begitu online lagi
 * (OfflineStatusBanner → syncQueue). Tagihan di layar adalah perkiraan dengan tarif yang sama
 * dengan server; total final dihitung server saat sinkron.
 */

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type ActionInput = DistributiveOmit<OfflineAction, "id" | "at" | "clockOffsetMs" | "recordedBy"> & { at?: string };

export function OfflineRentalBoard({ outletId, online }: { outletId: string | null; online: boolean }) {
  const { t, lang } = useDashboardLang();
  const { user } = useAuth();
  const { formatMoney } = useCurrency();
  const syncing = useSyncing();
  const { queue, snapshot } = useOfflineData(outletId);
  const [now, setNow] = useState(() => serverNowMs());
  const [startFor, setStartFor] = useState<string | null>(null);
  const [fnbFor, setFnbFor] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(serverNowMs()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const actions = useMemo(() => queue.map((q) => q.action), [queue]);
  const state = useMemo(() => (snapshot ? deriveLocalState(snapshot, actions) : null), [snapshot, actions]);
  const failed = queue.filter((q) => q.error);

  const record = (input: ActionInput) => {
    if (!outletId) return false;
    const action = {
      ...input,
      id: newUuid(),
      at: input.at ?? new Date(serverNowMs()).toISOString(),
      clockOffsetMs: getClock()?.offsetMs ?? 0,
      recordedBy: user?.id ?? null,
    } as OfflineAction;
    if (!enqueue(outletId, action)) {
      void showAlert(t("offline.saveFailed", "Gagal menyimpan transaksi di perangkat ini (penyimpanan penuh atau diblokir). Catat manual di kertas."));
      return false;
    }
    return true;
  };

  // Mirror the server's auto-stop: a fixed-duration session whose time is up is closed at the exact
  // moment its time ran out (not "now"), so the bill matches what the server would have charged.
  const autoStopped = useRef(new Set<string>());
  useEffect(() => {
    if (!state) return;
    for (const u of state.units) {
      const s = u.session;
      if (!s || s.status !== "running" || s.plannedMinutes === null || autoStopped.current.has(s.id)) continue;
      const allowedMs = (s.plannedMinutes + s.extendedMinutes) * 60_000;
      const endMs = Date.parse(s.startedAt) + s.accumulatedPauseMs + allowedMs;
      if (now >= endMs) {
        autoStopped.current.add(s.id);
        record({ kind: "stop", sessionId: s.id, at: new Date(Math.max(endMs, Date.parse(s.startedAt))).toISOString() });
      }
    }
    // record is recreated every render but only reads stable refs/props — re-running on it would
    // just repeat the same idempotent check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, state]);

  if (!outletId || !snapshot || !state) {
    return (
      <Card className="space-y-2 border-amber-500/40">
        <div className="flex items-center gap-2 font-semibold text-amber-300">
          <WifiOff size={18} /> {t("offline.title", "Mode Offline — Kasir Rental")}
        </div>
        <p className="text-sm text-neutral-300">
          {t(
            "offline.noSnapshot",
            "Data untuk Mode Offline belum tersimpan di perangkat ini. Buka halaman Rental PS sekali saat internet tersambung, maka perangkat ini siap dipakai saat internet putus."
          )}
        </p>
      </Card>
    );
  }

  const rounding = snapshot.outlet.billingRoundingMinutes || 1;
  const snapshotAge = new Date(snapshot.serverTime).toLocaleString(DATE_LOCALE[lang], { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });

  return (
    <div className="space-y-4">
      <Card className="space-y-2 border-amber-500/40 bg-amber-500/[0.04]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-semibold text-amber-300">
            <WifiOff size={18} /> {t("offline.title", "Mode Offline — Kasir Rental")}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Badge status={online ? "success" : "pending"}>{online ? t("offline.statusOnline", "Online") : t("offline.statusOffline", "Offline")}</Badge>
            <span className="text-neutral-400">{t("offline.queued", "{n} transaksi menunggu dikirim").replace("{n}", String(queue.length))}</span>
            {online && queue.length > 0 && (
              <Button variant="secondary" className="text-xs px-2 py-1" disabled={syncing} onClick={() => void syncQueue(outletId)}>
                <RefreshCw size={12} className={syncing ? "animate-spin" : ""} /> {syncing ? t("offline.syncing", "Mengirim...") : t("offline.syncNow", "Kirim sekarang")}
              </Button>
            )}
          </div>
        </div>
        <ul className="list-disc pl-5 text-xs text-neutral-400 space-y-0.5">
          <li>{t("offline.info.saved", "Semua transaksi disimpan di perangkat ini dan dikirim otomatis begitu internet kembali. Jangan hapus data browser/aplikasi sebelum terkirim.")}</li>
          <li>{t("offline.info.cashOnly", "Hanya pembayaran tunai yang bisa dicatat. QRIS/transfer bisa diterima setelah online di halaman Kasir.")}</li>
          <li>{t("offline.info.tv", "TV/konsol tidak bisa dinyalakan atau dimatikan otomatis selama offline — lakukan manual. Saat online kembali, status TV diselaraskan otomatis.")}</li>
          <li>{t("offline.info.estimate", "Tagihan di layar adalah perkiraan dengan tarif yang sama; total final dihitung server saat sinkron. Member & aksesori dihitung setelah online.")}</li>
          <li>{t("offline.info.snapshot", "Data terakhir dari server: {time}").replace("{time}", snapshotAge)}</li>
        </ul>
      </Card>

      {failed.length > 0 && <FailedActions outletId={outletId} failed={failed} />}

      {state.finished.length > 0 && (
        <Card className="space-y-3">
          <h3 className="font-semibold">{t("offline.finishedTitle", "Sesi selesai (offline)")}</h3>
          {state.finished.map((f) => (
            <FinishedBill key={f.session.id} entry={f} unitName={snapshot.units.find((u) => u.id === f.session.rentalUnitId)?.name ?? "Unit"} formatMoney={formatMoney} onPay={(amount) => record({ kind: "payCash", sessionId: f.session.id, amount })} />
          ))}
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {state.units.map((u) => (
          <UnitCard
            key={u.id}
            unit={u}
            now={now}
            rounding={rounding}
            formatMoney={formatMoney}
            presets={snapshot.durationPresets}
            onStart={() => setStartFor(startFor === u.id ? null : u.id)}
            onExtend={(minutes) => u.session && record({ kind: "extend", sessionId: u.session.id, minutes })}
            onPause={() => u.session && record({ kind: "pause", sessionId: u.session.id })}
            onResume={() => u.session && record({ kind: "resume", sessionId: u.session.id })}
            onFnb={() => setFnbFor(fnbFor === u.id ? null : u.id)}
            onStop={async () => {
              if (!u.session) return;
              if (!(await showConfirm(t("offline.confirmStop", "Hentikan sesi {unit} sekarang?").replace("{unit}", u.name)))) return;
              record({ kind: "stop", sessionId: u.session.id });
            }}
          >
            {startFor === u.id && !u.session && (
              <StartForm
                unit={u}
                promos={snapshot.promos.filter((p) => p.consoleType === "any" || p.consoleType === u.consoleType)}
                presets={snapshot.durationPresets}
                formatMoney={formatMoney}
                onCancel={() => setStartFor(null)}
                onStart={(fields) => {
                  if (record({ kind: "start", sessionId: newUuid(), rentalUnitId: u.id, ...fields })) setStartFor(null);
                }}
              />
            )}
            {fnbFor === u.id && u.session && (
              <FnbForm
                products={snapshot.products}
                formatMoney={formatMoney}
                onCancel={() => setFnbFor(null)}
                onAdd={(items) => {
                  if (u.session && record({ kind: "addItems", sessionId: u.session.id, items })) setFnbFor(null);
                }}
              />
            )}
          </UnitCard>
        ))}
      </div>
    </div>
  );
}

function fmtDuration(totalMinutes: number, t: (k: string, f: string) => string) {
  const m = Math.max(0, Math.floor(totalMinutes));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h > 0 ? t("offline.hm", "{h} jam {m} mnt").replace("{h}", String(h)).replace("{m}", String(mm)) : t("offline.m", "{m} mnt").replace("{m}", String(mm));
}

function UnitCard(props: {
  unit: LocalUnit;
  now: number;
  rounding: number;
  formatMoney: (n: number) => string;
  presets: { minutes: number; label: string }[];
  onStart: () => void;
  onExtend: (minutes: number) => void;
  onPause: () => void;
  onResume: () => void;
  onFnb: () => void;
  onStop: () => void;
  children?: React.ReactNode;
}) {
  const { t } = useDashboardLang();
  const { unit: u, now } = props;
  const s = u.session;
  const est = s ? estimateSession(s, props.rounding, now) : null;
  const maintenance = !s && u.status === "maintenance";
  const extendOptions = props.presets.length ? props.presets.slice(0, 3).map((p) => p.minutes) : [30, 60];
  const low = est?.remainingMinutes !== null && est?.remainingMinutes !== undefined && est.remainingMinutes <= 5;

  return (
    <Card className={`space-y-2 ${low ? "border-rose-500/50" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-semibold">{u.name}</div>
          <div className="text-[11px] uppercase text-neutral-500">{u.consoleType}</div>
        </div>
        <Badge status={s ? (s.status === "paused" ? "pending" : "occupied") : maintenance ? "maintenance" : "available"}>
          {s
            ? s.status === "paused"
              ? t("offline.unit.paused", "Dijeda")
              : t("offline.unit.occupied", "Dipakai")
            : maintenance
              ? t("offline.unit.maintenance", "Maintenance")
              : t("offline.unit.available", "Kosong")}
        </Badge>
      </div>

      {s && est && (
        <div className="space-y-1 text-sm">
          {s.customerName && <div className="text-neutral-300">{s.customerName}</div>}
          <div className="font-mono text-lg">
            {est.remainingMinutes !== null
              ? t("offline.remaining", "Sisa {time}").replace("{time}", fmtDuration(est.remainingMinutes, t))
              : t("offline.elapsed", "Berjalan {time}").replace("{time}", fmtDuration(est.elapsedMinutes, t))}
          </div>
          <div className="text-xs text-neutral-400">
            {t("offline.estimateLine", "Perkiraan tagihan {total}").replace("{total}", props.formatMoney(est.total))}
            {s.origin === "offline" && <span className="ml-1 text-amber-400">· {t("offline.recordedOffline", "dicatat offline")}</span>}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {!s && !maintenance && (
          <Button className="text-xs px-2 py-1" onClick={props.onStart}>
            <Play size={12} /> {t("offline.start", "Mulai")}
          </Button>
        )}
        {s && (
          <>
            {extendOptions.map((m) => (
              <Button key={m} variant="secondary" className="text-xs px-2 py-1" onClick={() => props.onExtend(m)}>
                <Plus size={12} /> {fmtDuration(m, t)}
              </Button>
            ))}
            {s.status === "running" ? (
              <Button variant="secondary" className="text-xs px-2 py-1" onClick={props.onPause}>
                <Pause size={12} /> {t("offline.pause", "Jeda")}
              </Button>
            ) : (
              <Button variant="secondary" className="text-xs px-2 py-1" onClick={props.onResume}>
                <PlayCircle size={12} /> {t("offline.resume", "Lanjut")}
              </Button>
            )}
            <Button variant="secondary" className="text-xs px-2 py-1" onClick={props.onFnb}>
              <UtensilsCrossed size={12} /> {t("offline.fnb", "F&B")}
            </Button>
            <Button variant="danger" className="text-xs px-2 py-1" onClick={props.onStop}>
              <Square size={12} /> {t("offline.stop", "Stop & Bayar")}
            </Button>
          </>
        )}
      </div>
      {props.children}
    </Card>
  );
}

function StartForm(props: {
  unit: LocalUnit;
  promos: { id: string; name: string; durationMinutes: number; packagePrice: number }[];
  presets: { minutes: number; label: string }[];
  formatMoney: (n: number) => string;
  onCancel: () => void;
  onStart: (fields: { customerName: string | null; gameName: string | null; plannedMinutes: number | null; promoId: string | null }) => void;
}) {
  const { t } = useDashboardLang();
  const [customerName, setCustomerName] = useState("");
  const [gameName, setGameName] = useState("");
  const [choice, setChoice] = useState<string>("open");
  const inputCls = "w-full rounded-lg bg-neutral-800 border border-neutral-700 px-2.5 py-1.5 text-sm";

  const submit = () => {
    const promo = choice.startsWith("promo:") ? choice.slice(6) : null;
    const minutes = choice.startsWith("min:") ? Number(choice.slice(4)) : null;
    props.onStart({ customerName: customerName.trim() || null, gameName: gameName.trim() || null, plannedMinutes: minutes, promoId: promo });
  };

  return (
    <div className="space-y-2 rounded-lg border border-neutral-700 p-2">
      <input className={inputCls} placeholder={t("offline.customerName", "Nama pelanggan (opsional)")} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
      <input className={inputCls} placeholder={t("offline.gameName", "Game (opsional)")} value={gameName} onChange={(e) => setGameName(e.target.value)} />
      <select className={inputCls} value={choice} onChange={(e) => setChoice(e.target.value)}>
        <option value="open">{t("offline.openPlay", "Main bebas (bayar sesuai durasi)")}</option>
        {props.presets.map((p) => (
          <option key={`min:${p.minutes}`} value={`min:${p.minutes}`}>
            {p.label}
          </option>
        ))}
        {props.promos.map((p) => (
          <option key={p.id} value={`promo:${p.id}`}>
            {p.name} · {props.formatMoney(p.packagePrice)}
          </option>
        ))}
      </select>
      <p className="text-[11px] text-neutral-500">{t("offline.memberNote", "Pelanggan member dicatat sebagai non-member saat offline; diskon member bisa diberikan setelah online.")}</p>
      <div className="flex gap-2">
        <Button className="text-xs px-2 py-1" onClick={submit}>
          <Play size={12} /> {t("offline.startNow", "Mulai Sesi")}
        </Button>
        <Button variant="ghost" className="text-xs px-2 py-1" onClick={props.onCancel}>
          {t("offline.cancel", "Batal")}
        </Button>
      </div>
    </div>
  );
}

function FnbForm(props: {
  products: { id: string; name: string; price: number; category: string | null }[];
  formatMoney: (n: number) => string;
  onCancel: () => void;
  onAdd: (items: { productId: string; qty: number }[]) => void;
}) {
  const { t } = useDashboardLang();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const list = props.products.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 30);
  const items = Object.entries(cart)
    .filter(([, n]) => n > 0)
    .map(([productId, qty]) => ({ productId, qty }));
  return (
    <div className="space-y-2 rounded-lg border border-neutral-700 p-2">
      <input
        className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-2.5 py-1.5 text-sm"
        placeholder={t("offline.searchProduct", "Cari produk...")}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="max-h-56 space-y-1 overflow-y-auto">
        {list.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate">
              {p.name} <span className="text-xs text-neutral-500">{props.formatMoney(p.price)}</span>
            </span>
            <span className="flex items-center gap-1">
              <button className="rounded bg-neutral-800 p-1" onClick={() => setCart((c) => ({ ...c, [p.id]: Math.max(0, (c[p.id] ?? 0) - 1) }))} aria-label="-">
                <Minus size={12} />
              </button>
              <span className="w-6 text-center">{cart[p.id] ?? 0}</span>
              <button className="rounded bg-neutral-800 p-1" onClick={() => setCart((c) => ({ ...c, [p.id]: (c[p.id] ?? 0) + 1 }))} aria-label="+">
                <Plus size={12} />
              </button>
            </span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button className="text-xs px-2 py-1" disabled={items.length === 0} onClick={() => props.onAdd(items)}>
          {t("offline.addToBill", "Tambah ke Tagihan")}
        </Button>
        <Button variant="ghost" className="text-xs px-2 py-1" onClick={props.onCancel}>
          {t("offline.cancel", "Batal")}
        </Button>
      </div>
    </div>
  );
}

function FinishedBill(props: { entry: FinishedLocal; unitName: string; formatMoney: (n: number) => string; onPay: (amount: number) => void }) {
  const { t } = useDashboardLang();
  const { entry: f, formatMoney } = props;
  const due = Math.max(0, f.estimate.due - f.cashPaid);
  const [tendered, setTendered] = useState<number>(due);
  const change = Math.max(0, tendered - due);
  const paidFull = due <= 0.5;

  return (
    <div className="space-y-1.5 rounded-lg border border-neutral-700 p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium">
          {props.unitName}
          {f.session.customerName ? ` · ${f.session.customerName}` : ""}
        </span>
        <Badge status={paidFull ? "success" : "pending"}>{paidFull ? t("offline.paid", "Lunas (offline)") : t("offline.unpaid", "Belum dibayar")}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-x-4 text-xs text-neutral-400">
        <span>{t("offline.bill.rental", "Sewa")}</span>
        <span className="text-right">{formatMoney(f.estimate.rental)}</span>
        {f.estimate.items > 0 && (
          <>
            <span>{t("offline.bill.items", "F&B")}</span>
            <span className="text-right">{formatMoney(f.estimate.items)}</span>
          </>
        )}
        {f.estimate.paid > 0 && (
          <>
            <span>{t("offline.bill.deposit", "Sudah dibayar (DP)")}</span>
            <span className="text-right">−{formatMoney(f.estimate.paid)}</span>
          </>
        )}
        {f.cashPaid > 0 && (
          <>
            <span>{t("offline.bill.cash", "Tunai diterima")}</span>
            <span className="text-right">−{formatMoney(f.cashPaid)}</span>
          </>
        )}
        <span className="font-semibold text-neutral-200">{t("offline.bill.due", "Sisa tagihan (perkiraan)")}</span>
        <span className="text-right font-semibold text-neutral-200">{formatMoney(due)}</span>
      </div>
      {!paidFull && (
        <div className="flex flex-wrap items-end gap-2 pt-1">
          <label className="text-xs text-neutral-400">
            {t("offline.tendered", "Uang tunai diterima")}
            <input
              type="number"
              min={0}
              className="mt-1 block w-36 rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-sm"
              value={Number.isFinite(tendered) ? tendered : 0}
              onChange={(e) => setTendered(Number(e.target.value))}
            />
          </label>
          {change > 0 && <span className="text-xs text-emerald-300">{t("offline.change", "Kembalian {amount}").replace("{amount}", formatMoney(change))}</span>}
          <Button className="text-xs px-2 py-1" disabled={!(tendered > 0)} onClick={() => props.onPay(Math.min(tendered, due))}>
            {t("offline.payCash", "Simpan Pembayaran Tunai")}
          </Button>
          <span className="w-full text-[11px] text-neutral-500">{t("offline.payLater", "Belum bayar? Biarkan saja — tagihannya muncul di Kasir sebagai belum lunas setelah online.")}</span>
        </div>
      )}
    </div>
  );
}

function FailedActions({ outletId, failed }: { outletId: string; failed: { action: OfflineAction; error?: string }[] }) {
  const { t, lang } = useDashboardLang();
  const kindLabel: Record<OfflineAction["kind"], string> = {
    start: t("offline.kind.start", "Mulai sesi"),
    extend: t("offline.kind.extend", "Tambah waktu"),
    pause: t("offline.kind.pause", "Jeda"),
    resume: t("offline.kind.resume", "Lanjut"),
    addItems: t("offline.kind.addItems", "Tambah F&B"),
    stop: t("offline.kind.stop", "Stop sesi"),
    payCash: t("offline.kind.payCash", "Bayar tunai"),
  };
  const discard = async (a: OfflineAction) => {
    if (!(await showConfirm(t("offline.confirmDiscard", "Buang transaksi offline ini dari antrean? Transaksi ini TIDAK akan tercatat di server. Catat manual bila perlu.")))) return;
    discardActions(outletId, [a.id]);
  };
  return (
    <Card className="space-y-2 border-rose-500/40">
      <div className="flex items-center gap-2 font-semibold text-rose-300">
        <AlertTriangle size={16} /> {t("offline.failedTitle", "{n} transaksi offline perlu ditinjau").replace("{n}", String(failed.length))}
      </div>
      <p className="text-xs text-neutral-400">
        {t("offline.failedHelp", "Server menolak transaksi berikut. Periksa alasannya, perbaiki di halaman terkait bila perlu, lalu kirim ulang atau buang dari antrean.")}
      </p>
      <ul className="space-y-1.5 text-sm">
        {failed.map(({ action, error }) => (
          <li key={action.id} className="flex flex-wrap items-start justify-between gap-2 rounded border border-neutral-800 p-2">
            <div>
              <div className="font-medium">
                {kindLabel[action.kind]} · <span className="text-xs text-neutral-500">{new Date(action.at).toLocaleString(DATE_LOCALE[lang])}</span>
              </div>
              <div className="text-xs text-rose-300">{error}</div>
            </div>
            <button className="text-xs text-neutral-400 hover:text-rose-300" onClick={() => void discard(action)}>
              <Trash2 size={12} className="inline" /> {t("offline.discard", "Buang")}
            </button>
          </li>
        ))}
      </ul>
      <Button variant="secondary" className="text-xs px-2 py-1" onClick={() => void syncQueue(outletId)}>
        <RefreshCw size={12} /> {t("offline.retry", "Coba kirim ulang")}
      </Button>
    </Card>
  );
}

