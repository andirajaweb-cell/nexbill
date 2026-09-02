/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fetchJsonObject } from "@/lib/api/fetch-json";
import { useAuth } from "@/lib/auth/client";
import { hasPermission } from "@/lib/auth/permissions";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { ShoppingCart, Plus, Minus, Zap, Wrench, Tv, Sparkles, Share2, Timer, LayoutDashboard, FileText, Wallet, TrendingUp, Receipt } from "lucide-react";
import { BillingFaq } from "@/components/billing/BillingFaq";
import { BillingProfileTab } from "@/components/billing/BillingProfileTab";
import { DepositTab } from "@/components/billing/DepositTab";
import { InvoiceHistoryTab } from "@/components/billing/InvoiceHistoryTab";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-billing";

// UsageGrowthTab pulls in recharts — only fetched when the "Pertumbuhan Data" tab is actually
// opened (most visits to this page never touch it) instead of bundled into every billing page
// load. Named export, so the dynamic import needs the .then() re-map to a default.
const UsageGrowthTab = dynamic(() => import("@/components/billing/UsageGrowthTab").then((m) => m.UsageGrowthTab), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-lg bg-white/5" />,
});

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;

// --- Type Definitions ---
interface BillingCurrency {
  code: string | null;
  effectiveRateIdrPerUnit: number | null;
}

interface SubscriptionData {
  status: string;
  currentPeriodEnd: string | null;
  graceUntil: string | null;
  smartPlugOwnedQty: number;
}

interface PlanData {
  name: string;
  priceCurrent: number;
  unlimitedEntitlement: boolean;
  includedConsoles?: number;
  extraConsolePrice?: number;
  smartPlugPrice?: number;
  setupServicePrice?: number;
}

interface AiAddonData {
  includedViaPlan: boolean;
  freeViaTrial: boolean;
  active: boolean;
  periodEnd: string | null;
  priceMonthly: number;
}

interface GroupMember {
  outletId: string;
  outletName: string;
  planName: string | null;
  planPrice: number | null;
  subscriptionStatus: string;
}

interface BillingGroupData {
  members: GroupMember[];
  totalMonthly: number;
}

interface InvoiceData {
  id: string;
  status: string;
  type: string;
  invoiceNumber: string;
  description: string;
  amount: number;
  method: string | null;
  providerRef: string | null;
  lineItemsJson: string | null;
  vaNumber: string | null;
  vaBankCode: string | null;
  qrImageUrl: string | null;
  expiresAt?: string | null; // Ditambahkan untuk hitung mundur iPaymu
  cancelReason?: string | null;
  createdAt?: string | null;
  paidAt?: string | null;
}

interface ProductData {
  id: string;
  category: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
}

interface PlugOrderData {
  qty: number;
  invoiceStatus: string;
}

interface BillingResponse {
  subscription: SubscriptionData;
  plan?: PlanData;
  plans?: PlanData[];
  isLocked: boolean;
  isPaid: boolean;
  trialDaysLeft: number;
  invoices: InvoiceData[];
  plugOrders: PlugOrderData[];
  products: ProductData[];
  billingGroup?: BillingGroupData;
  aiAddon?: AiAddonData;
  billingCurrency?: BillingCurrency;
}

interface CartLine {
  category: string;
  productId: string | null;
  name: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

interface ShippingArea {
  id: string;
  name: string;
  postalCode: number | null;
}

interface ShippingRateOption {
  courierCode: string;
  courierName: string;
  courierServiceCode: string;
  courierServiceName: string;
  description: string;
  duration: string;
  price: number;
}
// ------------------------

const formatMoney = (idr: number, currency?: BillingCurrency | null) => {
  if (currency?.code && currency.effectiveRateIdrPerUnit) {
    const amount = (idr ?? 0) / currency.effectiveRateIdrPerUnit;
    return `${currency.code} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return rupiah(idr);
};

const STATUS_LABEL_KEYS: Record<string, { key: string; fallback: string }> = {
  trial: { key: "billing.status.trial", fallback: "Masa Percobaan" },
  trial_expired: { key: "billing.status.trialExpired", fallback: "Percobaan Berakhir" },
  pending_payment: { key: "billing.status.pendingPayment", fallback: "Menunggu Pembayaran" },
  active: { key: "billing.status.active", fallback: "Aktif" },
  grace: { key: "billing.status.grace", fallback: "Masa Tenggang" },
  suspended: { key: "billing.status.suspended", fallback: "Ditangguhkan" },
  cancelled: { key: "billing.status.cancelled", fallback: "Dibatalkan" },
  free_forever: { key: "billing.status.freeForever", fallback: "Gratis Selamanya" },
};

const STATUS_BADGE: Record<string, string> = {
  trial: "pending",
  trial_expired: "failed",
  pending_payment: "pending",
  active: "success",
  grace: "pending",
  suspended: "failed",
  cancelled: "failed",
  free_forever: "success",
};

const INVOICE_TYPE_LABEL_KEYS: Record<string, { key: string; fallback: string }> = {
  subscription_fee: { key: "billing.invoiceType.subscriptionFee", fallback: "Biaya Langganan" },
  smart_plug_purchase: { key: "billing.invoiceType.smartPlugPurchase", fallback: "Pembelian Smart Plug" },
  setup_service: { key: "billing.invoiceType.setupService", fallback: "Jasa Setup Jarak Jauh" },
  extra_console: { key: "billing.invoiceType.extraConsole", fallback: "Konsol Tambahan" },
  cart_order: { key: "billing.invoiceType.cartOrder", fallback: "Belanja Langganan" },
  group_renewal: { key: "billing.invoiceType.groupRenewal", fallback: "Tagihan Gabungan Multi-Outlet" },
  ai_addon: { key: "billing.invoiceType.aiAddon", fallback: "AI Add-on" },
  deposit_topup: { key: "billing.invoiceType.depositTopup", fallback: "Top Up Saldo Deposit" },
};

const INVOICE_STATUS_LABEL_KEYS: Record<string, { key: string; fallback: string }> = {
  unpaid: { key: "billing.invoiceStatus.unpaid", fallback: "Belum Bayar" },
  paid: { key: "billing.invoiceStatus.paid", fallback: "Lunas" },
  expired: { key: "billing.invoiceStatus.expired", fallback: "Kedaluwarsa (Otomatis)" },
  cancelled: { key: "billing.invoiceStatus.cancelled", fallback: "Dibatalkan" },
};

const INVOICE_STATUS_COLOR: Record<string, string> = {
  unpaid: "text-amber-400",
  paid: "text-emerald-400",
  expired: "text-neutral-500",
  cancelled: "text-rose-400",
};

const CATEGORY_LABEL_KEYS: Record<string, { key: string; fallback: string }> = {
  smart_plug: { key: "billing.category.product", fallback: "Produk" },
  installation_service: { key: "billing.category.installationService", fallback: "Jasa Instalasi" },
  extra_console: { key: "billing.category.extraConsole", fallback: "Konsol Tambahan" },
};

const CATEGORY_ICON: Record<string, React.ElementType> = {
  smart_plug: Zap,
  installation_service: Wrench,
  extra_console: Tv,
};

const VA_BANKS: { method: string; labelKey: string; fallback: string }[] = [
  { method: "va_bca", labelKey: "billing.method.vaBca", fallback: "VA BCA" },
  { method: "va_bni", labelKey: "billing.method.vaBni", fallback: "VA BNI" },
  { method: "va_mandiri", labelKey: "billing.method.vaMandiri", fallback: "VA Mandiri" },
  { method: "va_bri", labelKey: "billing.method.vaBri", fallback: "VA BRI" },
  { method: "va_permata", labelKey: "billing.method.vaPermata", fallback: "VA Permata" },
];
const VA_BANK_NAME: Record<string, string> = { bca: "BCA", bni: "BNI", mandiri: "Mandiri", bri: "BRI", permata: "Permata" };

export default function BillingPage() {
  const { t } = useDashboardLang();
  const { user } = useAuth();
  
  const role = (user?.role ?? "cashier") as Parameters<typeof hasPermission>[0];
  const canManage = hasPermission(role, "manage_settings");
  const isSuperuser = role === "superuser";

  const [data, setData] = useState<BillingResponse | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [tab, setTab] = useState<"dashboard" | "profile" | "deposit" | "invoices" | "usage">("dashboard");

  // --- Clock Ticker untuk Countdown Jangka Waktu Pembayaran ---
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const money = (idr: number) => formatMoney(idr, data?.billingCurrency);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [installName, setInstallName] = useState("");
  const [installPhone, setInstallPhone] = useState("");
  const [installAddress, setInstallAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [renewBusy, setRenewBusy] = useState(false);
  const [aiAddonBusy, setAiAddonBusy] = useState(false);

  const [areaQuery, setAreaQuery] = useState("");
  const [areaResults, setAreaResults] = useState<ShippingArea[]>([]);
  const [areaSearching, setAreaSearching] = useState(false);
  const [selectedArea, setSelectedArea] = useState<ShippingArea | null>(null);
  const [rateOptions, setRateOptions] = useState<ShippingRateOption[]>([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState("");
  const [selectedRate, setSelectedRate] = useState<ShippingRateOption | null>(null);

  // Was previously a broken bare `function load() { throw new Error("Function not implemented.");
  // }` declared at the bottom of this file — every handler below (doCheckout, doPay, doSync,
  // doConfirm, doRenew, doActivateAi) called `await load()` expecting it to refresh `data`, but
  // that stub always threw instead. A stable useCallback (not redefined every render, so effects/
  // handlers that depend on it don't need to worry about identity churn) is the actual fix.
  const load = useCallback(async () => {
    const res = await fetchJsonObject<BillingResponse>("/api/subscription");
    setData(res);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // --- Auto-Polling: Mengecek status pembayaran otomatis ke API jika ada tagihan Pending iPaymu ---
  useEffect(() => {
    const safeInvoices = data?.invoices ?? [];
    const needsPolling = safeInvoices.some((inv) => inv.status === "unpaid" && inv.method && inv.method !== "cash");
    
    if (!needsPolling) return;

    let cancelled = false;
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetchJsonObject<BillingResponse>("/api/subscription");
        if (cancelled) return;

        if (res && res.invoices) {
          // Cari apakah ada invoice iPaymu yang baru saja Lunas secara otomatis
          let autoPaidDetected = false;
          res.invoices.forEach((newInv) => {
            const oldInv = safeInvoices.find((old) => old.id === newInv.id);
            if (oldInv && oldInv.status === "unpaid" && newInv.status === "paid" && oldInv.method !== "cash") {
              autoPaidDetected = true;
            }
          });

          if (autoPaidDetected) {
            showAlert(t("billing.alert.autoPaid", "Berhasil melakukan pembayaran secara otomatis!"));
          }
          
          setData(res);
        }
      } catch {
        // Abaikan error jaringan saat polling
      }
    }, 5000); // Polling setiap 5 detik

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
    };
  }, [data?.invoices, t]);

  const setQty = (productId: string, qty: number) => {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[productId];
      else next[productId] = qty;
      return next;
    });
    setRateOptions([]);
    setSelectedRate(null);
  };

  useEffect(() => {
    if (areaQuery.trim().length < 3) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      setAreaSearching(true);
      try {
        const res = await fetch(`/api/shipping/areas?q=${encodeURIComponent(areaQuery)}`);
        const out = await res.json();
        if (!cancelled) setAreaResults(res.ok ? out.areas ?? [] : []);
      } catch {
        if (!cancelled) setAreaResults([]);
      } finally {
        if (!cancelled) setAreaSearching(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [areaQuery]);

  const checkShippingRates = async () => {
    if (!selectedArea) return;
    setRatesLoading(true);
    setRatesError("");
    setSelectedRate(null);
    try {
      const items = Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([productId, qty]) => ({ productId, qty }));
      const res = await fetch("/api/shipping/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinationAreaId: selectedArea.id, items }),
      });
      const out = await res.json();
      if (!res.ok) {
        setRatesError(out.error ?? t("billing.alert.fetchRatesFailed", "Gagal mengambil ongkos kirim."));
        setRateOptions([]);
        return;
      }
      setRateOptions(out.options ?? []);
      if ((out.options ?? []).length === 0) setRatesError(t("billing.alert.noCourierAvailable", "Belum ada kurir yang aktif untuk rute ini — hubungi NEXBILL."));
    } finally {
      setRatesLoading(false);
    }
  };

  const doCheckout = async () => {
    if (hasSmartPlug && !selectedRate) {
      return showAlert(t("billing.alert.selectCourierFirst", 'Pilih kurir pengiriman untuk Smart Plug dulu (klik "Cek Ongkos Kirim" di bawah keranjang).'));
    }
    setBusy(true);
    try {
      const items = Object.entries(cart).map(([productId, qty]) => ({ productId, qty }));
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          installContactName: installName,
          installContactPhone: installPhone,
          shippingAddress: installAddress,
          shippingDestinationAreaId: selectedArea?.id,
          shippingDestinationAreaLabel: selectedArea?.name,
          shippingCourierCode: selectedRate?.courierCode,
          shippingCourierServiceName: selectedRate?.courierServiceName,
        }),
      });
      const out = await res.json();
      if (!res.ok) return showAlert(out.error);
      setCart({});
      setSelectedArea(null);
      setAreaQuery("");
      setRateOptions([]);
      setSelectedRate(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const doPay = async (invoiceId: string, method: string) => {
    const res = await fetch(`/api/subscription/invoices/${invoiceId}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method }),
    });
    const out = await res.json();
    if (!res.ok) return showAlert(out.error);
    
    await load();
    
    if (method === "cash") {
      const ok = await showConfirm(t("billing.confirm.cashReceived", "Konfirmasi tunai {amount} sudah diterima NEXBILL?").replace("{amount}", money(out.amount || 0)));
      if (ok) await doConfirm(invoiceId);
    } else if (out.paymentUrl && (method === "ipaymu_crossborder" || method === "ipaymu_hosted")) {
      window.open(out.paymentUrl, "_blank");
    }
  };

  const doSync = async (invoiceId: string) => {
    const res = await fetch(`/api/subscription/invoices/${invoiceId}/sync`, { method: "POST" });
    const out = await res.json();
    if (!res.ok) return showAlert(out.error);
    
    await load();
    if (out.status === "paid") {
      showAlert(t("billing.alert.syncPaid", "Pembayaran berhasil dikonfirmasi dan lunas!"));
    } else {
      showAlert(t("billing.alert.syncPending", "Pembayaran belum diterima atau masih tertunda di payment gateway. Sistem mengecek otomatis setiap 5 detik."));
    }
  };

  const doConfirm = async (invoiceId: string) => {
    const res = await fetch(`/api/subscription/invoices/${invoiceId}/confirm`, { method: "POST" });
    const out = await res.json();
    if (!res.ok) return showAlert(out.error);
    await load();
  };

  const doRenew = async () => {
    setRenewBusy(true);
    try {
      const res = await fetch("/api/subscription/renew", { method: "POST" });
      const out = await res.json();
      if (!res.ok) return showAlert(out.error);
      await load();
    } finally {
      setRenewBusy(false);
    }
  };

  const doActivateAi = async () => {
    setAiAddonBusy(true);
    try {
      const res = await fetch("/api/subscription/ai-addon/activate", { method: "POST" });
      const out = await res.json();
      if (!res.ok) return showAlert(out.error);
      await load();
    } finally {
      setAiAddonBusy(false);
    }
  };

  // Helper untuk formatting Countdown
  const formatCountdown = (expiresAt: string) => {
    if (!now) return "00:00:00";
    const diff = new Date(expiresAt).getTime() - now;
    if (diff <= 0) return "00:00:00";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const cartTotal = useMemo(() => {
    if (!data?.products) return 0;
    return Object.entries(cart).reduce((sum, [productId, qty]) => {
      const p = data.products.find((x) => x.id === productId);
      return p ? sum + p.price * qty : sum;
    }, 0);
  }, [cart, data]);

  const wantsInstall = useMemo(() => {
    if (!data?.products) return false;
    return Object.entries(cart).some(([productId, qty]) => {
      const p = data.products.find((x) => x.id === productId);
      return p?.category === "installation_service" && qty > 0;
    });
  }, [cart, data]);

  const hasSmartPlug = !!data?.products?.some((product) => {
    const quantity = cart[product.id] ?? 0;
    return product.category === "smart_plug" && quantity > 0;
  });

  if (!data) return <div className="text-sm text-neutral-500">{t("billing.loading", "Memuat data langganan...")}</div>;

  const { subscription: sub, plan, isLocked, isPaid, trialDaysLeft, invoices, plugOrders, products, billingGroup, aiAddon } = data;
  const catalogPlan = plan ?? data.plans?.[0];
  
  const safeInvoices = invoices ?? [];
  const unpaidInvoices = safeInvoices.filter((i) => i.status === "unpaid");
  
  const grandTotal = (catalogPlan?.priceCurrent ?? 0) + cartTotal + (selectedRate?.price ?? 0);
  
  const daysToExpiry = sub.currentPeriodEnd && now !== null
    ? Math.ceil((new Date(sub.currentPeriodEnd).getTime() - now) / 86_400_000) 
    : null;
    
  const canRenewNow = (sub.status === "active" || sub.status === "grace") && unpaidInvoices.length === 0;
  
  const grouped = (products ?? []).reduce<Record<string, ProductData[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="gm-display text-2xl font-bold gm-gradient-title">{t("billing.header.title", "Langganan")}</h1>
          <p className="text-sm text-neutral-500">{t("billing.header.subtitle", "Status langganan NEXBILL, etalase belanja smart plug & add-on, dan tagihan outlet ini.")}</p>
        </div>
        <Badge status={STATUS_BADGE[sub.status] ?? "unknown"}>{STATUS_LABEL_KEYS[sub.status] ? t(STATUS_LABEL_KEYS[sub.status].key, STATUS_LABEL_KEYS[sub.status].fallback) : sub.status}</Badge>
      </div>

      {/* Accurate.id-style tab bar — Dashboard / Profil Billing / Saldo Deposit / Riwayat Faktur / Pertumbuhan Data */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/5 p-1">
        {([
          { id: "dashboard", label: t("billing.tab.dashboard", "Dashboard"), Icon: LayoutDashboard },
          { id: "profile", label: t("billing.tab.profile", "Profil Billing"), Icon: FileText },
          { id: "deposit", label: t("billing.tab.deposit", "Saldo Deposit"), Icon: Wallet },
          { id: "invoices", label: t("billing.tab.invoices", "Riwayat Faktur"), Icon: Receipt },
          { id: "usage", label: t("billing.tab.usage", "Pertumbuhan Data"), Icon: TrendingUp },
        ] as const).map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              tab === id ? "bg-cyan-500/15 text-cyan-300" : "text-neutral-400 hover:text-neutral-200 hover:bg-white/5"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === "profile" && <BillingProfileTab />}
      {tab === "deposit" && (
        <DepositTab
          money={money}
          onTopupCreated={async () => {
            await load();
            setTab("dashboard");
          }}
        />
      )}
      {tab === "invoices" && <InvoiceHistoryTab invoices={safeInvoices} money={money} />}
      {tab === "usage" && <UsageGrowthTab money={money} />}

      {tab === "dashboard" && (
      <>

      {data.billingCurrency?.code && (
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 px-4 py-2.5 text-xs text-cyan-200">
          {data.billingCurrency.effectiveRateIdrPerUnit
            ? t("billing.currency.note", "Harga di halaman ini dikonversi dari Rupiah ke {currency} berdasarkan kurs terkini (bisa berubah sewaktu-waktu). Semua tagihan tetap dicatat resmi dalam Rupiah.").replace("{currency}", data.billingCurrency.code)
            : t("billing.currency.noRate", "Outlet ini terdaftar dalam {currency}, tapi kurs belum diatur NEXBILL — harga sementara tetap tampil dalam Rupiah.").replace("{currency}", data.billingCurrency.code)}
        </div>
      )}

      <Link
        href="/dashboard/rekomendasi-produk"
        className="group flex items-center justify-between gap-3 rounded-xl border border-amber-400/20 bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent px-4 py-3 transition hover:border-amber-400/40 hover:from-amber-500/15"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-500/10">
            <Sparkles size={16} className="text-amber-300" />
          </div>
          <div>
            <div className="text-sm font-medium text-amber-200">{t("billing.recommend.title", "Rekomendasi Produk")}</div>
            <div className="text-xs text-neutral-500">{t("billing.recommend.subtitle", "Perlengkapan rental pilihan, link belanja langsung (di luar keranjang NEXBILL)")}</div>
          </div>
        </div>
        <span className="shrink-0 text-xs text-amber-300/80 group-hover:text-amber-200 transition">{t("billing.recommend.cta", "Lihat →")}</span>
      </Link>

      <Link
        href="/dashboard/referral"
        className="group flex items-center justify-between gap-3 rounded-xl border border-emerald-400/20 bg-linear-to-r from-emerald-500/10 via-emerald-500/5 to-transparent px-4 py-3 transition hover:border-emerald-400/40 hover:from-emerald-500/15"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-500/10">
            <Share2 size={16} className="text-emerald-300" />
          </div>
          <div>
            <div className="text-sm font-medium text-emerald-200">{t("billing.referral.title", "Program Referral")}</div>
            <div className="text-xs text-neutral-500">{t("billing.referral.subtitle", "Ajak outlet lain — dapat diskon 20% untuk mereka, komisi berulang untuk kamu")}</div>
          </div>
        </div>
        <span className="shrink-0 text-xs text-emerald-300/80 group-hover:text-emerald-200 transition">{t("billing.referral.cta", "Lihat →")}</span>
      </Link>

      {billingGroup && billingGroup.members && billingGroup.members.length > 1 && (
        <Card className="p-4 border-cyan-400/20">
          <div className="font-semibold text-cyan-300">{t("billing.group.heading", "Tagihan Gabungan — {n} Outlet").replace("{n}", String(billingGroup.members.length))}</div>
          <p className="text-sm text-neutral-500 mt-1 mb-3">
            {t("billing.group.subtitle", "Outlet ini ditagih bersama outlet lain di bawah akun yang sama — satu invoice, satu pembayaran, memperpanjang semuanya sekaligus.")}
          </p>
          <div className="space-y-1.5">
            {billingGroup.members.map((m) => (
              <div key={m.outletId} className="flex items-center justify-between text-sm border-b border-white/5 pb-1.5 last:border-0">
                <span className="text-neutral-300">{m.outletName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500">{m.planName ?? "—"}</span>
                  <span className="text-xs font-medium">{m.planPrice != null ? money(m.planPrice) : "—"}</span>
                  <Badge status={STATUS_BADGE[m.subscriptionStatus] ?? "unknown"}>{STATUS_LABEL_KEYS[m.subscriptionStatus] ? t(STATUS_LABEL_KEYS[m.subscriptionStatus].key, STATUS_LABEL_KEYS[m.subscriptionStatus].fallback) : m.subscriptionStatus}</Badge>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm font-semibold mt-2 pt-2 border-t border-white/10">
            <span>{t("billing.group.totalLabel", "Total per bulan (jika semua aktif)")}</span>
            <span className="text-cyan-300">{money(billingGroup.totalMonthly)}</span>
          </div>
        </Card>
      )}

      {isSuperuser && (
        <Card className="p-4 border-white/10">
          <div className="font-semibold text-neutral-300">{t("billing.superuser.title", "Fitur langganan tidak berlaku untuk akun Superuser")}</div>
          <p className="text-sm text-neutral-500 mt-1">
            {t("billing.superuser.body", "Akun Superuser tidak pernah dibatasi oleh trial/lock/masa tenggang. Bagian checkout dan riwayat tagihan di bawah tetap tersedia kalau kamu tetap ingin mengelola pembayaran langganan outlet ini.")}
          </p>
        </Card>
      )}

      {!isSuperuser && sub.status === "trial" && (
        <Card className="p-4 border-cyan-400/30">
          <div className="font-semibold text-cyan-300">{t("billing.trial.title", "Masa percobaan gratis — {n} hari lagi").replace("{n}", String(trialDaysLeft))}</div>
          <p className="text-sm text-neutral-400 mt-1">
            {t("billing.trial.body", "Selama percobaan, fitur AI (Business Assistant & Insights) gratis dipakai tanpa batas. Smart plug belum bisa dipakai (beli lewat etalase di bawah) dan kontrol TV Android dibatasi 1 unit.")}
          </p>
        </Card>
      )}

      {!isSuperuser && isLocked && (
        <Card className="p-4 border-rose-400/30">
          <div className="font-semibold text-rose-300">{t("billing.locked.title", "Akses terbatas (read-only)")}</div>
          <p className="text-sm text-neutral-400 mt-1">
            {sub.status === "trial_expired" && t("billing.locked.trialExpired", "Masa percobaan 30 hari sudah berakhir. Data kamu aman — selesaikan pembayaran di bawah untuk membuka akses penuh selama 30 hari ke depan.")}
            {sub.status === "pending_payment" && t("billing.locked.pendingPayment", "Checkout sudah dibuat — selesaikan tagihan di bawah untuk mengaktifkan langganan.")}
            {sub.status === "suspended" && t("billing.locked.suspended", "Langganan ditangguhkan karena tagihan perpanjangan belum dibayar melewati masa tenggang.")}
            {sub.status === "cancelled" && t("billing.locked.cancelled", "Langganan sudah dibatalkan. Hubungi NEXBILL untuk mengaktifkan kembali.")}
          </p>
          {sub.status === "suspended" && canRenewNow && (
            <Button className="mt-3" onClick={doRenew} disabled={renewBusy}>{renewBusy ? t("billing.common.processing", "Memproses...") : t("billing.common.renewNow", "Perpanjang Sekarang")}</Button>
          )}
        </Card>
      )}

      {!isSuperuser && sub.status === "grace" && (
        <Card className="p-4 border-amber-400/30">
          <div className="font-semibold text-amber-300">{t("billing.grace.title", "Masa tenggang (toleransi) — segera bayar tagihan perpanjangan")}</div>
          <p className="text-sm text-neutral-400 mt-1">
            {t("billing.grace.body", "Tanggal langganan habis: {expiry}. Toleransi diberikan sampai {graceUntil} — setelah itu semua fitur akan dikunci penuh.")
              .replace("{expiry}", sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString("id-ID") : "-")
              .replace("{graceUntil}", sub.graceUntil ? new Date(sub.graceUntil).toLocaleDateString("id-ID") : "-")}
          </p>
          {canRenewNow && (
            <Button className="mt-3" onClick={doRenew} disabled={renewBusy}>{renewBusy ? t("billing.common.processing", "Memproses...") : t("billing.common.renewNow", "Perpanjang Sekarang")}</Button>
          )}
        </Card>
      )}

      {!isSuperuser && sub.status === "free_forever" && (
        <Card className="p-4 border-emerald-400/30">
          <div className="font-semibold text-emerald-300">{t("billing.freeForever.title", "Akses Gratis Selamanya")}</div>
          <p className="text-sm text-neutral-400 mt-1">
            {t(
              "billing.freeForever.body",
              "Outlet ini mendapat akses NEXBILL gratis permanen dari tim NEXBILL — tidak akan pernah ditagih. Konsol, cabang, dan staf tanpa batas. AI Add-on (Business Assistant & Insights) tetap dibeli terpisah seperti outlet lain."
            )}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="text-xs px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300">{t("billing.unlimited.consoles", "Unlimited Konsol")}</span>
            <span className="text-xs px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300">{t("billing.unlimited.branches", "Unlimited Cabang")}</span>
            <span className="text-xs px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300">{t("billing.unlimited.users", "Unlimited User")}</span>
          </div>
          {sub.smartPlugOwnedQty > 0 && (
            <p className="text-xs text-neutral-500 mt-2">{t("billing.paid.smartPlugRegistered", "{n} smart plug terdaftar.").replace("{n}", String(sub.smartPlugOwnedQty))}</p>
          )}
        </Card>
      )}

      {isPaid && sub.status !== "free_forever" && (
        <Card className="p-4">
          <div className="font-semibold text-emerald-300">{t("billing.paid.planTitle", "Paket {plan}").replace("{plan}", String(plan?.name ?? ""))}</div>
          {plan?.unlimitedEntitlement && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <span className="text-xs px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300">{t("billing.unlimited.consoles", "Unlimited Konsol")}</span>
              <span className="text-xs px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300">{t("billing.unlimited.branches", "Unlimited Cabang")}</span>
              <span className="text-xs px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300">{t("billing.unlimited.users", "Unlimited User")}</span>
              <span className="text-xs px-2 py-0.5 rounded-lg bg-violet-500/15 text-violet-300">{t("billing.unlimited.aiIncluded", "AI Termasuk")}</span>
            </div>
          )}
          <p className="text-sm text-neutral-400 mt-1">
            {t("billing.paid.periodActiveUntil", "Periode aktif sampai {date}").replace("{date}", sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString("id-ID") : "-")}
            {sub.status === "active" && daysToExpiry !== null && daysToExpiry <= 7 && (
              <span className="text-amber-400">
                {t("billing.paid.expiringSoonSuffix", " — akan habis {when}, segera perpanjang.").replace(
                  "{when}",
                  daysToExpiry <= 0 ? t("billing.paid.expiresToday", "hari ini") : t("billing.paid.expiresInDays", "{n} hari lagi").replace("{n}", String(daysToExpiry))
                )}
              </span>
            )}
            . {sub.smartPlugOwnedQty > 0 && t("billing.paid.smartPlugRegistered", "{n} smart plug terdaftar.").replace("{n}", String(sub.smartPlugOwnedQty))}
          </p>
          {sub.status === "active" && canRenewNow && (
            <Button variant={daysToExpiry !== null && daysToExpiry <= 7 ? "primary" : "secondary"} className="mt-3 mr-2" onClick={doRenew} disabled={renewBusy}>
              {renewBusy ? t("billing.common.processing", "Memproses...") : t("billing.common.renewNow", "Perpanjang Sekarang")}
            </Button>
          )}
          {plugOrders?.some((o) => o.qty > 0 && o.invoiceStatus === "paid") && (
            <Button variant="secondary" className="mt-3" onClick={() => window.open("/api/subscription/manual", "_blank")}>
              {t("billing.paid.downloadManual", "Download Buku Manual Smart Plug")}
            </Button>
          )}
        </Card>
      )}

      {!isPaid && canManage && unpaidInvoices.length === 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-4">
              <div className="font-semibold">{t("billing.shop.subscriptionPlan", "Langganan {plan}").replace("{plan}", String(catalogPlan?.name ?? ""))}</div>
              {catalogPlan?.unlimitedEntitlement && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <span className="text-xs px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300">{t("billing.unlimited.consoles", "Unlimited Konsol")}</span>
                  <span className="text-xs px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300">{t("billing.unlimited.branches", "Unlimited Cabang")}</span>
                  <span className="text-xs px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300">{t("billing.unlimited.users", "Unlimited User")}</span>
                  <span className="text-xs px-2 py-0.5 rounded-lg bg-violet-500/15 text-violet-300">{t("billing.unlimited.aiIncluded", "AI Termasuk")}</span>
                </div>
              )}
              <p className="text-xs text-neutral-500 mt-1">{t("billing.shop.mandatoryNote", "Wajib untuk mengaktifkan akses penuh NEXBILL — sudah otomatis masuk keranjang di samping.")}</p>
              <div className="mt-2 text-sm flex justify-between">
                <span className="text-neutral-400">{t("billing.shop.subscriptionFeeLabel", "Biaya langganan (periode pertama)")}</span>
                <span className="font-semibold">{money(catalogPlan?.priceCurrent ?? 0)}</span>
              </div>
            </Card>

            {Object.entries(CATEGORY_LABEL_KEYS).map(([cat, meta]) => {
              const items = grouped[cat] ?? [];
              if (items.length === 0) return null;
              const Icon = CATEGORY_ICON[cat] ?? ShoppingCart;
              return (
                <Card key={cat} className="p-4 space-y-3">
                  <div className="flex items-center gap-2 font-semibold">
                    <Icon size={16} className="text-cyan-400" /> {t(meta.key, meta.fallback)}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {items.map((p) => (
                      <div key={p.id} className="rounded-lg border border-white/10 p-3 space-y-2">
                        {cat === "smart_plug" && (
                          p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} className="w-full aspect-square object-cover rounded-lg border border-white/10 bg-black/20" />
                          ) : (
                            <div className="w-full aspect-square rounded-lg border border-dashed border-white/10 flex items-center justify-center text-neutral-700">
                              <Icon size={24} />
                            </div>
                          )
                        )}
                        <div className="text-sm font-medium">{p.name}</div>
                        {p.description && <div className="text-xs text-neutral-500">{p.description}</div>}
                        <div className="text-sm text-cyan-300 font-semibold">{money(p.price)}</div>
                        <div className="flex items-center gap-2">
                          <button
                            className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10"
                            onClick={() => setQty(p.id, Math.max(0, (cart[p.id] ?? 0) - 1))}
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-8 text-center text-sm">{cart[p.id] ?? 0}</span>
                          <button
                            className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10"
                            onClick={() => setQty(p.id, (cart[p.id] ?? 0) + 1)}
                          >
                            <Plus size={12} />
                          </button>
                          <Button
                            variant="secondary"
                            className="text-xs ml-auto"
                            onClick={() => setQty(p.id, (cart[p.id] ?? 0) === 0 ? 1 : (cart[p.id] ?? 0))}
                          >
                            {t("billing.shop.addToCart", "+ Keranjang")}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}

            {(wantsInstall || hasSmartPlug) && (
              <Card className="p-4 space-y-3">
                <div>
                  <div className="font-semibold text-sm">{hasSmartPlug ? t("billing.install.headingWithShipping", "Alamat Pengiriman & Instalasi") : t("billing.install.headingInstallOnly", "Detail Instalasi")}</div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {hasSmartPlug && wantsInstall && t("billing.install.noteShippingAndInstall", "Wajib diisi karena ada Smart Plug di keranjang — juga dipakai vendor Jasa Instalasi untuk menghubungi kontak ini.")}
                    {hasSmartPlug && !wantsInstall && t("billing.install.noteShippingOnly", "Wajib diisi karena ada Smart Plug di keranjang — Smart Plug dikirim ke alamat ini.")}
                    {!hasSmartPlug && wantsInstall && t("billing.install.noteInstallOnly", 'Diisi karena "Jasa Instalasi" ada di keranjang — vendor akan menghubungi kontak ini.')}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm" placeholder={t("billing.install.placeholderName", "Nama Penerima")} value={installName} onChange={(e) => setInstallName(e.target.value)} />
                  <input className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm" placeholder={t("billing.install.placeholderPhone", "No. WhatsApp Penerima")} value={installPhone} onChange={(e) => setInstallPhone(e.target.value)} />
                  <input className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm" placeholder={t("billing.install.placeholderAddress", "Alamat lengkap (jalan, no. rumah, RT/RW)")} value={installAddress} onChange={(e) => setInstallAddress(e.target.value)} />
                </div>

                {hasSmartPlug && (
                  <div className="space-y-2 pt-1 border-t border-white/10">
                    <div className="text-xs font-medium text-neutral-300">{t("billing.install.destinationLabel", "Kecamatan/Kota Tujuan (untuk hitung ongkos kirim)")}</div>
                    <div className="relative">
                      <input
                        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
                        placeholder={t("billing.install.destinationPlaceholder", "Ketik nama kecamatan/kota, mis. Cilandak...")}
                        value={selectedArea ? selectedArea.name : areaQuery}
                        onChange={(e) => {
                          setSelectedArea(null);
                          setAreaQuery(e.target.value);
                        }}
                      />
                      {!selectedArea && areaQuery.trim().length >= 3 && (areaSearching || areaResults.length > 0) && (
                        <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-[#0b0f1e] shadow-xl">
                          {areaSearching && <div className="px-3 py-2 text-xs text-neutral-500">{t("billing.install.searching", "Mencari...")}</div>}
                          {!areaSearching &&
                            areaResults.map((a) => (
                              <button
                                key={a.id}
                                type="button"
                                className="w-full text-left px-3 py-2 text-xs hover:bg-white/5"
                                onClick={() => {
                                  setSelectedArea(a);
                                  setAreaQuery("");
                                  setAreaResults([]);
                                }}
                              >
                                {a.name}
                              </button>
                            ))}
                          {!areaSearching && areaResults.length === 0 && <div className="px-3 py-2 text-xs text-neutral-600">{t("billing.install.notFound", "Tidak ditemukan.")}</div>}
                        </div>
                      )}
                    </div>

                    <Button variant="secondary" className="text-xs" onClick={checkShippingRates} disabled={!selectedArea || ratesLoading}>
                      {ratesLoading ? t("billing.common.checking", "Mengecek...") : t("billing.install.checkShipping", "Cek Ongkos Kirim")}
                    </Button>

                    {ratesError && <div className="text-xs text-rose-400">{ratesError}</div>}

                    {rateOptions.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {rateOptions.map((o) => {
                          const key = `${o.courierCode}-${o.courierServiceCode}`;
                          const active = selectedRate && selectedRate.courierCode === o.courierCode && selectedRate.courierServiceName === o.courierServiceName;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setSelectedRate(o)}
                              className={`w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs ${
                                active ? "border-cyan-400/50 bg-cyan-400/10" : "border-white/10 hover:bg-white/5"
                              }`}
                            >
                              <span>
                                <span className="font-medium text-neutral-200">{o.courierName} — {o.courierServiceName}</span>
                                <span className="text-neutral-500"> · {o.duration}</span>
                              </span>
                              <span className="font-semibold text-cyan-300 shrink-0">{money(o.price)}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )}
          </div>

          <div className="lg:col-span-1">
            <Card className="p-4 space-y-3 sticky top-4">
              <div className="flex items-center gap-2 font-semibold">
                <ShoppingCart size={16} className="text-cyan-400" /> {t("billing.cart.heading", "Keranjang")}
              </div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-neutral-400">{t("billing.shop.subscriptionPlan", "Langganan {plan}").replace("{plan}", String(catalogPlan?.name ?? ""))}</span>
                  <span>{money(catalogPlan?.priceCurrent ?? 0)}</span>
                </div>
                {Object.entries(cart).filter(([, qty]) => qty > 0).map(([productId, qty]) => {
                  const p = (products ?? []).find((x) => x.id === productId);
                  if (!p) return null;
                  return (
                    <div key={productId} className="flex justify-between">
                      <span className="text-neutral-400">{p.name} x{qty}</span>
                      <span>{money(p.price * qty)}</span>
                    </div>
                  );
                })}
                {Object.keys(cart).length === 0 && (
                  <div className="text-xs text-neutral-600">{t("billing.cart.empty", "Belum ada item lain di keranjang — browse etalase di sebelah kiri untuk tambah produk, jasa instalasi, atau konsol tambahan.")}</div>
                )}
                {hasSmartPlug && (
                  <div className="flex justify-between">
                    <span className="text-neutral-400">{t("billing.cart.shippingLabel", "Ongkos Kirim")}{selectedRate ? ` (${selectedRate.courierName})` : ""}</span>
                    <span>{selectedRate ? money(selectedRate.price) : t("billing.cart.shippingNotSelected", "Belum dipilih")}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t border-white/10 pt-2 mt-2">
                  <span>{t("billing.cart.total", "Total")}</span>
                  <span className="text-cyan-300">{money(grandTotal)}</span>
                </div>
              </div>
              <Button className="w-full" onClick={doCheckout} disabled={busy}>{busy ? t("billing.common.processing", "Memproses...") : t("billing.cart.checkout", "Checkout")}</Button>
              <p className="text-[11px] text-neutral-600">{t("billing.cart.footnote", "Setelah checkout, satu tagihan gabungan akan muncul untuk dibayar (Cash/QRIS/VA) — akses penuh terbuka otomatis 30 hari setelah pembayaran diterima.")}</p>
            </Card>
          </div>
        </div>
      )}

      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="font-semibold text-violet-300">{t("billing.ai.title", "AI Business Assistant & Insights")}</div>
            <p className="text-sm text-neutral-400 mt-1">
              {aiAddon?.includedViaPlan && t("billing.ai.includedInPlan", "Sudah termasuk dalam paket langganan — tidak ada biaya tambahan, tidak perlu diaktifkan terpisah.")}
              {!aiAddon?.includedViaPlan && aiAddon?.freeViaTrial && t("billing.ai.freeTrial", "Gratis selama masa percobaan berjalan — tidak perlu diaktifkan terpisah.")}
              {!aiAddon?.includedViaPlan && !aiAddon?.freeViaTrial && aiAddon?.active && t("billing.ai.activeUntil", "Aktif sampai {date}.").replace("{date}", aiAddon.periodEnd ? new Date(aiAddon.periodEnd).toLocaleDateString("id-ID") : "-")}
              {!aiAddon?.includedViaPlan && !aiAddon?.freeViaTrial && !aiAddon?.active && t("billing.ai.locked", "Terkunci — fitur AI berbayar terpisah dari paket langganan reguler (bukan bagian dari harga langganan), karena setiap pemakaiannya punya biaya nyata ke penyedia AI.")}
            </p>
          </div>
          <div className="text-right">
            {aiAddon?.includedViaPlan && (
              <span className="inline-block text-xs px-2 py-1 rounded-lg bg-violet-500/15 text-violet-300">{t("billing.ai.includedBadge", "Termasuk")}</span>
            )}
            {!aiAddon?.includedViaPlan && !aiAddon?.freeViaTrial && (
              <>
                <div className="text-sm font-semibold text-violet-300 mb-1">{money(aiAddon?.priceMonthly ?? 0)}{t("billing.ai.perMonthSuffix", "/bulan")}</div>
                <Button variant={aiAddon?.active ? "secondary" : "primary"} onClick={doActivateAi} disabled={aiAddonBusy}>
                  {aiAddonBusy ? t("billing.common.processing", "Memproses...") : aiAddon?.active ? t("billing.ai.renewButton", "Perpanjang AI Add-on") : t("billing.ai.activateButton", "Aktifkan AI Add-on")}
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {unpaidInvoices.length > 0 && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="font-semibold">{t("billing.invoices.unpaidHeading", "Tagihan Belum Lunas")}</div>
            <div className="flex items-center gap-1.5 text-[11px] text-amber-400/80">
              <Timer size={12} />
              {t("billing.invoices.autoExpireNotice", "Tagihan yang belum dibayar dalam 2x24 jam akan otomatis kedaluwarsa (dibatalkan otomatis, tetap tercatat di Riwayat Faktur).")}
            </div>
          </div>
          {unpaidInvoices.map((inv) => {
            let lines: CartLine[] = [];
            try {
              const raw = inv.lineItemsJson ? JSON.parse(inv.lineItemsJson) : [];
              lines = inv.type === "group_renewal"
                ? raw.map((l: { outletName: string; planName: string; amount: number }) => ({ category: "subscription", productId: null, name: `${l.outletName} — ${l.planName}`, qty: 1, unitPrice: l.amount, amount: l.amount }))
                : raw;
            } catch { lines = []; }

            // Menghitung status kedaluwarsa tagihan iPaymu
            const isExpired = inv.expiresAt && now ? new Date(inv.expiresAt).getTime() <= now : false;

            return (
              <div key={inv.id} className="border-b border-white/5 pb-3 last:border-0 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="text-sm">{INVOICE_TYPE_LABEL_KEYS[inv.type] ? t(INVOICE_TYPE_LABEL_KEYS[inv.type].key, INVOICE_TYPE_LABEL_KEYS[inv.type].fallback) : inv.type} — {inv.invoiceNumber}</div>
                    <div className="text-xs text-neutral-500">{inv.description}</div>
                  </div>
                  
                  {/* --- BAGIAN TOMBOL DAN METODE PEMBAYARAN --- */}
                  <div className="flex flex-col items-end gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{money(inv.amount)}</span>
                    
                    {/* Munculkan pemilihan metode jika belum di-set ATAU waktu sudah habis (kedaluwarsa) */}
                    {canManage && (!inv.method || isExpired) && (
                      <div className="flex gap-2 flex-wrap justify-end">
                        {data.billingCurrency?.code ? (
                          <Button onClick={() => doPay(inv.id, "ipaymu_crossborder")}>{t("billing.method.crossBorderCard", "Bayar Kartu ({currency})").replace("{currency}", data.billingCurrency.code)}</Button>
                        ) : null}
                        <Button variant="secondary" onClick={() => doPay(inv.id, "cash")}>{t("billing.method.cash", "Cash")}</Button>
                        <Button variant="secondary" onClick={() => doPay(inv.id, "qris")}>{t("billing.method.qris", "QRIS")}</Button>
                        {VA_BANKS.map((b) => (
                          <Button key={b.method} variant="secondary" onClick={() => doPay(inv.id, b.method)}>{t(b.labelKey, b.fallback)}</Button>
                        ))}
                        <Button variant="secondary" onClick={() => doPay(inv.id, "ipaymu_hosted")}>{t("billing.method.ipaymuHosted", "E-Wallet / Retail")}</Button>
                      </div>
                    )}
                    
                    {/* Jika metode SUDAH dipilih & belum kedaluwarsa */}
                    {canManage && inv.method && !isExpired && (
                      <div className="flex gap-2 flex-wrap justify-end items-center">
                        
                        {/* Menampilkan Jangka Waktu Pembayaran (Countdown) jika expiresAt tersedia */}
                        {inv.method !== "cash" && inv.expiresAt && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400 text-xs font-medium mr-2">
                            <Timer size={14} /> Sisa Waktu: {formatCountdown(inv.expiresAt)}
                          </div>
                        )}

                        {inv.method === "cash" ? (
                          <Button onClick={() => doConfirm(inv.id)}>
                            {t("billing.invoices.markPaid", "Tandai Lunas (Manual)")}
                          </Button>
                        ) : (
                          <>
                            <Button variant="secondary" onClick={() => doSync(inv.id)}>
                              {t("billing.invoices.syncStatus", "Cek Status Pembayaran")}
                            </Button>
                            {(inv.method === "ipaymu_hosted" || inv.method === "ipaymu_crossborder") && (
                              <Button variant="secondary" onClick={() => doPay(inv.id, inv.method as string)}>
                                {t("billing.invoices.reopenPayment", "Buka Hal. Pembayaran")}
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {lines.length > 0 && (
                  <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 space-y-1">
                    <div className="text-xs text-neutral-500 mb-1">{t("billing.invoices.lineDetailLabel", "Rincian belanja:")}</div>
                    {lines.map((l, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-neutral-400">
                        <span>{l.name} x{l.qty}</span>
                        <span>{money(l.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {!isExpired && inv.method?.startsWith("va_") && inv.vaNumber && (
                  <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm flex items-center justify-between flex-wrap gap-2 mt-2">
                    <div>
                      <div className="text-xs text-neutral-500">{t("billing.invoices.vaTransferTo", "Transfer ke Virtual Account {bank}").replace("{bank}", VA_BANK_NAME[inv.vaBankCode ?? ""] ?? inv.vaBankCode)}</div>
                      <div className="font-mono font-semibold text-cyan-300 tracking-wider">{inv.vaNumber}</div>
                    </div>
                    <div className="text-xs text-neutral-500">{t("billing.invoices.vaAmountNote", "Sistem kami akan memeriksa pembayaran ini secara otomatis.")}</div>
                  </div>
                )}

                {!isExpired && inv.method === "qris" && inv.qrImageUrl && (
                  <div className="flex flex-col gap-2 mt-2">
                    <img src={inv.qrImageUrl} alt={t("billing.invoices.qrAlt", "QR pembayaran langganan")} className="w-32 h-32 rounded-lg border border-white/10 bg-white" />
                    <span className="text-xs text-neutral-500">{t("billing.invoices.qrisNote", "Silakan scan kode QRIS ini. Sistem akan mengecek otomatis.")}</span>
                  </div>
                )}

                {!isExpired && inv.method === "ipaymu_hosted" && (
                  <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs text-neutral-400 mt-2">
                    <div>{t("billing.invoices.ipaymuHostedPending", "Pembayaran via E-Wallet/Retail sedang diproses. Silakan selesaikan di halaman iPaymu, atau klik 'Buka Hal. Pembayaran'.")}</div>
                  </div>
                )}

                {!isExpired && inv.method === "ipaymu_crossborder" && (
                  <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs text-neutral-400 space-y-1 mt-2">
                    <div>{t("billing.invoices.crossBorderPending", "Pembayaran kartu lintas negara sedang diproses — ref: {ref}. Hubungi NEXBILL Support jika belum menerima link pembayaran.").replace("{ref}", inv.providerRef ?? "-")}</div>
                    <div>{t("billing.invoices.crossBorderNote", "Sistem akan mengecek pembayaran ini secara otomatis.")}</div>
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      )}

      {safeInvoices.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">{t("billing.history.heading", "Riwayat Tagihan")}</div>
            <button type="button" className="text-xs text-cyan-400 hover:underline" onClick={() => setTab("invoices")}>
              {t("billing.history.viewAll", "Lihat semua di Riwayat Faktur →")}
            </button>
          </div>
          <div className="space-y-1 text-sm">
            {safeInvoices.slice(0, 5).map((inv) => (
              <div key={inv.id} className="flex justify-between text-neutral-400">
                <span>{inv.invoiceNumber} — {INVOICE_TYPE_LABEL_KEYS[inv.type] ? t(INVOICE_TYPE_LABEL_KEYS[inv.type].key, INVOICE_TYPE_LABEL_KEYS[inv.type].fallback) : inv.type}</span>
                <span className={INVOICE_STATUS_COLOR[inv.status] ?? "text-neutral-400"}>
                  {money(inv.amount)} · {INVOICE_STATUS_LABEL_KEYS[inv.status] ? t(INVOICE_STATUS_LABEL_KEYS[inv.status].key, INVOICE_STATUS_LABEL_KEYS[inv.status].fallback) : inv.status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      </>
      )}

      <BillingFaq
        planName={catalogPlan?.name}
        planPrice={catalogPlan?.priceCurrent}
        includedConsoles={catalogPlan?.includedConsoles}
        extraConsolePrice={catalogPlan?.extraConsolePrice}
        smartPlugPrice={catalogPlan?.smartPlugPrice}
        setupServicePrice={catalogPlan?.setupServicePrice}
        aiAddonPriceMonthly={aiAddon?.priceMonthly}
        unlimitedEntitlement={!!catalogPlan?.unlimitedEntitlement}
      />

      <p className="text-center text-xs text-neutral-600">
        <a href="/syarat-ketentuan" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
          {t("billing.footer.terms", "Syarat & Ketentuan")}
        </a>
        {" · "}
        <a href="/kebijakan-refund" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
          {t("billing.footer.refundPolicy", "Kebijakan Refund & Pembatalan")}
        </a>
      </p>
    </div>
  );
}
