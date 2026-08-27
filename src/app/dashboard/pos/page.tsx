"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { fetchJsonArray } from "@/lib/api/fetch-json";
import { PAYMENT_METHOD_OPTIONS } from "@/lib/payments/labels";
import { showAlert } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-pos";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stockQty: number;
  isActive: boolean;
  sku?: string | null;
  barcode?: string | null;
}

/**
 * Multi-keyword AND search on the product name — typing "ayam goreng pedas"
 * matches "Ayam Goreng Pedas Level 5" regardless of word order, and works
 * the same whether the cashier types 1 word or 5+. Also matches directly
 * against SKU/barcode so a partial code typed by hand still finds the item.
 */
function matchesQuery(p: Product, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (p.barcode && p.barcode.toLowerCase().includes(q)) return true;
  if (p.sku && p.sku.toLowerCase().includes(q)) return true;
  const name = p.name.toLowerCase();
  return q.split(/\s+/).filter(Boolean).every((word) => name.includes(word));
}

interface CartLine {
  productId?: string;
  description: string;
  qty: number;
  unitPrice: number;
}

interface OpenOrder {
  id: string;
  total: number;
  source: string;
  rentalSessionId: string | null;
  createdAt: string;
}

const rupiah = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;

/**
 * Cashier's in-progress order (cart + discount/voucher/tax/method) draft,
 * kept in localStorage so switching to another page (or an accidental
 * refresh) before hitting "Bayar" doesn't wipe out items already scanned.
 * Cleared naturally once checkout succeeds and these fields reset to empty.
 */
const POS_DRAFT_KEY = "pos_draft_v1";
interface PosDraft {
  cart: CartLine[];
  discount: number;
  voucherCode: string;
  voucherDiscount: number;
  voucherMsg: string;
  applyTax: boolean;
  applyServiceCharge: boolean;
  method: string;
}

export default function PosPage() {
  const { t } = useDashboardLang();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [method, setMethod] = useState("cash");
  const [methods, setMethods] = useState(PAYMENT_METHOD_OPTIONS); // starts with the static 8 as a safe default, replaced once the outlet's live catalog loads
  const [discount, setDiscount] = useState(0);
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [voucherMsg, setVoucherMsg] = useState("");
  const [applyTax, setApplyTax] = useState(false);
  const [applyServiceCharge, setApplyServiceCharge] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<any>(null);
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
  const [mergeSelection, setMergeSelection] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const isFirstRender = useRef(true);

  const loadOpenOrders = () => fetchJsonArray("/api/orders?status=open").then(setOpenOrders);

  // Restore any in-progress order left over from before navigating away.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(POS_DRAFT_KEY);
    if (!saved) return;
    try {
      const draft: Partial<PosDraft> = JSON.parse(saved);
      if (draft.cart?.length) setCart(draft.cart);
      if (draft.discount) setDiscount(draft.discount);
      if (draft.voucherCode) setVoucherCode(draft.voucherCode);
      if (draft.voucherDiscount) setVoucherDiscount(draft.voucherDiscount);
      if (draft.voucherMsg) setVoucherMsg(draft.voucherMsg);
      if (draft.applyTax) setApplyTax(draft.applyTax);
      if (draft.applyServiceCharge) setApplyServiceCharge(draft.applyServiceCharge);
      if (draft.method) setMethod(draft.method);
    } catch {
      // corrupted draft — ignore, start fresh
    }
  }, []);

  // Persist on every change, skipping the very first render (initial default
  // state, before the restore effect above has had a chance to apply).
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (typeof window === "undefined") return;
    const draft: PosDraft = { cart, discount, voucherCode, voucherDiscount, voucherMsg, applyTax, applyServiceCharge, method };
    window.localStorage.setItem(POS_DRAFT_KEY, JSON.stringify(draft));
  }, [cart, discount, voucherCode, voucherDiscount, voucherMsg, applyTax, applyServiceCharge, method]);

  useEffect(() => {
    // device_rental products (PlayStation/console gear) are scoped to Home
    // Rental + the Rental page's own session/accessory system — they're not
    // sellable through the generic F&B/retail cashier, so exclude them here
    // regardless of what's in the Produk catalog.
    fetchJsonArray("/api/products").then((rows) => setProducts(rows.filter((p: Product) => p.isActive && p.category !== "device_rental")));
    loadOpenOrders();
    const id = setInterval(loadOpenOrders, 5000);
    // Owner-editable payment methods (add/edit/delete from the Pembayaran page) — falls back to the static 8 above if this fails.
    getOutletId()
      .then((outletId) => fetchJsonArray(`/api/payment-methods?outletId=${outletId}`))
      .then((rows) => {
        const active = rows.filter((m: any) => m.isActive);
        if (active.length > 0) setMethods(active.map((m: any) => ({ value: m.key, label: m.label })));
      });
    return () => clearInterval(id);
  }, []);

  const addToCart = (p: Product) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === p.id);
      if (existing) return prev.map((l) => (l.productId === p.id ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { productId: p.id, description: p.name, qty: 1, unitPrice: p.price }];
    });
  };

  const updateQty = (productId: string, qty: number) => {
    setCart((prev) => (qty <= 0 ? prev.filter((l) => l.productId !== productId) : prev.map((l) => (l.productId === productId ? { ...l, qty } : l))));
  };

  const subtotal = cart.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
  const estimatedTotal = Math.max(0, subtotal - discount - voucherDiscount);

  const checkVoucher = async () => {
    if (!voucherCode) return;
    const outletId = await getOutletId();
    const res = await fetch("/api/vouchers/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outletId, code: voucherCode, subtotal }),
    });
    const result = await res.json();
    if (result.valid) {
      setVoucherDiscount(result.discountAmount);
      setVoucherMsg(t("pos.voucherOk", "Voucher OK: -{amount}").replace("{amount}", rupiah(result.discountAmount)));
    } else {
      setVoucherDiscount(0);
      setVoucherMsg(result.reason);
    }
  };

  const checkout = async () => {
    if (cart.length === 0) return;
    const orderRes = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outletId: await getOutletId(),
        items: cart,
        discount,
        voucherCode: voucherDiscount > 0 ? voucherCode : undefined,
        applyTax,
        applyServiceCharge,
        source: "pos",
      }),
    });
    const order = await orderRes.json();
    if (!orderRes.ok) return showAlert(order.error);

    const payRes = await fetch(`/api/orders/${order.id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method }),
    });
    const payment = await payRes.json();
    setCheckoutResult({ order, payment });
    setCart([]);
    setDiscount(0);
    setVoucherCode("");
    setVoucherDiscount(0);
    setVoucherMsg("");
    loadOpenOrders();
  };

  const payOpenOrder = async (orderId: string) => {
    const res = await fetch(`/api/orders/${orderId}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method }),
    });
    const payment = await res.json();
    if (method === "cash") {
      await fetch(`/api/payments/${payment.id}/confirm-cash`, { method: "POST" });
    }
    loadOpenOrders();
  };

  const splitOrder = async (orderId: string) => {
    const parts = prompt(t("pos.splitPromptMessage", "Split jadi berapa bagian?"), "2");
    if (!parts) return;
    const res = await fetch(`/api/orders/${orderId}/split`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parts: Number(parts) }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    loadOpenOrders();
  };

  const mergeSelected = async () => {
    if (mergeSelection.length < 2) return showAlert(t("pos.selectMinTwoOrders", "Pilih minimal 2 order untuk digabung."));
    const res = await fetch("/api/orders/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderIds: mergeSelection }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setMergeSelection([]);
    loadOpenOrders();
  };

  const filteredProducts = products.filter((p) => matchesQuery(p, search));
  const isSearching = search.trim().length > 0;

  const grouped = filteredProducts.reduce<Record<string, Product[]>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});

  /**
   * Barcode-scanner-friendly: a scanner types the code then sends Enter.
   * On Enter, prefer an exact SKU/barcode match (what a real scan produces);
   * if the search just narrows down to one item, add that one too so typing
   * a code by hand and hitting Enter works the same way.
   */
  const onSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const q = search.trim().toLowerCase();
    if (!q) return;
    const exact = products.find((p) => (p.barcode && p.barcode.toLowerCase() === q) || (p.sku && p.sku.toLowerCase() === q));
    if (exact) {
      addToCart(exact);
      setSearch("");
      return;
    }
    if (filteredProducts.length === 1) {
      addToCart(filteredProducts[0]);
      setSearch("");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h1 className="gm-display text-2xl font-bold gm-gradient-title">{t("pos.title", "Kasir (POS)")}</h1>
          <p className="text-sm text-neutral-500">{t("pos.subtitle", "Makanan & minuman. Sewa perangkat dikelola di Home Rental / halaman Rental, bukan di sini.")}</p>
        </div>

        <div>
          <input
            autoFocus
            className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm"
            placeholder={t("pos.searchPlaceholder", "Cari nama produk (bisa beberapa kata) atau scan barcode...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={onSearchKeyDown}
          />
        </div>

        {openOrders.length > 0 && (
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-medium text-neutral-400">{t("pos.openOrders", "Order Terbuka (belum dibayar)")}</h2>
              {mergeSelection.length >= 2 && <Button className="text-xs" onClick={mergeSelected}>{t("pos.mergeOrders", "Gabung {n} Order").replace("{n}", String(mergeSelection.length))}</Button>}
            </div>
            <div className="space-y-2">
              {openOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between text-sm border-b border-neutral-900 pb-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={mergeSelection.includes(o.id)}
                      onChange={(e) => setMergeSelection((prev) => e.target.checked ? [...prev, o.id] : prev.filter((id) => id !== o.id))} />
                    <span>{o.rentalSessionId ? t("pos.orderTypeRental", "Rental") : t("pos.orderTypeFnb", "F&B")} #{o.id.slice(0, 8)} — {rupiah(o.total)}</span>
                  </label>
                  <div className="flex gap-1">
                    <Button variant="ghost" className="text-xs" onClick={() => splitOrder(o.id)}>{t("pos.split", "Split")}</Button>
                    <Button variant="secondary" className="text-xs" onClick={() => payOpenOrder(o.id)}>{t("pos.payWithMethod", "Bayar ({method})").replace("{method}", method)}</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {isSearching ? (
          <div>
            <h2 className="text-sm font-medium text-neutral-400 mb-2">{t("pos.searchResults", "Hasil pencarian ({n})").replace("{n}", String(filteredProducts.length))}</h2>
            {filteredProducts.length === 0 ? (
              <div className="text-sm text-neutral-500 py-4 text-center rounded-xl border border-neutral-800 bg-neutral-900/60">{t("pos.noMatchingProducts", "Tidak ada produk yang cocok.")}</div>
            ) : (
              <div className="space-y-1.5">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="w-full flex items-center justify-between text-left rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-2.5 hover:border-emerald-500/50 transition"
                  >
                    <div>
                      <div className="text-sm font-medium">{p.name}</div>
                      <div className="text-[10px] text-neutral-600 uppercase">{p.category.replace("_", " ")}{p.barcode ? ` · ${p.barcode}` : p.sku ? ` · ${p.sku}` : ""}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-medium">{rupiah(p.price)}</div>
                      <div className="text-[10px] text-neutral-600">{t("pos.stockLabel", "Stok: {n}").replace("{n}", String(p.stockQty))}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h2 className="text-sm font-medium text-neutral-400 uppercase mb-2">{category.replace("_", " ")}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {items.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="text-left rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 hover:border-emerald-500/50 transition"
                  >
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-neutral-500">{rupiah(p.price)}</div>
                    <div className="text-[10px] text-neutral-600">{t("pos.stockLabel", "Stok: {n}").replace("{n}", String(p.stockQty))}</div>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <Card className="h-fit sticky top-6 space-y-4">
        <h2 className="font-medium">{t("pos.cart", "Keranjang")}</h2>
        {cart.length === 0 && <p className="text-sm text-neutral-500">{t("pos.emptyCart", "Belum ada item.")}</p>}
        <div className="space-y-2">
          {cart.map((l) => (
            <div key={l.productId} className="flex items-center justify-between text-sm">
              <div>
                <div>{l.description}</div>
                <div className="text-xs text-neutral-500">{rupiah(l.unitPrice)} x {l.qty}</div>
              </div>
              <div className="flex items-center gap-1">
                <button className="w-6 h-6 bg-neutral-800 rounded" onClick={() => updateQty(l.productId!, l.qty - 1)}>-</button>
                <span className="w-6 text-center">{l.qty}</span>
                <button className="w-6 h-6 bg-neutral-800 rounded" onClick={() => updateQty(l.productId!, l.qty + 1)}>+</button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t border-neutral-800 pt-3">
          <div className="flex gap-2">
            <input type="number" className="w-20 shrink-0 rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-sm" placeholder={t("pos.discountPlaceholder", "Diskon Rp")}
              value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value))} />
            <input className="flex-1 min-w-0 rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-sm uppercase" placeholder={t("pos.voucherCodePlaceholder", "Kode voucher")}
              value={voucherCode} onChange={(e) => setVoucherCode(e.target.value)} />
            <Button variant="secondary" className="shrink-0 text-xs px-2.5" onClick={checkVoucher}>{t("pos.checkVoucher", "Cek")}</Button>
          </div>
          {voucherMsg && <div className="text-xs text-neutral-500">{voucherMsg}</div>}
          <div className="flex gap-4 text-xs text-neutral-400">
            <label className="flex items-center gap-1"><input type="checkbox" checked={applyTax} onChange={(e) => setApplyTax(e.target.checked)} /> {t("pos.tax", "Pajak")}</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={applyServiceCharge} onChange={(e) => setApplyServiceCharge(e.target.checked)} /> {t("pos.serviceCharge", "Service Charge")}</label>
          </div>
        </div>

        <div className="border-t border-neutral-800 pt-3 flex justify-between font-semibold">
          <span>{t("pos.estimatedTotal", "Estimasi Total")}</span>
          <span>{rupiah(estimatedTotal)}</span>
        </div>

        <div>
          <label className="text-xs text-neutral-500">{t("pos.paymentMethod", "Metode Pembayaran")}</label>
          <select
            className="w-full mt-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            {methods.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <Button className="w-full" onClick={checkout} disabled={cart.length === 0}>
          {t("pos.payButton", "Bayar {amount}").replace("{amount}", rupiah(estimatedTotal))}
        </Button>

        {checkoutResult && (
          <div className="text-xs text-neutral-400 border-t border-neutral-800 pt-3 space-y-1">
            <div>{t("pos.orderCreated", "Order #{id} dibuat.").replace("{id}", checkoutResult.order.id.slice(0, 8))}</div>
            {checkoutResult.payment.qrString && <div>{t("pos.qrisReady", "QRIS siap discan pelanggan (lihat halaman Pembayaran).")}</div>}
            {checkoutResult.payment.method === "cash" && (
              <Button
                variant="secondary"
                className="w-full mt-1"
                onClick={async () => {
                  await fetch(`/api/payments/${checkoutResult.payment.id}/confirm-cash`, { method: "POST" });
                  setCheckoutResult(null);
                }}
              >
                {t("pos.confirmCashReceived", "Konfirmasi Cash Diterima")}
              </Button>
            )}
            <Link href={`/receipt/${checkoutResult.order.id}`} target="_blank" className="block text-center text-emerald-400 underline mt-1">
              {t("pos.printReceipt", "Cetak Struk")}
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}

async function getOutletId() {
  const res = await fetch("/api/outlets/default");
  const data = await res.json();
  return data.id;
}
