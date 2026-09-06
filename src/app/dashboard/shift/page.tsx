"use client";
import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fetchJsonArray, fetchJsonObject } from "@/lib/api/fetch-json";
import { useApi } from "@/lib/api/use-api";
import { useAuth } from "@/lib/auth/client";
import { hasPermission } from "@/lib/auth/permissions";
import { getCashDenominations, denominationLabel } from "@/lib/shift/denominations";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { useCurrency } from "@/lib/currency/client";
import { useOutletFormat } from "@/lib/format/client";
import "@/lib/i18n/dict-shift";

/**
 * Shared over/under (lebih/kurang) labeling for shift cash & non-cash
 * variance — negative = shortage (uang kurang, risiko utama), positive =
 * overage (uang lebih, juga perlu ditandai karena bisa berarti salah catat
 * transaksi), near-zero = pas/sesuai. Used both in the close-shift reveal
 * card and the shift history table so the two always agree visually. Takes
 * `rupiah` as a parameter (rather than closing over a module-level constant)
 * since it's now the outlet's own currency formatter from useCurrency(),
 * which can only be read inside a component.
 */
function varianceBadge(v: number | null | undefined, t: (key: string, fallback?: string) => string, rupiah: (n: number) => string): { text: string; className: string } {
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
  const { t, lang } = useDashboardLang();
  const { user } = useAuth();
  const { currency, formatMoney: rupiah } = useCurrency();
  // Outlet's own date-display preference (Settings > Preferensi > Format Lainnya) — applied here
  // to the timestamps this page already shows (Dibuka/Ditutup) as this feature's first adopter;
  // most other pages sitewide still use an inline toLocaleString("id-ID") and haven't been
  // migrated yet (131 call sites across 67 files at last count — a larger follow-up sweep).
  const { formatDateTime } = useOutletFormat();
  // Which physical notes/coins the cashier counts follows the outlet's own currency (Settings >
  // Business & Tax > Negara) instead of always assuming IDR — see denominations.ts's
  // DENOMINATIONS_BY_CURRENCY doc comment. Server-side validation in lib/shift/shift.ts resolves
  // the same list independently from the outlet's own record, so the two can't drift apart.
  const cashDenominations = useMemo(() => getCashDenominations(currency.code), [currency.code]);
  const staffUserId = user?.id ?? "";
  const canManageChannels = hasPermission((user?.role ?? "cashier") as any, "manage_coa");
  // Owner/Superuser can both delete AND correct ("Edit") a shift's history — same gate for both,
  // since editing an already-closed shift's figures is just as sensitive as deleting it outright.
  const canManageShiftHistory = user?.role === "owner" || user?.role === "superuser";
  // Anti-fraud shift review (see lib/shift/fraud-detection.ts) — same approve_requests permission
  // gate as the void/refund approval queue on the Staff page, since this is the same mechanism.
  const canReviewShifts = hasPermission((user?.role ?? "cashier") as any, "approve_requests");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [deletingShiftId, setDeletingShiftId] = useState<string | null>(null);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editOpeningCash, setEditOpeningCash] = useState(0);
  const [editQtyByDenom, setEditQtyByDenom] = useState<Record<number, number>>({});
  const [editBalanceChecks, setEditBalanceChecks] = useState<{ channelKey: string; label: string; actualBalance: number; expectedBalance: number }[]>([]);
  const [editNotes, setEditNotes] = useState("");
  const [editRecomputeExpected, setEditRecomputeExpected] = useState(false);
  // Plain-language walkthrough for outlet staff who find the shift-close form confusing — starts
  // open since that's exactly the audience that needs it, but collapsible so it doesn't get in
  // the way once someone's done this a hundred times.
  const [showGuide, setShowGuide] = useState(true);
  const [outletId, setOutletId] = useState<string | null>(null);
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [openingCash, setOpeningCash] = useState(0);
  // Cash pools (Kas Toko, Kas Besar, Kas Kecil, Saldo Deposit Virtual, dll — see lib/cash/deposits.ts)
  // with their live trial-balance-derived balance, used both for the "Modal Awal" quick-fill below
  // and the Setoran Kas tab's source/destination pickers.
  const [cashAccounts, setCashAccounts] = useState<{ id: string; name: string; type: string; isDefault: boolean; includeInShiftFloat: boolean; balance: number }[]>([]);
  const [pageTab, setPageTab] = useState<"shift" | "deposit">("shift");

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
    fetchJsonArray(`/api/cash-bank-accounts?withBalance=1`).then((rows: any[]) => setCashAccounts(rows.filter((r) => r.type === "cash")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outlet]);

  const defaultTillAccount = cashAccounts.find((a) => a.isDefault) ?? cashAccounts[0];
  // If the outlet has checked off specific pools in Settings > Preferensi > "Komposisi Modal Awal
  // Shift", the suggestion sums those; otherwise it falls back to the single default till, same
  // as before that setting existed — see the schema doc comment on includeInShiftFloat.
  const shiftFloatAccounts = cashAccounts.filter((a) => a.includeInShiftFloat);
  const suggestedOpeningCash = shiftFloatAccounts.length > 0 ? shiftFloatAccounts.reduce((s, a) => s + a.balance, 0) : defaultTillAccount?.balance;
  const suggestedOpeningCashLabel = shiftFloatAccounts.length > 0 ? shiftFloatAccounts.map((a) => a.name).join(" + ") : defaultTillAccount?.name;

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
    () => cashDenominations.reduce((s, d) => s + d * (qtyByDenom[d] || 0), 0),
    [qtyByDenom, cashDenominations]
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
    // Deleting a still-open shift is allowed (Owner/Superuser) for cleaning up a stuck/orphaned
    // row, but it has a real side effect a closed shift's deletion doesn't: whoever "owns" that
    // open shift will just find it gone and get prompted to open a new one, and any transactions
    // already tagged with it lose that link before ever being reconciled by a close. Extra-strong
    // wording specifically for that case instead of the normal delete confirm.
    const confirmMessage =
      shift.status !== "closed"
        ? t(
            "shift.confirmDeleteOpenShift",
            'PERHATIAN: shift ini MASIH BERJALAN (dibuka {openedAt}, kasir {staffName}), belum ditutup. Menghapusnya akan langsung menghilangkannya dari sistem — kasir yang memakainya akan diminta buka shift baru, dan transaksi yang sudah tercatat di shift ini kehilangan tautannya. Hanya lakukan ini untuk shift yang memang error/tidak akan pernah ditutup normal. Lanjutkan hapus?'
          )
            .replace("{openedAt}", formatDateTime(shift.openedAt))
            .replace("{staffName}", shift.staffName ?? "-")
        : t("shift.confirmDeleteShift", "Hapus riwayat shift ini (dibuka {openedAt}, kasir {staffName})? Tidak bisa dibatalkan.")
            .replace("{openedAt}", formatDateTime(shift.openedAt))
            .replace("{staffName}", shift.staffName ?? "-");
    if (!(await showConfirm(confirmMessage, { tone: "danger" }))) return;
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

  /** Owner/Manager sign-off on a shift auto-flagged by the anti-fraud check (see fraud-detection.ts) — approving/rejecting here doesn't undo anything on the shift itself, it's a review acknowledgment, same approval_requests mechanism as void/refund. */
  const decideReview = async (reviewId: string, action: "approve" | "reject") => {
    const note = action === "reject" ? (prompt(t("shift.review.rejectNotePrompt", "Catatan penolakan (opsional)?")) ?? undefined) : undefined;
    setReviewingId(reviewId);
    try {
      const res = await fetch(`/api/approvals/${reviewId}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }) });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      if (outletId) fetchJsonArray(`/api/shifts?outletId=${outletId}`).then(setHistory);
    } finally {
      setReviewingId(null);
    }
  };

  /** Owner/Superuser correction panel — toggles an inline edit row under the clicked shift,
   * fetching its full denomination/balance-check breakdown (the history table itself only shows
   * summary columns) the first time it's opened. */
  const startEditShift = async (s: any) => {
    if (editingShiftId === s.id) {
      setEditingShiftId(null);
      return;
    }
    setEditingShiftId(s.id);
    setEditLoading(true);
    setEditRecomputeExpected(false);
    try {
      const detail = await fetchJsonObject<{ shift: any; cashCounts: { denomination: number; qty: number }[]; balanceChecks: { channelKey: string; label: string; actualBalance: number; expectedBalance: number }[] }>(
        `/api/shifts/${s.id}`
      );
      if (!detail) {
        setEditingShiftId(null);
        return;
      }
      setEditOpeningCash(detail.shift.openingCash || 0);
      const qtyMap: Record<number, number> = {};
      for (const c of detail.cashCounts) qtyMap[c.denomination] = c.qty;
      setEditQtyByDenom(qtyMap);
      setEditBalanceChecks(detail.balanceChecks.map((b) => ({ channelKey: b.channelKey, label: b.label, actualBalance: b.actualBalance, expectedBalance: b.expectedBalance })));
      setEditNotes(detail.shift.notes || "");
    } finally {
      setEditLoading(false);
    }
  };

  const cancelEditShift = () => setEditingShiftId(null);

  const saveEditShift = async (shiftId: string) => {
    setEditSaving(true);
    try {
      const res = await fetch(`/api/shifts/${shiftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openingCash: editOpeningCash,
          notes: editNotes,
          cashCounts: cashDenominations.map((d) => ({ denomination: d, qty: editQtyByDenom[d] || 0 })),
          balanceChecks: editBalanceChecks.map((b) => ({ channelKey: b.channelKey, actualBalance: b.actualBalance })),
          recomputeExpectedBalances: editRecomputeExpected,
        }),
      });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      setEditingShiftId(null);
      setEditRecomputeExpected(false);
      if (outletId) fetchJsonArray(`/api/shifts?outletId=${outletId}`).then(setHistory);
    } finally {
      setEditSaving(false);
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
          cashCounts: cashDenominations.map((d) => ({ denomination: d, qty: qtyByDenom[d] || 0 })),
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

      <div className="flex gap-1 border-b border-neutral-800">
        <button onClick={() => setPageTab("shift")} className={`px-3 py-2 text-sm ${pageTab === "shift" ? "border-b-2 border-emerald-500 text-emerald-400" : "text-neutral-500 hover:text-neutral-300"}`}>
          {t("shift.tab.shift", "Shift")}
        </button>
        {hasPermission((user?.role ?? "cashier") as any, "manage_cash_deposit") && (
          <button onClick={() => setPageTab("deposit")} className={`px-3 py-2 text-sm ${pageTab === "deposit" ? "border-b-2 border-emerald-500 text-emerald-400" : "text-neutral-500 hover:text-neutral-300"}`}>
            {t("shift.tab.cashDeposit", "Setoran Kas")}
          </button>
        )}
      </div>

      {pageTab === "deposit" ? (
        <CashDepositTab outletId={outletId} currentShiftId={currentShift?.id ?? null} cashAccounts={cashAccounts} rupiah={rupiah} />
      ) : (
      <>
      <Card className="border-cyan-500/30">
        <button className="w-full flex items-center justify-between text-left" onClick={() => setShowGuide((v) => !v)}>
          <span className="font-medium flex items-center gap-2">
            <HelpCircle size={16} className="text-cyan-400" /> {t("shift.guideTitle", "Panduan Singkat: Cara Kerja Shift")}
          </span>
          {showGuide ? <ChevronUp size={16} className="text-neutral-500" /> : <ChevronDown size={16} className="text-neutral-500" />}
        </button>
        {showGuide && (
          <ol className="mt-3 space-y-2 text-sm text-neutral-300 list-decimal list-inside">
            <li>{t("shift.guideStep1", "Di awal kerja, klik \"Buka Shift\" dan isi Modal Awal — jumlah uang tunai yang sudah ada di laci saat kamu mulai.")}</li>
            <li>{t("shift.guideStep2", "Selama shift berjalan, lakukan transaksi seperti biasa (rental, F&B, dll) — tidak perlu buka halaman ini lagi sampai mau pulang/gantian.")}</li>
            <li>{t("shift.guideStep3", "Saat mau pulang atau gantian shift, buka halaman ini lagi dan klik \"Tutup Shift\".")}</li>
            <li>{t("shift.guideStep4", "Hitung UANG TUNAI di laci satu per satu sesuai pecahannya (lembar Rp100.000, Rp50.000, dst), lalu isi jumlah lembarnya di kolom masing-masing — bukan totalnya, tapi JUMLAH LEMBAR/KEPINGnya.")}</li>
            <li>{t("shift.guideStep5", "Kalau ada channel non-tunai (GoPay, DANA, saldo Fastpay, dll), buka aplikasinya di HP, lihat angka saldo yang tertera di layar, lalu ketik angka itu apa adanya — jangan dikira-kira.")}</li>
            <li>{t("shift.guideStep6", "Klik \"Tutup Shift\". Sistem otomatis membandingkan hitunganmu dengan catatan transaksi, dan langsung menunjukkan kalau ada selisih (uang kurang atau lebih).")}</li>
          </ol>
        )}
      </Card>

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
            <p className="text-xs text-neutral-500 mb-2">
              {t(
                "shift.cashCountDesc",
                'Ambil semua uang tunai dari laci, pisahkan per jenis lembar/koin, lalu isi JUMLAH LEMBARNYA (bukan nilai rupiahnya) di kolom "Jumlah" masing-masing. Contoh: kalau ada 3 lembar Rp50.000, ketik "3" — bukan "150000". Sistem yang otomatis mengalikan dan menjumlahkan totalnya.'
              )}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {cashDenominations.map((d) => (
                <div key={d} className="flex items-center gap-2 rounded-lg border border-neutral-800 px-3 py-2">
                  <span className="text-sm w-28 shrink-0">{denominationLabel(d, currency)}</span>
                  <input
                    type="number"
                    min={0}
                    className="w-20 rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-sm"
                    value={qtyByDenom[d] || ""}
                    onChange={(e) => setQtyByDenom((prev) => ({ ...prev, [d]: Math.max(0, Number(e.target.value)) }))}
                    placeholder={t("shift.qtyPlaceholder", "Jumlah lembar")}
                  />
                  <span className="text-[10px] text-neutral-500">{t("shift.qtyUnit", "lbr")}</span>
                  <span className="text-xs text-neutral-500 ml-auto">= {rupiah(d * (qtyByDenom[d] || 0))}</span>
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
              <p className="text-xs text-neutral-500 mb-2">
                {t(
                  "shift.verifyBalanceDesc",
                  'Buka aplikasi/HP masing-masing channel di bawah ini (GoPay Merchant, DANA Bisnis, dsb), lihat ANGKA SALDO yang tertera di layar utamanya saat ini, lalu ketik persis angka itu. Contoh: kalau di aplikasi GoPay tertulis saldo Rp350.000, ketik "350000". Jangan dikira-kira atau dibulatkan.'
                )}
              </p>
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
                      placeholder={t("shift.balancePlaceholder", "Saldo di app saat ini")}
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
          <div className="flex gap-2 items-center flex-wrap">
            <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("shift.openingCashPlaceholder", "Modal awal kas")}
              value={openingCash || ""} onChange={(e) => setOpeningCash(Number(e.target.value))} />
            <Button onClick={openShift}>{t("shift.openShiftBtn", "Buka Shift")}</Button>
          </div>
          {suggestedOpeningCash != null && suggestedOpeningCashLabel && (
            <p className="text-xs text-neutral-500 mt-2">
              {t("shift.openingCashHint", "Modal Awal harus sesuai uang kas fisik yang sudah ada di laci — kalau kas ini dilacak sistem (Kas Toko/Kas Besar/Kas Kecil, dll di Pengaturan), gunakan angka itu, bukan perkiraan.")}
              {" "}
              <button type="button" className="text-emerald-400 hover:underline" onClick={() => setOpeningCash(suggestedOpeningCash)}>
                {t("shift.useCurrentTillBalance", "Pakai saldo {name} saat ini: {amount}").replace("{name}", suggestedOpeningCashLabel).replace("{amount}", rupiah(suggestedOpeningCash))}
              </button>
              {" "}
              <a href="/dashboard/settings" className="text-neutral-500 hover:underline">{t("shift.configureShiftFloatLink", "(atur komposisinya)")}</a>
            </p>
          )}
        </Card>
      )}

      {closeResult && (
        <Card className={closeResult.shift.variance === 0 ? "border-emerald-500/30" : "border-amber-500/30"}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-medium">{t("shift.closeSummaryTitle", "Ringkasan Tutup Shift")}</h2>
            <a href={`/api/shifts/${closeResult.shift.id}/export?format=pdf&lang=${lang}`} target="_blank" rel="noreferrer">
              <Button variant="secondary" className="text-xs">{t("shift.downloadReportBtn", "Download Berita Acara (PDF)")}</Button>
            </a>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
            <div><div className="text-xs text-neutral-500">{t("shift.cashInLabel", "Kas Masuk")}</div>{rupiah(closeResult.cashIn)}</div>
            <div><div className="text-xs text-neutral-500">{t("shift.cashOutLabel", "Kas Keluar")}</div>{rupiah(closeResult.cashOut)}</div>
            <div><div className="text-xs text-neutral-500" title={t("shift.expectedCashHint", "Uang yang SEHARUSNYA ada di laci menurut catatan transaksi sistem (modal awal + uang masuk − uang keluar) — bukan hasil hitungan fisikmu.")}>{t("shift.expectedCashLabel", "Ekspektasi Kas")} <HelpCircle size={10} className="inline text-neutral-600" /></div>{rupiah(closeResult.shift.expectedCash)}</div>
            <div><div className="text-xs text-neutral-500" title={t("shift.cashVarianceHint", "Selisih = uang hasil hitungan fisikmu dikurangi Ekspektasi Kas. Negatif berarti uang di laci kurang dari seharusnya; positif berarti lebih.")}>{t("shift.cashVarianceLabel", "Selisih Kas")} <HelpCircle size={10} className="inline text-neutral-600" /></div>
              <span className={Math.abs(closeResult.shift.variance) < 1 ? "text-emerald-400" : closeResult.shift.variance < 0 ? "text-red-400" : "text-amber-400"}>
                {rupiah(closeResult.shift.variance)}{closeResult.shift.variance < 0 ? t("shift.shortSuffixLower", " (kurang)") : closeResult.shift.variance > 0 ? t("shift.overSuffixLower", " (lebih)") : ""}
              </span>
            </div>
          </div>
          {closeResult.balanceCheckRows?.length > 0 && (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-neutral-500 border-b border-neutral-800"><th className="py-2">{t("shift.colChannel", "Channel")}</th><th className="text-right" title={t("shift.colExpectedHint", "Saldo yang seharusnya ada menurut sistem")}>{t("shift.colExpected", "Ekspektasi")}</th><th className="text-right" title={t("shift.colActualHint", "Saldo yang kamu lihat di aplikasi channel tersebut")}>{t("shift.colActual", "Aktual")}</th><th className="text-right" title={t("shift.colVarianceHint", "Aktual dikurangi Ekspektasi")}>{t("shift.colVariance", "Selisih")}</th></tr></thead>
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
          <thead><tr className="text-left text-neutral-500 border-b border-neutral-800"><th className="py-2">{t("shift.colOpen", "Buka")}</th><th>{t("shift.colClose", "Tutup")}</th><th>{t("shift.colStaff", "Karyawan")}</th><th>{t("shift.colOpeningCapital", "Modal")}</th><th title={t("shift.expectedCashHint", "Uang yang SEHARUSNYA ada di laci menurut catatan transaksi sistem (modal awal + uang masuk − uang keluar) — bukan hasil hitungan fisikmu.")}>{t("shift.colExpected", "Ekspektasi")}</th><th title={t("shift.colActualCashHint", "Total uang tunai hasil hitungan fisik saat tutup shift")}>{t("shift.colActual", "Aktual")}</th><th title={t("shift.cashVarianceHint", "Selisih = uang hasil hitungan fisikmu dikurangi Ekspektasi Kas. Negatif berarti uang di laci kurang dari seharusnya; positif berarti lebih.")}>{t("shift.cashVarianceLabel", "Selisih Kas")}</th><th title={t("shift.colNonCashVarianceHint", "Total selisih (aktual vs ekspektasi) untuk semua channel non-tunai seperti GoPay/DANA/Fastpay pada shift ini")}>{t("shift.colNonCashVariance", "Selisih Non-Tunai")}</th><th title={t("shift.colFraudHint", "Ditandai otomatis kalau selisih atau jumlah void/refund/hapus pada shift ini melebihi ambang batas di Pengaturan > Preferensi")}>{t("shift.colFraud", "Anti-Fraud")}</th><th></th></tr></thead>
          <tbody>
            {history.map((s) => {
              const cashV = varianceBadge(s.variance, t, rupiah);
              const nonCashV = varianceBadge(s.nonCashVarianceTotal, t, rupiah);
              const riskFlags: { code: string; label: string; severity: "warn" | "high" }[] = (() => {
                try { return s.riskFlags ? JSON.parse(s.riskFlags) : []; } catch { return []; }
              })();
              return (
                <Fragment key={s.id}>
                <tr className="border-b border-neutral-900">
                  <td className="py-2">{formatDateTime(s.openedAt)}</td>
                  <td>{s.closedAt ? formatDateTime(s.closedAt) : "-"}</td>
                  <td>{s.staffName ?? "-"}</td>
                  <td>{rupiah(s.openingCash)}</td>
                  <td>{s.expectedCash != null ? rupiah(s.expectedCash) : "-"}</td>
                  <td>{s.actualCash != null ? rupiah(s.actualCash) : "-"}</td>
                  <td className={cashV.className}>{cashV.text}</td>
                  <td className={nonCashV.className}>{nonCashV.text}</td>
                  <td className="whitespace-nowrap">
                    {riskFlags.length === 0 ? (
                      <span className="text-xs text-neutral-600">{t("shift.fraud.clean", "Bersih")}</span>
                    ) : (
                      <div className="space-y-1">
                        <span
                          className={`text-xs font-medium ${riskFlags.some((f) => f.severity === "high") ? "text-red-400" : "text-amber-400"}`}
                          title={riskFlags.map((f) => f.label).join("\n")}
                        >
                          🚩 {t("shift.fraud.flaggedCount", "{count} ditandai").replace("{count}", String(riskFlags.length))}
                        </span>
                        {s.review?.status === "pending" && (
                          <div className="text-xs">
                            <span className="text-amber-400">{t("shift.fraud.pendingReview", "Menunggu review")}</span>
                            {canReviewShifts && (
                              <div className="flex gap-1 mt-1">
                                <button disabled={reviewingId === s.review.id} onClick={() => decideReview(s.review.id, "approve")} className="text-emerald-400 hover:underline disabled:opacity-60">{t("shift.fraud.approveBtn", "Setujui")}</button>
                                <button disabled={reviewingId === s.review.id} onClick={() => decideReview(s.review.id, "reject")} className="text-red-400 hover:underline disabled:opacity-60">{t("shift.fraud.rejectBtn", "Tolak")}</button>
                              </div>
                            )}
                          </div>
                        )}
                        {s.review?.status === "approved" && <div className="text-xs text-emerald-400">{t("shift.fraud.reviewed", "Sudah ditinjau")}</div>}
                        {s.review?.status === "rejected" && <div className="text-xs text-red-400">{t("shift.fraud.reviewRejected", "Ditolak reviewer")}</div>}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    {s.status === "closed" && (
                      <a href={`/api/shifts/${s.id}/export?format=pdf&lang=${lang}`} target="_blank" rel="noreferrer" className="text-xs text-emerald-400 hover:underline">{t("shift.pdfLink", "PDF")}</a>
                    )}
                    {canManageShiftHistory && s.status === "closed" && (
                      <button
                        onClick={() => startEditShift(s)}
                        className="text-xs text-cyan-400 hover:underline ml-2"
                        title={t("shift.editTooltip", "Koreksi hitungan/saldo/catatan shift ini")}
                      >
                        {editingShiftId === s.id ? t("shift.editClose", "Tutup") : t("shift.edit", "Edit")}
                      </button>
                    )}
                    {canManageShiftHistory && (
                      <button
                        onClick={() => deleteShiftAction(s)}
                        disabled={deletingShiftId === s.id}
                        className="text-xs text-red-400 hover:underline ml-2 disabled:opacity-60"
                        title={s.status !== "closed" ? t("shift.deleteTooltipStillOpen", "Shift ini masih berjalan — hapus hanya kalau memang shift error/tidak akan ditutup normal") : t("shift.deleteTooltipReady", "Hapus riwayat shift ini")}
                      >
                        {deletingShiftId === s.id ? t("shift.deleting", "Menghapus...") : t("shift.delete", "Hapus")}
                      </button>
                    )}
                  </td>
                </tr>
                {editingShiftId === s.id && (
                  <tr className="border-b border-neutral-900 bg-neutral-900/40">
                    <td colSpan={10} className="p-4">
                      {editLoading ? (
                        <div className="text-xs text-neutral-500">{t("shift.editLoading", "Memuat detail shift...")}</div>
                      ) : (
                        <div className="space-y-4">
                          <div className="text-xs text-amber-400">
                            {t("shift.editWarning", "Koreksi ini akan mengubah angka final shift yang sudah ditutup — aktual kas & selisih dihitung ulang otomatis. Gunakan hanya untuk memperbaiki kesalahan input, bukan untuk sengaja menutupi selisih.")}
                          </div>

                          <div>
                            <label className="text-xs text-neutral-500">{t("shift.openingCashLabel", "Modal awal:")}</label>
                            <input
                              type="number"
                              className="w-40 rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-sm mt-1 block"
                              value={editOpeningCash || ""}
                              onChange={(e) => setEditOpeningCash(Number(e.target.value))}
                            />
                          </div>

                          <div>
                            <h4 className="text-sm font-medium mb-2">{t("shift.cashCountTitle", "Hitung Fisik Kas (Per Pecahan)")}</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {cashDenominations.map((d) => (
                                <div key={d} className="flex items-center gap-2 rounded-lg border border-neutral-800 px-3 py-2">
                                  <span className="text-sm w-28 shrink-0">{denominationLabel(d, currency)}</span>
                                  <input
                                    type="number"
                                    min={0}
                                    className="w-20 rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-sm"
                                    value={editQtyByDenom[d] || ""}
                                    onChange={(e) => setEditQtyByDenom((prev) => ({ ...prev, [d]: Math.max(0, Number(e.target.value)) }))}
                                    placeholder="0"
                                  />
                                  <span className="text-xs text-neutral-500 ml-auto">{rupiah(d * (editQtyByDenom[d] || 0))}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {editBalanceChecks.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">{t("shift.verifyBalanceTitle", "Verifikasi Saldo Channel Non-Tunai")}</h4>
                              <p className="text-xs text-neutral-500 mb-2">
                                {t(
                                  "shift.editBalanceHint",
                                  '"Ekspektasi" adalah saldo yang seharusnya ada menurut sistem (tidak ikut berubah kalau kamu edit) — kalau kamu ubah "Aktual", "Selisih" di sebelahnya otomatis dihitung ulang: Aktual dikurangi Ekspektasi.'
                                )}
                              </p>
                              <label className="flex items-start gap-2 text-xs text-amber-400 mb-2 rounded-lg border border-amber-600/30 px-3 py-2">
                                <input type="checkbox" className="mt-0.5" checked={editRecomputeExpected} onChange={(e) => setEditRecomputeExpected(e.target.checked)} />
                                <span>
                                  {t(
                                    "shift.editRecomputeExpectedLabel",
                                    'Hitung ulang "Ekspektasi" dari data sistem saat ini, bukan pakai angka lama. Gunakan HANYA kalau angka Ekspektasi lama diketahui salah karena bug data (misalnya sisa jurnal yatim yang sudah dibersihkan lewat halaman Admin Data) — jangan dipakai untuk menutupi selisih sungguhan.'
                                  )}
                                </span>
                              </label>
                              <div className="grid grid-cols-1 gap-2">
                                {editBalanceChecks.map((b, i) => {
                                  const variance = b.actualBalance - b.expectedBalance;
                                  return (
                                    <div key={b.channelKey} className="grid grid-cols-2 sm:grid-cols-4 items-center gap-2 rounded-lg border border-neutral-800 px-3 py-2">
                                      <span className="text-sm">{b.label}</span>
                                      <div className="text-xs text-neutral-500">
                                        {t("shift.colExpected", "Ekspektasi")}: <span className="text-neutral-300">{rupiah(b.expectedBalance)}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs text-neutral-500">{t("shift.colActual", "Aktual")}:</span>
                                        <input
                                          type="number"
                                          className="w-28 rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-sm"
                                          value={b.actualBalance}
                                          onChange={(e) =>
                                            setEditBalanceChecks((prev) => prev.map((row, idx) => (idx === i ? { ...row, actualBalance: Number(e.target.value) } : row)))
                                          }
                                        />
                                      </div>
                                      <div className={`text-xs font-medium ${Math.abs(variance) < 1 ? "text-emerald-400" : variance < 0 ? "text-red-400" : "text-amber-400"}`}>
                                        {t("shift.colVariance", "Selisih")}: {rupiah(variance)}
                                        {variance < 0 ? t("shift.shortSuffixLower", " (kurang)") : variance > 0 ? t("shift.overSuffixLower", " (lebih)") : ""}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div>
                            <label className="text-xs text-neutral-500">{t("shift.notesLabel", "Catatan (opsional)")}</label>
                            <textarea
                              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm mt-1"
                              rows={2}
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button className="text-xs" disabled={editSaving} onClick={() => saveEditShift(s.id)}>
                              {editSaving ? t("shift.savingEdit", "Menyimpan...") : t("shift.saveEdit", "Simpan Koreksi")}
                            </Button>
                            <Button variant="secondary" className="text-xs" disabled={editSaving} onClick={cancelEditShift}>
                              {t("shift.cancel", "Batal")}
                            </Button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </Card>
      </>
      )}
    </div>
  );
}

const PURPOSE_LABEL_KEYS: Record<string, [string, string]> = {
  kas_besar: ["cashDeposit.purpose.kasBesar", "Kas Besar"],
  saldo_deposit_virtual: ["cashDeposit.purpose.saldoDepositVirtual", "Saldo Deposit Virtual"],
  kas_kecil: ["cashDeposit.purpose.kasKecil", "Kas Kecil"],
  prive: ["cashDeposit.purpose.prive", "Prive Pemilik"],
  dividen: ["cashDeposit.purpose.dividen", "Dividen Pemilik"],
};
const INTERNAL_TRANSFER_PURPOSES = new Set(["kas_besar", "saldo_deposit_virtual", "kas_kecil"]);

/**
 * "Setoran Kas" — Owner/Manager/Supervisor/Accounting taking cash out of the till, moved to
 * another cash pool (Kas Besar/Saldo Deposit Virtual/Kas Kecil) or out of the business entirely
 * as an owner draw/dividend. Cashier records the amount + who received it; see
 * lib/cash/deposits.ts for the accounting behind each purpose. Kept as its own component (rather
 * than inlined in the parent) since the parent page is already very large.
 */
function CashDepositTab({
  outletId,
  currentShiftId,
  cashAccounts,
  rupiah,
}: {
  outletId: string | null;
  currentShiftId: string | null;
  cashAccounts: { id: string; name: string; type: string; isDefault: boolean; balance: number }[];
  rupiah: (n: number) => string;
}) {
  const { t } = useDashboardLang();
  const { user } = useAuth();
  const role = (user?.role ?? "cashier") as any;
  const canVoid = hasPermission(role, "void_cash_deposit");

  const [receivers, setReceivers] = useState<{ id: string; name: string; role: string }[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [amount, setAmount] = useState<number>(0);
  const [purposeType, setPurposeType] = useState("kas_besar");
  const [sourceId, setSourceId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    if (!outletId) return;
    fetchJsonArray("/api/cash-deposits/receivers").then(setReceivers);
    fetchJsonArray("/api/cash-deposits").then(setHistory);
  };
  useEffect(load, [outletId]);

  useEffect(() => {
    if (!sourceId) {
      const def = cashAccounts.find((a) => a.isDefault) ?? cashAccounts[0];
      if (def) setSourceId(def.id);
    }
  }, [cashAccounts, sourceId]);

  const isInternalTransfer = INTERNAL_TRANSFER_PURPOSES.has(purposeType);
  const destinationOptions = cashAccounts.filter((a) => a.id !== sourceId);
  const roleLabelMap: Record<string, string> = { owner: "Owner", superuser: "Superuser", manager: "Manager", supervisor: "Supervisor", accountant: "Accounting" };

  const submit = async () => {
    if (!(amount > 0)) return showAlert(t("cashDeposit.errAmount", "Jumlah setoran harus lebih dari 0."));
    if (!sourceId) return showAlert(t("cashDeposit.errSource", "Pilih akun kas sumber."));
    if (isInternalTransfer && !destinationId) return showAlert(t("cashDeposit.errDestination", "Pilih akun kas tujuan."));
    if (!receivedBy) return showAlert(t("cashDeposit.errReceiver", "Pilih staf penerima (Owner/Manager/Supervisor/Accounting)."));

    setSubmitting(true);
    try {
      const res = await fetch("/api/cash-deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId: currentShiftId,
          amount,
          purposeType,
          sourceCashBankAccountId: sourceId,
          destinationCashBankAccountId: isInternalTransfer ? destinationId : null,
          receivedByStaffUserId: receivedBy,
          notes: notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      setAmount(0);
      setDestinationId("");
      setReceivedBy("");
      setNotes("");
      load();
      showAlert(t("cashDeposit.saved", "Setoran kas berhasil dicatat."));
    } finally {
      setSubmitting(false);
    }
  };

  const voidDeposit = async (id: string) => {
    const reason = prompt(t("cashDeposit.promptVoidReason", "Alasan pembatalan setoran ini?")) ?? "";
    if (!reason) return;
    const res = await fetch(`/api/cash-deposits/${id}/void`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    load();
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-3">
        <h2 className="font-medium">{t("cashDeposit.formTitle", "Catat Setoran Kas")}</h2>
        <p className="text-xs text-neutral-500">
          {t("cashDeposit.formDesc", "Untuk kas toko yang diambil/dipindahkan oleh Owner/Manager/Supervisor/Accounting — ke Kas Besar, Saldo Deposit Virtual, Kas Kecil, atau ditarik sebagai Prive/Dividen pemilik. Wajib memilih siapa yang menerima, supaya setiap pengambilan tercatat jelas siapa penanggung jawabnya, dan otomatis terbukukan ke accounting.")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-neutral-500">{t("cashDeposit.amountLabel", "Jumlah")}</label>
            <input type="number" className="w-full mt-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} />
          </div>
          <div>
            <label className="text-xs text-neutral-500">{t("cashDeposit.purposeLabel", "Peruntukan")}</label>
            <select className="w-full mt-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={purposeType} onChange={(e) => { setPurposeType(e.target.value); setDestinationId(""); }}>
              {Object.entries(PURPOSE_LABEL_KEYS).map(([key, [labelKey, fallback]]) => (
                <option key={key} value={key}>{t(labelKey, fallback)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-neutral-500">{t("cashDeposit.sourceLabel", "Dari Akun Kas")}</label>
            <select className="w-full mt-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
              <option value="">{t("cashDeposit.selectPlaceholder", "Pilih")}</option>
              {cashAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({rupiah(a.balance)})</option>
              ))}
            </select>
          </div>
          {isInternalTransfer && (
            <div>
              <label className="text-xs text-neutral-500">{t("cashDeposit.destinationLabel", "Ke Akun Kas Tujuan")}</label>
              <select className="w-full mt-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={destinationId} onChange={(e) => setDestinationId(e.target.value)}>
                <option value="">{t("cashDeposit.selectPlaceholder", "Pilih")}</option>
                {destinationOptions.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({rupiah(a.balance)})</option>
                ))}
              </select>
              {destinationOptions.length === 0 && (
                <p className="text-xs text-amber-400 mt-1">{t("cashDeposit.noDestinationHint", "Belum ada akun kas lain — tambahkan dulu di Admin Data > Akun Kas/Bank (mis. \"Kas Besar\").")}</p>
              )}
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="text-xs text-neutral-500">{t("cashDeposit.receiverLabel", "Diterima/Diambil Oleh (wajib)")}</label>
            <select className="w-full mt-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)}>
              <option value="">{t("cashDeposit.selectPlaceholder", "Pilih")}</option>
              {receivers.map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({roleLabelMap[r.role] ?? r.role})</option>
              ))}
            </select>
            {receivers.length === 0 && (
              <p className="text-xs text-amber-400 mt-1">{t("cashDeposit.noReceiverHint", "Belum ada staf dengan role Owner/Manager/Supervisor/Accounting di outlet ini.")}</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-neutral-500">{t("cashDeposit.notesLabel", "Catatan (opsional)")}</label>
            <textarea className="w-full mt-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <Button onClick={submit} disabled={submitting}>{submitting ? t("cashDeposit.saving", "Menyimpan...") : t("cashDeposit.submitBtn", "Catat Setoran")}</Button>
      </Card>

      <Card>
        <h2 className="font-medium mb-3">{t("cashDeposit.historyTitle", "Riwayat Setoran Kas")}</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500 border-b border-neutral-800">
              <th className="py-2">{t("cashDeposit.col.time", "Waktu")}</th>
              <th>{t("cashDeposit.col.purpose", "Peruntukan")}</th>
              <th>{t("cashDeposit.col.amount", "Jumlah")}</th>
              <th>{t("cashDeposit.col.fromTo", "Dari → Ke")}</th>
              <th>{t("cashDeposit.col.receivedBy", "Diterima Oleh")}</th>
              <th>{t("cashDeposit.col.recordedBy", "Dicatat Oleh")}</th>
              <th>{t("cashDeposit.col.status", "Status")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {history.map((d) => (
              <tr key={d.id} className="border-b border-neutral-900">
                <td className="py-2 text-xs whitespace-nowrap">{new Date(d.createdAt).toLocaleString("id-ID")}</td>
                <td className="text-xs">{t(PURPOSE_LABEL_KEYS[d.purposeType]?.[0] ?? d.purposeType, PURPOSE_LABEL_KEYS[d.purposeType]?.[1] ?? d.purposeType)}</td>
                <td className="text-xs font-medium">{rupiah(d.amount)}</td>
                <td className="text-xs text-neutral-400">{d.sourceAccountName} → {d.destinationAccountName ?? PURPOSE_LABEL_KEYS[d.purposeType]?.[1] ?? d.purposeType}</td>
                <td className="text-xs">{d.receivedByName}</td>
                <td className="text-xs text-neutral-400">{d.recordedByName}</td>
                <td><Badge status={d.status === "posted" ? "success" : "failed"}>{d.status === "posted" ? t("cashDeposit.statusPosted", "Posted") : t("cashDeposit.statusVoid", "Dibatalkan")}</Badge></td>
                <td>
                  {canVoid && d.status === "posted" && (
                    <Button variant="ghost" className="text-xs text-red-400" onClick={() => voidDeposit(d.id)}>{t("cashDeposit.voidBtn", "Batalkan")}</Button>
                  )}
                </td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr><td colSpan={8} className="text-center text-neutral-500 py-6">{t("cashDeposit.noHistory", "Belum ada setoran kas tercatat.")}</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
