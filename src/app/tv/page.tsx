"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { computeUnitView, formatDuration, type TvUnitView } from "@/lib/tv/view";
import { normalizePairingCode } from "@/lib/tv/pairing";

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
  };
  bookingUrl: string | null;
  serverTime: string;
}

export default function TvPage() {
  const [token, setToken] = useState<string | null>(null);
  const [booted, setBooted] = useState(false);

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
  }, []);

  const handleUnpair = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      /* diabaikan — state di bawah yang menentukan tampilan */
    }
    setToken(null);
  }, []);

  if (!booted) return <div className="min-h-screen bg-black" />;
  if (!token) return <PairingScreen onPaired={handlePaired} />;
  return <ScreenDisplay token={token} onUnpair={handleUnpair} />;
}

/** ---------------- PAIRING ---------------- */

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
          body: JSON.stringify({ code: clean }),
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
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 bg-black">
      <div className="text-center space-y-2">
        <div className="text-cyan-400 text-sm tracking-[0.3em] font-semibold">NEXBILL TV</div>
        <h1 className="text-4xl md:text-5xl font-bold">Masukkan Kode Pairing</h1>
        <p className="text-neutral-400 text-lg md:text-xl max-w-2xl">
          Buka <span className="text-white">Pengaturan &rsaquo; TV Screensaver</span> di dashboard NEXBILL, tambahkan layar untuk bilik ini, lalu ketik 6 digit
          kodenya memakai tombol angka remote.
        </p>
      </div>

      <div className="flex gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className={`w-16 h-24 md:w-20 md:h-28 rounded-xl border-2 flex items-center justify-center text-4xl md:text-5xl font-bold ${
              code.length === i ? "border-cyan-400 bg-cyan-400/10" : "border-neutral-700 bg-neutral-900"
            }`}
          >
            {code[i] ?? ""}
          </div>
        ))}
      </div>

      {busy && <div className="text-cyan-300 text-xl">Memasangkan layar...</div>}
      {error && !busy && <div className="text-red-400 text-xl text-center max-w-2xl">{error}</div>}

      <div className="grid grid-cols-3 gap-3 mt-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "hapus", "0", "ok"].map((key) => (
          <button
            key={key}
            disabled={busy}
            onClick={() => {
              if (key === "hapus") setCode((p) => p.slice(0, -1));
              else if (key === "ok") void submit(code);
              else setCode((p) => (p.length >= 6 ? p : p + key));
            }}
            className="w-20 h-14 md:w-24 md:h-16 rounded-lg bg-neutral-800 border border-neutral-700 text-xl font-semibold hover:bg-neutral-700 focus:bg-cyan-500/20 focus:border-cyan-400 focus:outline-none disabled:opacity-40"
          >
            {key === "hapus" ? "⌫" : key === "ok" ? "OK" : key}
          </button>
        ))}
      </div>

      <p className="text-neutral-600 text-sm">Kode berlaku 30 menit. Sudah lewat? Buat kode baru di dashboard.</p>
    </div>
  );
}

/** ---------------- TAMPILAN LAYAR ---------------- */

type Mode = "screensaver" | "pin" | "panel";

function ScreenDisplay({ token, onUnpair }: { token: string; onUnpair: () => void }) {
  const [state, setState] = useState<TvState | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [mode, setMode] = useState<Mode>("screensaver");
  const [now, setNow] = useState(() => Date.now());
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
  }, [token, onUnpair]);

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
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-neutral-500 text-2xl">{offline ? "Menyambungkan ulang..." : "Memuat..."}</div>
      </div>
    );
  }

  if (!state.enabled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-black text-center p-8">
        <div className="text-neutral-400 text-3xl font-semibold">Screensaver tidak aktif</div>
        <p className="text-neutral-500 text-lg max-w-2xl">{state.disabledReason}</p>
        <p className="text-neutral-600 text-base max-w-xl">
          Layar <span className="text-neutral-300">{state.screenName}</span> masih terpasang dan akan menyala sendiri begitu masalah di atas dibereskan di dashboard.
        </p>
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

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {mode === "screensaver" && <Screensaver state={state} liveView={liveView} qrDataUrl={qrDataUrl} now={now} driftStyle={driftStyle} />}
      {mode === "pin" && <PinPrompt token={token} accent={accent} onOk={() => setMode("panel")} onCancel={() => setMode("screensaver")} />}
      {mode === "panel" && <UnitPanel state={state} liveView={liveView} onBack={() => setMode("screensaver")} />}

      {/* Overlay mode malam — di atas segalanya, tidak menerima klik supaya tidak menghalangi remote. */}
      {state.display.nightDimOpacity > 0 && (
        <div className="fixed inset-0 bg-black pointer-events-none" style={{ opacity: state.display.nightDimOpacity }} aria-hidden />
      )}

      {/*
        Penanda luring sengaja kecil dan di pojok, bukan pesan galat di tengah layar. Yang dilihat
        pelanggan tetap branding outlet; yang perlu tahu jaringan terganggu hanyalah staf, dan
        mereka tahu di mana melihatnya.
      */}
      {offline && <div className="fixed bottom-3 right-4 text-xs text-amber-400/70">Menyambungkan ulang...</div>}
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
}: {
  state: TvState;
  liveView: TvUnitView;
  qrDataUrl: string | null;
  now: number;
  driftStyle: React.CSSProperties;
}) {
  const d = state.display;
  const accent = d.accentColor;
  const clock = new Date(now);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-10 text-center" style={driftStyle}>
      {d.showClock && (
        <div className="mb-6">
          <div className="text-6xl md:text-8xl font-bold tabular-nums tracking-tight">
            {clock.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}
          </div>
          <div className="text-neutral-500 text-lg md:text-2xl mt-1">
            {clock.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" })}
          </div>
        </div>
      )}

      {state.logoUrl && <img src={state.logoUrl} alt="" className="h-20 md:h-28 object-contain mb-4" />}

      <h1 className="text-4xl md:text-6xl font-bold tracking-wide" style={{ color: accent }}>
        {state.outletName}
      </h1>

      {d.headline && <div className="text-3xl md:text-5xl font-semibold mt-5">{d.headline}</div>}
      {d.tagline && <div className="text-2xl md:text-4xl text-neutral-300 mt-3 tracking-wide">{d.tagline}</div>}
      {d.priceText && (
        <div className="text-2xl md:text-4xl font-semibold mt-4 px-6 py-2 rounded-xl border" style={{ borderColor: accent, color: accent }}>
          {d.priceText}
        </div>
      )}

      {d.showUnitStatus && state.unitName && (
        <div className="mt-8">
          <UnitStatusBadge unitName={state.unitName} liveView={liveView} accent={accent} />
        </div>
      )}

      {d.showBookingQr && qrDataUrl && (
        <div className="mt-8 flex flex-col items-center gap-2">
          <div className="text-lg md:text-2xl text-neutral-300 tracking-wide">SCAN QR UNTUK BOOKING</div>
          <img src={qrDataUrl} alt="QR booking" className="w-40 h-40 md:w-52 md:h-52 rounded-xl bg-white p-2" />
        </div>
      )}

      {d.showWifi && d.wifiSsid && <div className="mt-6 text-neutral-400 text-lg md:text-xl">WiFi: {d.wifiSsid}</div>}

      {d.footerText && <div className="mt-6 text-neutral-400 text-lg md:text-xl max-w-3xl">{d.footerText}</div>}

      <div className="mt-10 text-neutral-600 text-sm md:text-base tracking-[0.25em]">POWERED BY NEXBILL</div>
      <div className="mt-2 text-neutral-700 text-xs md:text-sm">Tekan tombol apa saja di remote</div>
    </div>
  );
}

function UnitStatusBadge({ unitName, liveView, accent }: { unitName: string; liveView: TvUnitView; accent: string }) {
  if (liveView.status === "maintenance") {
    return (
      <div className="px-8 py-5 rounded-2xl border-2 border-amber-500/50 bg-amber-500/10">
        <div className="text-2xl md:text-3xl font-bold text-amber-300">{unitName}</div>
        <div className="text-xl md:text-2xl text-amber-200/80 mt-1">SEDANG PERBAIKAN</div>
      </div>
    );
  }

  if (liveView.status === "available" || liveView.status === "unknown") {
    return (
      <div className="px-8 py-5 rounded-2xl border-2 bg-emerald-500/10" style={{ borderColor: accent }}>
        <div className="text-3xl md:text-4xl font-bold">🎮 {unitName}</div>
        <div className="text-2xl md:text-3xl font-bold text-emerald-400 mt-1 tracking-wide">TERSEDIA</div>
        <div className="text-base md:text-lg text-neutral-400 mt-1">Hubungi kasir untuk mulai bermain</div>
      </div>
    );
  }

  const paused = liveView.status === "paused";
  return (
    <div className={`px-8 py-5 rounded-2xl border-2 ${paused ? "border-sky-500/50 bg-sky-500/10" : "border-red-500/50 bg-red-500/10"}`}>
      <div className="text-3xl md:text-4xl font-bold">
        {paused ? "⏸" : "🔴"} {unitName}
      </div>
      <div className={`text-2xl md:text-3xl font-bold mt-1 tracking-wide ${paused ? "text-sky-300" : "text-red-300"}`}>
        {paused ? "DIJEDA" : "SEDANG DIGUNAKAN"}
      </div>
      <div className="text-xl md:text-2xl mt-2 tabular-nums">
        {liveView.remainingSeconds !== null ? (
          liveView.isOvertime ? (
            <span className="text-amber-300">Waktu habis — lewat {formatDuration(liveView.elapsedSeconds)}</span>
          ) : (
            <>Sisa waktu: <span className="font-bold">{formatDuration(liveView.remainingSeconds)}</span></>
          )
        ) : (
          <>Berjalan: <span className="font-bold">{formatDuration(liveView.elapsedSeconds)}</span></>
        )}
      </div>
    </div>
  );
}

/** ---------------- PIN ---------------- */

function PinPrompt({ token, accent, onOk, onCancel }: { token: string; accent: string; onOk: () => void; onCancel: () => void }) {
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
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 bg-black">
      <div className="text-2xl md:text-3xl font-semibold">Masukkan PIN Staf</div>
      <div className="flex gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className={`w-12 h-16 md:w-14 md:h-20 rounded-lg border-2 flex items-center justify-center text-3xl ${
              pin.length === i ? "border-cyan-400" : "border-neutral-700"
            }`}
            style={pin.length === i ? { borderColor: accent } : undefined}
          >
            {pin[i] ? "•" : ""}
          </div>
        ))}
      </div>
      {error && <div className="text-red-400 text-xl">{error}</div>}
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
            className="w-20 h-14 rounded-lg bg-neutral-800 border border-neutral-700 text-xl font-semibold focus:bg-cyan-500/20 focus:border-cyan-400 focus:outline-none disabled:opacity-40"
          >
            {key === "hapus" ? "⌫" : key === "ok" ? "OK" : key}
          </button>
        ))}
      </div>
      <button onClick={onCancel} className="text-neutral-500 text-base underline">
        Kembali ke screensaver
      </button>
    </div>
  );
}

/** ---------------- PANEL UNIT ---------------- */

/**
 * Yang dilihat staf setelah membuka kunci.
 *
 * HANYA-BACA, dan isinya persis apa yang sudah dikirim /api/tv/state — tidak ada permintaan data
 * tambahan, tidak ada tombol yang mengubah apa pun. Membuka kunci layar di bilik BUKAN login: tidak
 * ada sesi yang dibuat dan tidak ada cookie yang dipasang. Tombol "mulai sesi" di sini akan
 * berarti perangkat yang berdiri tanpa pengawasan, di balik PIN 4 digit, bisa membuka transaksi
 * berbayar — dan itu jauh melampaui yang pantas dipercayakan kepadanya. Memulai sesi tetap di
 * kasir.
 */
function UnitPanel({ state, liveView, onBack }: { state: TvState; liveView: TvUnitView; onBack: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-10 bg-black text-center">
      <div className="text-cyan-400 text-sm tracking-[0.3em]">NEXBILL TV</div>
      <div className="text-3xl md:text-4xl font-bold">{state.unitName ?? state.screenName}</div>
      {state.consoleType && <div className="text-neutral-400 text-xl uppercase tracking-wide">{state.consoleType.replace(/_/g, " ")}</div>}

      <UnitStatusBadge unitName={state.unitName ?? state.screenName} liveView={liveView} accent={state.display.accentColor} />

      {state.hourlyRate !== null && (
        <div className="text-xl text-neutral-300">Tarif: Rp{state.hourlyRate.toLocaleString("id-ID")}/jam</div>
      )}

      <div className="text-neutral-500 text-base max-w-xl">
        Layar ini hanya menampilkan informasi. Mulai, jeda, dan hentikan sesi tetap dilakukan dari kasir NEXBILL.
      </div>

      <button
        onClick={onBack}
        className="mt-2 px-6 py-3 rounded-lg bg-neutral-800 border border-neutral-700 text-lg focus:bg-cyan-500/20 focus:border-cyan-400 focus:outline-none"
      >
        Kembali ke Screensaver
      </button>
      <div className="text-neutral-700 text-sm">{state.outletName} &middot; {state.screenName}</div>
    </div>
  );
}
