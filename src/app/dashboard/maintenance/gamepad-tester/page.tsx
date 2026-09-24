"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-maintenance";
import { IndikatorLive, PemeriksaanTerpandu } from "./doctor";

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

type Family = "ps3" | "ps4" | "ps5" | "sony_other" | "generic";

function detectFamily(id: string): Family {
  const s = id.toLowerCase();
  if (s.includes("054c")) {
    // Sony USB vendor ID — product IDs below are the common DS3/DS4/DualSense ones.
    if (s.includes("0268")) return "ps3";
    if (s.includes("05c4") || s.includes("09cc")) return "ps4";
    if (s.includes("0ce6")) return "ps5";
    return "sony_other";
  }
  if (s.includes("dualsense")) return "ps5";
  if (s.includes("dualshock 4") || s.includes("dualshock4")) return "ps4";
  if (s.includes("dualshock 3") || s.includes("dualshock3")) return "ps3";
  return "generic";
}

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

function GamepadCard({ snap, t }: { snap: Snapshot; t: (k: string, f: string) => string }) {
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
            {t("maintenance.gamepad.nonStandardMapping", "Mapping non-standar — cek driver controller")}
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

export default function GamepadTesterPage() {
  const { t } = useDashboardLang();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [supported, setSupported] = useState(true);
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
            "Sambungkan controller lewat USB atau Bluetooth ke PC/laptop yang membuka halaman ini, lalu tekan tombol/gerakkan stick — hasil dibaca langsung dari hardware, bukan simulasi."
          )}
        </p>
      </div>

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
          <GamepadCard key={s.index} snap={s} t={t} />
        ))}
      </div>

      {supported && (
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
