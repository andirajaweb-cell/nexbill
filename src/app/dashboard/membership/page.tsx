"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fetchJsonArray, fetchJsonObject } from "@/lib/api/fetch-json";
import { useApi } from "@/lib/api/use-api";
import { useAuth, isSuperRole } from "@/lib/auth/client";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-membership";
import { isPaidTier, summarizeTierBenefits, isMembershipActive, sisaHariKeanggotaan } from "@/lib/membership/tier-benefits";

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;
const TABS = ["Customer", "Membership Tier", "Reward", "Voucher"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL_KEY: Record<Tab, string> = {
  Customer: "membership.tabCustomer",
  "Membership Tier": "membership.tabTier",
  Reward: "membership.tabReward",
  Voucher: "membership.tabVoucher",
};

const LOYALTY_TYPE_LABEL: Record<string, string> = { earn: "Diperoleh", redeem: "Ditukar", adjust: "Penyesuaian", expire: "Kedaluwarsa" };
const LOYALTY_TYPE_BADGE: Record<string, string> = { earn: "success", redeem: "pending", adjust: "unknown", expire: "failed" };
const RENTAL_STATUS_LABEL: Record<string, string> = { running: "Berjalan", paused: "Jeda", finished: "Selesai", cancelled: "Batal" };
const RENTAL_STATUS_BADGE: Record<string, string> = { running: "running", paused: "pending", finished: "finished", cancelled: "failed" };

export default function MembershipPage() {
  return (
    <Suspense fallback={null}>
      <MembershipPageInner />
    </Suspense>
  );
}

function MembershipPageInner() {
  const { t } = useDashboardLang();
  const searchParams = useSearchParams();
  // Deep link from Rental's SESI BARU "Member" flow — /dashboard/membership?customerId=xxx opens
  // straight into that customer's transaction history instead of the plain list.
  const deepLinkCustomerId = searchParams.get("customerId");
  const [tab, setTab] = useState<Tab>("Customer");
  const [outletId, setOutletId] = useState<string | null>(null);

  const { data: outlet } = useApi<{ id: string }>("/api/outlets/default");
  useEffect(() => {
    if (outlet) setOutletId(outlet.id);
  }, [outlet]);

  useEffect(() => {
    if (deepLinkCustomerId) setTab("Customer");
  }, [deepLinkCustomerId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold gm-gradient-title">{t("membership.pageTitle", "Membership & CRM")}</h1>
        <p className="text-sm text-neutral-500">{t("membership.pageSubtitle", "Poin loyalty & upgrade tier otomatis setiap transaksi selesai — atau langsung jual keanggotaan (Cash/QRIS) dari detail customer, dengan biaya yang bisa diatur per outlet di tab Membership Tier.")}</p>
      </div>

      <div className="flex gap-1 border-b border-neutral-800">
        {TABS.map((tabItem) => (
          <button key={tabItem} onClick={() => setTab(tabItem)} className={`px-3 py-2 text-sm ${tab === tabItem ? "border-b-2 border-emerald-500 text-emerald-400" : "text-neutral-500 hover:text-neutral-300"}`}>
            {t(TAB_LABEL_KEY[tabItem], tabItem)}
          </button>
        ))}
      </div>

      {!outletId ? null : tab === "Customer" ? <CustomerTab outletId={outletId} initialCustomerId={deepLinkCustomerId} /> : tab === "Membership Tier" ? <TierTab outletId={outletId} /> : tab === "Reward" ? <RewardTab outletId={outletId} /> : <VoucherTab outletId={outletId} />}
    </div>
  );
}

function CustomerTab({ outletId, initialCustomerId }: { outletId: string; initialCustomerId?: string | null }) {
  const { t } = useDashboardLang();
  const { user } = useAuth();
  const role = (user?.role ?? "cashier") as StaffRole;
  const canDelete = isSuperRole(user?.role);
  const canRedeem = isSuperRole(user?.role);
  const canSellMembership = hasPermission(role, "manage_membership");
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [rewards, setRewards] = useState<any[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [expanded, setExpanded] = useState({ orders: false, rentals: false, loyalty: false });
  const [tiers, setTiers] = useState<any[]>([]);
  const [membershipPayments, setMembershipPayments] = useState<any[]>([]);
  const [sellForm, setSellForm] = useState<{ membershipTierId: string; paymentMethod: "cash" | "qris" }>({ membershipTierId: "", paymentMethod: "cash" });
  const [sellBusy, setSellBusy] = useState(false);
  const tr = (map: Record<string, string>, prefix: string, key: string) => t(`membership.${prefix}.${key}`, map[key] ?? key);

  const load = () => fetchJsonArray(`/api/customers${search ? `?search=${search}` : ""}`).then(setCustomers);
  useEffect(() => { load(); }, [search]);
  useEffect(() => { fetchJsonArray(`/api/loyalty-rewards?outletId=${outletId}&activeOnly=true`).then(setRewards); }, [outletId]);
  useEffect(() => { fetchJsonArray(`/api/membership-tiers?outletId=${outletId}`).then(setTiers); }, [outletId]);
  const payableTiers = tiers.filter(isPaidTier);
  const tierTerpilih = payableTiers.find((tier) => tier.id === sellForm.membershipTierId) ?? null;

  // Auto-open the deep-linked customer's detail panel once, on arrival from Rental's Member flow.
  useEffect(() => {
    if (initialCustomerId) openDetail({ id: initialCustomerId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCustomerId]);

  const create = async () => {
    if (!form.name) return;
    await fetch("/api/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, outletId }) });
    setForm({ name: "", phone: "" });
    load();
  };

  const openDetail = async (c: any) => {
    setSelected(c);
    setExpanded({ orders: false, rentals: false, loyalty: false });
    const res = await fetch(`/api/customers/${c.id}`);
    setDetail(await res.json());
    fetchJsonArray(`/api/loyalty-redemptions?customerId=${c.id}`).then(setRedemptions);
    fetchJsonArray(`/api/membership-payments?customerId=${c.id}`).then(setMembershipPayments);
  };

  const redeem = async (rewardId: string) => {
    if (!selected) return;
    const res = await fetch("/api/loyalty-redemptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId: selected.id, rewardId }) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    await showAlert(t("membership.redeemSuccess", "Berhasil! Kode redeem: {code}").replace("{code}", String(data.redemption.code)));
    openDetail(selected);
    load();
  };

  const sellMembershipAction = async () => {
    if (!selected || !sellForm.membershipTierId) return showAlert(t("membership.selectTierAlert", "Pilih tier keanggotaan."));
    setSellBusy(true);
    try {
      const res = await fetch("/api/membership-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: selected.id, membershipTierId: sellForm.membershipTierId, paymentMethod: sellForm.paymentMethod }),
      });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      await showAlert(t("membership.sellSuccess", "Berhasil! {paymentNumber} — keanggotaan aktif.").replace("{paymentNumber}", String(data.paymentNumber)));
      setSellForm({ membershipTierId: "", paymentMethod: "cash" });
      openDetail(selected);
      load();
    } finally {
      setSellBusy(false);
    }
  };

  const deleteCustomer = async (c: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!await showConfirm(t("membership.confirmDeleteCustomer", 'Hapus customer "{name}"? Riwayat order tetap tersimpan.').replace("{name}", String(c.name)))) return;
    const res = await fetch(`/api/admin/customers/${c.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    if (selected?.id === c.id) { setSelected(null); setDetail(null); }
    load();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <div className="flex gap-2 mb-3">
            <input className="flex-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("membership.searchPlaceholder", "Cari nama/HP...")} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("membership.newCustomerNamePlaceholder", "Nama customer baru")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("membership.phonePlaceholder", "No. HP")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <Button className="text-xs" onClick={create}>{t("membership.addCustomerBtn", "Tambah Customer")}</Button>
        </Card>

        <Card>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-neutral-500 border-b border-neutral-800"><th className="py-2">{t("membership.colMemberNumber", "No. Anggota")}</th><th>{t("membership.colName", "Nama")}</th><th>{t("membership.colPhone", "HP")}</th><th>{t("membership.colTotalSpending", "Total Belanja")}</th><th>{t("membership.colPoints", "Poin")}</th><th></th></tr></thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-neutral-900 cursor-pointer hover:bg-neutral-900" onClick={() => openDetail(c)}>
                  <td className="py-2 font-mono text-xs text-emerald-400">{c.memberNumber ?? "-"}</td>
                  <td>{c.name}</td>
                  <td className="text-neutral-400">{c.phone}</td>
                  <td>{rupiah(c.totalSpending)}</td>
                  <td>{c.loyaltyPoints}</td>
                  <td className="text-right">
                    {canDelete && <button className="text-xs text-red-400" onClick={(e) => deleteCustomer(c, e)}>{t("membership.deleteBtn", "Hapus")}</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Card className="h-fit">
        {!selected ? (
          <p className="text-sm text-neutral-500">{t("membership.selectCustomerHint", "Pilih customer untuk lihat detail.")}</p>
        ) : detail ? (
          <div className="space-y-3">
            <div>
              <div className="font-medium">{detail.customer.name}</div>
              <div className="font-mono text-xs text-emerald-400">{detail.customer.memberNumber ?? "-"}</div>
              <div className="text-xs text-neutral-500">{detail.customer.phone}</div>
              {detail.tier && <MembershipStatusBadge tier={detail.tier} expiresAt={detail.customer.membershipExpiresAt} />}
            </div>
            {/*
              Keuntungan tier yang sedang dipegang customer ditampilkan langsung di sini, bukan
              hanya di tab Membership Tier. Di sinilah kasir berdiri saat member bertanya "saya
              dapat apa?" — memaksanya pindah tab untuk menjawab adalah alasan paling umum
              keuntungan member akhirnya tidak pernah diberikan.
            */}
            {detail.tier && <TierBenefitList tier={detail.tier} />}
            <div className="text-sm">{t("membership.totalSpendingLabel", "Total Belanja")}: {rupiah(detail.customer.totalSpending)}</div>
            <div className="text-sm">{t("membership.loyaltyPointsLabel", "Poin Loyalty")}: {detail.customer.loyaltyPoints}</div>

            {canSellMembership && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5 space-y-2">
                <h3 className="text-xs text-emerald-400 uppercase font-medium">{t("membership.sellMembershipTitle", "Jual / Perpanjang Keanggotaan")}</h3>
                {payableTiers.length === 0 ? (
                  <p className="text-xs text-neutral-500">{t("membership.noPayableTiers", "Belum ada tier berbayar — atur Biaya Keanggotaan di tab Membership Tier dulu.")}</p>
                ) : (
                  <>
                    <select
                      className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs"
                      value={sellForm.membershipTierId}
                      onChange={(e) => setSellForm({ ...sellForm, membershipTierId: e.target.value })}
                    >
                      <option value="">{t("membership.selectTierOption", "Pilih tier...")}</option>
                      {payableTiers.map((tier) => <option key={tier.id} value={tier.id}>{tier.name} — {rupiah(tier.feeAmount)}</option>)}
                    </select>
                    {/*
                      Keuntungan tier yang dipilih ditampilkan SEBELUM tombol bayar ditekan.
                      Kasir yang menawarkan kartu member perlu bisa menyebutkan isinya tanpa
                      menghafal, dan customer berhak tahu persis apa yang dibelinya sebelum
                      uangnya berpindah.
                    */}
                    {tierTerpilih && (
                      <div className="rounded-lg bg-black/30 p-2">
                        <div className="text-[11px] text-neutral-400">
                          {tierTerpilih.validityDays > 0
                            ? t("membership.sellValidity", "Berlaku {n} hari sejak dibayar").replace("{n}", String(tierTerpilih.validityDays))
                            : t("membership.sellValidityForever", "Berlaku seumur hidup")}
                        </div>
                        <TierBenefitList tier={tierTerpilih} className="mt-1.5" />
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs">
                        <input type="radio" checked={sellForm.paymentMethod === "cash"} onChange={() => setSellForm({ ...sellForm, paymentMethod: "cash" })} /> {t("membership.cashLabel", "Cash")}
                      </label>
                      <label className="flex items-center gap-1.5 text-xs">
                        <input type="radio" checked={sellForm.paymentMethod === "qris"} onChange={() => setSellForm({ ...sellForm, paymentMethod: "qris" })} /> QRIS
                      </label>
                    </div>
                    <Button className="text-xs w-full" disabled={sellBusy || !sellForm.membershipTierId} onClick={sellMembershipAction}>
                      {sellBusy ? t("membership.processing", "Memproses...") : t("membership.payActivateBtn", "Bayar & Aktifkan")}
                    </Button>
                  </>
                )}
                {membershipPayments.length > 0 && (
                  <div className="pt-1.5 border-t border-white/10 space-y-1">
                    <div className="text-[10px] text-neutral-500 uppercase">{t("membership.paymentHistoryTitle", "Riwayat Pembayaran")}</div>
                    {membershipPayments.slice(0, 5).map((mp: any) => (
                      <div key={mp.id} className="text-xs flex items-center justify-between gap-2">
                        <span className={mp.status === "void" ? "text-neutral-600 line-through" : "text-neutral-300"}>
                          {mp.paymentNumber} · {mp.paymentMethod === "cash" ? t("membership.cashLabel", "Cash") : "QRIS"}
                        </span>
                        <span className={mp.status === "void" ? "text-neutral-600 line-through" : "text-emerald-400"}>{rupiah(mp.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs text-neutral-500 uppercase">{t("membership.orderHistoryTitle", "Riwayat Order ({n})").replace("{n}", String(detail.orderHistory.length))}</h3>
                {detail.orderHistory.length > 5 && (
                  <button className="text-[10px] text-emerald-400 hover:underline" onClick={() => setExpanded((s) => ({ ...s, orders: !s.orders }))}>
                    {expanded.orders ? t("membership.hideBtn", "Sembunyikan") : t("membership.viewAllBtn", "Lihat semua")}
                  </button>
                )}
              </div>
              {detail.orderHistory.length === 0 && <div className="text-xs text-neutral-600">{t("membership.noOrders", "Belum ada order.")}</div>}
              {detail.orderHistory.slice(0, expanded.orders ? undefined : 5).map((o: any) => (
                <div key={o.id} className="text-xs flex justify-between py-0.5">
                  <span>{new Date(o.createdAt).toLocaleDateString("id-ID")} · {o.source === "pos" ? t("membership.posSourceLabel", "Kasir") : o.source}</span>
                  <span>{rupiah(o.total)}</span>
                </div>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs text-neutral-500 uppercase">{t("membership.rentalHistoryTitle", "Riwayat Sewa ({n})").replace("{n}", String(detail.rentalHistory.length))}</h3>
                {detail.rentalHistory.length > 5 && (
                  <button className="text-[10px] text-emerald-400 hover:underline" onClick={() => setExpanded((s) => ({ ...s, rentals: !s.rentals }))}>
                    {expanded.rentals ? t("membership.hideBtn", "Sembunyikan") : t("membership.viewAllBtn", "Lihat semua")}
                  </button>
                )}
              </div>
              {detail.rentalHistory.length === 0 && <div className="text-xs text-neutral-600">{t("membership.noRentals", "Belum ada sesi sewa.")}</div>}
              {detail.rentalHistory.slice(0, expanded.rentals ? undefined : 5).map((r: any) => (
                <div key={r.id} className="text-xs flex items-center justify-between py-0.5">
                  <div>
                    <div>{new Date(r.startedAt).toLocaleDateString("id-ID")} · {r.unitName ?? t("membership.unitFallback", "Unit")}{r.gameName ? ` · ${r.gameName}` : ""}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span>{rupiah(r.totalAmount ?? 0)}</span>
                    <Badge status={RENTAL_STATUS_BADGE[r.status] ?? "unknown"}>{tr(RENTAL_STATUS_LABEL, "rentalStatus", r.status)}</Badge>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs text-neutral-500 uppercase">{t("membership.loyaltyHistoryTitle", "Riwayat Poin & Bonus ({n})").replace("{n}", String(detail.loyaltyHistory.length))}</h3>
                {detail.loyaltyHistory.length > 5 && (
                  <button className="text-[10px] text-emerald-400 hover:underline" onClick={() => setExpanded((s) => ({ ...s, loyalty: !s.loyalty }))}>
                    {expanded.loyalty ? t("membership.hideBtn", "Sembunyikan") : t("membership.viewAllBtn", "Lihat semua")}
                  </button>
                )}
              </div>
              {detail.loyaltyHistory.length === 0 && <div className="text-xs text-neutral-600">{t("membership.noLoyaltyHistory", "Belum ada riwayat poin.")}</div>}
              {detail.loyaltyHistory.slice(0, expanded.loyalty ? undefined : 5).map((lt: any) => (
                <div key={lt.id} className="text-xs flex items-center justify-between py-0.5 gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Badge status={LOYALTY_TYPE_BADGE[lt.type] ?? "unknown"}>{tr(LOYALTY_TYPE_LABEL, "loyaltyType", lt.type)}</Badge>
                      <span className="text-neutral-600">{new Date(lt.createdAt).toLocaleDateString("id-ID")}</span>
                    </div>
                    {lt.note && <div className="text-neutral-500 truncate">{lt.note}</div>}
                  </div>
                  <span className={`shrink-0 font-medium ${lt.points > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {lt.points > 0 ? "+" : ""}{lt.points}
                  </span>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-xs text-neutral-500 uppercase mb-1">{t("membership.redeemPointsTitle", "Tukar Poin")}</h3>
              {rewards.length === 0 && <div className="text-xs text-neutral-600">{t("membership.noRewardsCatalog", "Belum ada reward di katalog.")}</div>}
              <div className="space-y-1">
                {rewards.map((r) => {
                  const enough = detail.customer.loyaltyPoints >= r.pointsCost;
                  return (
                    <div key={r.id} className="flex justify-between items-center text-xs bg-neutral-900 rounded-lg px-2 py-1.5">
                      <div>
                        <div className="text-neutral-200">{r.name}</div>
                        <div className="text-neutral-500">
                          {t("membership.pointsCostLabel", "{n} poin").replace("{n}", String(r.pointsCost))}
                          {r.type === "partner_brand"
                            ? ` · ${r.partnerBrandName ?? t("membership.partnerFallback", "Partner")}`
                            : ` · ${t("membership.playDiscountLabel", "Diskon main {value}").replace("{value}", r.discountType === "percent" ? `${r.discountValue}%` : rupiah(r.discountValue))}`}
                        </div>
                      </div>
                      {canRedeem && (
                        <button disabled={!enough} className={`text-xs ${enough ? "text-emerald-400" : "text-neutral-700 cursor-not-allowed"}`} onClick={() => redeem(r.id)}>{t("membership.redeemBtn", "Tukar")}</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {redemptions.length > 0 && (
              <div>
                <h3 className="text-xs text-neutral-500 uppercase mb-1">{t("membership.redeemHistoryTitle", "Riwayat Redeem")}</h3>
                {redemptions.map((rd: any) => (
                  <div key={rd.id} className="text-xs flex justify-between py-0.5">
                    <span className="font-mono">{rd.code}</span>
                    <Badge status={rd.status === "used" ? "occupied" : "available"}>{rd.status === "used" ? t("membership.statusUsed", "Terpakai") : rd.status === "cancelled" ? t("membership.statusCancelled", "Batal") : t("membership.statusUnused", "Belum dipakai")}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </Card>
    </div>
  );
}

const emptyTierForm = {
  name: "",
  berbayar: true,
  feeAmount: 0,
  validityDays: 30,
  minSpending: 0,
  pointMultiplier: 1,
  discountPercent: 0,
  freePlayMinutes: 0,
  freeFnbAmount: 0,
  benefits: "",
};
type TierForm = typeof emptyTierForm;

/** Mengubah baris tabel jadi isian form — `berbayar` tidak disimpan di database, melainkan diturunkan dari ada/tidaknya biaya keanggotaan. */
const tierToForm = (tier: any): TierForm => ({
  name: tier.name ?? "",
  berbayar: (tier.feeAmount ?? 0) > 0,
  feeAmount: tier.feeAmount ?? 0,
  validityDays: tier.validityDays ?? 0,
  minSpending: tier.minSpending ?? 0,
  pointMultiplier: tier.pointMultiplier ?? 1,
  discountPercent: tier.discountPercent ?? 0,
  freePlayMinutes: tier.freePlayMinutes ?? 0,
  freeFnbAmount: tier.freeFnbAmount ?? 0,
  benefits: tier.benefits ?? "",
});

/** Kebalikannya — tier gratis dipaksa biaya 0 dan tanpa masa berlaku, supaya tidak mungkin tersimpan "gratis tapi berbiaya". */
const formToPayload = (f: TierForm) => ({
  name: f.name.trim(),
  minSpending: f.minSpending,
  feeAmount: f.berbayar ? f.feeAmount : 0,
  validityDays: f.berbayar ? f.validityDays : 0,
  pointMultiplier: f.pointMultiplier,
  discountPercent: f.discountPercent,
  freePlayMinutes: f.freePlayMinutes,
  freeFnbAmount: f.freeFnbAmount,
  benefits: f.benefits.trim() || null,
});

const labelKecil = "block text-[11px] uppercase tracking-wide text-neutral-500 mb-1";
const isian = "w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm";

/**
 * Satu form dipakai untuk Tambah maupun Edit.
 *
 * Sebelumnya keduanya adalah dua blok JSX terpisah dengan lima isian yang sama persis, dan tiap
 * kolom baru berarti menambahkannya di dua tempat — kalau lupa satu, kolomnya bisa diisi saat
 * membuat tapi hilang diam-diam saat mengedit. Dengan sepuluh isian sekarang, risiko itu tidak
 * lagi sepadan.
 *
 * Isiannya BERLABEL, bukan sekadar placeholder abu-abu. Alasannya sama dengan perombakan Form
 * Expense: placeholder hilang begitu kolomnya diisi, sehingga merchant yang kembali sehari
 * kemudian melihat deretan angka tanpa tahu angka mana artinya apa.
 */
function TierFormFields({ form, setForm }: { form: TierForm; setForm: (f: TierForm) => void }) {
  const { t } = useDashboardLang();
  const set = (patch: Partial<TierForm>) => setForm({ ...form, ...patch });

  return (
    <div className="space-y-4">
      <div>
        <label className={labelKecil}>{t("membership.fieldTierName", "1. Nama Tier")}</label>
        <input className={isian} placeholder={t("membership.tierNamePlaceholder", "Nama tier")} value={form.name} onChange={(e) => set({ name: e.target.value })} />
      </div>

      <div>
        <label className={labelKecil}>{t("membership.fieldTierType", "2. Cara Customer Mendapatkannya")}</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => set({ berbayar: true })}
            className={`rounded-lg border px-3 py-2 text-left text-xs transition ${form.berbayar ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300" : "border-neutral-700 bg-neutral-800 text-neutral-400"}`}
          >
            <div className="font-medium">{t("membership.tierTypePaid", "Berbayar (Kartu Member)")}</div>
            <div className="mt-0.5 text-[11px] opacity-80">{t("membership.tierTypePaidHint", "Dijual di kasir — uangnya masuk Cash/QRIS")}</div>
          </button>
          <button
            type="button"
            onClick={() => set({ berbayar: false })}
            className={`rounded-lg border px-3 py-2 text-left text-xs transition ${!form.berbayar ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300" : "border-neutral-700 bg-neutral-800 text-neutral-400"}`}
          >
            <div className="font-medium">{t("membership.tierTypeFree", "Gratis (Naik Sendiri)")}</div>
            <div className="mt-0.5 text-[11px] opacity-80">{t("membership.tierTypeFreeHint", "Didapat otomatis dari total belanja")}</div>
          </button>
        </div>
      </div>

      {form.berbayar ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelKecil}>{t("membership.fieldFee", "3. Harga Kartu Member (Rp)")}</label>
            <input type="number" min={0} className={isian} value={form.feeAmount || ""} onChange={(e) => set({ feeAmount: Number(e.target.value) })} />
          </div>
          <div>
            <label className={labelKecil}>{t("membership.fieldValidity", "4. Masa Berlaku (hari)")}</label>
            <input type="number" min={0} className={isian} value={form.validityDays} onChange={(e) => set({ validityDays: Number(e.target.value) })} />
            <p className="mt-1 text-[11px] text-neutral-600">{t("membership.fieldValidityHint", "Isi 0 kalau berlaku seumur hidup. 30 = sebulan, 365 = setahun. Perpanjangan ditambahkan di atas sisa yang masih ada.")}</p>
          </div>
        </div>
      ) : (
        <div>
          <label className={labelKecil}>{t("membership.fieldMinSpending", "3. Naik Tier Setelah Belanja (Rp)")}</label>
          <input type="number" min={0} className={isian} value={form.minSpending || ""} onChange={(e) => set({ minSpending: Number(e.target.value) })} />
          <p className="mt-1 text-[11px] text-neutral-600">{t("membership.fieldMinSpendingHint", "Customer otomatis naik ke tier ini begitu total belanjanya tembus angka ini.")}</p>
        </div>
      )}

      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-3">
        <div>
          <div className="text-xs font-medium text-emerald-300">{t("membership.autoBenefitsTitle", "Keuntungan Otomatis")}</div>
          <p className="text-[11px] text-neutral-500">{t("membership.autoBenefitsHint", "Dipotong sendiri oleh sistem. Kasir tidak perlu mengingatnya.")}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelKecil}>{t("membership.fieldDiscount", "Diskon Tarif Main (%)")}</label>
            <input type="number" min={0} max={100} className={isian} value={form.discountPercent || ""} onChange={(e) => set({ discountPercent: Number(e.target.value) })} />
          </div>
          <div>
            <label className={labelKecil}>{t("membership.fieldMultiplier", "Pengali Poin Loyalty")}</label>
            <input type="number" min={0} step={0.1} className={isian} value={form.pointMultiplier} onChange={(e) => set({ pointMultiplier: Number(e.target.value) })} />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-3">
        <div>
          <div className="text-xs font-medium text-amber-300">{t("membership.manualBenefitsTitle", "Keuntungan yang Diberikan Kasir")}</div>
          <p className="text-[11px] text-neutral-500">
            {t("membership.manualBenefitsHint", "Sistem hanya MENAMPILKAN ini sebagai pengingat di layar kasir — tidak memotongnya sendiri. Kasir yang memberikannya lewat diskon atau item gratis di bill.")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelKecil}>{t("membership.fieldFreeMinutes", "Gratis Main (menit)")}</label>
            <input type="number" min={0} className={isian} value={form.freePlayMinutes || ""} onChange={(e) => set({ freePlayMinutes: Number(e.target.value) })} />
          </div>
          <div>
            <label className={labelKecil}>{t("membership.fieldFreeFnb", "Gratis Makanan/Minuman (Rp)")}</label>
            <input type="number" min={0} className={isian} value={form.freeFnbAmount || ""} onChange={(e) => set({ freeFnbAmount: Number(e.target.value) })} />
          </div>
        </div>
        <div>
          <label className={labelKecil}>{t("membership.fieldBenefits", "Keuntungan Lain (satu per baris)")}</label>
          <textarea
            rows={3}
            className={`${isian} resize-y`}
            placeholder={t("membership.fieldBenefitsPlaceholder", "Prioritas booking akhir pekan\nGratis 1 jam saat ulang tahun\nBoleh bawa 2 teman dengan harga member")}
            value={form.benefits}
            onChange={(e) => set({ benefits: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

function TierTab({ outletId }: { outletId: string }) {
  const { t } = useDashboardLang();
  const { user } = useAuth();
  const canManage = isSuperRole(user?.role);
  const [tiers, setTiers] = useState<any[]>([]);
  const [form, setForm] = useState<TierForm>(emptyTierForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TierForm>(emptyTierForm);

  const load = () => fetchJsonArray(`/api/membership-tiers?outletId=${outletId}`).then(setTiers);
  useEffect(() => { load(); }, [outletId]);

  const create = async () => {
    if (!form.name.trim()) return showAlert(t("membership.tierNameRequired", "Nama tier wajib diisi."));
    if (form.berbayar && !(form.feeAmount > 0)) return showAlert(t("membership.tierFeeRequired", "Tier berbayar harus punya harga kartu member di atas 0."));
    const res = await fetch("/api/membership-tiers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...formToPayload(form), outletId }) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setForm(emptyTierForm);
    load();
  };

  const startEdit = (tier: any) => { setEditingId(tier.id); setEditForm(tierToForm(tier)); };
  const cancelEdit = () => { setEditingId(null); setEditForm(emptyTierForm); };

  const saveEdit = async (id: string) => {
    if (!editForm.name.trim()) return showAlert(t("membership.tierNameRequired", "Nama tier wajib diisi."));
    if (editForm.berbayar && !(editForm.feeAmount > 0)) return showAlert(t("membership.tierFeeRequired", "Tier berbayar harus punya harga kartu member di atas 0."));
    const res = await fetch(`/api/membership-tiers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formToPayload(editForm)) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    cancelEdit();
    load();
  };

  const remove = async (tier: any) => {
    if (!await showConfirm(t("membership.confirmDeleteTier", 'Hapus tier "{name}"?').replace("{name}", String(tier.name)))) return;
    const res = await fetch(`/api/membership-tiers/${tier.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    load();
  };

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="font-medium mb-1">{t("membership.addTierTitle", "Tambah Tier")}</h2>
        <p className="text-xs text-neutral-500 mb-4">
          {t("membership.tierFormDesc2", "Outlet Anda yang menentukan sendiri: mau keanggotaan gratis yang naik sendiri dari belanja, atau kartu member berbayar yang dijual di kasir — lengkap dengan harga, masa berlaku, dan keuntungannya.")}
        </p>
        <TierFormFields form={form} setForm={setForm} />
        <Button className="mt-4" onClick={create}>{t("membership.saveTierBtn", "Simpan Tier")}</Button>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {tiers.map((tier) => (
          <Card key={tier.id}>
            {editingId === tier.id ? (
              <div className="space-y-3">
                <TierFormFields form={editForm} setForm={setEditForm} />
                <div className="flex gap-2">
                  <Button className="text-xs" onClick={() => saveEdit(tier.id)}>{t("membership.saveBtn", "Simpan")}</Button>
                  <button className="text-xs text-neutral-400" onClick={cancelEdit}>{t("membership.cancelBtn", "Batal")}</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{tier.name}</div>
                    {isPaidTier(tier) ? (
                      <div className="text-xs text-emerald-400">
                        {rupiah(tier.feeAmount)}
                        {tier.validityDays > 0
                          ? ` · ${t("membership.validForDays", "berlaku {n} hari").replace("{n}", String(tier.validityDays))}`
                          : ` · ${t("membership.validForever", "seumur hidup")}`}
                      </div>
                    ) : (
                      <div className="text-xs text-neutral-500">{t("membership.freeTierLabel", "Gratis — naik sendiri setelah belanja {amount}").replace("{amount}", rupiah(tier.minSpending))}</div>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex gap-2 text-xs shrink-0">
                      <button className="text-emerald-400" onClick={() => startEdit(tier)}>{t("membership.editBtn", "Edit")}</button>
                      <button className="text-red-400" onClick={() => remove(tier)}>{t("membership.deleteBtn", "Hapus")}</button>
                    </div>
                  )}
                </div>
                <TierBenefitList tier={tier} className="mt-3" />
              </>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * Status keanggotaan customer: aktif, sisa harinya menipis, atau sudah habis.
 *
 * Kedaluwarsa SENGAJA tetap menampilkan nama tier-nya, bukan menghilangkannya. Sistem memang
 * berhenti memberi diskon (lihat computeEffectiveHourlyRate), tapi kasir perlu melihat "Gold —
 * sudah habis" untuk tahu ada perpanjangan yang bisa ditawarkan detik itu juga. Menghapus
 * statusnya dari layar justru membuang penjualan yang paling mudah.
 */
function MembershipStatusBadge({ tier, expiresAt }: { tier: any; expiresAt: string | null | undefined }) {
  const { t } = useDashboardLang();
  const aktif = isMembershipActive(expiresAt);
  const sisa = sisaHariKeanggotaan(expiresAt);

  if (!aktif) {
    return (
      <div className="flex items-center gap-1.5">
        <Badge status="failed">{tier.name}</Badge>
        <span className="text-[11px] text-rose-400">{t("membership.expiredLabel", "Masa berlaku habis")}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <Badge status="available">{tier.name}</Badge>
      {sisa !== null && (
        <span className={`text-[11px] ${sisa <= 7 ? "text-amber-400" : "text-neutral-500"}`}>
          {t("membership.daysLeftLabel", "sisa {n} hari").replace("{n}", String(sisa))}
        </span>
      )}
    </div>
  );
}

/**
 * Daftar keuntungan sebuah tier, dipisah tegas antara yang berjalan otomatis dan yang harus
 * diberikan kasir sendiri — pembagiannya ditentukan summarizeTierBenefits(), bukan di sini.
 *
 * Pemisahan ini bukan kosmetik. "Diskon 10%" memang dipotong sistem saat sesi dihitung, tapi
 * "gratis 30 menit" tidak ada kodenya di mana pun. Menampilkan keduanya dalam satu daftar rata
 * akan membuat merchant mengira sistem mengurusnya, lalu member menagih jam gratis yang tidak
 * pernah muncul di bill.
 */
function TierBenefitList({ tier, className = "" }: { tier: any; className?: string }) {
  const { t } = useDashboardLang();
  const s = summarizeTierBenefits(tier);
  const otomatis: string[] = [];
  if (s.otomatis.discountPercent > 0) otomatis.push(t("membership.benefitDiscount", "Diskon tarif main {n}%").replace("{n}", String(s.otomatis.discountPercent)));
  if (s.otomatis.pointMultiplier > 1) otomatis.push(t("membership.benefitMultiplier", "Poin loyalty x{n}").replace("{n}", String(s.otomatis.pointMultiplier)));

  const manual: string[] = [];
  if (s.manual.freePlayMinutes > 0) manual.push(t("membership.benefitFreeMinutes", "Gratis main {n} menit").replace("{n}", String(s.manual.freePlayMinutes)));
  if (s.manual.freeFnbAmount > 0) manual.push(t("membership.benefitFreeFnb", "Gratis makanan/minuman {amount}").replace("{amount}", rupiah(s.manual.freeFnbAmount)));
  manual.push(...s.manual.catatan);

  if (otomatis.length === 0 && manual.length === 0) {
    return <p className={`text-xs text-neutral-600 ${className}`}>{t("membership.noBenefitsYet", "Belum ada keuntungan yang diatur untuk tier ini.")}</p>;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {otomatis.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wide text-emerald-500/80">{t("membership.autoBenefitsTitle", "Keuntungan Otomatis")}</div>
          <ul className="mt-0.5 space-y-0.5">
            {otomatis.map((b, i) => <li key={i} className="text-xs text-neutral-300">• {b}</li>)}
          </ul>
        </div>
      )}
      {manual.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wide text-amber-500/80">{t("membership.manualBenefitsShort", "Diberikan Kasir")}</div>
          <ul className="mt-0.5 space-y-0.5">
            {manual.map((b, i) => <li key={i} className="text-xs text-neutral-400">• {b}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

const emptyRewardForm = { name: "", type: "partner_brand" as "partner_brand" | "play_discount", pointsCost: 100, partnerBrandName: "", description: "", discountType: "percent" as "percent" | "amount", discountValue: 10 };

function RewardTab({ outletId }: { outletId: string }) {
  const { t } = useDashboardLang();
  const { user } = useAuth();
  const canManage = isSuperRole(user?.role);
  const [rewards, setRewards] = useState<any[]>([]);
  const [form, setForm] = useState(emptyRewardForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyRewardForm);

  const load = () => fetchJsonArray(`/api/loyalty-rewards?outletId=${outletId}`).then(setRewards);
  useEffect(() => { load(); }, [outletId]);

  const create = async () => {
    if (!form.name || !form.pointsCost) return showAlert(t("membership.rewardNameRequired", "Nama reward dan poin wajib diisi."));
    const body: any = { outletId, name: form.name, type: form.type, pointsCost: form.pointsCost };
    if (form.type === "partner_brand") { body.partnerBrandName = form.partnerBrandName; body.description = form.description; }
    else { body.discountType = form.discountType; body.discountValue = form.discountValue; }
    const res = await fetch("/api/loyalty-rewards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setForm(emptyRewardForm);
    load();
  };

  const startEdit = (r: any) => {
    setEditingId(r.id);
    setEditForm({
      name: r.name, type: r.type, pointsCost: r.pointsCost,
      partnerBrandName: r.partnerBrandName ?? "", description: r.description ?? "",
      discountType: r.discountType ?? "percent", discountValue: r.discountValue ?? 10,
    });
  };
  const cancelEdit = () => { setEditingId(null); setEditForm(emptyRewardForm); };

  const saveEdit = async (id: string) => {
    const body: any = { name: editForm.name, pointsCost: editForm.pointsCost };
    if (editForm.type === "partner_brand") { body.partnerBrandName = editForm.partnerBrandName; body.description = editForm.description; }
    else { body.discountType = editForm.discountType; body.discountValue = editForm.discountValue; }
    const res = await fetch(`/api/loyalty-rewards/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    cancelEdit();
    load();
  };

  const toggleActive = async (r: any) => {
    await fetch(`/api/loyalty-rewards/${r.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !r.isActive }) });
    load();
  };

  const remove = async (r: any) => {
    if (!await showConfirm(t("membership.confirmDeleteReward", 'Hapus reward "{name}"?').replace("{name}", String(r.name)))) return;
    const res = await fetch(`/api/loyalty-rewards/${r.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    load();
  };

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="font-medium mb-3">{t("membership.addRewardTitle", "Tambah Reward")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("membership.rewardNamePlaceholder", "Nama reward")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })}>
            <option value="partner_brand">{t("membership.partnerBrandOption", "Belanja Brand Partner")}</option>
            <option value="play_discount">{t("membership.playDiscountOption", "Diskon Main")}</option>
          </select>
          <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("membership.pointsCostPlaceholder", "Poin dibutuhkan")} value={form.pointsCost || ""} onChange={(e) => setForm({ ...form, pointsCost: Number(e.target.value) })} />
          {form.type === "partner_brand" ? (
            <>
              <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("membership.partnerBrandNamePlaceholder", "Nama brand partner")} value={form.partnerBrandName} onChange={(e) => setForm({ ...form, partnerBrandName: e.target.value })} />
              <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm sm:col-span-2" placeholder={t("membership.descriptionPlaceholder", "Keterangan (mis. Voucher belanja Rp50.000)")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </>
          ) : (
            <>
              <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value as any })}>
                <option value="percent">{t("membership.percentOption", "Persen (%)")}</option>
                <option value="amount">{t("membership.amountOption", "Nominal (Rp)")}</option>
              </select>
              <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("membership.discountValuePlaceholder", "Nilai diskon")} value={form.discountValue || ""} onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })} />
            </>
          )}
        </div>
        <Button className="mt-2" onClick={create}>{t("membership.saveRewardBtn", "Simpan Reward")}</Button>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rewards.map((r) => (
          <Card key={r.id}>
            {editingId === r.id ? (
              <div className="space-y-2">
                <input className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-sm" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                <input type="number" className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-sm" placeholder={t("membership.pointsPlaceholder", "Poin")} value={editForm.pointsCost} onChange={(e) => setEditForm({ ...editForm, pointsCost: Number(e.target.value) })} />
                {editForm.type === "partner_brand" ? (
                  <>
                    <input className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-sm" placeholder={t("membership.brandNamePlaceholder", "Nama brand")} value={editForm.partnerBrandName} onChange={(e) => setEditForm({ ...editForm, partnerBrandName: e.target.value })} />
                    <input className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-sm" placeholder={t("membership.descriptionShortPlaceholder", "Keterangan")} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                  </>
                ) : (
                  <input type="number" className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-sm" placeholder={t("membership.discountValuePlaceholder", "Nilai diskon")} value={editForm.discountValue} onChange={(e) => setEditForm({ ...editForm, discountValue: Number(e.target.value) })} />
                )}
                <div className="flex gap-2">
                  <Button className="text-xs" onClick={() => saveEdit(r.id)}>{t("membership.saveBtn", "Simpan")}</Button>
                  <button className="text-xs text-neutral-400" onClick={cancelEdit}>{t("membership.cancelBtn", "Batal")}</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start">
                  <div className="font-medium">{r.name}</div>
                  {canManage && (
                    <div className="flex gap-2 text-xs">
                      <button className="text-emerald-400" onClick={() => startEdit(r)}>{t("membership.editBtn", "Edit")}</button>
                      <button className="text-red-400" onClick={() => remove(r)}>{t("membership.deleteBtn", "Hapus")}</button>
                    </div>
                  )}
                </div>
                <div className="text-xs text-neutral-500">{t("membership.pointsCostLabel", "{n} poin").replace("{n}", String(r.pointsCost))}</div>
                <div className="text-xs text-neutral-500">
                  {r.type === "partner_brand"
                    ? `${t("membership.brandLabel", "Brand: {name}").replace("{name}", r.partnerBrandName ?? "-")}${r.description ? ` · ${r.description}` : ""}`
                    : t("membership.playDiscountFullLabel", "Diskon main: {value}").replace("{value}", r.discountType === "percent" ? `${r.discountValue}%` : rupiah(r.discountValue))}
                </div>
                {canManage && (
                  <button className="mt-1 text-xs text-neutral-400" onClick={() => toggleActive(r)}>
                    <Badge status={r.isActive ? "available" : "occupied"}>{r.isActive ? t("membership.activeLabel", "Aktif") : t("membership.inactiveLabel", "Nonaktif")}</Badge>
                  </button>
                )}
              </>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function VoucherTab({ outletId }: { outletId: string }) {
  const { t } = useDashboardLang();
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [form, setForm] = useState({ code: "", type: "percent", value: 10, minPurchase: 0 });

  const load = () => fetchJsonArray(`/api/vouchers?outletId=${outletId}`).then(setVouchers);
  useEffect(() => { load(); }, [outletId]);

  const create = async () => {
    if (!form.code) return;
    await fetch("/api/vouchers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, outletId }) });
    setForm({ code: "", type: "percent", value: 10, minPurchase: 0 });
    load();
  };

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="font-medium mb-3">{t("membership.createVoucherTitle", "Buat Voucher")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm uppercase" placeholder={t("membership.codePlaceholder", "Kode")} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="percent">{t("membership.percentOption", "Persen (%)")}</option>
            <option value="amount">{t("membership.amountOption", "Nominal (Rp)")}</option>
          </select>
          <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("membership.valuePlaceholder", "Nilai")} value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
          <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("membership.minSpendingPlaceholder", "Min belanja")} value={form.minPurchase || ""} onChange={(e) => setForm({ ...form, minPurchase: Number(e.target.value) })} />
        </div>
        <Button className="mt-2" onClick={create}>{t("membership.createVoucherBtn", "Buat Voucher")}</Button>
      </Card>
      <Card>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-neutral-500 border-b border-neutral-800"><th className="py-2">{t("membership.colCode", "Kode")}</th><th>{t("membership.colType", "Tipe")}</th><th>{t("membership.colValue", "Nilai")}</th><th>{t("membership.colUsed", "Terpakai")}</th><th>{t("membership.colStatus", "Status")}</th></tr></thead>
          <tbody>
            {vouchers.map((v) => (
              <tr key={v.id} className="border-b border-neutral-900">
                <td className="py-2 font-mono">{v.code}</td>
                <td>{v.type === "percent" ? "%" : "Rp"}</td>
                <td>{v.type === "percent" ? `${v.value}%` : rupiah(v.value)}</td>
                <td>{v.usedCount}{v.usageLimit ? `/${v.usageLimit}` : ""}</td>
                <td><Badge status={v.isActive ? "available" : "occupied"}>{v.isActive ? t("membership.activeLabel", "Aktif") : t("membership.inactiveLabel", "Nonaktif")}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
