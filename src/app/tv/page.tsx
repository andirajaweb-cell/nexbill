"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { computeUnitView, formatDuration, type TvUnitView } from "@/lib/tv/view";
import { normalizePairingCode } from "@/lib/tv/pairing";
import { tvTopicBrowser, TV_PUSH_EVENT } from "@/lib/tv/push-topic";
import { consoleLabel } from "@/lib/tv/console-line";

/**
 * NEXBILL TV — layar kiosk untuk TV Android di bilik rental.
 *
 * Halaman ini HANYA mengimpor dua modul lib/tv yang MURNI (view.ts dan pairing.ts). lib/tv/service.ts
 * sengaja tidak disentuh dari sini: ia menarik `db` dan bcryptjs, dan semua itu akan ikut ke bundle
 * browser. Preseden mahalnya sudah pernah terjadi di repo ini — halaman Rekomendasi Produk nyaris
 * mengirim SDK Anthropic ke browser karena mengimpor modul server. tsc tidak akan menangkapnya.
 *
 * TIGA HAL YANG MEMBENTUK SELURUH DESAIN DI BAWAH:
 *
 *   1. Alat masukannya REMOTE TV, bukan tetikus atau sentuhan. Tidak ada satu pun elemen di sini
 *      yang menuntut penunjuk: semuanya dijalankan dengan tombol angka, tombol arah, dan OK.
 *
 *   2. Layarnya menyala BERJAM-JAM menampilkan hal yang nyaris sama. Panel LCD/OLED bisa
 *      meninggalkan bayangan permanen dari elemen statis, jadi seluruh isi digeser perlahan
 *      (lihat driftStyle) — bukan gimmick, melainkan yang membedakan fitur ini dari fitur yang
 *      merusak TV merchant.
 *
 *   3. Jaringan outlet sering putus-nyambung. Layar TIDAK BOLEH menjadi hitam atau menampilkan
 *      pesan galat saat polling gagal; ia menahan tampilan terakhir dan terus mencoba, karena TV
 *      yang menampilkan layar galat di ruang tamu pelanggan lebih buruk daripada TV yang
 *      menampilkan harga sewa yang telat beberapa detik.
 */

const TOKEN_STORAGE_KEY = "nexbill_tv_token";
const POLL_MS = 5000;

interface TvState {
  enabled: boolean;
  disabledReason: string | null;
  outletName: string;
  /** Alamat outlet — server lama tidak mengirim. */
  outletAddress?: string | null;
  logoUrl: string | null;
  screenName: string;
  unitName: string | null;
  consoleType: string | null;
  hourlyRate: number | null;
  view: TvUnitView;
  display: {
    idleMinutes: number;
    headline: string | null;
    tagline: string | null;
    /** Baris konsol dari unit aktif outlet (server baru) — dipakai bila tagline kosong. */
    consoleLine?: string | null;
    priceText: string | null;
    footerText: string | null;
    showClock: boolean;
    showUnitStatus: boolean;
    showBookingQr: boolean;
    showWifi: boolean;
    wifiSsid: string | null;
    accentColor: string;
    requiresPin: boolean;
    nightDimOpacity: number;
    /** Ambang peringatan sisa waktu (menit), null = fitur peringatan mati. Bisa absen di server lama. */
    timeWarningMinutes?: number | null;
  };
  bookingUrl: string | null;
  /** Waktu habis & tagihan belum dibayar (server lama tidak mengirim → dianggap false). */
  timeUp?: boolean;
  hasUnitQr?: boolean;
  serverTime: string;
}

export default function TvPage() {
  const [token, setToken] = useState<string | null>(null);
  const [booted, setBooted] = useState(false);
  /** Baru saja dipasangkan → tampilkan konfirmasi "Terhubung ke <outlet>" sebentar. */
  const [justPaired, setJustPaired] = useState(false);

  // localStorage hanya ada di browser — dibaca setelah mount, bukan saat render, supaya hasil
  // render di server dan di klien tidak berbeda (hydration mismatch).
  useEffect(() => {
    try {
      setToken(localStorage.getItem(TOKEN_STORAGE_KEY));
    } catch {
      // Mode penyamaran / penyimpanan diblokir: biarkan token null, layar akan meminta pairing.
    }
    setBooted(true);
  }, []);

  const handlePaired = useCallback((newToken: string) => {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    } catch {
      // Tetap lanjut dengan token di memori — layar jalan sampai TV dimatikan, lalu minta kode lagi.
    }
    setToken(newToken);
    setJustPaired(true);
  }, []);

  const handleUnpair = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      /* diabaikan — state di bawah yang menentukan tampilan */
    }
    setToken(null);
  }, []);

  // Aplikasi Android TV "NEXBILL TV" (folder android-tv/) memuat halaman ini di WebView dan perlu
  // tahu token layar supaya bisa mengambil status unit sendiri: memindahkan TV ke input HDMI saat
  // sesi berjalan dan menutupnya lagi saat waktu habis. Di browser biasa jembatan ini tidak ada.
  useEffect(() => {
    if (!booted) return;
    const bridge = (window as unknown as { NexbillTvApp?: { setToken?: (t: string) => void } }).NexbillTvApp;
    try {
      bridge?.setToken?.(token ?? "");
    } catch {
      /* jembatan aplikasi gagal — halaman tetap jalan seperti di browser biasa */
    }
  }, [booted, token]);

  if (!booted) return <div className="min-h-screen bg-black" />;
  if (!token) return <PairingScreen onPaired={handlePaired} />;
  return <ScreenDisplay token={token} onUnpair={handleUnpair} justPaired={justPaired} />;
}

/** ---------------- PAIRING ---------------- */

/** Sidik TV dari jembatan aplikasi NEXBILL TV (kosong di browser biasa / aplikasi versi lama). */
function appDeviceId(): string | undefined {
  try {
    const bridge = (window as unknown as { NexbillTvApp?: { deviceId?: () => string } }).NexbillTvApp;
    const id = bridge?.deviceId?.();
    return id ? id : undefined;
  } catch {
    return undefined;
  }
}

function PairingScreen({ onPaired }: { onPaired: (token: string) => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = useCallback(
    async (value: string) => {
      const clean = normalizePairingCode(value);
      if (!clean) {
        setError("Kode harus 6 digit angka.");
        return;
      }
      setBusy(true);
      setError("");
      try {
        const res = await fetch("/api/tv/pair", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Aplikasi NEXBILL TV 1.2.2+ menyertakan sidik TV: server menolak pairing ke outlet lain selama TV ini masih terdaftar.
          body: JSON.stringify({ code: clean, deviceId: appDeviceId() }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Gagal memasangkan layar.");
          setCode("");
          return;
        }
        onPaired(data.token);
      } catch {
        setError("Tidak bisa menghubungi server. Periksa koneksi internet TV ini.");
      } finally {
        setBusy(false);
      }
    },
    [onPaired]
  );

  // Nilai kode terbaru disimpan juga di ref, dan penangan Enter membaca dari ref ini — BUKAN dari
  // dalam updater setState. Menyelipkan submit() ke dalam updater akan mengirimkannya dua kali di
  // React StrictMode, yang memang sengaja memanggil updater dua kali untuk menjaring efek samping
  // seperti ini. Pengiriman ganda berarti percobaan kedua menemukan kode yang sudah hangus dan
  // melaporkan "kode sudah dipakai layar lain" pada pemasangan yang sebenarnya berhasil.
  const codeRef = useRef("");
  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  // Tombol angka di remote TV muncul sebagai penekanan tombol biasa di browser, jadi seluruh
  // pemasukan kode bisa dilakukan tanpa pernah memunculkan papan ketik di layar — yang di TV
  // justru menutupi setengah tampilan dan harus dinavigasi tombol arah satu huruf demi satu.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (busy) return;
      if (/^\d$/.test(e.key)) {
        setError("");
        setCode((prev) => (prev.length >= 6 ? prev : prev + e.key));
      } else if (e.key === "Backspace") {
        setError("");
        setCode((prev) => prev.slice(0, -1));
      } else if (e.key === "Enter") {
        void submit(codeRef.current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, submit]);

  // Kirim otomatis begitu digit keenam masuk — di TV, menemukan dan menekan tombol "Lanjut"
  // butuh beberapa penekanan tombol arah lagi, dan kode 6 digit memang sudah lengkap pada digit
  // keenam. Tidak ada yang perlu dikonfirmasi.
  useEffect(() => {
    if (code.length === 6 && !busy) void submit(code);
  }, [code, busy, submit]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#04060c] text-white">
      <Backdrop accent="#22d3ee" />
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center gap-10 p-10 nb-fade-in">
        <Wordmark />
        <div className="text-center space-y-3">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight">Hubungkan TV ini</h1>
          <p className="text-neutral-300/80 text-xl md:text-2xl max-w-3xl leading-relaxed">
            Ketik 6 digit kode pairing dengan tombol angka di remote. TV ini akan terhubung ke <span className="text-white font-semibold">satu outlet</span> dan satu unit saja.
          </p>
        </div>

        <div className={`flex gap-4 p-6 rounded-3xl ${GLASS}`}>
          {Array.from({ length: 6 }, (_, i) => {
            const active = code.length === i && !busy;
            const filled = !!code[i];
            return (
              <div
                key={i}
                className={`w-16 h-24 md:w-24 md:h-32 rounded-2xl flex items-center justify-center text-5xl md:text-6xl font-bold tabular-nums transition-all duration-300 ${
                  active ? "border-2 border-cyan-300 bg-cyan-300/10 shadow-[0_0_40px_rgba(34,211,238,0.45)] scale-105" : filled ? "border border-white/25 bg-white/[0.07]" : "border border-white/10 bg-black/30"
                }`}
              >
                {code[i] ?? ""}
              </div>
            );
          })}
        </div>

        <div className="h-8 text-center">
          {busy && <div className="text-cyan-300 text-2xl animate-pulse">Menghubungkan ke outlet…</div>}
          {error && !busy && <div className="text-rose-300 text-xl md:text-2xl max-w-3xl">{error}</div>}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "hapus", "0", "ok"].map((key) => (
            <button
              key={key}
              disabled={busy}
              onClick={() => {
                if (key === "hapus") setCode((p) => p.slice(0, -1));
                else if (key === "ok") void submit(code);
                else setCode((p) => (p.length >= 6 ? p : p + key));
              }}
              className="w-24 h-16 md:w-28 md:h-[4.5rem] rounded-2xl bg-white/[0.05] border border-white/10 text-2xl font-semibold transition hover:bg-white/10 focus:outline-none focus:border-cyan-300 focus:bg-cyan-300/15 focus:shadow-[0_0_30px_rgba(34,211,238,0.35)] disabled:opacity-40"
            >
              {key === "hapus" ? "⌫" : key === "ok" ? "OK" : key}
            </button>
          ))}
        </div>

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl w-full text-left">
          {[
            ["1", "Owner / Manager", "Buka Pengaturan › TV Screensaver di dashboard NEXBILL, lalu tambah layar untuk unit ini."],
            ["2", "Kode 6 digit", "Kode muncul di dashboard dan berlaku 30 menit. Ketik di sini dengan remote."],
            ["3", "Selesai", "TV langsung mengikuti sesi dari kasir. Tahan OK 3 detik untuk menu staf."],
          ].map(([n, title, body]) => (
            <li key={n} className={`rounded-2xl p-5 ${GLASS}`}>
              <div className="flex items-center gap-3">
                <span className="h-9 w-9 rounded-full bg-cyan-300/15 text-cyan-200 flex items-center justify-center font-bold">{n}</span>
                <span className="text-lg font-semibold">{title}</span>
              </div>
              <p className="mt-2 text-neutral-400 text-base leading-relaxed">{body}</p>
            </li>
          ))}
        </ol>
      </div>
      <GlobalTvStyles />
    </div>
  );
}

/** ---------------- TAMPILAN LAYAR ---------------- */

type Mode = "screensaver" | "pin" | "panel";

function ScreenDisplay({ token, onUnpair, justPaired = false }: { token: string; onUnpair: () => void; justPaired?: boolean }) {
  const [state, setState] = useState<TvState | null>(null);
  const [showConnected, setShowConnected] = useState(false);
  const hasState = !!state;
  useEffect(() => {
    if (!justPaired || !hasState) return;
    setShowConnected(true);
    const id = setTimeout(() => setShowConnected(false), 9000);
    return () => clearTimeout(id);
  }, [justPaired, hasState]);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [unitQrDataUrl, setUnitQrDataUrl] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [mode, setMode] = useState<Mode>("screensaver");
  const [now, setNow] = useState(() => Date.now());
  /** Naik setiap ada "colekan" dari server (Supabase Realtime) → status diambil SEKARANG. */
  const [pokeTick, setPokeTick] = useState(0);
  /** Waktu status server terakhir diterima — dipakai penanda "terhubung" & mitigasi offline. */
  const [lastOkAt, setLastOkAt] = useState<number | null>(null);
  const lastActivityRef = useRef(Date.now());

  /**
   * Polling status. Kegagalan hanya menyalakan penanda `offline` dan MEMPERTAHANKAN state
   * terakhir — tidak menghapusnya. Kalau state dikosongkan setiap kali jaringan tersendat, layar
   * di bilik akan berkedip ke hitam setiap beberapa menit di outlet ber-WiFi biasa.
   */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/tv/state", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        if (res.status === 401) {
          if (!cancelled) onUnpair(); // layar dicabut dari dashboard — kembali ke layar pairing
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setOffline(true);
          return;
        }
        setState(data);
        setOffline(false);
        setLastOkAt(Date.now());
      } catch {
        if (!cancelled) setOffline(true);
      }
    };
    void load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token, onUnpair, pokeTick]);

  /**
   * Kontrol instan (lib/tv/push.ts): dashboard "mencolek" kanal layar ini lewat Supabase Realtime
   * setiap sesi/unit berubah. Colekan → ambil status sekarang + beri tahu aplikasi Android supaya
   * HDMI dibuka/dikunci tanpa menunggu polling 5 detik. Gagal tersambung = tetap polling 5 detik.
   */
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;
    let stop: (() => void) | null = null;
    let cancelled = false;
    void (async () => {
      const topic = await tvTopicBrowser(token);
      if (!topic || cancelled) return;
      const { createClient } = await import("@supabase/supabase-js");
      if (cancelled) return;
      const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const channel = client
        .channel(topic)
        .on("broadcast", { event: TV_PUSH_EVENT }, () => {
          setPokeTick((n) => n + 1);
          try {
            (window as unknown as { NexbillTvApp?: { poke?: () => void } }).NexbillTvApp?.poke?.();
          } catch {
            /* aplikasi versi lama tanpa poke — PollService tetap 5 detik */
          }
        })
        .subscribe();
      stop = () => {
        void client.removeChannel(channel);
      };
    })();
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [token]);

  /** QR diambil SEKALI (dan hanya saat memang ditampilkan) — isinya tidak berubah selama slug outlet tetap. */
  useEffect(() => {
    if (!state?.display.showBookingQr || qrDataUrl) return;
    let cancelled = false;
    fetch("/api/tv/qr", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.qrDataUrl) setQrDataUrl(d.qrDataUrl);
      })
      .catch(() => {
        /* QR gagal dimuat bukan alasan merusak seluruh layar — bagiannya saja yang tidak tampil */
      });
    return () => {
      cancelled = true;
    };
  }, [state?.display.showBookingQr, qrDataUrl, token]);

  /**
   * QR Pelanggan unit ini — hanya diambil saat layar peringatan / Waktu Habis memang perlu
   * menampilkannya, lalu disimpan (isinya tetap selama QR unit tidak diganti dari dashboard).
   */
  const needUnitQr = !!state && (!!state.timeUp || (state.display.timeWarningMinutes ?? null) !== null);
  useEffect(() => {
    if (!needUnitQr || unitQrDataUrl) return;
    let cancelled = false;
    fetch("/api/tv/qr?kind=unit", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.qrDataUrl) setUnitQrDataUrl(d.qrDataUrl);
      })
      .catch(() => {
        /* tanpa QR, layar peringatan tetap tampil */
      });
    return () => {
      cancelled = true;
    };
  }, [needUnitQr, unitQrDataUrl, token]);

  /**
   * Detak satu detik untuk jam dan hitung mundur.
   *
   * Hitung mundur dihitung ULANG DI KLIEN dari data polling terakhir, bukan menunggu polling
   * berikutnya. Tanpa ini angka sisa waktu akan melompat 5 detik sekali — terlihat patah, dan
   * pelanggan yang memperhatikan akan mengira waktunya dipotong.
   */
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  /** Aktivitas apa pun dari remote membangunkan layar. */
  useEffect(() => {
    const wake = () => {
      lastActivityRef.current = Date.now();
      setMode((prev) => {
        if (prev !== "screensaver") return prev;
        return state?.display.requiresPin ? "pin" : "panel";
      });
    };
    window.addEventListener("keydown", wake);
    window.addEventListener("click", wake);
    return () => {
      window.removeEventListener("keydown", wake);
      window.removeEventListener("click", wake);
    };
  }, [state?.display.requiresPin]);

  /** Kembali ke screensaver setelah idleMinutes tanpa aktivitas. */
  useEffect(() => {
    if (mode === "screensaver") return;
    const idleMs = (state?.display.idleMinutes ?? 3) * 60_000;
    const id = setInterval(() => {
      if (Date.now() - lastActivityRef.current >= idleMs) setMode("screensaver");
    }, 5000);
    return () => clearInterval(id);
  }, [mode, state?.display.idleMinutes]);

  /**
   * Pergeseran perlahan anti burn-in: seluruh isi layar berkeliling pelan dalam siklus 11 menit.
   * Angka 11 dipilih supaya tidak selaras dengan periode polling (5 detik) maupun detak jam (1
   * detik) — kalau selaras, elemen akan berhenti di posisi yang sama berulang kali dan justru
   * mengalahkan tujuannya. Amplitudonya kecil (±14px) supaya tidak terlihat sebagai gerakan.
   */
  const driftStyle = useMemo(() => {
    const phase = (now / 660_000) * 2 * Math.PI;
    return { transform: `translate(${Math.sin(phase) * 14}px, ${Math.cos(phase * 0.7) * 14}px)`, transition: "transform 2s linear" };
  }, [now]);

  if (!state) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#04060c] text-white">
        <Backdrop accent="#22d3ee" />
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center gap-6">
          <Wordmark />
          <div className="h-1 w-56 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full w-1/3 rounded-full bg-cyan-300 nb-loading" />
          </div>
          <div className="text-neutral-400 text-2xl">{offline ? "Menyambungkan ulang…" : "Memuat…"}</div>
        </div>
        <GlobalTvStyles />
      </div>
    );
  }

  if (!state.enabled) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#04060c] text-white">
        <Backdrop accent="#64748b" />
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center gap-5 text-center p-10">
          <OutletIdentity state={state} offline={offline} centered />
          <div className={`mt-6 rounded-3xl p-8 max-w-3xl ${GLASS}`}>
            <div className="text-neutral-200 text-3xl font-semibold">Screensaver tidak aktif</div>
            <p className="text-neutral-400 text-xl mt-3">{state.disabledReason}</p>
            <p className="text-neutral-500 text-lg mt-3">
              Layar <span className="text-neutral-200">{state.screenName}</span> tetap terhubung dan menyala sendiri begitu masalah di atas dibereskan di dashboard.
            </p>
          </div>
        </div>
        <GlobalTvStyles />
      </div>
    );
  }

  const accent = state.display.accentColor;

  // Sisa waktu dihitung ulang dari jam lokal TV sejak polling terakhir. Sengaja memakai data
  // sesi yang sama, bukan menebak-nebak: kalau sesi berakhir di antara dua polling, angkanya
  // berhenti di 0 (computeUnitView tidak pernah mengembalikan nilai negatif) dan bukan berjalan
  // mundur ke angka minus di hadapan pelanggan.
  const liveView = state.view.elapsedSeconds === null
    ? state.view
    : computeUnitView(
        null,
        {
          status: state.view.status === "paused" ? "paused" : "running",
          // startedAt direkonstruksi dari elapsed yang dilaporkan server pada serverTime, supaya
          // selisih jam antara TV dan server tidak ikut terbawa ke angka di layar.
          startedAt: new Date(new Date(state.serverTime).getTime() - state.view.elapsedSeconds * 1000).toISOString(),
          accumulatedPauseMs: 0,
          pausedAt: null,
          plannedMinutes: state.view.remainingSeconds === null ? 0 : Math.round((state.view.elapsedSeconds + state.view.remainingSeconds) / 60),
          extendedMinutes: 0,
        },
        // Sesi yang dijeda dibekukan pada nilai terakhir dari server — TV tidak tahu kapan jeda
        // dimulai, jadi melanjutkan hitungan sendiri hanya akan salah.
        state.view.status === "paused" ? new Date(state.serverTime).getTime() : now
      );

  // Layar peringatan sisa waktu / Waktu Habis menggantikan screensaver biasa (bukan panel staf).
  const warnMinutes = state.display.timeWarningMinutes ?? null;
  const warningActive =
    warnMinutes !== null &&
    liveView.status === "occupied" &&
    liveView.remainingSeconds !== null &&
    liveView.remainingSeconds > 0 &&
    liveView.remainingSeconds <= warnMinutes * 60;
  const alertKind: "warning" | "timeUp" | null = state.timeUp ? "timeUp" : warningActive ? "warning" : null;

  return (
    <div className="relative min-h-screen bg-[#04060c] text-white overflow-hidden">
      <Backdrop accent={alertKind === "timeUp" ? "#f43f5e" : alertKind === "warning" ? "#f59e0b" : accent} />
      <div className="relative z-10">
        {mode === "screensaver" && alertKind && (
          <AlertScreen kind={alertKind} state={state} liveView={liveView} unitQrDataUrl={unitQrDataUrl} driftStyle={driftStyle} />
        )}
        {mode === "screensaver" && !alertKind && <Screensaver state={state} liveView={liveView} qrDataUrl={qrDataUrl} now={now} driftStyle={driftStyle} offline={offline} lastOkAt={lastOkAt} />}
        {mode === "pin" && <PinPrompt token={token} accent={accent} state={state} onOk={() => setMode("panel")} onCancel={() => setMode("screensaver")} />}
        {mode === "panel" && <UnitPanel state={state} liveView={liveView} offline={offline} onBack={() => setMode("screensaver")} />}
      </div>

      {/* Baru dipasangkan: konfirmasi besar outlet & alamat, supaya staf yakin TV terhubung ke outlet yang benar. */}
      {showConnected && (
        <div className="fixed inset-x-0 top-10 z-30 flex justify-center pointer-events-none nb-fade-in">
          <div className="rounded-3xl px-10 py-6 bg-emerald-500/15 border border-emerald-300/40 shadow-[0_0_60px_rgba(16,185,129,0.35)] text-center">
            <div className="text-emerald-200 text-xl tracking-[0.2em] font-semibold">✓ TERHUBUNG</div>
            <div className="text-3xl md:text-4xl font-bold mt-1">{state.outletName}</div>
            {state.outletAddress && <div className="text-lg md:text-xl text-neutral-300 mt-1">{state.outletAddress}</div>}
            {state.unitName && <div className="text-base text-neutral-400 mt-2">Unit: {state.unitName}</div>}
          </div>
        </div>
      )}

      {/* Overlay mode malam — di atas segalanya, tidak menerima klik supaya tidak menghalangi remote. */}
      {state.display.nightDimOpacity > 0 && (
        <div className="fixed inset-0 z-40 bg-black pointer-events-none" style={{ opacity: state.display.nightDimOpacity }} aria-hidden />
      )}
      <GlobalTvStyles />
    </div>
  );
}

/** ---------------- BAHAN TAMPILAN BERSAMA ---------------- */

/** Host halaman ini (dashboard.nexbill.id) — supaya alamat di bawah QR bisa dicek dengan mata. */
function bookingHost(): string {
  return typeof window === "undefined" ? "" : window.location.host;
}

/** Kaca gelap: dipakai semua kartu. Sengaja TANPA backdrop-blur — WebView TV murah tersendat karenanya. */
const GLASS = "bg-white/[0.045] border border-white/10 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]";

/** "#22d3ee" → "rgba(34,211,238,a)"; warna tak dikenal jatuh ke cyan. */
function hexA(hex: string, a: number): string {
  const h = (hex || "").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = /^[0-9a-fA-F]{6}$/.test(full) ? parseInt(full, 16) : 0x22d3ee;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/**
 * Latar hidup: dua cahaya lembut warna aksen yang bergerak sangat pelan + vinyet. Hanya transform &
 * opacity yang dianimasikan (murah bagi GPU TV), dan geraknya juga ikut mencegah burn-in.
 */
function Backdrop({ accent }: { accent: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute -top-1/3 -left-1/4 h-[90vh] w-[90vh] rounded-full nb-orb-a" style={{ background: `radial-gradient(circle, ${hexA(accent, 0.42)} 0%, transparent 65%)` }} />
      <div className="absolute -bottom-1/3 -right-1/4 h-[100vh] w-[100vh] rounded-full nb-orb-b" style={{ background: `radial-gradient(circle, ${hexA("#8b5cf6", 0.3)} 0%, transparent 65%)` }} />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "80px 80px", maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)", WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)" }}
      />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.75) 100%)" }} />
    </div>
  );
}

function Wordmark({ small }: { small?: boolean }) {
  return (
    <div className={`flex items-center gap-2 font-black tracking-[0.35em] ${small ? "text-sm" : "text-lg"}`}>
      <span className="bg-gradient-to-r from-cyan-200 via-white to-violet-200 bg-clip-text text-transparent">NEXBILL</span>
      <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[0.7em] tracking-[0.2em] text-cyan-200">TV</span>
    </div>
  );
}

/** Nama & alamat outlet + status sambungan — selalu tampil supaya jelas TV ini milik outlet mana. */
function OutletIdentity({ state, offline, centered, lastOkAt }: { state: TvState; offline: boolean; centered?: boolean; lastOkAt?: number | null }) {
  const agoMin = lastOkAt ? Math.max(0, Math.round((Date.now() - lastOkAt) / 60_000)) : null;
  const initial = state.outletName.trim().charAt(0).toUpperCase() || "N";
  return (
    <div className={`flex items-center gap-5 ${centered ? "flex-col text-center" : ""}`}>
      {state.logoUrl ? (
        <img src={state.logoUrl} alt="" className="h-16 w-16 md:h-20 md:w-20 rounded-2xl object-contain bg-white/5 p-1.5 border border-white/10" />
      ) : (
        <div
          className="h-16 w-16 md:h-20 md:w-20 rounded-2xl flex items-center justify-center text-3xl md:text-4xl font-black border border-white/15"
          style={{ background: `linear-gradient(135deg, ${hexA(state.display.accentColor, 0.45)}, ${hexA("#8b5cf6", 0.35)})` }}
        >
          {initial}
        </div>
      )}
      <div className="min-w-0">
        <div className="text-2xl md:text-4xl font-bold tracking-tight truncate max-w-[52vw]">{state.outletName}</div>
        {state.outletAddress && (
          <div className="mt-1 text-base md:text-xl text-neutral-400 truncate max-w-[52vw]">
            <span aria-hidden>📍</span> {state.outletAddress}
          </div>
        )}
        <div className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm md:text-base ${offline ? "bg-amber-400/10 text-amber-200" : "bg-emerald-400/10 text-emerald-200"}`}>
          <span className={`h-2 w-2 rounded-full ${offline ? "bg-amber-300" : "bg-emerald-300 nb-dot"}`} />
          {offline
            ? `Offline${agoMin !== null ? ` · terakhir terhubung ${agoMin < 1 ? "baru saja" : `${agoMin} mnt lalu`}` : ""} — waktu sesi tetap dihitung di TV`
            : `Terhubung ke dashboard${state.unitName ? ` · ${state.unitName}` : ""}`}
        </div>
      </div>
    </div>
  );
}

/** Cincin progres SVG (0–1). */
function Ring({ progress, size, stroke, color, children }: { progress: number; size: number; stroke: number; color: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          style={{ transition: "stroke-dashoffset 1s linear", filter: `drop-shadow(0 0 12px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/** Animasi dipasang sekali sebagai <style> biasa — tanpa mengubah globals.css bersama. */
function GlobalTvStyles() {
  return (
    <style>{`
      @keyframes nbOrbA { 0% { transform: translate(0,0) scale(1); } 50% { transform: translate(18vw, 12vh) scale(1.15); } 100% { transform: translate(0,0) scale(1); } }
      @keyframes nbOrbB { 0% { transform: translate(0,0) scale(1.1); } 50% { transform: translate(-16vw, -10vh) scale(0.95); } 100% { transform: translate(0,0) scale(1.1); } }
      @keyframes nbFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
      @keyframes nbDot { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
      @keyframes nbLoading { 0% { transform: translateX(-120%); } 100% { transform: translateX(320%); } }
      .nb-orb-a { animation: nbOrbA 38s ease-in-out infinite; will-change: transform; }
      .nb-orb-b { animation: nbOrbB 46s ease-in-out infinite; will-change: transform; }
      .nb-fade-in { animation: nbFadeIn .8s ease-out both; }
      .nb-dot { animation: nbDot 2s ease-in-out infinite; }
      .nb-loading { animation: nbLoading 1.4s ease-in-out infinite; }
    `}</style>
  );
}

/** ---------------- PERINGATAN SISA WAKTU & WAKTU HABIS ---------------- */

/**
 * Tampil penuh, huruf besar, kontras tinggi — dibaca dari sofa beberapa meter. Tanpa nominal
 * tagihan (layar ini menghadap ruang publik); rinciannya ada di HP pelanggan lewat QR unit.
 */
function AlertScreen({
  kind,
  state,
  liveView,
  unitQrDataUrl,
  driftStyle,
}: {
  kind: "warning" | "timeUp";
  state: TvState;
  liveView: TvUnitView;
  unitQrDataUrl: string | null;
  driftStyle: React.CSSProperties;
}) {
  const timeUp = kind === "timeUp";
  const color = timeUp ? "#fb7185" : "#fbbf24";
  const warnTotal = Math.max(1, (state.display.timeWarningMinutes ?? 5) * 60);
  const progress = timeUp ? 0 : (liveView.remainingSeconds ?? 0) / warnTotal;
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-10 text-center nb-fade-in" style={driftStyle}>
      <div className="text-2xl md:text-3xl font-semibold tracking-[0.35em] text-neutral-200">{(state.unitName ?? state.outletName).toUpperCase()}</div>
      <div className="mt-8 flex items-center gap-14">
        <Ring progress={progress} size={340} stroke={18} color={color}>
          {timeUp ? (
            <div className="text-5xl md:text-6xl font-black" style={{ color }}>
              WAKTU
              <br />
              HABIS
            </div>
          ) : (
            <>
              <div className="text-lg tracking-[0.3em] text-amber-200/80">SISA WAKTU</div>
              <div className="text-7xl md:text-8xl font-black tabular-nums leading-none mt-2">{formatDuration(liveView.remainingSeconds)}</div>
            </>
          )}
        </Ring>
        {unitQrDataUrl && (
          <div className={`rounded-3xl p-6 ${GLASS}`}>
            <img src={unitQrDataUrl} alt="QR unit" className="w-52 h-52 md:w-60 md:h-60 rounded-2xl bg-white p-2" />
            <div className="mt-4 text-lg md:text-xl text-neutral-300 max-w-[15rem]">
              {timeUp ? "Scan untuk lihat tagihan & panggil kasir" : "Scan untuk tambah waktu, pesan makanan, atau panggil kasir"}
              <div className="mt-1 text-base text-neutral-500">Tanpa aplikasi — cukup kamera HP</div>
            </div>
          </div>
        )}
      </div>
      <div className="mt-10 text-3xl md:text-4xl text-neutral-100 max-w-4xl font-medium">
        {timeUp ? "Terima kasih sudah bermain! Silakan selesaikan pembayaran di kasir." : "Mau lanjut main? Tambah waktu sekarang sebelum habis."}
      </div>
      {!unitQrDataUrl && <div className="mt-4 text-2xl text-neutral-400">Hubungi kasir untuk {timeUp ? "pembayaran" : "tambah waktu"}.</div>}
      <div className="mt-12 flex flex-col items-center gap-1 text-neutral-500">
        <div className="text-lg md:text-xl tracking-[0.2em]">{state.outletName.toUpperCase()}</div>
        {state.outletAddress && <div className="text-base">{state.outletAddress}</div>}
      </div>
    </div>
  );
}

/** ---------------- SCREENSAVER ---------------- */

function Screensaver({
  state,
  liveView,
  qrDataUrl,
  now,
  driftStyle,
  offline,
  lastOkAt,
}: {
  state: TvState;
  liveView: TvUnitView;
  qrDataUrl: string | null;
  now: number;
  driftStyle: React.CSSProperties;
  offline: boolean;
  lastOkAt?: number | null;
}) {
  const d = state.display;
  const accent = d.accentColor;
  const clock = new Date(now);

  return (
    <div className="min-h-screen flex flex-col px-12 py-10 md:px-16 md:py-12" style={driftStyle}>
      {/* Atas: identitas outlet (nama + alamat + status sambungan) · jam */}
      <div className="flex items-start justify-between gap-8 nb-fade-in">
        <OutletIdentity state={state} offline={offline} lastOkAt={lastOkAt} />
        {d.showClock && (
          <div className="text-right shrink-0">
            <div className="text-6xl md:text-8xl font-extralight tabular-nums tracking-tight leading-none">
              {clock.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}
            </div>
            <div className="text-neutral-400 text-lg md:text-2xl mt-2">
              {clock.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jakarta" })}
            </div>
          </div>
        )}
      </div>

      {/* Tengah: pesan utama + status unit */}
      <div className="flex-1 flex items-center justify-between gap-12 py-10">
        <div className="max-w-[58%] nb-fade-in">
          {d.headline && (
            <h1
              className="text-6xl md:text-8xl font-black tracking-tight leading-[0.95] bg-clip-text text-transparent"
              style={{ backgroundImage: `linear-gradient(120deg, #ffffff 30%, ${accent} 100%)` }}
            >
              {d.headline}
            </h1>
          )}
          {(d.tagline || d.consoleLine) && <div className="text-2xl md:text-4xl text-neutral-300 mt-6 tracking-wide font-light">{d.tagline || d.consoleLine}</div>}
          {d.priceText && (
            <div
              className="inline-flex mt-8 text-2xl md:text-4xl font-bold px-7 py-3 rounded-2xl border"
              style={{ borderColor: hexA(accent, 0.6), color: accent, background: hexA(accent, 0.08), boxShadow: `0 0 40px ${hexA(accent, 0.25)}` }}
            >
              {d.priceText}
            </div>
          )}
          {!d.headline && !d.priceText && <div className="text-5xl md:text-7xl font-black tracking-tight">Siap Main?</div>}
        </div>

        {d.showUnitStatus && state.unitName && (
          <div className="shrink-0">
            <UnitStatusBadge unitName={state.unitName} liveView={liveView} accent={accent} consoleType={state.consoleType} />
          </div>
        )}
      </div>

      {/* Bawah: QR booking · WiFi · teks bebas · merek */}
      <div className="flex items-end justify-between gap-8">
        <div className="flex items-end gap-6">
          {d.showBookingQr && qrDataUrl && (
            <div className={`flex items-center gap-5 rounded-3xl p-4 pr-7 ${GLASS}`}>
              <img src={qrDataUrl} alt="QR booking" className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-white p-2" />
              <div>
                <div className="text-sm tracking-[0.3em] text-neutral-400">BOOKING ONLINE</div>
                <div className="text-2xl md:text-3xl font-bold mt-1">Scan &amp; pesan unit</div>
                <div className="text-neutral-400 text-base mt-1">Tanpa aplikasi — cukup kamera HP</div>
                {state.bookingUrl && <div className="text-cyan-200/80 text-sm md:text-base mt-1 font-mono">{bookingHost()}{state.bookingUrl}</div>}
              </div>
            </div>
          )}
          <div className="space-y-2 pb-1">
            {d.showWifi && d.wifiSsid && (
              <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-lg md:text-xl ${GLASS}`}>
                <span aria-hidden>📶</span> WiFi: <span className="font-semibold">{d.wifiSsid}</span>
              </div>
            )}
            {d.footerText && <div className="text-neutral-300 text-lg md:text-2xl max-w-2xl">{d.footerText}</div>}
          </div>
        </div>
        <div className="text-right shrink-0 space-y-2">
          <Wordmark small />
          <div className="text-neutral-500 text-sm md:text-base">Tekan tombol apa saja di remote</div>
        </div>
      </div>
    </div>
  );
}

function UnitStatusBadge({ unitName, liveView, accent, consoleType }: { unitName: string; liveView: TvUnitView; accent: string; consoleType?: string | null }) {
  const consoleText = consoleLabel(consoleType ?? null);
  if (liveView.status === "maintenance") {
    return (
      <div className={`rounded-[2rem] px-10 py-8 text-center ${GLASS}`} style={{ borderColor: "rgba(251,191,36,0.45)" }}>
        <div className="text-3xl md:text-4xl font-bold">{unitName}</div>
        <div className="mt-3 text-2xl md:text-3xl font-bold tracking-[0.15em] text-amber-300">SEDANG PERBAIKAN</div>
      </div>
    );
  }

  if (liveView.status === "available" || liveView.status === "unknown") {
    return (
      <div className={`rounded-[2rem] px-12 py-9 text-center ${GLASS}`} style={{ borderColor: hexA(accent, 0.5), boxShadow: `0 0 70px ${hexA(accent, 0.18)}` }}>
        <div className="text-sm tracking-[0.35em] text-neutral-400">{consoleText ? consoleText.toUpperCase() : "UNIT"}</div>
        <div className="text-4xl md:text-5xl font-black mt-1">{unitName}</div>
        <div className="mt-5 inline-flex items-center gap-3 rounded-full bg-emerald-400/15 px-6 py-2.5">
          <span className="h-3 w-3 rounded-full bg-emerald-300 nb-dot" />
          <span className="text-2xl md:text-3xl font-bold tracking-[0.15em] text-emerald-300">TERSEDIA</span>
        </div>
        <div className="text-lg md:text-xl text-neutral-400 mt-4">Hubungi kasir untuk mulai bermain</div>
      </div>
    );
  }

  const paused = liveView.status === "paused";
  const color = paused ? "#7dd3fc" : liveView.isOvertime ? "#fbbf24" : "#fb7185";
  const total = liveView.remainingSeconds !== null ? (liveView.elapsedSeconds ?? 0) + liveView.remainingSeconds : null;
  const progress = total ? (liveView.remainingSeconds ?? 0) / total : 1;
  return (
    <div className={`rounded-[2rem] px-10 py-8 text-center flex flex-col items-center ${GLASS}`} style={{ borderColor: hexA(color, 0.4) }}>
      <div className="text-sm tracking-[0.35em] text-neutral-400">{consoleText ? consoleText.toUpperCase() : "UNIT"}</div>
      <div className="text-3xl md:text-4xl font-black mt-1 mb-5">{unitName}</div>
      <Ring progress={progress} size={230} stroke={14} color={color}>
        <div className="text-base tracking-[0.25em]" style={{ color }}>
          {paused ? "DIJEDA" : liveView.remainingSeconds !== null ? (liveView.isOvertime ? "LEWAT WAKTU" : "SISA") : "BERJALAN"}
        </div>
        <div className="text-5xl md:text-6xl font-black tabular-nums leading-none mt-1">
          {liveView.remainingSeconds !== null && !liveView.isOvertime ? formatDuration(liveView.remainingSeconds) : formatDuration(liveView.elapsedSeconds)}
        </div>
      </Ring>
      <div className="mt-5 text-xl md:text-2xl font-bold tracking-[0.15em]" style={{ color }}>
        {paused ? "SESI DIJEDA" : "SEDANG DIGUNAKAN"}
      </div>
    </div>
  );
}

/** ---------------- PIN ---------------- */

function PinPrompt({ token, accent, state, onOk, onCancel }: { token: string; accent: string; state: TvState; onOk: () => void; onCancel: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = useCallback(
    async (value: string) => {
      if (value.length < 4) return;
      setBusy(true);
      setError("");
      try {
        const res = await fetch("/api/tv/unlock", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ pin: value }),
        });
        const data = await res.json();
        if (data.ok) onOk();
        else {
          setError("PIN salah.");
          setPin("");
        }
      } catch {
        setError("Tidak bisa menghubungi server.");
      } finally {
        setBusy(false);
      }
    },
    [token, onOk]
  );

  // Ref, dengan alasan yang sama seperti di PairingScreen: submit tidak boleh dipanggil dari dalam
  // updater setState, karena StrictMode menjalankan updater dua kali.
  const pinRef = useRef("");
  useEffect(() => {
    pinRef.current = pin;
  }, [pin]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (busy) return;
      if (/^\d$/.test(e.key)) {
        setError("");
        setPin((p) => (p.length >= 6 ? p : p + e.key));
      } else if (e.key === "Backspace") setPin((p) => p.slice(0, -1));
      else if (e.key === "Enter") void submit(pinRef.current);
      else if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, submit, onCancel]);

  return (
    <div className="min-h-screen flex items-center justify-center p-10 nb-fade-in">
      <div className={`rounded-[2rem] p-10 flex flex-col items-center gap-6 ${GLASS}`}>
        <Wordmark small />
        <div className="text-3xl md:text-4xl font-bold">PIN Staf</div>
        <div className="text-neutral-400 text-lg -mt-3">{state.outletName}{state.unitName ? ` · ${state.unitName}` : ""}</div>
        <div className="flex gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="w-14 h-20 md:w-16 md:h-24 rounded-2xl border flex items-center justify-center text-4xl bg-black/30 transition-all"
              style={pin.length === i ? { borderColor: accent, boxShadow: `0 0 30px ${hexA(accent, 0.4)}` } : { borderColor: "rgba(255,255,255,0.12)" }}
            >
              {pin[i] ? "•" : ""}
            </div>
          ))}
        </div>
        <div className="h-7">{error && <div className="text-rose-300 text-xl">{error}</div>}</div>
        <div className="grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "hapus", "0", "ok"].map((key) => (
            <button
              key={key}
              disabled={busy}
              onClick={() => {
                if (key === "hapus") setPin((p) => p.slice(0, -1));
                else if (key === "ok") void submit(pin);
                else setPin((p) => (p.length >= 6 ? p : p + key));
              }}
              className="w-24 h-16 rounded-2xl bg-white/[0.05] border border-white/10 text-2xl font-semibold focus:outline-none focus:border-cyan-300 focus:bg-cyan-300/15 disabled:opacity-40"
            >
              {key === "hapus" ? "⌫" : key === "ok" ? "OK" : key}
            </button>
          ))}
        </div>
        <button onClick={onCancel} className="text-neutral-400 text-lg underline-offset-4 hover:underline focus:outline-none focus:text-white">
          Kembali ke screensaver
        </button>
      </div>
    </div>
  );
}

/** ---------------- PANEL UNIT ---------------- */

/**
 * Yang dilihat staf setelah membuka kunci.
 *
 * HANYA-BACA, dan isinya persis apa yang sudah dikirim /api/tv/state — tidak ada permintaan data
 * tambahan, tidak ada tombol yang mengubah apa pun. Membuka kunci layar di bilik BUKAN login: tidak
 * ada sesi yang dibuat dan tidak ada cookie yang dipasang. Memulai sesi dari TV memakai panel kasir
 * di aplikasi NEXBILL TV (tombol OK → PIN), bukan halaman ini.
 */
function UnitPanel({ state, liveView, offline, onBack }: { state: TvState; liveView: TvUnitView; offline: boolean; onBack: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-10 nb-fade-in">
      <div className={`rounded-[2rem] p-10 w-full max-w-5xl ${GLASS}`}>
        <div className="flex items-start justify-between gap-6">
          <OutletIdentity state={state} offline={offline} />
          <Wordmark small />
        </div>
        <div className="mt-8 grid grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <div>
              <div className="text-sm tracking-[0.3em] text-neutral-400">LAYAR</div>
              <div className="text-2xl font-semibold">{state.screenName}</div>
            </div>
            {state.consoleType && (
              <div>
                <div className="text-sm tracking-[0.3em] text-neutral-400">KONSOL</div>
                <div className="text-2xl font-semibold">{consoleLabel(state.consoleType)}</div>
              </div>
            )}
            {state.hourlyRate !== null && (
              <div>
                <div className="text-sm tracking-[0.3em] text-neutral-400">TARIF</div>
                <div className="text-2xl font-semibold">Rp{state.hourlyRate.toLocaleString("id-ID")}/jam</div>
              </div>
            )}
            <p className="text-neutral-400 text-base leading-relaxed">
              Halaman ini hanya informasi. Mulai, jeda, dan hentikan sesi dari kasir NEXBILL — atau di aplikasi NEXBILL TV: tekan OK → PIN.
            </p>
          </div>
          <div className="flex justify-center">
            <UnitStatusBadge unitName={state.unitName ?? state.screenName} liveView={liveView} accent={state.display.accentColor} consoleType={state.consoleType} />
          </div>
        </div>
        <div className="mt-8 flex justify-center">
          <button
            onClick={onBack}
            className="px-8 py-3 rounded-2xl bg-white/[0.06] border border-white/15 text-xl focus:outline-none focus:border-cyan-300 focus:bg-cyan-300/15"
          >
            Kembali ke Screensaver
          </button>
        </div>
      </div>
    </div>
  );
}
