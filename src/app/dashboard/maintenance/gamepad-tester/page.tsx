"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-maintenance";
import { IndikatorLive, PemeriksaanTerpandu } from "./doctor";
import { detectGamepadFamily, isAndroidUserAgent, type GamepadFamily } from "@/lib/maintenance/gamepad-family";
import { bukaKunciAudio, bunyiTerhubung, bunyiTerputus, siapBerbunyi } from "./sound";

const KUNCI_SUARA = "nexbill.gamepadTester.suara";

interface NotifKoneksi {
  jenis: "terhubung" | "terputus";
  label: string;
  slot: number;
  kunci: number;
}

/**
 * Live controller (gamepad) tester — pure client-side, built on the browser's standard Gamepad
 * API (navigator.getGamepads()), no server/device dependency at all. Lets staff plug a
 * PS3/PS4/PS5 controller straight into the PC running this dashboard and see every button/stick/
 * trigger reading in real time, mainly to catch analog stick drift and dead/stuck buttons before
 * handing a controller to a customer.
 *
 * Accuracy notes (see the Help card at the bottom of the page for the staff-facing version of
 * this): PS4 (DualShock 4) and PS5 (DualSense) report as the W3C "standard" gamepad mapping in
 * Chrome/Edge — button indices and axis values below are read directly from the OS/hardware, not
 * simulated, so this is genuinely accurate for spotting drift and dead buttons. PS3 (DualShock 3)
 * often does NOT report as "standard" on Windows without a dedicated driver (e.g. the DS3 Windows
 * driver / SCP Toolkit) — mapping !== "standard" is detected below and surfaced as a warning
 * rather than silently guessing at button positions.
 */

const AXIS_DEADZONE_RADIUS = 0.15; // visual reference circle only — NOT a "pass/fail" threshold, staff judge by eye

interface Snapshot {
  index: number;
  id: string;
  mapping: string;
  connected: boolean;
  buttons: { pressed: boolean; value: number }[];
  axes: number[];
}

function readGamepads(): Snapshot[] {
  const pads = typeof navigator !== "undefined" && navigator.getGamepads ? navigator.getGamepads() : [];
  const out: Snapshot[] = [];
  for (const g of pads) {
    if (!g) continue;
    out.push({
      index: g.index,
      id: g.id,
      mapping: g.mapping || "",
      connected: g.connected,
      buttons: g.buttons.map((b) => ({ pressed: b.pressed, value: b.value })),
      axes: [...g.axes],
    });
  }
  return out;
}

type Family = GamepadFamily;
// Deteksi jenis stik ada di lib/maintenance/gamepad-family.ts (teruji) — termasuk nama perangkat
// versi Chrome Android, yang tidak menyertakan vendor/product id seperti Chrome desktop.
const detectFamily = detectGamepadFamily;

const FAMILY_LABEL: Record<Family, string> = {
  ps3: "PS3 (DualShock 3)",
  ps4: "PS4 (DualShock 4)",
  ps5: "PS5 (DualSense)",
  sony_other: "Controller Sony (model tidak dikenali)",
  generic: "Controller generik / non-Sony",
};

const FACE_BUTTONS = [
  { idx: 0, ds: "Cross", generic: "A", color: "#4aa3ff" }, // bottom
  { idx: 1, ds: "Circle", generic: "B", color: "#ff5c5c" }, // right
  { idx: 2, ds: "Square", generic: "X", color: "#ff6fd8" }, // left
  { idx: 3, ds: "Triangle", generic: "Y", color: "#3ee08a" }, // top
];

function GamepadDiagram({ snap, family }: { snap: Snapshot; family: Family }) {
  const isDs = family !== "generic";
  const btn = (i: number) => snap.buttons[i] ?? { pressed: false, value: 0 };
  const [lx, ly, rx, ry] = [snap.axes[0] ?? 0, snap.axes[1] ?? 0, snap.axes[2] ?? 0, snap.axes[3] ?? 0];

  const Stick = ({ x, y, cx, cy, clicked, label }: { x: number; y: number; cx: number; cy: number; clicked: boolean; label: string }) => {
    const radius = 30;
    const dotX = cx + Math.max(-1, Math.min(1, x)) * radius;
    const dotY = cy + Math.max(-1, Math.min(1, y)) * radius;
    return (
      <g>
        <circle cx={cx} cy={cy} r={radius + 8} fill="#1a1a24" stroke={clicked ? "#3ee08a" : "#333"} strokeWidth={clicked ? 3 : 1.5} />
        <circle cx={cx} cy={cy} r={radius * AXIS_DEADZONE_RADIUS * 4} fill="none" stroke="#555" strokeDasharray="2,2" />
        <circle cx={dotX} cy={dotY} r={9} fill="#4aa3ff" stroke="#dbeeff" strokeWidth={1.5} />
        <text x={cx} y={cy + radius + 22} textAnchor="middle" fontSize="9" fill="#888">{label}</text>
      </g>
    );
  };

  const DPad = ({ cx, cy }: { cx: number; cy: number }) => {
    const up = btn(12).pressed, down = btn(13).pressed, left = btn(14).pressed, right = btn(15).pressed;
    const c = (on: boolean) => (on ? "#3ee08a" : "#3a3a46");
    return (
      <g>
        <rect x={cx - 8} y={cy - 26} width={16} height={18} rx={3} fill={c(up)} />
        <rect x={cx - 8} y={cy + 8} width={16} height={18} rx={3} fill={c(down)} />
        <rect x={cx - 26} y={cy - 8} width={18} height={16} rx={3} fill={c(left)} />
        <rect x={cx + 8} y={cy - 8} width={18} height={16} rx={3} fill={c(right)} />
        <rect x={cx - 8} y={cy - 8} width={16} height={16} fill="#26262f" />
      </g>
    );
  };

  return (
    <svg viewBox="0 0 420 220" className="w-full max-w-md mx-auto">
      {/* body */}
      <path
        d="M60,80 Q40,60 80,50 Q160,30 210,30 Q260,30 340,50 Q380,60 360,80 L370,150 Q375,185 340,185 Q310,185 300,160 Q270,140 210,140 Q150,140 120,160 Q110,185 80,185 Q45,185 50,150 Z"
        fill="#1f1f28"
        stroke="#3a3a46"
        strokeWidth={2}
      />
      {/* triggers */}
      <g>
        <rect x={70} y={38} width={50} height={10} rx={4} fill={btn(4).pressed ? "#3ee08a" : "#3a3a46"} />
        <rect x={300} y={38} width={50} height={10} rx={4} fill={btn(5).pressed ? "#3ee08a" : "#3a3a46"} />
        <text x={95} y={35} textAnchor="middle" fontSize="9" fill="#888">L1</text>
        <text x={325} y={35} textAnchor="middle" fontSize="9" fill="#888">R1</text>
        {/* analog trigger gauges */}
        <rect x={70} y={16} width={50} height={8} rx={3} fill="#26262f" />
        <rect x={70} y={16} width={50 * (btn(6).value || (btn(6).pressed ? 1 : 0))} height={8} rx={3} fill="#e0a83e" />
        <rect x={300} y={16} width={50} height={8} rx={3} fill="#26262f" />
        <rect x={300} y={16} width={50 * (btn(7).value || (btn(7).pressed ? 1 : 0))} height={8} rx={3} fill="#e0a83e" />
        <text x={95} y={14} textAnchor="middle" fontSize="8" fill="#666">L2</text>
        <text x={325} y={14} textAnchor="middle" fontSize="8" fill="#666">R2</text>
      </g>

      <DPad cx={110} cy={100} />

      {/* face buttons diamond */}
      {FACE_BUTTONS.map((f) => {
        const pos = f.idx === 0 ? { x: 310, y: 120 } : f.idx === 1 ? { x: 335, y: 95 } : f.idx === 2 ? { x: 285, y: 95 } : { x: 310, y: 70 };
        const pressed = btn(f.idx).pressed;
        return (
          <g key={f.idx}>
            <circle cx={pos.x} cy={pos.y} r={11} fill={pressed ? f.color : "#2a2a34"} stroke={f.color} strokeWidth={1.5} opacity={pressed ? 1 : 0.55} />
            <text x={pos.x} y={pos.y + 3} textAnchor="middle" fontSize="8" fill={pressed ? "#0a0a0a" : "#999"}>{isDs ? f.ds[0] : f.generic}</text>
          </g>
        );
      })}

      {/* share/options */}
      <rect x={175} y={55} width={22} height={9} rx={4} fill={btn(8).pressed ? "#3ee08a" : "#2a2a34"} />
      <rect x={223} y={55} width={22} height={9} rx={4} fill={btn(9).pressed ? "#3ee08a" : "#2a2a34"} />
      <text x={186} y={52} textAnchor="middle" fontSize="7" fill="#666">{isDs ? "Share" : "Back"}</text>
      <text x={234} y={52} textAnchor="middle" fontSize="7" fill="#666">{isDs ? "Options" : "Start"}</text>

      {/* PS/home button */}
      {snap.buttons.length > 16 && (
        <circle cx={210} cy={95} r={10} fill={btn(16).pressed ? "#4aa3ff" : "#2a2a34"} stroke="#555" />
      )}

      <Stick x={lx} y={ly} cx={150} cy={165} clicked={btn(10).pressed} label="L3 (Stick Kiri)" />
      <Stick x={rx} y={ry} cx={270} cy={165} clicked={btn(11).pressed} label="R3 (Stick Kanan)" />
    </svg>
  );
}

function GamepadCard({ snap, t, android }: { snap: Snapshot; t: (k: string, f: string) => string; android: boolean }) {
  const family = detectFamily(snap.id);
  const nonStandard = snap.mapping !== "standard";

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-medium text-neutral-100">{FAMILY_LABEL[family]}</h3>
          <p className="text-[11px] text-neutral-600 break-all">{snap.id}</p>
        </div>
        {nonStandard && (
          <span className="text-[11px] px-2 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
            {android
              ? t("maintenance.gamepad.nonStandardMappingAndroid", "Mapping non-standar — label tombol bisa tertukar; coba sambung ulang pakai kabel")
              : t("maintenance.gamepad.nonStandardMapping", "Mapping non-standar — cek driver controller")}
          </span>
        )}
      </div>

      <GamepadDiagram snap={snap} family={family} />

      <p className="text-[11px] text-neutral-500 text-center">
        {t(
          "maintenance.gamepad.driftHint",
          "Lepas kedua stick — kalau titik biru tidak balik ke tengah lingkaran, kemungkinan stick sudah drift dan perlu diservis/diganti."
        )}
      </p>

      <div className="border-t border-white/5 pt-4">
        <IndikatorLive snap={snap} standar={!nonStandard} />
      </div>
      <div className="border-t border-white/5 pt-4">
        <PemeriksaanTerpandu snap={snap} standar={!nonStandard} labelController={FAMILY_LABEL[family]} />
      </div>
    </Card>
  );
}

/**
 * Panduan stik PS3 (DualShock 3). Windows TIDAK punya driver bawaan yang meneruskan input DS3 —
 * stik tercolok & lampunya berkedip, tapi navigator.getGamepads() tetap kosong. Tidak ada yang bisa
 * dilakukan halaman web untuk itu lewat Gamepad API; solusinya driver DsHidMini (Nefarius, open
 * source) dalam mode XInput, atau membuka halaman ini di Android yang membaca DS3 secara native.
 */
/*
 * Driver PS3 yang disematkan. Salinan TANPA PERUBAHAN dari rilis resmi, disimpan di
 * public/downloads/ps3-driver/ bersama LICENSE-DsHidMini.txt (syarat redistribusi BSD-3). Bila
 * berkas lokalnya belum ada di deploy ini (lupa disalin), tombol otomatis jatuh ke tautan unduhan
 * langsung dari rilis GitHub resmi — outlet tidak pernah menekan tombol yang berujung 404.
 * Saat memperbarui versi: ganti ketiga konstanta di bawah + berkas MSI-nya + teks ps3Download.
 */
const DRIVER_PS3_VERSI = "3.5.1";
const DRIVER_PS3_LOKAL = `/downloads/ps3-driver/Nefarius_DsHidMini_Drivers_x64_arm64_v${DRIVER_PS3_VERSI}.msi`;
const DRIVER_PS3_GITHUB = `https://github.com/nefarius/DsHidMini/releases/download/setup-v${DRIVER_PS3_VERSI}/Nefarius_DsHidMini_Drivers_x64_arm64_v${DRIVER_PS3_VERSI}.msi`;

function useUrlDriverPs3() {
  const [url, setUrl] = useState(DRIVER_PS3_GITHUB);
  useEffect(() => {
    let batal = false;
    fetch(DRIVER_PS3_LOKAL, { method: "HEAD" })
      .then((r) => { if (!batal && r.ok) setUrl(DRIVER_PS3_LOKAL); })
      .catch(() => {});
    return () => { batal = true; };
  }, []);
  return url;
}

function BantuanPs3({ t, terbuka }: { t: (k: string, f: string) => string; terbuka: boolean }) {
  const [buka, setBuka] = useState<boolean | null>(null);
  const tampil = buka ?? terbuka; // ikut kondisi otomatis sampai pengguna menekan tombolnya sendiri
  const urlDriver = useUrlDriverPs3();
  return (
    <Card className={`space-y-2 border ${terbuka ? "border-amber-500/30 bg-amber-500/5" : "border-white/10"}`}>
      <button type="button" onClick={() => setBuka(!tampil)} className="flex w-full items-center justify-between text-left">
        <h2 className="font-medium text-sm text-amber-300">{t("maintenance.gamepad.ps3Heading", "Stik PS3 (DualShock 3) tidak terdeteksi?")}</h2>
        <span className="text-xs text-neutral-500">{tampil ? "▲" : "▼"}</span>
      </button>
      {tampil && (
        <>
          <p className="text-xs text-neutral-300 leading-relaxed">
            {t(
              "maintenance.gamepad.ps3Why",
              "Ini bukan kerusakan stik. Windows tidak punya driver bawaan untuk stik PS3: stik tercolok dan lampunya berkedip, tapi Windows tidak meneruskan tombolnya ke browser, sehingga halaman ini tidak bisa membacanya. Stik PS4 dan PS5 tidak butuh langkah ini."
            )}
          </p>
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-black/30 px-3 py-2">
            <a
              href={urlDriver}
              download={urlDriver === DRIVER_PS3_LOKAL ? `Nefarius_DsHidMini_Drivers_x64_arm64_v${DRIVER_PS3_VERSI}.msi` : undefined}
              className="inline-block rounded-lg bg-amber-500/20 border border-amber-400/40 px-3 py-2 text-xs font-medium text-amber-200 hover:bg-amber-500/30"
            >
              ⬇ {t("maintenance.gamepad.ps3Download", `Unduh Driver PS3 (DsHidMini v${DRIVER_PS3_VERSI})`)}
            </a>
            <span className="text-[11px] text-neutral-500 flex-1 min-w-[200px]">
              {t("maintenance.gamepad.ps3Credit", "Driver gratis & open source buatan Nefarius (lisensi BSD-3), bukan buatan NEXBILL. Versi 3.5.1 masih berlabel BETA. Hanya untuk Windows 10/11 64-bit.")}
            </span>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-line">
            {t("maintenance.gamepad.ps3Steps", "1) Windows 10/11 64-bit, kabel mini-USB data.\n2) Unduh & jalankan .msi.\n3) Colok stik, tekan PS.\n4) Cek joy.cpl.\n5) Tekan tombol di halaman ini.")}
          </p>
          <p className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-neutral-300 leading-relaxed">
            {t("maintenance.gamepad.ps3Clone", "Penting: driver ini hanya dijamin untuk stik PS3 ORIGINAL Sony. Stik KW sering tidak terbaca.")}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
            <a href="https://github.com/nefarius/DsHidMini" target="_blank" rel="noopener noreferrer" className="text-sky-300 underline">Sumber: github.com/nefarius/DsHidMini</a>
            <a href={`https://github.com/nefarius/DsHidMini/releases/tag/setup-v${DRIVER_PS3_VERSI}`} target="_blank" rel="noopener noreferrer" className="text-sky-300 underline">Catatan rilis v{DRIVER_PS3_VERSI}</a>
            <a href="https://docs.nefarius.at/projects/DsHidMini/v3/How-to-Install/" target="_blank" rel="noopener noreferrer" className="text-sky-300 underline">Panduan resmi (Inggris)</a>
            <a href="/downloads/ps3-driver/LICENSE-DsHidMini.txt" target="_blank" rel="noopener noreferrer" className="text-sky-300 underline">Lisensi BSD-3</a>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            {t("maintenance.gamepad.ps3Alt", "Tanpa memasang driver: buka halaman ini di HP Android lewat Chrome, lalu colok stik PS3 pakai kabel OTG.")}
          </p>
        </>
      )}
    </Card>
  );
}

/**
 * Panduan menyambungkan stik PS3/PS4/PS5 ke HP Android. Chrome Android (dan aplikasi NEXBILL, yang
 * berjalan di atas Chrome) membaca stik lewat Gamepad API seperti di PC; yang sering membuat bingung
 * adalah cara memasangkannya: DS4/DualSense lewat Bluetooth, DS3 hanya lewat kabel OTG (Android
 * tidak bisa memasangkan DS3 lewat Bluetooth tanpa alat khusus). Juga: stik yang dipasangkan ke HP
 * harus disambungkan ulang ke konsol pakai kabel sebelum dipakai main lagi.
 */
function BantuanAndroid({ t, terbuka }: { t: (k: string, f: string) => string; terbuka: boolean }) {
  const [buka, setBuka] = useState<boolean | null>(null);
  const tampil = buka ?? terbuka;
  const langkah: { judul: string; isi: string }[] = [
    { judul: "PS4 (DualShock 4)", isi: t("maintenance.gamepad.android.ps4", "Bluetooth: tahan tombol SHARE + PS sekitar 3 detik sampai lampu berkedip cepat. Di HP buka Pengaturan → Bluetooth → pilih \"Wireless Controller\". Atau colok kabel micro-USB lewat adaptor OTG.") },
    { judul: "PS5 (DualSense)", isi: t("maintenance.gamepad.android.ps5", "Bluetooth: tahan tombol CREATE + PS sampai lampu di sekitar touchpad berkedip cepat. Di HP buka Pengaturan → Bluetooth → pilih \"DualSense Wireless Controller\" (paling stabil di Android 12 ke atas). Atau colok kabel USB-C langsung ke HP.") },
    { judul: "PS3 (DualShock 3)", isi: t("maintenance.gamepad.android.ps3", "Hanya lewat kabel: Android tidak bisa memasangkan stik PS3 lewat Bluetooth. Colok kabel mini-USB (kabel data) + adaptor OTG ke HP, lalu tekan tombol PS. Stik PS3 KW sering tidak terbaca.") },
  ];
  return (
    <Card className={`space-y-2 border ${terbuka ? "border-cyan-500/30 bg-cyan-500/5" : "border-white/10"}`}>
      <button type="button" onClick={() => setBuka(!tampil)} className="flex w-full items-center justify-between text-left">
        <h2 className="font-medium text-sm text-cyan-300">{t("maintenance.gamepad.android.heading", "Cara menyambungkan stik PS ke HP Android")}</h2>
        <span className="text-xs text-neutral-500">{tampil ? "▲" : "▼"}</span>
      </button>
      {tampil && (
        <>
          <p className="text-xs text-neutral-300 leading-relaxed">
            {t("maintenance.gamepad.android.intro", "Biarkan halaman ini tetap terbuka di Chrome atau aplikasi NEXBILL. Setelah stik tersambung, tekan sembarang tombol sekali — kartu stik akan muncul di atas.")}
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {langkah.map((l) => (
              <div key={l.judul} className="rounded-lg border border-white/10 bg-black/30 p-3">
                <div className="text-xs font-semibold text-neutral-100">{l.judul}</div>
                <p className="mt-1 text-xs text-neutral-400 leading-relaxed">{l.isi}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            {t("maintenance.gamepad.android.otg", "Lewat kabel tidak terdeteksi? Pastikan HP mendukung OTG (sebagian HP perlu menyalakan OTG di Pengaturan) dan kabelnya kabel data, bukan kabel cas saja.")}
          </p>
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200 leading-relaxed">
            {t("maintenance.gamepad.android.repair", "Penting: stik yang dites lewat Bluetooth akan tersambung ke HP. Sebelum dipakai main lagi, hapus stik dari daftar Bluetooth HP, lalu colok stik ke konsol pakai kabel USB dan tekan tombol PS supaya tersambung kembali ke konsol.")}
          </p>
        </>
      )}
    </Card>
  );
}

export default function GamepadTesterPage() {
  const { t } = useDashboardLang();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [supported, setSupported] = useState(true);
  // HP/tablet Android (Chrome atau aplikasi NEXBILL): panduan sambung lewat Bluetooth/OTG
  // menggantikan panduan driver PS3 yang khusus Windows.
  const [android, setAndroid] = useState(false);
  useEffect(() => setAndroid(isAndroidUserAgent(navigator.userAgent)), []);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.getGamepads) {
      setSupported(false);
      return;
    }
    const tick = () => {
      setSnapshots(readGamepads());
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // --- Suara & notifikasi koneksi controller ---
  const [suara, setSuara] = useState(true);
  const [audioTerkunci, setAudioTerkunci] = useState(false);
  const [notif, setNotif] = useState<NotifKoneksi | null>(null);
  const suaraRef = useRef(true);

  useEffect(() => {
    try {
      const simpan = window.localStorage.getItem(KUNCI_SUARA);
      if (simpan === "0") {
        setSuara(false);
        suaraRef.current = false;
      }
    } catch {
      /* localStorage tidak tersedia — pakai default (aktif) */
    }
    // Klik menu dashboard sebelumnya biasanya sudah cukup untuk membuka audio.
    void bukaKunciAudio().then((ok) => setAudioTerkunci(!ok));

    // Tombol di stik tidak dihitung interaksi oleh browser, jadi buka kunci audio pada klik/keyboard pertama.
    const buka = () => {
      void bukaKunciAudio().then((ok) => {
        if (ok) {
          setAudioTerkunci(false);
          window.removeEventListener("pointerdown", buka);
          window.removeEventListener("keydown", buka);
        }
      });
    };
    window.addEventListener("pointerdown", buka);
    window.addEventListener("keydown", buka);

    const labelDari = (id: string) => FAMILY_LABEL[detectFamily(id)];
    const onConnect = (e: GamepadEvent) => {
      setNotif({ jenis: "terhubung", label: labelDari(e.gamepad.id), slot: e.gamepad.index + 1, kunci: Date.now() });
      if (suaraRef.current && !bunyiTerhubung()) setAudioTerkunci(true);
    };
    const onDisconnect = (e: GamepadEvent) => {
      setNotif({ jenis: "terputus", label: labelDari(e.gamepad.id), slot: e.gamepad.index + 1, kunci: Date.now() });
      if (suaraRef.current && !bunyiTerputus()) setAudioTerkunci(true);
    };
    window.addEventListener("gamepadconnected", onConnect);
    window.addEventListener("gamepaddisconnected", onDisconnect);
    return () => {
      window.removeEventListener("pointerdown", buka);
      window.removeEventListener("keydown", buka);
      window.removeEventListener("gamepadconnected", onConnect);
      window.removeEventListener("gamepaddisconnected", onDisconnect);
    };
  }, []);

  // Notifikasi hilang sendiri setelah 4 detik (kunci berubah tiap event → timer di-reset).
  useEffect(() => {
    if (!notif) return;
    const h = window.setTimeout(() => setNotif(null), 4000);
    return () => window.clearTimeout(h);
  }, [notif]);

  const gantiSuara = async () => {
    const baru = !suara;
    setSuara(baru);
    suaraRef.current = baru;
    try {
      window.localStorage.setItem(KUNCI_SUARA, baru ? "1" : "0");
    } catch {
      /* abaikan */
    }
    if (baru) {
      const ok = await bukaKunciAudio();
      setAudioTerkunci(!ok);
      if (ok) bunyiTerhubung();
    }
  };

  const tesSuara = async () => {
    const ok = await bukaKunciAudio();
    setAudioTerkunci(!ok);
    if (!ok) return;
    bunyiTerhubung();
    window.setTimeout(() => bunyiTerputus(), 900);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/maintenance" className="text-xs text-emerald-400 hover:underline">
          {t("maintenance.gamepad.backLink", "← Kembali ke Maintenance")}
        </Link>
        <h1 className="gm-display text-2xl font-bold gm-gradient-title mt-1">
          {t("maintenance.gamepad.title", "Gamepad Tester — Cek Controller PS3/PS4/PS5")}
        </h1>
        <p className="text-sm text-neutral-500">
          {t(
            "maintenance.gamepad.subtitle",
            "Sambungkan controller lewat USB atau Bluetooth ke PC/laptop atau HP Android yang membuka halaman ini, lalu tekan tombol/gerakkan stick — hasil dibaca langsung dari hardware, bukan simulasi."
          )}
        </p>
      </div>

      {supported && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={gantiSuara}
            aria-pressed={suara}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              suara
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                : "border-white/15 bg-white/5 text-neutral-400 hover:bg-white/10"
            }`}
          >
            {suara ? t("maintenance.gamepad.sound.on", "Suara: Aktif") : t("maintenance.gamepad.sound.off", "Suara: Mati")}
          </button>
          <button
            type="button"
            onClick={tesSuara}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-neutral-300 hover:bg-white/10"
          >
            {t("maintenance.gamepad.sound.test", "Tes Suara")}
          </button>
          <span className="text-xs text-neutral-500">
            {t("maintenance.gamepad.sound.hint", "Nada naik = controller terhubung, nada turun = controller terputus.")}
          </span>
          {suara && audioTerkunci && (
            <span className="w-full text-xs text-amber-300">
              {t(
                "maintenance.gamepad.sound.locked",
                "Klik sekali di mana saja pada halaman ini agar suara bisa berbunyi — browser memblokir suara sebelum ada klik (menekan tombol stik tidak dihitung)."
              )}
            </span>
          )}
        </div>
      )}

      {notif && (
        <div
          key={notif.kunci}
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur ${
            notif.jenis === "terhubung"
              ? "border-emerald-500/50 bg-emerald-950/90 text-emerald-200"
              : "border-rose-500/50 bg-rose-950/90 text-rose-200"
          }`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${notif.jenis === "terhubung" ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`}
            aria-hidden
          />
          <div className="text-sm">
            <div className="font-semibold">
              {notif.jenis === "terhubung"
                ? t("maintenance.gamepad.toast.connected", "Controller terhubung")
                : t("maintenance.gamepad.toast.disconnected", "Controller terputus")}
            </div>
            <div className="text-xs opacity-80">
              {notif.label} · {t("maintenance.gamepad.toast.slot", "Slot")} {notif.slot}
            </div>
          </div>
        </div>
      )}

      {!supported && (
        <Card className="border border-rose-700/40 bg-rose-950/10">
          <p className="text-sm text-rose-300">
            {t("maintenance.gamepad.notSupported", "Browser ini tidak mendukung Gamepad API. Coba buka halaman ini lewat Google Chrome atau Microsoft Edge terbaru.")}
          </p>
        </Card>
      )}

      {supported && snapshots.length === 0 && (
        <Card className="text-center py-10">
          <p className="text-sm text-neutral-400">
            {t("maintenance.gamepad.waiting", "Belum ada controller terdeteksi — sambungkan controller lalu tekan sembarang tombol sekali (biasanya perlu 1x tekan tombol dulu agar browser mendeteksinya).")}
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {snapshots.map((s) => (
          <GamepadCard key={s.index} snap={s} t={t} android={android} />
        ))}
      </div>

      {supported && android && <BantuanAndroid t={t} terbuka={snapshots.length === 0} />}

      {supported && !android && (
        <BantuanPs3
          t={t}
          // Terbuka otomatis saat belum ada controller sama sekali, atau saat stik PS3 terbaca tapi mapping-nya
          // non-standar — dua gejala yang sama-sama disebabkan driver Windows, bukan stiknya.
          terbuka={snapshots.length === 0 || snapshots.some((s) => detectFamily(s.id) === "ps3" && s.mapping !== "standard")}
        />
      )}

      <Card className="space-y-2 border border-white/10">
        <h2 className="font-medium text-sm text-neutral-200">{t("maintenance.gamepad.helpHeading", "Soal Akurasi")}</h2>
        <p className="text-xs text-neutral-500 leading-relaxed">
          {t(
            "maintenance.gamepad.helpBody",
            "PS4 (DualShock 4) dan PS5 (DualSense) terbaca sangat akurat lewat USB maupun Bluetooth di Chrome/Edge — posisi stick, tekanan trigger, dan status tiap tombol diambil langsung dari hardware. PS3 (DualShock 3) di Windows kadang perlu driver tambahan dulu (DS3 Windows driver) agar terbaca benar — kalau muncul peringatan \"mapping non-standar\" di atas, itu tandanya. Alat ini tidak bisa membaca fitur khusus DualSense (adaptive trigger, gyro) atau mengontrol getaran — hanya untuk cek fungsi tombol dan stick."
          )}
        </p>
      </Card>
    </div>
  );
}
