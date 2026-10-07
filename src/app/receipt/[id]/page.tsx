"use client";
import { useEffect, useState, use, useSyncExternalStore } from "react";
import { getDevicePrinterSettings, PAPER_WIDTH_PX, printConnectionOf } from "@/lib/printer/deviceSettings";
import { buildReceiptEscPos, receiptDocFromOrder, receiptLangFor, RECEIPT_LOCALE, RECEIPT_TEXT, type ReceiptLang } from "@/lib/printer/escpos";
import { readStoredLang } from "@/lib/i18n/client-text";
import { printViaBluetooth, printViaRawBt } from "@/lib/printer/bluetooth-printer";

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;

/** Teks tombol & status halaman ini (bukan isi struk — itu RECEIPT_TEXT di lib/printer/escpos.ts). */
const PAGE_TEXT: Record<ReceiptLang, { loading: string; sent: string; failed: string; printerThisPc: string; printing: string; viaRawBt: string; viaBt: string; print: string; printSystem: string }> = {
  id: {
    loading: "Memuat struk...", sent: "Struk terkirim ke printer.", failed: "Gagal mencetak: {error}", printerThisPc: "Printer PC ini: {name} ({paper}mm)",
    printing: "Mencetak...", viaRawBt: "Cetak via RawBT", viaBt: "Cetak via Bluetooth", print: "Cetak Struk", printSystem: "Cetak (dialog sistem)",
  },
  en: {
    loading: "Loading receipt...", sent: "Receipt sent to the printer.", failed: "Printing failed: {error}", printerThisPc: "This PC's printer: {name} ({paper}mm)",
    printing: "Printing...", viaRawBt: "Print via RawBT", viaBt: "Print via Bluetooth", print: "Print Receipt", printSystem: "Print (system dialog)",
  },
};

// Bahasa dashboard tersimpan di browser ini; saat render server selalu "id" lalu disesuaikan setelah hidrasi.
const subscribeLang = () => () => {};
const useReceiptLang = (): ReceiptLang => useSyncExternalStore(subscribeLang, () => receiptLangFor(readStoredLang()), () => "id");

export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<any>(null);
  const [btBusy, setBtBusy] = useState(false);
  const [btMsg, setBtMsg] = useState<string | null>(null);
  const lang = useReceiptLang();
  const L = RECEIPT_TEXT[lang];
  const P = PAGE_TEXT[lang];

  useEffect(() => {
    fetch(`/api/orders/${id}/receipt`).then((r) => r.json()).then(setData);
  }, [id]);

  if (!data) return <div className="p-8 text-neutral-500">{P.loading}</div>;
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
  // HP / aplikasi Android dengan printer Bluetooth (Pengaturan → Printer → Cara cetak).
  const connection = printConnectionOf(device);

  const printBluetooth = async () => {
    setBtBusy(true);
    setBtMsg(null);
    try {
      const bytes = buildReceiptEscPos(receiptDocFromOrder(data, { lang }), paperWidthMm, { cut: !!device?.autoCut });
      if (connection === "rawbt") printViaRawBt(bytes);
      else await printViaBluetooth(bytes, { savedDeviceId: device?.bluetoothDeviceId });
      setBtMsg(P.sent);
    } catch (e) {
      setBtMsg(P.failed.replace("{error}", e instanceof Error ? e.message : String(e)));
    } finally {
      setBtBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black flex items-start justify-center py-8 print:py-0">
      <div className="font-mono text-xs space-y-2 p-4" style={{ width: containerPx }}>
        {printerName && (
          <div className="text-center text-[10px] text-neutral-400 print:hidden">{P.printerThisPc.replace("{name}", printerName).replace("{paper}", String(paperWidthMm))}</div>
        )}
        <div className="text-center space-y-1">
          <div className="font-bold text-sm">{outlet?.name}</div>
          <div>{outlet?.address}</div>
          <div>{outlet?.phone}</div>
        </div>
        <div className="border-t border-dashed border-black my-2" />
        <div>{L.no}: {order.id.slice(0, 8).toUpperCase()}</div>
        <div>{L.date}: {new Date(order.createdAt).toLocaleString(RECEIPT_LOCALE[lang])}</div>
        <div className="border-t border-dashed border-black my-2" />
        {items.map((item: any) => (
          <div key={item.id} className="flex justify-between">
            <span>{item.qty}x {item.description}</span>
            <span>{rupiah(item.lineTotal)}</span>
          </div>
        ))}
        <div className="border-t border-dashed border-black my-2" />
        <div className="flex justify-between"><span>{L.subtotal}</span><span>{rupiah(order.subtotal)}</span></div>
        {order.discount > 0 && <div className="flex justify-between"><span>{L.discount}</span><span>-{rupiah(order.discount)}</span></div>}
        {order.serviceCharge > 0 && <div className="flex justify-between"><span>{L.serviceCharge}</span><span>{rupiah(order.serviceCharge)}</span></div>}
        {order.tax > 0 && <div className="flex justify-between"><span>{L.tax}</span><span>{rupiah(order.tax)}</span></div>}
        {(order.roundingAdjustment ?? 0) !== 0 && <div className="flex justify-between"><span>{L.rounding}</span><span>{order.roundingAdjustment > 0 ? "" : "-"}{rupiah(Math.abs(order.roundingAdjustment))}</span></div>}
        <div className="flex justify-between font-bold border-t border-dashed border-black mt-1 pt-1"><span>{L.total}</span><span>{rupiah(order.total)}</span></div>
        {successPayment && (
          <>
            <div className="border-t border-dashed border-black my-2" />
            <div className="flex justify-between"><span>{L.paymentMethod}</span><span className="uppercase">{successPayment.method}</span></div>
            <div className="flex justify-between"><span>{L.status}</span><span>{L.paid}</span></div>
          </>
        )}
        <div className="border-t border-dashed border-black my-2" />
        <div className="text-center whitespace-pre-line">{outlet?.receiptFooterText || L.thanks}</div>
        {connection !== "system" && (
          <button onClick={printBluetooth} disabled={btBusy} className="w-full mt-4 bg-black text-white py-2 print:hidden disabled:opacity-50">
            {btBusy ? P.printing : connection === "rawbt" ? P.viaRawBt : P.viaBt}
          </button>
        )}
        {btMsg && <div className="text-center text-[11px] text-neutral-500 print:hidden">{btMsg}</div>}
        <button
          onClick={() => window.print()}
          className={connection === "system" ? "w-full mt-4 bg-black text-white py-2 print:hidden" : "w-full mt-1 border border-black py-2 print:hidden"}
        >
          {connection === "system" ? P.print : P.printSystem}
        </button>
      </div>
    </div>
  );
}
