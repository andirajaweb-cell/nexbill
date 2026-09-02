"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Loader2, Copy, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

const rupiah = (n: number | undefined) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;

interface Order {
  orderNumber: string;
  status: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
}

interface PaymentData {
  paymentUrl?: string;
  qrImage?: string;
  vaNumber?: string;
}

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [selectedMethod, setSelectedMethod] = useState("qris");
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchOrderDetail = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      const data = await res.json();
      if (data.success) {
        setOrder(data.order);
        if (data.order.status === "COMPLETED") {
          router.push(`/payment/${orderId}/success`);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialFetch = setTimeout(() => {
      void fetchOrderDetail();
    }, 0);
    // Polling status setiap 5 detik untuk update real-time tanpa refresh manual
    const interval = setInterval(fetchOrderDetail, 5000);
    return () => {
      clearTimeout(initialFetch);
      clearInterval(interval);
    };
  }, [orderId]);

  const handleProceedPayment = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/payments/${orderId}/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: selectedMethod }),
      });
      const data = await res.json();
      if (data.success) {
        setPaymentData(data);
        if (data.paymentUrl) {
          window.open(data.paymentUrl, "_blank");
        }
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && !order) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950 text-white">
        <Loader2 className="animate-spin text-cyan-400" size={32} />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-4 md:p-8 flex items-center justify-center">
      <Card className="w-full max-w-xl p-6 border border-white/10 bg-neutral-900/50 backdrop-blur-md">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
          <div>
            <h1 className="text-xl font-bold">Selesaikan Pembayaran</h1>
            <p className="text-xs text-neutral-400">Order #{order?.orderNumber}</p>
          </div>
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {order?.status}
          </span>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-400">Subtotal</span>
            <span>{rupiah(order?.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-400">Pajak / Diskon</span>
            <span>{rupiah((order?.tax ?? 0) - (order?.discount ?? 0))}</span>
          </div>
          <div className="flex justify-between text-base font-bold pt-2 border-t border-white/10">
            <span>Total Tagihan</span>
            <span className="text-cyan-400">{rupiah(order?.total)}</span>
          </div>
        </div>

        {!paymentData ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase mb-2">
                Pilih Metode Pembayaran (iPaymu)
              </label>
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="w-full bg-neutral-800 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-cyan-400"
              >
                <option value="qris">QRIS (Instant)</option>
                <option value="va">Virtual Account (BCA, BNI, Mandiri, Permata)</option>
                <option value="cstore">Convenience Store (Indomaret / Alfamart)</option>
              </select>
            </div>

            <button
              onClick={handleProceedPayment}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Bayar Sekarang
            </button>
          </div>
        ) : (
          <div className="space-y-4 text-center bg-neutral-800/40 p-4 rounded-xl border border-white/5">
            <p className="text-sm text-neutral-300">Silakan selesaikan pembayaran Anda.</p>
            {paymentData.qrImage && (
              <div className="flex justify-center my-4">
                <img src={paymentData.qrImage} alt="QRIS Code" className="w-48 h-48 bg-white p-2 rounded-lg" />
              </div>
            )}
            {paymentData.vaNumber && (
              <div className="flex items-center justify-between bg-neutral-900 p-3 rounded-lg border border-white/10">
                <span className="text-sm font-mono">{paymentData.vaNumber}</span>
                <button
                  onClick={() => paymentData.vaNumber && copyToClipboard(paymentData.vaNumber)}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 text-xs rounded flex items-center gap-1"
                >
                  <Copy size={12} /> {copied ? "Disalin!" : "Salin VA"}
                </button>
              </div>
            )}
            <button
              onClick={fetchOrderDetail}
              className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-xs rounded-lg flex items-center justify-center gap-2 mt-4"
            >
              <RefreshCw size={14} /> Cek Status Pembayaran
            </button>
          </div>
        )}
      </Card>
    </main>
  );
}