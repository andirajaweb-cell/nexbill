"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fetchJsonArray } from "@/lib/api/fetch-json";

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;
const inputCls = "w-full rounded-lg bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm";

/** Duplicated from getNextPayoutDate() in lib/referral/service.ts rather than imported — that
 * module imports the Postgres db client at the top, which can't run in the browser bundle (same
 * reasoning as effectiveRate() in the Market Risk platform-admin page). Keep the day-of-week
 * constant (1 = Monday) in sync if the payout cadence rule ever changes. */
function nextPayoutDate(from: Date = new Date()): string {
  const d = new Date(from);
  const daysUntil = (1 - d.getDay() + 7) % 7; // 1 = Monday
  d.setDate(d.getDate() + daysUntil);
  return d.toISOString().slice(0, 10);
}

const TIER_OPTIONS = [
  { value: "customer", label: "Customer (default, 20%)" },
  { value: "affiliate", label: "Affiliate (27%)" },
  { value: "master_partner", label: "Master Partner (35%)" },
];
const TIER_LABEL: Record<string, string> = { customer: "Customer", affiliate: "Affiliate", master_partner: "Master Partner" };
const TIER_BADGE: Record<string, string> = {
  customer: "bg-white/5 text-neutral-300",
  affiliate: "bg-sky-500/15 text-sky-300",
  master_partner: "bg-violet-500/15 text-violet-300",
};

interface Partner {
  id: string;
  outletId: string;
  outletName: string;
  code: string;
  tier: string;
  commissionPercent: number;
  isActive: boolean;
  totalReferrals: number;
  totalCommissionEarned: number;
  balanceAvailable: number;
  notes: string | null;
}

interface Detail extends Partner {
  referrals: { id: string; refereeOutletName: string; status: string; createdAt: string }[];
  commissions: { id: string; amount: number; commissionPercent: number; sourceInvoiceAmount: number; createdAt: string }[];
  payouts: { id: string; amount: number; method: string | null; note: string | null; createdAt: string }[];
  bank: { bankCountry: string | null; bankName: string | null; bankSwiftCode: string | null; bankAccountNumber: string | null; bankAccountHolderName: string | null };
}

export default function PlatformReferralsPage() {
  const [rows, setRows] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [editForm, setEditForm] = useState<{ tier: string; commissionPercent: string; isActive: boolean; notes: string } | null>(null);
  const [payoutForm, setPayoutForm] = useState({ amount: "", method: "", note: "" });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const data = await fetchJsonArray<Partner>("/api/platform-admin/referrals");
    setRows(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openDetail = async (id: string) => {
    setOpenId(id);
    setDetail(null);
    setError(null);
    const res = await fetch(`/api/platform-admin/referrals/${id}`);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "Gagal memuat detail partner.");
      return;
    }
    setDetail(data);
    setEditForm({ tier: data.tier, commissionPercent: String(data.commissionPercent), isActive: data.isActive, notes: data.notes ?? "" });
    // Pre-fill the payout method from the outlet's saved bank info so ops doesn't have to
    // retype it every time — still fully editable in case the actual transfer used something
    // else (e.g. cash, e-wallet) for this particular payout.
    const b = data.bank;
    const prefillMethod = b?.bankName && b?.bankAccountNumber ? `${b.bankName}${b.bankSwiftCode ? ` (${b.bankSwiftCode})` : ""} — ${b.bankAccountNumber} a.n. ${b.bankAccountHolderName ?? "-"}` : "";
    setPayoutForm({ amount: "", method: prefillMethod, note: "" });
  };

  const saveEdit = async () => {
    if (!openId || !editForm) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/platform-admin/referrals/${openId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: editForm.tier, commissionPercent: Number(editForm.commissionPercent), isActive: editForm.isActive, notes: editForm.notes }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Gagal menyimpan perubahan.");
        return;
      }
      await load();
      await openDetail(openId);
    } finally {
      setBusy(false);
    }
  };

  const submitPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/platform-admin/referrals/${openId}/payout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(payoutForm.amount), method: payoutForm.method, note: payoutForm.note }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Gagal mencatat payout.");
        return;
      }
      await load();
      await openDetail(openId);
      setPayoutForm({ amount: "", method: "", note: "" });
    } finally {
      setBusy(false);
    }
  };

  const totals = rows.reduce(
    (acc, r) => ({ referrals: acc.referrals + r.totalReferrals, earned: acc.earned + r.totalCommissionEarned, balance: acc.balance + r.balanceAvailable }),
    { referrals: 0, earned: 0, balance: 0 }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold text-emerald-300">Program Referral</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Setiap outlet otomatis punya kode referral sendiri (bagikan sebagai <code className="text-neutral-400">/daftar?ref=KODE</code>). Referee dapat diskon 20% di tagihan pertama; referrer dapat komisi berulang setiap tagihan langganan referee yang lunas, selama outlet itu terus berlangganan. Naikkan tier partner yang produktif ke Affiliate/Master Partner untuk rate komisi lebih tinggi. Payout dicairkan manual dari sini.
        </p>
      </div>

      <Card className="p-4 border-cyan-400/20">
        <div className="text-sm text-cyan-200 font-medium">Jadwal Pencairan: Setiap Hari Senin (1x/Minggu)</div>
        <p className="text-xs text-neutral-500 mt-0.5">
          Proses payout mingguan berikutnya:{" "}
          <span className="text-neutral-200">{new Date(nextPayoutDate() + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>.
          Total saldo yang perlu dicairkan minggu ini: <span className="text-amber-300 font-semibold">{rupiah(totals.balance)}</span>.
        </p>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4"><div className="text-xs text-neutral-500">Total Partner</div><div className="text-xl font-bold text-neutral-100">{rows.length}</div></Card>
        <Card className="p-4"><div className="text-xs text-neutral-500">Total Referral Berhasil</div><div className="text-xl font-bold text-neutral-100">{totals.referrals}</div></Card>
        <Card className="p-4"><div className="text-xs text-neutral-500">Total Saldo Belum Dicairkan</div><div className="text-xl font-bold text-amber-300">{rupiah(totals.balance)}</div></Card>
      </div>

      <Card>
        <h2 className="gm-heading font-semibold mb-3">Daftar Partner Referral</h2>
        {loading ? (
          <p className="text-sm text-neutral-500">Memuat...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-neutral-500">Belum ada partner referral (dibuat otomatis begitu ada outlet).</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <button
                key={r.id}
                onClick={() => openDetail(r.id)}
                className="w-full text-left rounded-lg border border-white/10 p-3 hover:border-emerald-400/30 hover:bg-white/[0.03] transition"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="text-sm font-medium text-neutral-100">
                      {r.outletName} <span className="text-neutral-600 font-mono">— {r.code}</span>
                      <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${TIER_BADGE[r.tier] ?? TIER_BADGE.customer}`}>{TIER_LABEL[r.tier] ?? r.tier}</span>
                      {!r.isActive && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300">Nonaktif</span>}
                    </div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      {r.totalReferrals} referral · komisi {r.commissionPercent}% · total earned {rupiah(r.totalCommissionEarned)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-neutral-500">Saldo belum dicairkan</div>
                    <div className="text-sm font-semibold text-emerald-300">{rupiah(r.balanceAvailable)}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {openId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setOpenId(null)}>
          <div className="max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <Card className="p-5 space-y-4">
              {!detail || !editForm ? (
                <p className="text-sm text-neutral-500">Memuat detail...</p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-semibold text-neutral-100">{detail.outletName}</div>
                      <div className="text-xs text-neutral-500 font-mono">{detail.code}</div>
                    </div>
                    <Button variant="ghost" onClick={() => setOpenId(null)}>Tutup</Button>
                  </div>

                  {error && <p className="text-xs text-red-400">{error}</p>}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="text-xs text-neutral-500">Tier</label>
                      <select
                        className={inputCls}
                        value={editForm.tier}
                        onChange={(e) => setEditForm({ ...editForm, tier: e.target.value })}
                      >
                        {TIER_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500">Komisi (%)</label>
                      <input type="number" className={inputCls} value={editForm.commissionPercent} onChange={(e) => setEditForm({ ...editForm, commissionPercent: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500">Status</label>
                      <select className={inputCls} value={editForm.isActive ? "1" : "0"} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === "1" })}>
                        <option value="1">Aktif</option>
                        <option value="0">Nonaktif (dibekukan)</option>
                      </select>
                    </div>
                    <div className="col-span-2 sm:col-span-1 flex items-end">
                      <Button onClick={saveEdit} disabled={busy} className="w-full">{busy ? "Menyimpan..." : "Simpan"}</Button>
                    </div>
                    <div className="col-span-2 sm:col-span-4">
                      <label className="text-xs text-neutral-500">Catatan Internal (ops only)</label>
                      <input className={inputCls} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="mis. TikTok creator @xxx, upgraded 2026-08" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg border border-white/10 p-2">
                      <div className="text-[10px] text-neutral-500">Referral</div>
                      <div className="text-sm font-semibold text-neutral-100">{detail.totalReferrals}</div>
                    </div>
                    <div className="rounded-lg border border-white/10 p-2">
                      <div className="text-[10px] text-neutral-500">Total Earned</div>
                      <div className="text-sm font-semibold text-neutral-100">{rupiah(detail.totalCommissionEarned)}</div>
                    </div>
                    <div className="rounded-lg border border-white/10 p-2">
                      <div className="text-[10px] text-neutral-500">Saldo Tersedia</div>
                      <div className="text-sm font-semibold text-emerald-300">{rupiah(detail.balanceAvailable)}</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-neutral-300 mb-1.5">Outlet Referral</div>
                    {detail.referrals.length === 0 ? (
                      <p className="text-xs text-neutral-500">Belum ada.</p>
                    ) : (
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {detail.referrals.map((r) => (
                          <div key={r.id} className="flex justify-between text-xs text-neutral-400 border-b border-white/5 py-1">
                            <span>{r.refereeOutletName}</span>
                            <span>{r.status} · {new Date(r.createdAt).toLocaleDateString("id-ID")}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-neutral-300 mb-1.5">Riwayat Komisi</div>
                    {detail.commissions.length === 0 ? (
                      <p className="text-xs text-neutral-500">Belum ada.</p>
                    ) : (
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {detail.commissions.map((c) => (
                          <div key={c.id} className="flex justify-between text-xs text-neutral-400 border-b border-white/5 py-1">
                            <span>{c.commissionPercent}% dari {rupiah(c.sourceInvoiceAmount)}</span>
                            <span className="text-emerald-300">+{rupiah(c.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-white/10 pt-3">
                    <div className="text-xs font-semibold text-neutral-300 mb-1.5">Rekening Bank Outlet</div>
                    {detail.bank.bankName && detail.bank.bankAccountNumber ? (
                      <div className="rounded-lg border border-white/10 p-2.5 text-xs text-neutral-300 space-y-0.5">
                        <div>{detail.bank.bankName} {detail.bank.bankSwiftCode && <span className="text-neutral-500 font-mono">({detail.bank.bankSwiftCode})</span>}</div>
                        <div>No. Rekening: <span className="font-mono">{detail.bank.bankAccountNumber}</span></div>
                        <div>a.n. {detail.bank.bankAccountHolderName ?? "-"}</div>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-400/80">Outlet belum mengisi rekening bank di Pengaturan — minta mereka melengkapi dulu sebelum payout diproses.</p>
                    )}
                  </div>

                  <div className="border-t border-white/10 pt-3">
                    <div className="text-xs font-semibold text-neutral-300 mb-1.5">Catat Payout Manual</div>
                    <form onSubmit={submitPayout} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <input type="number" placeholder="Jumlah (Rp)" className={inputCls} value={payoutForm.amount} onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })} />
                      <input placeholder="Metode (Transfer BCA, dll)" className={inputCls} value={payoutForm.method} onChange={(e) => setPayoutForm({ ...payoutForm, method: e.target.value })} />
                      <input placeholder="Catatan (opsional)" className={inputCls} value={payoutForm.note} onChange={(e) => setPayoutForm({ ...payoutForm, note: e.target.value })} />
                      <Button type="submit" disabled={busy}>{busy ? "Mencatat..." : "Catat Payout"}</Button>
                    </form>
                    {detail.payouts.length > 0 && (
                      <div className="space-y-1 max-h-24 overflow-y-auto mt-2">
                        {detail.payouts.map((p) => (
                          <div key={p.id} className="flex justify-between text-xs text-neutral-500 border-b border-white/5 py-1">
                            <span>{p.method ?? "-"} {p.note ? `— ${p.note}` : ""}</span>
                            <span>-{rupiah(p.amount)} · {new Date(p.createdAt).toLocaleDateString("id-ID")}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
