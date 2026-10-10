"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { Copy, Check, MessageCircle, QrCode, X, Printer } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useApi } from "@/lib/api/use-api";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-setup";

interface BookingLinkInfo {
  slug: string;
  name: string;
  acceptOnlineBooking: boolean;
}

/**
 * "Bagikan link booking" langsung dari halaman Booking. Sebelumnya link /book/[slug] hanya ada di
 * Pengaturan, jadi banyak pemilik tidak tahu cara membagikannya. Tiga cara: salin, kirim lewat
 * WhatsApp (teks siap kirim), dan poster QR siap cetak untuk ditempel di meja kasir/pintu.
 * Ganti alamat link tetap di Pengaturan (link lama berhenti bekerja, jadi sengaja tidak di sini).
 */
export function ShareBookingLink() {
  const { t } = useDashboardLang();
  const { data } = useApi<BookingLinkInfo>("/api/outlets/booking-link");
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [posterOpen, setPosterOpen] = useState(false);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (data?.slug) setUrl(`${window.location.origin}/book/${data.slug}`);
  }, [data?.slug]);

  useEffect(() => {
    if (!posterOpen || !url) return;
    QRCode.toDataURL(url, { margin: 1, width: 640, errorCorrectionLevel: "M" })
      .then(setQr)
      .catch(() => setQr(null));
  }, [posterOpen, url]);

  if (!data || !url) return null;

  const message = t("setup.bookingShare.waMessage", "Pesan tempat main di {outlet} secara online: {url}")
    .replace("{outlet}", data.name)
    .replace("{url}", url);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard diblokir — pengguna masih bisa menyalin dari kolom teks */
    }
  };

  const btn = "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition";

  return (
    <Card className="space-y-3 border border-sky-500/20">
      <div>
        <h2 className="font-medium">{t("setup.bookingShare.title", "Bagikan link booking online")}</h2>
        <p className="text-xs text-neutral-500">
          {t("setup.bookingShare.subtitle", "Pelanggan memesan sendiri dari HP; booking-nya langsung masuk ke daftar di bawah.")}
        </p>
      </div>

      {!data.acceptOnlineBooking && (
        <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          {t("setup.bookingShare.disabled", "Booking online sedang dimatikan — pelanggan hanya bisa melihat ketersediaan unit.")}{" "}
          <Link href="/dashboard/settings" className="underline">{t("setup.bookingShare.enableLink", "Aktifkan di Pengaturan")}</Link>
        </div>
      )}

      <input
        readOnly
        value={url}
        onFocus={(e) => e.target.select()}
        className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copy} className={`${btn} border-white/10 bg-white/5 text-neutral-100 hover:bg-white/10`}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? t("setup.bookingShare.copied", "Tersalin!") : t("setup.bookingShare.copy", "Salin link")}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${btn} border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20`}
        >
          <MessageCircle size={14} /> {t("setup.bookingShare.whatsapp", "Kirim lewat WhatsApp")}
        </a>
        <button type="button" onClick={() => setPosterOpen(true)} className={`${btn} border-cyan-400/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20`}>
          <QrCode size={14} /> {t("setup.bookingShare.poster", "Poster QR")}
        </button>
      </div>
      <p className="text-[11px] text-neutral-600">
        {t("setup.bookingShare.changeHint", "Alamat link bisa diganti di Pengaturan › Business & Tax.")}
      </p>

      {posterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 print:static print:bg-white print:p-0" onClick={() => setPosterOpen(false)}>
          <style>{`@media print { body * { visibility: hidden !important; } #nexbill-booking-poster, #nexbill-booking-poster * { visibility: visible !important; } #nexbill-booking-poster { position: fixed; inset: 0; margin: auto; } }`}</style>
          <div className="w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
            <div id="nexbill-booking-poster" className="rounded-2xl bg-white p-6 text-center text-black">
              <div className="text-xs font-semibold uppercase tracking-widest text-neutral-500">{data.name}</div>
              <div className="mt-1 text-2xl font-extrabold">{t("setup.bookingShare.posterTitle", "Booking Online")}</div>
              <div className="text-sm text-neutral-600">{t("setup.bookingShare.posterSubtitle", "Scan untuk pesan tempat main")}</div>
              {qr ? <img src={qr} alt={url} className="mx-auto my-4 h-56 w-56" /> : <div className="mx-auto my-4 h-56 w-56 rounded bg-neutral-100" />}
              <div className="break-all text-xs text-neutral-600">{url}</div>
            </div>
            <div className="flex justify-center gap-2 print:hidden">
              <Button variant="secondary" onClick={() => setPosterOpen(false)}>
                <span className="inline-flex items-center gap-1.5"><X size={14} /> {t("setup.common.close", "Tutup")}</span>
              </Button>
              {qr && (
                <a
                  href={qr}
                  download={`booking-${data.slug}.png`}
                  className="rounded-lg px-3 py-2 text-sm font-medium bg-white/5 border border-white/10 text-neutral-100 hover:bg-white/10"
                >
                  {t("setup.bookingShare.downloadQr", "Unduh QR")}
                </a>
              )}
              <Button onClick={() => window.print()} disabled={!qr}>
                <span className="inline-flex items-center gap-1.5"><Printer size={14} /> {t("setup.bookingShare.print", "Cetak")}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
