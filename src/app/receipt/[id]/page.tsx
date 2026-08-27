"use client";
import { useEffect, useState, use } from "react";
import { getDevicePrinterSettings, PAPER_WIDTH_PX } from "@/lib/printer/deviceSettings";

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;

export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/orders/${id}/receipt`).then((r) => r.json()).then(setData);
  }, [id]);

  if (!data) return <div className="p-8 text-neutral-500">Memuat struk...</div>;
  const { order, items, payments, outlet } = data;
  const successPayment = payments.find((p: any) => p.status === "success");

  // Paper width & printer name follow THIS PC's own local preference (set in
  // Settings → Printer & Struk → "PC/Komputer Ini") if one was saved, falling
  // back to the outlet-wide default otherwise — the actual printer used is
  // always whatever's default in this PC's own OS/browser print dialog;
  // these only control the on-screen/print layout width.
  const device = getDevicePrinterSettings(outlet?.id);
  const paperWidthMm: 58 | 80 = device?.paperWidthMm ?? (outlet?.printerPaperWidthMm === 80 ? 80 : 58);
  const containerPx = PAPER_WIDTH_PX[paperWidthMm];
  const printerName = device?.printerName || outlet?.printerName;

  return (
    <div className="min-h-screen bg-white text-black flex items-start justify-center py-8 print:py-0">
      <div className="font-mono text-xs space-y-2 p-4" style={{ width: containerPx }}>
        {printerName && (
          <div className="text-center text-[10px] text-neutral-400 print:hidden">Printer PC ini: {printerName} ({paperWidthMm}mm)</div>
        )}
        <div className="text-center space-y-1">
          <div className="font-bold text-sm">{outlet?.name}</div>
          <div>{outlet?.address}</div>
          <div>{outlet?.phone}</div>
        </div>
        <div className="border-t border-dashed border-black my-2" />
        <div>No: {order.id.slice(0, 8).toUpperCase()}</div>
        <div>Tanggal: {new Date(order.createdAt).toLocaleString("id-ID")}</div>
        <div className="border-t border-dashed border-black my-2" />
        {items.map((item: any) => (
          <div key={item.id} className="flex justify-between">
            <span>{item.qty}x {item.description}</span>
            <span>{rupiah(item.lineTotal)}</span>
          </div>
        ))}
        <div className="border-t border-dashed border-black my-2" />
        <div className="flex justify-between"><span>Subtotal</span><span>{rupiah(order.subtotal)}</span></div>
        {order.discount > 0 && <div className="flex justify-between"><span>Diskon</span><span>-{rupiah(order.discount)}</span></div>}
        {order.serviceCharge > 0 && <div className="flex justify-between"><span>Service Charge</span><span>{rupiah(order.serviceCharge)}</span></div>}
        {order.tax > 0 && <div className="flex justify-between"><span>Pajak</span><span>{rupiah(order.tax)}</span></div>}
        <div className="flex justify-between font-bold border-t border-dashed border-black mt-1 pt-1"><span>TOTAL</span><span>{rupiah(order.total)}</span></div>
        {successPayment && (
          <>
            <div className="border-t border-dashed border-black my-2" />
            <div className="flex justify-between"><span>Metode Bayar</span><span className="uppercase">{successPayment.method}</span></div>
            <div className="flex justify-between"><span>Status</span><span>LUNAS</span></div>
          </>
        )}
        <div className="border-t border-dashed border-black my-2" />
        <div className="text-center whitespace-pre-line">{outlet?.receiptFooterText || "Terima kasih!"}</div>
        <button onClick={() => window.print()} className="w-full mt-4 bg-black text-white py-2 print:hidden">Cetak Struk</button>
      </div>
    </div>
  );
}
