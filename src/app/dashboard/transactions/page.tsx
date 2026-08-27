"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fetchJsonArray, fetchJsonObject } from "@/lib/api/fetch-json";
import { useAuth } from "@/lib/auth/client";
import { hasPermission } from "@/lib/auth/permissions";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-transactions";

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;
const TYPE_LABEL: Record<string, string> = { rental: "Rental", fnb: "F&B", product: "Produk", ppob: "PPOB" };
const TYPE_LABEL_KEY: Record<string, string> = { rental: "transactions.type.rental", fnb: "transactions.type.fnb", product: "transactions.type.product", ppob: "transactions.type.ppob" };
const STATUS_LABEL: Record<string, string> = { open: "Open", awaiting_payment: "Menunggu Bayar", partial: "Sebagian", paid: "Lunas", cancelled: "Dibatalkan" };
const STATUS_LABEL_KEY: Record<string, string> = { open: "transactions.status.open", awaiting_payment: "transactions.status.awaitingPayment", partial: "transactions.status.partial", paid: "transactions.status.paid", cancelled: "transactions.status.cancelled" };
const STATUS_BADGE: Record<string, string> = { open: "pending", awaiting_payment: "pending", partial: "pending", paid: "success", cancelled: "failed" };
const PAYMENT_GROUPS = ["Cash", "Transfer Bank", "QRIS", "E-Wallet", "Card"];
const PAYMENT_GROUP_KEY: Record<string, string> = { "Cash": "transactions.paymentGroup.cash", "Transfer Bank": "transactions.paymentGroup.transferBank", "QRIS": "transactions.paymentGroup.qris", "E-Wallet": "transactions.paymentGroup.ewallet", "Card": "transactions.paymentGroup.card" };

/** Looks up a translated display label for a raw type/status/payment-group value, falling back
 * to the original Indonesian label map (and then the raw value itself) if no key/translation exists. */
function typeLabel(t: (key: string, fallback?: string) => string, type: string): string {
  return TYPE_LABEL_KEY[type] ? t(TYPE_LABEL_KEY[type], TYPE_LABEL[type] ?? type) : type;
}
function statusLabel(t: (key: string, fallback?: string) => string, status: string): string {
  return STATUS_LABEL_KEY[status] ? t(STATUS_LABEL_KEY[status], STATUS_LABEL[status] ?? status) : status;
}
function paymentGroupLabel(t: (key: string, fallback?: string) => string, group: string): string {
  return PAYMENT_GROUP_KEY[group] ? t(PAYMENT_GROUP_KEY[group], group) : group;
}

type PeriodPreset = "today" | "yesterday" | "this_week" | "last_week" | "this_month" | "last_month" | "this_year" | "last_year" | "custom";
const PRESETS: { key: PeriodPreset; label: string }[] = [
  { key: "today", label: "Hari Ini" },
  { key: "yesterday", label: "Kemarin" },
  { key: "this_week", label: "Minggu Ini" },
  { key: "last_week", label: "Minggu Lalu" },
  { key: "this_month", label: "Bulan Ini" },
  { key: "last_month", label: "Bulan Lalu" },
  { key: "this_year", label: "Tahun Ini" },
  { key: "last_year", label: "Tahun Lalu" },
  { key: "custom", label: "Custom" },
];
const PRESET_KEY: Record<PeriodPreset, string> = {
  today: "transactions.preset.today",
  yesterday: "transactions.preset.yesterday",
  this_week: "transactions.preset.thisWeek",
  last_week: "transactions.preset.lastWeek",
  this_month: "transactions.preset.thisMonth",
  last_month: "transactions.preset.lastMonth",
  this_year: "transactions.preset.thisYear",
  last_year: "transactions.preset.lastYear",
  custom: "transactions.preset.custom",
};

function toLocalIso(d: Date) {
  return d.toISOString();
}
function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
function startOfWeek(d: Date) { const x = startOfDay(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); return x; } // Monday start
function endOfWeek(d: Date) { const x = startOfWeek(d); x.setDate(x.getDate() + 6); return endOfDay(x); }

/** Resolves a quick-select preset to a [from,to] ISO range in the browser's own local timezone
 * (matches how the rest of this app is UTC-naive server-side — computing the boundary client-side
 * in local time and sending it as an absolute ISO instant is the correct fix). */
function resolvePreset(preset: PeriodPreset, customFrom: string, customTo: string): { from: string; to: string } {
  const now = new Date();
  switch (preset) {
    case "today": return { from: toLocalIso(startOfDay(now)), to: toLocalIso(endOfDay(now)) };
    case "yesterday": { const y = new Date(now); y.setDate(y.getDate() - 1); return { from: toLocalIso(startOfDay(y)), to: toLocalIso(endOfDay(y)) }; }
    case "this_week": return { from: toLocalIso(startOfWeek(now)), to: toLocalIso(endOfWeek(now)) };
    case "last_week": { const w = new Date(now); w.setDate(w.getDate() - 7); return { from: toLocalIso(startOfWeek(w)), to: toLocalIso(endOfWeek(w)) }; }
    case "this_month": { const s = new Date(now.getFullYear(), now.getMonth(), 1); const e = new Date(now.getFullYear(), now.getMonth() + 1, 0); return { from: toLocalIso(startOfDay(s)), to: toLocalIso(endOfDay(e)) }; }
    case "last_month": { const s = new Date(now.getFullYear(), now.getMonth() - 1, 1); const e = new Date(now.getFullYear(), now.getMonth(), 0); return { from: toLocalIso(startOfDay(s)), to: toLocalIso(endOfDay(e)) }; }
    case "this_year": { const s = new Date(now.getFullYear(), 0, 1); const e = new Date(now.getFullYear(), 11, 31); return { from: toLocalIso(startOfDay(s)), to: toLocalIso(endOfDay(e)) }; }
    case "last_year": { const s = new Date(now.getFullYear() - 1, 0, 1); const e = new Date(now.getFullYear() - 1, 11, 31); return { from: toLocalIso(startOfDay(s)), to: toLocalIso(endOfDay(e)) }; }
    case "custom": return { from: customFrom ? toLocalIso(startOfDay(new Date(customFrom))) : "", to: customTo ? toLocalIso(endOfDay(new Date(customTo))) : "" };
  }
}

function PeriodBar({ preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo }: {
  preset: PeriodPreset; setPreset: (p: PeriodPreset) => void;
  customFrom: string; setCustomFrom: (v: string) => void;
  customTo: string; setCustomTo: (v: string) => void;
}) {
  const { t } = useDashboardLang();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.key}
          onClick={() => setPreset(p.key)}
          className={`rounded-full border px-3 py-1 text-xs transition ${preset === p.key ? "border-emerald-500 bg-emerald-500/15 text-emerald-400" : "border-neutral-700 text-neutral-400 hover:text-neutral-200"}`}
        >
          {t(PRESET_KEY[p.key], p.label)}
        </button>
      ))}
      {preset === "custom" && (
        <div className="flex items-center gap-1">
          <input type="date" className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
          <span className="text-neutral-500 text-xs">—</span>
          <input type="date" className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
        </div>
      )}
    </div>
  );
}

export default function TransactionsPage() {
  const { t } = useDashboardLang();
  const [outletId, setOutletId] = useState<string | null>(null);
  const [tab, setTab] = useState<"list" | "cashier">("list");
  useEffect(() => { fetchJsonObject("/api/outlets/default").then((o) => { if (o) setOutletId(o.id); }); }, []);

  const tabs = [
    { k: "list", l: t("transactions.tab.list", "Daftar Transaksi") },
    { k: "cashier", l: t("transactions.tab.cashier", "Performa Kasir") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold gm-gradient-title">{t("transactions.pageTitle", "Transaction Center")}</h1>
        <p className="text-sm text-neutral-500">{t("transactions.pageSubtitle", "Seluruh transaksi Rental, F&B, dan Produk yang diinput kasir — PPOB akan muncul di sini setelah modulnya dibangun. Hapus permanen hanya bisa dilakukan akun Superuser.")}</p>
      </div>

      <div className="flex gap-1 border-b border-neutral-800">
        {tabs.map((tb) => (
          <button key={tb.k} onClick={() => setTab(tb.k as any)} className={`px-3 py-2 text-sm ${tab === tb.k ? "border-b-2 border-emerald-500 text-emerald-400" : "text-neutral-500 hover:text-neutral-300"}`}>
            {tb.l}
          </button>
        ))}
      </div>

      {!outletId ? null : tab === "list" ? <TransactionListTab outletId={outletId} /> : <CashierPerformanceTab outletId={outletId} />}
    </div>
  );
}

function TransactionListTab({ outletId }: { outletId: string }) {
  const { t } = useDashboardLang();
  const { user } = useAuth();
  const role = (user?.role ?? "cashier") as any;
  const canRefund = hasPermission(role, "refund_order");
  const canVoid = hasPermission(role, "void_order_direct");
  // Exact-role check, not hasPermission() — hapus transaksi sengaja
  // dibatasi hanya Superuser, beda dengan void/refund yang bisa diberikan ke role lain.
  const isSuperuser = role === "superuser" || role === "owner";

  const [preset, setPreset] = useState<PeriodPreset>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [staffId, setStaffId] = useState("");
  const [type, setType] = useState("");
  const [payMethod, setPayMethod] = useState("");
  const [status, setStatus] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [minTotal, setMinTotal] = useState("");
  const [maxTotal, setMaxTotal] = useState("");

  const [staffList, setStaffList] = useState<any[]>([]);
  const [data, setData] = useState<{ transactions: any[]; summary: any } | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => { fetchJsonArray(`/api/staff?outletId=${outletId}`).then(setStaffList); }, [outletId]);

  const range = useMemo(() => resolvePreset(preset, customFrom, customTo), [preset, customFrom, customTo]);

  const load = async () => {
    if (!range.from || !range.to) return;
    setLoading(true);
    const params = new URLSearchParams({ outletId, from: range.from, to: range.to });
    if (staffId) params.set("staffUserId", staffId);
    if (type) params.set("type", type);
    if (payMethod) params.set("paymentMethodGroup", payMethod);
    if (status) params.set("status", status);
    if (minTotal) params.set("minTotal", minTotal);
    if (maxTotal) params.set("maxTotal", maxTotal);
    const res = await fetchJsonObject(`/api/transactions?${params}`);
    setData(res as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, [outletId, range.from, range.to, staffId, type, payMethod, status]);

  const rows = (data?.transactions ?? []).filter((t) => !customerQuery.trim() || (t.customerName ?? "").toLowerCase().includes(customerQuery.trim().toLowerCase()));
  const s = data?.summary;

  const doAction = async (id: string, kind: "refund" | "void") => {
    const reason = prompt(kind === "refund" ? t("transactions.prompt.refundReason", "Alasan refund?") : t("transactions.prompt.voidReason", "Alasan void?")) ?? "";
    const res = await fetch(`/api/orders/${id}/${kind === "refund" ? "refund-request" : "void-request"}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }),
    });
    const out = await res.json();
    if (!res.ok) return showAlert(out.error);
    const actionLabel = kind === "refund" ? t("transactions.action.refund", "Refund") : t("transactions.action.void", "Void");
    showAlert(out.pending ? t("transactions.alert.pendingApproval", "Diajukan untuk approval.") : t("transactions.alert.actionSuccess", "{action} berhasil diproses.").replace("{action}", actionLabel));
    load();
  };

  const deleteTransaction = async (id: string) => {
    if (!await showConfirm(t("transactions.confirm.deleteTransaction", "Hapus transaksi ini secara PERMANEN? Beda dengan Void — ini menghapus total dari sistem (order, item, pembayaran, jurnal akuntansi) dan tidak bisa dibatalkan. Stok akan dikembalikan otomatis kalau belum di-void sebelumnya."))) return;
    const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
    const out = await res.json();
    if (!res.ok) return showAlert(out.error);
    showAlert(t("transactions.alert.deleteSuccess", "Transaksi berhasil dihapus."));
    load();
  };

  // Superuser-only: manually mark a stuck "Menunggu Bayar"/"Sebagian" order as paid — e.g. a rental
  // bill dismissed via "Tutup (bayar nanti di POS)" that was never actually paid anywhere, or a
  // QRIS payment whose webhook never landed. Confirms any pending payment first, tops up the rest
  // in cash by default. Not exposed to staff/kasir — see isSuperuser gate on the button below.
  const settleTransaction = async (id: string) => {
    if (!await showConfirm(t("transactions.confirm.settleTransaction", "Tandai transaksi ini LUNAS? Sisa tagihan akan dicatat sebagai dibayar tunai (kecuali sudah ada pembayaran QRIS/lain yang menunggu konfirmasi, itu akan dikonfirmasi dulu)."))) return;
    const res = await fetch(`/api/orders/${id}/settle`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ method: "cash" }) });
    const out = await res.json();
    if (!res.ok) return showAlert(out.error);
    showAlert(t("transactions.alert.settleSuccess", "Transaksi ditandai lunas."));
    load();
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <PeriodBar preset={preset} setPreset={setPreset} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo} />
        <div className="flex flex-wrap gap-2">
          <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
            <option value="">{t("transactions.filter.allCashiers", "Semua Kasir")}</option>
            {staffList.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
          </select>
          <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">{t("transactions.filter.allTypes", "Semua Jenis")}</option>
            <option value="rental">{typeLabel(t, "rental")}</option>
            <option value="fnb">{typeLabel(t, "fnb")}</option>
            <option value="product">{typeLabel(t, "product")}</option>
            <option value="ppob">{typeLabel(t, "ppob")}</option>
          </select>
          <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
            <option value="">{t("transactions.filter.allPayments", "Semua Payment")}</option>
            {PAYMENT_GROUPS.map((g) => <option key={g} value={g}>{paymentGroupLabel(t, g)}</option>)}
          </select>
          <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{t("transactions.filter.allStatuses", "Semua Status")}</option>
            {Object.keys(STATUS_LABEL).map((k) => <option key={k} value={k}>{statusLabel(t, k)}</option>)}
          </select>
          <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs w-36" placeholder={t("transactions.filter.searchCustomer", "Cari customer...")} value={customerQuery} onChange={(e) => setCustomerQuery(e.target.value)} />
          <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs w-24" placeholder={t("transactions.filter.minAmount", "Min Rp")} type="number" value={minTotal} onChange={(e) => setMinTotal(e.target.value)} onBlur={load} />
          <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-xs w-24" placeholder={t("transactions.filter.maxAmount", "Max Rp")} type="number" value={maxTotal} onChange={(e) => setMaxTotal(e.target.value)} onBlur={load} />
        </div>
      </Card>

      {s && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            [t("transactions.stat.totalTransactions", "Total Transaksi"), s.totalTransactions, false],
            [t("transactions.stat.netSales", "Net Sales"), rupiah(s.netSales), false],
            [t("transactions.stat.rentalRevenue", "Rental Revenue"), rupiah(s.rentalRevenue), false],
            [t("transactions.stat.fnbRevenue", "F&B Revenue"), rupiah(s.fnbRevenue), false],
            [t("transactions.stat.ppobRevenue", "PPOB Revenue"), rupiah(s.ppobRevenue), false],
            [t("transactions.stat.otherProducts", "Produk/Lainnya"), rupiah(s.productRevenue), false],
            [t("transactions.stat.discount", "Diskon"), rupiah(s.discount), false],
            [t("transactions.stat.tax", "Pajak"), rupiah(s.tax), false],
            [t("transactions.stat.refund", "Refund"), rupiah(s.refund), false],
            [statusLabel(t, "cancelled"), s.cancelledTransactions, false],
          ].map(([label, value]) => (
            <Card key={label as string} className="p-3">
              <div className="text-xs text-neutral-500">{label}</div>
              <div className="text-lg font-semibold mt-1">{value}</div>
            </Card>
          ))}
          {s.byPaymentMethod?.map((p: any) => (
            <Card key={p.method} className="p-3">
              <div className="text-xs text-neutral-500">{p.method}</div>
              <div className="text-lg font-semibold mt-1">{rupiah(p.amount)}</div>
            </Card>
          ))}
        </div>
      )}

      <Card>
        {loading ? (
          <div className="text-sm text-neutral-500 py-4 text-center">{t("transactions.loading", "Memuat...")}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500 border-b border-neutral-800">
                <th className="py-2">{t("transactions.col.time", "Waktu")}</th><th>{t("transactions.col.cashier", "Kasir")}</th><th>{t("transactions.col.type", "Jenis")}</th><th>{t("transactions.col.customer", "Customer")}</th><th>{t("transactions.col.unit", "Unit")}</th><th>{t("transactions.col.item", "Item")}</th><th>{t("transactions.col.total", "Total")}</th><th>{t("transactions.col.payment", "Payment")}</th><th>{t("transactions.col.status", "Status")}</th><th>{t("transactions.col.action", "Aksi")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-neutral-900 align-top">
                  <td className="py-2 whitespace-nowrap">{new Date(row.createdAt).toLocaleString("id-ID")}</td>
                  <td>{row.staffName}</td>
                  <td><Badge status="unknown">{typeLabel(t, row.type)}</Badge></td>
                  <td>{row.customerName ?? "-"}{row.memberTier ? ` (${row.memberTier})` : ""}</td>
                  <td>{row.unitName ?? "-"}</td>
                  <td className="max-w-[220px] truncate text-xs text-neutral-400" title={row.items.map((i: any) => `${i.qty}x ${i.description}`).join(", ")}>
                    {row.items.map((i: any) => `${i.qty}x ${i.description}`).join(", ") || "-"}
                  </td>
                  <td className="font-medium">{rupiah(row.total)}</td>
                  <td className="text-xs">{row.payments.map((p: any) => p.methodGroup).join(", ") || "-"}</td>
                  <td><Badge status={STATUS_BADGE[row.status] ?? "unknown"}>{statusLabel(t, row.status)}</Badge></td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      <Button variant="ghost" className="text-xs" onClick={() => setDetailId(row.id)}>{t("transactions.action.detail", "Detail")}</Button>
                      <Button variant="ghost" className="text-xs" onClick={() => window.open(`/receipt/${row.id}`, "_blank")}>{t("transactions.action.receipt", "Struk")}</Button>
                      {canRefund && (row.status === "paid" || row.status === "partial") && (
                        <Button variant="ghost" className="text-xs text-amber-400" onClick={() => doAction(row.id, "refund")}>{t("transactions.action.refund", "Refund")}</Button>
                      )}
                      {canVoid && row.status !== "cancelled" && row.status !== "paid" && (
                        <Button variant="ghost" className="text-xs text-red-400" onClick={() => doAction(row.id, "void")}>{t("transactions.action.void", "Void")}</Button>
                      )}
                      {isSuperuser && (row.status === "awaiting_payment" || row.status === "partial" || row.status === "open") && (
                        <Button variant="ghost" className="text-xs text-emerald-400" onClick={() => settleTransaction(row.id)}>{t("transactions.action.markPaid", "Tandai Lunas")}</Button>
                      )}
                      {isSuperuser && (
                        <Button variant="ghost" className="text-xs text-red-500" onClick={() => deleteTransaction(row.id)}>{t("transactions.action.delete", "Hapus")}</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={10} className="text-center text-neutral-500 py-6">{t("transactions.emptyList", "Tidak ada transaksi pada periode/filter ini.")}</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      {detailId && <TransactionDetailModal id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}

function TransactionDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useDashboardLang();
  const [detail, setDetail] = useState<any>(null);
  useEffect(() => { fetchJsonObject(`/api/transactions/${id}`).then(setDetail); }, [id]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">{t("transactions.detail.title", "Detail Transaksi")}</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-200 text-sm">{t("transactions.detail.close", "Tutup")}</button>
        </div>
        {!detail ? (
          <p className="text-sm text-neutral-500">{t("transactions.loading", "Memuat...")}</p>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2 text-xs text-neutral-400">
              <div>{t("transactions.detail.orderId", "Order ID:")} <span className="font-mono text-neutral-200">{detail.order.id}</span></div>
              <div>{t("transactions.detail.status", "Status:")} <span className="text-neutral-200">{statusLabel(t, detail.order.status)}</span></div>
              <div>{t("transactions.detail.cashier", "Kasir:")} <span className="text-neutral-200">{detail.staff?.name ?? "-"}</span></div>
              <div>{t("transactions.detail.customer", "Customer:")} <span className="text-neutral-200">{detail.customer?.name ?? detail.customer?.phone ?? "-"}</span></div>
              <div>{t("transactions.detail.time", "Waktu:")} <span className="text-neutral-200">{new Date(detail.order.createdAt).toLocaleString("id-ID")}</span></div>
              <div>{t("transactions.detail.source", "Sumber:")} <span className="text-neutral-200">{detail.order.source}</span></div>
            </div>

            <div>
              <h3 className="text-xs uppercase text-neutral-500 mb-1">{t("transactions.col.item", "Item")}</h3>
              <table className="w-full text-xs">
                <tbody>
                  {detail.items.map((it: any) => (
                    <tr key={it.id} className="border-b border-neutral-800">
                      <td className="py-1">{it.qty}x {it.description}</td>
                      <td className="text-right">{rupiah(it.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-between mt-2 text-xs text-neutral-400"><span>{t("transactions.detail.subtotal", "Subtotal")}</span><span>{rupiah(detail.order.subtotal)}</span></div>
              <div className="flex justify-between text-xs text-neutral-400"><span>{t("transactions.stat.discount", "Diskon")}</span><span>-{rupiah(detail.order.discount)}</span></div>
              <div className="flex justify-between text-xs text-neutral-400"><span>{t("transactions.stat.tax", "Pajak")}</span><span>{rupiah(detail.order.tax)}</span></div>
              <div className="flex justify-between text-xs text-neutral-400"><span>{t("transactions.detail.serviceCharge", "Service Charge")}</span><span>{rupiah(detail.order.serviceCharge)}</span></div>
              <div className="flex justify-between font-medium mt-1"><span>{t("transactions.col.total", "Total")}</span><span>{rupiah(detail.order.total)}</span></div>
            </div>

            <div>
              <h3 className="text-xs uppercase text-neutral-500 mb-1">{t("transactions.detail.paymentHeading", "Pembayaran")}</h3>
              {detail.payments.map((p: any) => (
                <div key={p.id} className="flex justify-between text-xs text-neutral-400">
                  <span>{p.method} · {p.status}</span><span>{rupiah(p.amount)}</span>
                </div>
              ))}
              {detail.payments.length === 0 && <p className="text-xs text-neutral-500">{t("transactions.detail.noPayments", "Belum ada pembayaran.")}</p>}
            </div>

            <div>
              <h3 className="text-xs uppercase text-neutral-500 mb-1">{t("transactions.detail.journalHeading", "Jurnal Akuntansi")}</h3>
              {detail.journal.length === 0 && <p className="text-xs text-neutral-500">{t("transactions.detail.noJournal", "Belum ada jurnal terkait.")}</p>}
              {detail.journal.map((j: any) => (
                <div key={j.id} className="border border-neutral-800 rounded-lg p-2 mb-2">
                  <div className="text-xs text-neutral-400 flex justify-between">
                    <span>{j.description}</span>
                    <Badge status={j.status === "posted" ? "success" : "failed"}>{j.status}</Badge>
                  </div>
                  <table className="w-full text-xs mt-1">
                    <tbody>
                      {j.lines.map((l: any) => (
                        <tr key={l.id}>
                          <td className="text-neutral-400">{l.accountCode} {l.accountName}</td>
                          <td className="text-right">{l.debit > 0 ? rupiah(l.debit) : ""}</td>
                          <td className="text-right text-neutral-500">{l.credit > 0 ? rupiah(l.credit) : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CashierPerformanceTab({ outletId }: { outletId: string }) {
  const { t } = useDashboardLang();
  const [preset, setPreset] = useState<PeriodPreset>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const range = useMemo(() => resolvePreset(preset, customFrom, customTo), [preset, customFrom, customTo]);

  useEffect(() => {
    if (!range.from || !range.to) return;
    fetchJsonArray(`/api/reports/cashier-performance?outletId=${outletId}&from=${range.from}&to=${range.to}`).then(setRows);
  }, [outletId, range.from, range.to]);

  return (
    <div className="space-y-4">
      <Card><PeriodBar preset={preset} setPreset={setPreset} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo} /></Card>
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500 border-b border-neutral-800">
              <th className="py-2">{t("transactions.col.rank", "Rank")}</th><th>{t("transactions.col.cashier", "Kasir")}</th><th>{t("transactions.col.transactionCount", "Transaksi")}</th><th>{t("transactions.col.totalSales", "Total Penjualan")}</th><th>{t("transactions.col.average", "Rata-rata")}</th>
              <th>{typeLabel(t, "rental")}</th><th>{typeLabel(t, "fnb")}</th><th>{typeLabel(t, "product")}</th><th>{t("transactions.stat.discount", "Diskon")}</th><th>{t("transactions.action.void", "Void")}</th><th>{t("transactions.col.shift", "Shift")}</th><th>{t("transactions.col.cashVariance", "Cash Variance")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.staffUserId} className="border-b border-neutral-900">
                <td className="py-2">#{r.rank}</td>
                <td className="font-medium">{r.staffName}</td>
                <td>{r.transactionCount}</td>
                <td>{rupiah(r.totalSales)}</td>
                <td>{rupiah(r.avgTransaction)}</td>
                <td>{rupiah(r.rentalTotal)}</td>
                <td>{rupiah(r.fnbTotal)}</td>
                <td>{rupiah(r.productTotal)}</td>
                <td>{rupiah(r.discountTotal)}</td>
                <td>{r.voidCount}</td>
                <td>{r.shiftsCount}</td>
                <td className={r.totalVariance < 0 ? "text-red-400" : r.totalVariance > 0 ? "text-emerald-400" : ""}>{rupiah(r.totalVariance)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={12} className="text-center text-neutral-500 py-6">{t("transactions.emptyCashier", "Tidak ada transaksi kasir pada periode ini.")}</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
