"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fetchJsonArray, fetchJsonObject } from "@/lib/api/fetch-json";
import { useApi } from "@/lib/api/use-api";
import { useAuth } from "@/lib/auth/client";
import { hasPermission } from "@/lib/auth/permissions";
import { CASH_DENOMINATIONS, denominationLabel } from "@/lib/shift/denominations";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-shift";

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;

/**
 * Shared over/under (lebih/kurang) labeling for shift cash & non-cash
 * variance — negative = shortage (uang kurang, risiko utama), positive =
 * overage (uang lebih, juga perlu ditandai karena bisa berarti salah catat
 * transaksi), near-zero = pas/sesuai. Used both in the close-shift reveal
 * card and the shift history table so the two always agree visually.
 */
function varianceBadge(v: number | null | undefined, t: (key: string, fallback?: string) => string): { text: string; className: string } {
  if (v == null) return { text: "-", className: "text-neutral-600" };
  if (Math.abs(v) < 1) return { text: rupiah(v), className: "text-emerald-400" };
  if (v < 0) return { text: `${rupiah(v)} ${t("shift.varianceShort", "(Kurang)")}`, className: "text-red-400 font-medium" };
  return { text: `${rupiah(v)} ${t("shift.varianceOver", "(Lebih)")}`, className: "text-amber-400 font-medium" };
}

interface RequiredChannel {
  channelKey: string;
  label: string;
}

interface DepositChannel {
  id: string;
  channelKey: string;
  label: string;
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number;
}

export default function ShiftPage() {
  const { t } = useDashboardLang();
  const { user } = useAuth();
  const staffUserId = user?.id ?? "";
  const canManageChannels = hasPermission((user?.role ?? "cashier") as any, "manage_coa");
  const canDeleteShift = user?.role === "owner" || user?.role === "superuser";
  const [deletingShiftId, setDeletingShiftId] = useState<string | null>(null);
  const [outletId, setOutletId] = useState<string | null>(null);
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [openingCash, setOpeningCash] = useState(0);

  // Closing form state — the cashier fills this in blind (no expected figures shown
  // anywhere on this screen until after they submit; closeResult below is the reveal).
  const [qtyByDenom, setQtyByDenom] = useState<Record<number, number>>({});
  const [requiredChannels, setRequiredChannels] = useState<RequiredChannel[]>([]);
  const [actualByChannel, setActualByChannel] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [closing, setClosing] = useState(false);
  const [closeResult, setCloseResult] = useState<any>(null);

  // Deposit-balance channel management (rename Fastpay PPOB saldo / add-delete other
  // deposit-balance channels) — kept in sync with COA via /api/deposit-balance-channels.
  const [depositChannels, setDepositChannels] = useState<DepositChannel[]>([]);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [newChannelLabel, setNewChannelLabel] = useState("");
  const [channelBusy, setChannelBusy] = useState(false);

  const loadDepositChannels = () => fetchJsonArray<DepositChannel>("/api/deposit-balance-channels").then(setDepositChannels);
  useEffect(() => { loadDepositChannels(); }, []);

  const refreshRequiredChannels = () => {
    if (currentShift) fetchJsonArray<RequiredChannel>(`/api/shifts/${currentShift.id}/required-channels`).then(setRequiredChannels);
  };

  const startEditChannel = (c: DepositChannel) => { setEditingChannelId(c.id); setEditingLabel(c.label); };

  const saveChannelLabel = async (id: string) => {
    if (!editingLabel.trim()) return;
    setChannelBusy(true);
    try {
      const res = await fetch(`/api/deposit-balance-channels/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: editingLabel.trim() }),
      });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      setEditingChannelId(null);
      await loadDepositChannels();
      refreshRequiredChannels();
    } finally {
      setChannelBusy(false);
    }
  };

  const addChannel = async () => {
    if (!newChannelLabel.trim()) return;
    setChannelBusy(true);
    try {
      const res = await fetch("/api/deposit-balance-channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newChannelLabel.trim() }),
      });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      setNewChannelLabel("");
      await loadDepositChannels();
      refreshRequiredChannels();
    } finally {
      setChannelBusy(false);
    }
  };

  const deleteChannel = async (c: DepositChannel) => {
    if (!(await showConfirm(t("shift.confirmDeleteChannel", 'Hapus channel "{label}"? Akun COA yang terkait akan otomatis dihapus/diarsipkan bersamaan.').replace("{label}", c.label), { tone: "danger" }))) return;
    setChannelBusy(true);
    try {
      const res = await fetch(`/api/deposit-balance-channels/${c.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      await loadDepositChannels();
      refreshRequiredChannels();
    } finally {
      setChannelBusy(false);
    }
  };

  const { data: outlet } = useApi<{ id: string }>("/api/outlets/default");
  useEffect(() => {
    if (!outlet) return;
    setOutletId(outlet.id);
    fetchJsonArray(`/api/shifts?outletId=${outlet.id}`).then(setHistory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outlet]);

  useEffect(() => {
    if (!outletId || !staffUserId) return;
    fetchJsonObject(`/api/shifts/current?outletId=${outletId}&staffUserId=${staffUserId}`).then(setCurrentShift);
  }, [outletId, staffUserId]);

  useEffect(() => {
    if (!currentShift) {
      setRequiredChannels([]);
      setActualByChannel({});
      setQtyByDenom({});
      return;
    }
    fetchJsonArray<RequiredChannel>(`/api/shifts/${currentShift.id}/required-channels`).then(setRequiredChannels);
  }, [currentShift]);

  const totalCounted = useMemo(
    () => CASH_DENOMINATIONS.reduce((s, d) => s + d * (qtyByDenom[d] || 0), 0),
    [qtyByDenom]
  );

  const openShift = async () => {
    const res = await fetch("/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outletId, staffUserId, openingCash }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setCurrentShift(data);
  };

  const deleteShiftAction = async (shift: any) => {
    if (!(await showConfirm(
      t("shift.confirmDeleteShift", "Hapus riwayat shift ini (dibuka {openedAt}, kasir {staffName})? Tidak bisa dibatalkan.")
        .replace("{openedAt}", new Date(shift.openedAt).toLocaleString("id-ID"))
        .replace("{staffName}", shift.staffName ?? "-"),
      { tone: "danger" }
    ))) return;
    setDeletingShiftId(shift.id);
    try {
      const res = await fetch(`/api/shifts/${shift.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      if (outletId) fetchJsonArray(`/api/shifts?outletId=${outletId}`).then(setHistory);
    } finally {
      setDeletingShiftId(null);
    }
  };

  const closeShiftAction = async () => {
    const missing = requiredChannels.filter((c) => actualByChannel[c.channelKey] === undefined || actualByChannel[c.channelKey] === null);
    if (missing.length) {
      return showAlert(t("shift.missingBalanceAlert", "Saldo aktual belum diisi untuk: {list}").replace("{list}", missing.map((m) => m.label).join(", ")));
    }
    if (!await showConfirm(t("shift.confirmCloseShift", "Pastikan hitungan fisik sudah final sebelum submit — setelah ini tidak bisa diubah. Lanjutkan tutup shift?"))) return;

    setClosing(true);
    try {
      const res = await fetch(`/api/shifts/${currentShift.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cashCounts: CASH_DENOMINATIONS.map((d) => ({ denomination: d, qty: qtyByDenom[d] || 0 })),
          balanceChecks: requiredChannels.map((c) => ({ channelKey: c.channelKey, actualBalance: actualByChannel[c.channelKey] || 0 })),
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      setCloseResult(data);
      setCurrentShift(null);
      setQtyByDenom({});
      setActualByChannel({});
      setNotes("");
      if (outletId) fetchJsonArray(`/api/shifts?outletId=${outletId}`).then(setHistory);
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold gm-gradient-title">{t("shift.pageTitle", "Shift & Kasir")}</h1>
        <p className="text-sm text-neutral-500">{t("shift.pageSubtitle", "Buka shift dengan modal awal, tutup dengan hitung fisik kas per pecahan — selisih terdeteksi otomatis, baru ditampilkan setelah hitungan disubmit.")}</p>
      </div>

      {user && (
        <Card>
          <div className="text-xs text-neutral-500">{t("shift.staffLabel", "Staf")}</div>
          <div className="text-sm font-medium">{user.name} ({user.role})</div>
        </Card>
      )}

      {canManageChannels && (
        <Card>
          <h2 className="font-medium mb-1">{t("shift.depositChannelsTitle", "Channel Saldo Deposit (Non-Tunai)")}</h2>
          <p className="text-xs text-neutral-500 mb-3">
            {t("shift.depositChannelsDesc", 'Daftar ini yang muncul di "Verifikasi Saldo Channel Non-Tunai" saat tutup shift — Saldo Deposit Fastpay (PPOB) bisa diganti namanya, dan kamu bisa menambah channel saldo deposit lain (mis. provider PPOB kedua). Setiap channel otomatis terhubung ke akun COA sendiri — tambah/hapus channel di sini akan ikut membuat/menghapus akun COA-nya.')}
          </p>
          <div className="space-y-2">
            {depositChannels.map((c) => (
              <div key={c.id} className="flex items-center gap-2 rounded-lg border border-neutral-800 px-3 py-2">
                {editingChannelId === c.id ? (
                  <>
                    <input
                      className="flex-1 rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-sm"
                      value={editingLabel}
                      onChange={(e) => setEditingLabel(e.target.value)}
                      autoFocus
                    />
                    <Button className="text-xs" disabled={channelBusy} onClick={() => saveChannelLabel(c.id)}>{t("shift.save", "Simpan")}</Button>
                    <Button variant="secondary" className="text-xs" disabled={channelBusy} onClick={() => setEditingChannelId(null)}>{t("shift.cancel", "Batal")}</Button>
                  </>
                ) : (
                  <>
                    <span className="text-sm flex-1">{c.label}</span>
                    {c.isSystem && <Badge status="occupied">{t("shift.systemBadge", "Sistem")}</Badge>}
                    <button className="text-xs text-neutral-400 hover:text-emerald-400" disabled={channelBusy} onClick={() => startEditChannel(c)}>{t("shift.rename", "Ganti Nama")}</button>
                    {!c.isSystem && (
                      <button className="text-xs text-neutral-500 hover:text-red-400" disabled={channelBusy} onClick={() => deleteChannel(c)}>{t("shift.delete", "Hapus")}</button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 items-center mt-3">
            <input
              className="flex-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm"
              placeholder={t("shift.newChannelPlaceholder", "Nama channel saldo deposit baru, mis. Saldo Deposit Midtrans")}
              value={newChannelLabel}
              onChange={(e) => setNewChannelLabel(e.target.value)}
            />
            <Button className="text-xs" disabled={channelBusy || !newChannelLabel.trim()} onClick={addChannel}>{t("shift.addChannel", "Tambah Channel")}</Button>
          </div>
        </Card>
      )}

      {currentShift ? (
        <Card className="border-emerald-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">{t("shift.activeShiftTitle", "Shift Aktif")}</h2>
            <Badge status="occupied">{t("shift.runningSince", "Berjalan sejak {time}").replace("{time}", new Date(currentShift.openedAt).toLocaleTimeString("id-ID"))}</Badge>
          </div>
          <div className="text-sm">{t("shift.openingCashLabel", "Modal awal:")} {rupiah(currentShift.openingCash)}</div>

          <div>
            <h3 className="text-sm font-medium mb-2">{t("shift.cashCountTitle", "Hitung Fisik Kas (Per Pecahan)")}</h3>
            <p className="text-xs text-neutral-500 mb-2">{t("shift.cashCountDesc", "Hitung uang di laci satu per satu sesuai pecahan — jangan lihat laporan sistem dulu. Total akan muncul otomatis saat kamu mengisi.")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CASH_DENOMINATIONS.map((d) => (
                <div key={d} className="flex items-center gap-2 rounded-lg border border-neutral-800 px-3 py-2">
                  <span className="text-sm w-28 shrink-0">{denominationLabel(d)}</span>
                  <input
                    type="number"
                    min={0}
                    className="w-20 rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-sm"
                    value={qtyByDenom[d] || ""}
                    onChange={(e) => setQtyByDenom((prev) => ({ ...prev, [d]: Math.max(0, Number(e.target.value)) }))}
                    placeholder="0"
                  />
                  <span className="text-xs text-neutral-500 ml-auto">{rupiah(d * (qtyByDenom[d] || 0))}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center mt-2 rounded-lg bg-neutral-800/60 px-3 py-2">
              <span className="text-sm font-medium">{t("shift.totalCountedLabel", "Total Hitungan Fisik")}</span>
              <span className="text-sm font-semibold">{rupiah(totalCounted)}</span>
            </div>
          </div>

          {requiredChannels.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">{t("shift.verifyBalanceTitle", "Verifikasi Saldo Channel Non-Tunai")}</h3>
              <p className="text-xs text-neutral-500 mb-2">{t("shift.verifyBalanceDesc", "Buka app/dashboard masing-masing channel dan masukkan saldo yang tertera di sana saat ini.")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {requiredChannels.map((c) => (
                  <div key={c.channelKey} className="flex items-center gap-2 rounded-lg border border-neutral-800 px-3 py-2">
                    <span className="text-sm flex-1">{c.label}</span>
                    <input
                      type="number"
                      min={0}
                      className="w-32 rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-sm"
                      value={actualByChannel[c.channelKey] ?? ""}
                      onChange={(e) => setActualByChannel((prev) => ({ ...prev, [c.channelKey]: Number(e.target.value) }))}
                      placeholder={t("shift.balancePlaceholder", "Saldo di app")}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-neutral-500">{t("shift.notesLabel", "Catatan (opsional)")}</label>
            <textarea
              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm mt-1"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("shift.notesPlaceholder", "Mis. alasan jika ada selisih yang sudah diketahui sebelumnya")}
            />
          </div>

          <Button variant="danger" onClick={closeShiftAction} disabled={closing}>
            {closing ? t("shift.closing", "Menutup...") : t("shift.closeShiftBtn", "Tutup Shift")}
          </Button>
        </Card>
      ) : (
        <Card>
          <h2 className="font-medium mb-3">{t("shift.openNewShiftTitle", "Buka Shift Baru")}</h2>
          <div className="flex gap-2 items-center">
            <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("shift.openingCashPlaceholder", "Modal awal kas")}
              value={openingCash || ""} onChange={(e) => setOpeningCash(Number(e.target.value))} />
            <Button onClick={openShift}>{t("shift.openShiftBtn", "Buka Shift")}</Button>
          </div>
        </Card>
      )}

      {closeResult && (
        <Card className={closeResult.shift.variance === 0 ? "border-emerald-500/30" : "border-amber-500/30"}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-medium">{t("shift.closeSummaryTitle", "Ringkasan Tutup Shift")}</h2>
            <a href={`/api/shifts/${closeResult.shift.id}/export?format=pdf`} target="_blank" rel="noreferrer">
              <Button variant="secondary" className="text-xs">{t("shift.downloadReportBtn", "Download Berita Acara (PDF)")}</Button>
            </a>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
            <div><div className="text-xs text-neutral-500">{t("shift.cashInLabel", "Kas Masuk")}</div>{rupiah(closeResult.cashIn)}</div>
            <div><div className="text-xs text-neutral-500">{t("shift.cashOutLabel", "Kas Keluar")}</div>{rupiah(closeResult.cashOut)}</div>
            <div><div className="text-xs text-neutral-500">{t("shift.expectedCashLabel", "Ekspektasi Kas")}</div>{rupiah(closeResult.shift.expectedCash)}</div>
            <div><div className="text-xs text-neutral-500">{t("shift.cashVarianceLabel", "Selisih Kas")}</div>
              <span className={Math.abs(closeResult.shift.variance) < 1 ? "text-emerald-400" : closeResult.shift.variance < 0 ? "text-red-400" : "text-amber-400"}>
                {rupiah(closeResult.shift.variance)}{closeResult.shift.variance < 0 ? t("shift.shortSuffixLower", " (kurang)") : closeResult.shift.variance > 0 ? t("shift.overSuffixLower", " (lebih)") : ""}
              </span>
            </div>
          </div>
          {closeResult.balanceCheckRows?.length > 0 && (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-neutral-500 border-b border-neutral-800"><th className="py-2">{t("shift.colChannel", "Channel")}</th><th className="text-right">{t("shift.colExpected", "Ekspektasi")}</th><th className="text-right">{t("shift.colActual", "Aktual")}</th><th className="text-right">{t("shift.colVariance", "Selisih")}</th></tr></thead>
              <tbody>
                {closeResult.balanceCheckRows.map((b: any) => (
                  <tr key={b.channelKey} className="border-b border-neutral-900">
                    <td className="py-1.5">{b.label}</td>
                    <td className="text-right">{rupiah(b.expectedBalance)}</td>
                    <td className="text-right">{rupiah(b.actualBalance)}</td>
                    <td className={`text-right ${Math.abs(b.variance) < 1 ? "text-emerald-400" : "text-amber-400"}`}>{rupiah(b.variance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      <Card>
        <h2 className="font-medium mb-3">{t("shift.historyTitle", "Riwayat Shift")}</h2>
        <p className="text-xs text-neutral-500 mb-2">
          {t("shift.historyDescPrefix", "Setiap pergantian shift otomatis dicek selisih kas (fisik vs ekspektasi sistem) dan selisih saldo channel non-tunai — ditandai")} <span className="text-red-400">{t("shift.historyDescRedLabel", 'merah "Kurang"')}</span> {t("shift.historyDescMiddle", "untuk kekurangan dan")} <span className="text-amber-400">{t("shift.historyDescAmberLabel", 'kuning "Lebih"')}</span> {t("shift.historyDescSuffix", "untuk kelebihan, supaya keduanya sama-sama kelihatan, bukan cuma yang kurang.")}
        </p>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-neutral-500 border-b border-neutral-800"><th className="py-2">{t("shift.colOpen", "Buka")}</th><th>{t("shift.colClose", "Tutup")}</th><th>{t("shift.colStaff", "Karyawan")}</th><th>{t("shift.colOpeningCapital", "Modal")}</th><th>{t("shift.colExpected", "Ekspektasi")}</th><th>{t("shift.colActual", "Aktual")}</th><th>{t("shift.cashVarianceLabel", "Selisih Kas")}</th><th>{t("shift.colNonCashVariance", "Selisih Non-Tunai")}</th><th></th></tr></thead>
          <tbody>
            {history.map((s) => {
              const cashV = varianceBadge(s.variance, t);
              const nonCashV = varianceBadge(s.nonCashVarianceTotal, t);
              return (
                <tr key={s.id} className="border-b border-neutral-900">
                  <td className="py-2">{new Date(s.openedAt).toLocaleString("id-ID")}</td>
                  <td>{s.closedAt ? new Date(s.closedAt).toLocaleString("id-ID") : "-"}</td>
                  <td>{s.staffName ?? "-"}</td>
                  <td>{rupiah(s.openingCash)}</td>
                  <td>{s.expectedCash != null ? rupiah(s.expectedCash) : "-"}</td>
                  <td>{s.actualCash != null ? rupiah(s.actualCash) : "-"}</td>
                  <td className={cashV.className}>{cashV.text}</td>
                  <td className={nonCashV.className}>{nonCashV.text}</td>
                  <td className="whitespace-nowrap">
                    {s.status === "closed" && (
                      <a href={`/api/shifts/${s.id}/export?format=pdf`} target="_blank" rel="noreferrer" className="text-xs text-emerald-400 hover:underline">{t("shift.pdfLink", "PDF")}</a>
                    )}
                    {canDeleteShift && (
                      <button
                        onClick={() => deleteShiftAction(s)}
                        disabled={deletingShiftId === s.id}
                        className="text-xs text-red-400 hover:underline ml-2 disabled:opacity-60"
                        title={s.status !== "closed" ? t("shift.deleteTooltipNotClosed", "Tutup shift ini dulu sebelum bisa dihapus") : t("shift.deleteTooltipReady", "Hapus riwayat shift ini")}
                      >
                        {deletingShiftId === s.id ? t("shift.deleting", "Menghapus...") : t("shift.delete", "Hapus")}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
