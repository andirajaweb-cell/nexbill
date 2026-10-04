"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, SwitchCamera, X } from "lucide-react";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-scanner";

/**
 * Scanner kamera untuk barcode produk (Kasir) dan QR/barcode kartu member (Rental PS).
 *  - Pakai BarcodeDetector bawaan Chrome (cepat, ada di Android & aplikasi NEXBILL Android).
 *  - Fallback ke ZXing (dimuat hanya saat dibutuhkan) untuk browser tanpa BarcodeDetector,
 *    mis. Chrome di Windows atau Firefox.
 * Gambar kamera TIDAK pernah dikirim/disimpan — hanya teks kode hasil scan yang diteruskan.
 * Butuh Permissions-Policy camera=(self) (next.config.ts) dan HTTPS.
 *
 * mode "continuous": tetap terbuka dan memanggil onCode untuk setiap kode baru (kode sama
 * diabaikan 1,5 detik supaya satu barcode tidak terbaca berkali-kali). mode "single": tutup
 * otomatis setelah kode pertama. onCode boleh mengembalikan pesan untuk ditampilkan.
 */

type DetectorLike = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };

const FORMATS = ["qr_code", "ean_13", "ean_8", "code_128", "code_39", "code_93", "upc_a", "upc_e", "itf", "codabar", "data_matrix"];
const SAME_CODE_COOLDOWN_MS = 1500;

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 1500;
    gain.gain.value = 0.08;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
    osc.onended = () => ctx.close();
  } catch {
    // tanpa suara pun tidak apa-apa
  }
  if (navigator.vibrate) navigator.vibrate(60);
}

export function CameraScanner({
  open,
  onClose,
  onCode,
  mode = "continuous",
  hint,
}: {
  open: boolean;
  onClose: () => void;
  onCode: (code: string) => Promise<string | void> | string | void;
  mode?: "continuous" | "single";
  hint?: string;
}) {
  const { t } = useDashboardLang();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const lastRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const busyRef = useRef(false);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [status, setStatus] = useState<"starting" | "running" | "denied" | "nocamera">("starting");
  const [message, setMessage] = useState<string | null>(null);
  // Callback induk disimpan di ref supaya re-render induk (mis. keranjang bertambah) tidak
  // memicu kamera dibuka ulang.
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const stopAll = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  }, []);

  const handleCode = useCallback(
    async (raw: string) => {
      const code = raw.trim();
      if (!code || busyRef.current) return;
      const now = Date.now();
      if (code === lastRef.current.code && now - lastRef.current.at < SAME_CODE_COOLDOWN_MS) return;
      lastRef.current = { code, at: now };
      busyRef.current = true;
      beep();
      try {
        const msg = await onCodeRef.current(code);
        setMessage(typeof msg === "string" ? msg : null);
        if (modeRef.current === "single") {
          stopAll();
          onCloseRef.current();
        }
      } finally {
        busyRef.current = false;
      }
    },
    [stopAll]
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setStatus("starting");
    setMessage(null);

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("nocamera");
        return;
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      } catch (e) {
        const name = (e as { name?: string })?.name;
        setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "nocamera");
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((tr) => tr.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play().catch(() => {});
      setStatus("running");

      const Native = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => DetectorLike }).BarcodeDetector;
      if (Native) {
        let detector: DetectorLike;
        try {
          detector = new Native({ formats: FORMATS });
        } catch {
          detector = new Native({ formats: ["qr_code", "ean_13", "code_128"] });
        }
        let raf = 0;
        let lastTick = 0;
        const loop = async (ts: number) => {
          if (cancelled) return;
          if (ts - lastTick > 180 && video.readyState >= 2) {
            lastTick = ts;
            try {
              const found = await detector.detect(video);
              if (found[0]?.rawValue) await handleCode(found[0].rawValue);
            } catch {
              // frame belum siap — lanjut
            }
          }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        stopRef.current = () => cancelAnimationFrame(raf);
      } else {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (cancelled) return;
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromVideoElement(video, (result) => {
          if (result) void handleCode(result.getText());
        });
        stopRef.current = () => controls.stop();
      }
    })();

    return () => {
      cancelled = true;
      stopAll();
    };
  }, [open, facing, handleCode, stopAll]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-black/90 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between text-white mb-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Camera size={16} /> {t("scanner.title", "Scan dengan Kamera")}
        </div>
        <button type="button" onClick={() => { stopAll(); onClose(); }} className="rounded-lg p-2 hover:bg-white/10" aria-label={t("scanner.close", "Selesai")}>
          <X size={18} />
        </button>
      </div>

      <div className="relative flex-1 min-h-0 rounded-xl overflow-hidden bg-neutral-900 flex items-center justify-center">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        {status === "running" && (
          <div className="pointer-events-none absolute inset-x-[12%] top-1/2 -translate-y-1/2 h-[38%] rounded-2xl border-2 border-cyan-300/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
            <div className="absolute inset-x-3 top-1/2 h-0.5 bg-rose-500/80 animate-pulse" />
          </div>
        )}
        {status !== "running" && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-neutral-300">
            {status === "starting" && t("scanner.starting", "Membuka kamera...")}
            {status === "denied" && t("scanner.denied", "Izin kamera ditolak.")}
            {status === "nocamera" && t("scanner.noCamera", "Kamera tidak tersedia di perangkat ini.")}
          </div>
        )}
      </div>

      <div className="mt-3 space-y-2">
        <p className="text-center text-xs text-neutral-400">{hint}</p>
        {message && <p className="text-center text-sm font-medium text-emerald-300">{message}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-white/15 py-2.5 text-sm text-white"
          >
            <SwitchCamera size={15} /> {t("scanner.switch", "Ganti kamera")}
          </button>
          <button type="button" onClick={() => { stopAll(); onClose(); }} className="flex-1 rounded-lg bg-cyan-600 py-2.5 text-sm font-semibold text-white">
            {t("scanner.close", "Selesai")}
          </button>
        </div>
      </div>
    </div>
  );
}
