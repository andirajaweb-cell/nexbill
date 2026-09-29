/**
 * Nada status controller untuk Gamepad Tester — disintesis langsung dengan Web Audio API,
 * tanpa file audio (tidak ada aset yang perlu diunduh/di-cache).
 *
 *  - Terhubung : tiga nada NAIK cerah (C5 → E5 → G5), gelombang sinus.
 *  - Terputus  : dua nada TURUN (G4 → C4), gelombang segitiga, sedikit lebih rendah & lebih panjang.
 *
 * Aturan autoplay browser: AudioContext baru boleh berbunyi setelah ada interaksi pengguna
 * (klik/tombol keyboard) di dokumen ini. Menekan tombol di STIK tidak dihitung sebagai interaksi.
 * Kalau halaman dibuka lewat menu dashboard (navigasi klien Next.js), klik menu itu sudah cukup;
 * kalau URL dibuka langsung, perlu satu klik di halaman — `siapBerbunyi()` memberi tahu UI.
 */

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

let ctx: AudioContext | null = null;
let terakhirBunyi = 0;

function ambilCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const AC = window.AudioContext || (window as WebkitWindow).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
  } catch {
    ctx = null;
  }
  return ctx;
}

/** Coba aktifkan audio (panggil dari handler klik/keydown). true kalau audio sudah bisa berbunyi. */
export async function bukaKunciAudio(): Promise<boolean> {
  const c = ambilCtx();
  if (!c) return false;
  if (c.state === "suspended") {
    try {
      await c.resume();
    } catch {
      /* diblokir browser — biarkan, UI akan menampilkan petunjuk */
    }
  }
  return c.state === "running";
}

/** true kalau AudioContext sudah "running" (tidak diblokir autoplay). */
export function siapBerbunyi(): boolean {
  const c = ambilCtx();
  return !!c && c.state === "running";
}

function nada(c: AudioContext, frek: number, mulai: number, durasi: number, jenis: OscillatorType, volume: number) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = jenis;
  osc.frequency.setValueAtTime(frek, mulai);
  // Envelope pendek (attack 10 ms, decay eksponensial) agar tidak ada bunyi "klik".
  gain.gain.setValueAtTime(0.0001, mulai);
  gain.gain.exponentialRampToValueAtTime(volume, mulai + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, mulai + durasi);
  osc.connect(gain).connect(c.destination);
  osc.start(mulai);
  osc.stop(mulai + durasi + 0.02);
}

/** Jeda minimum antarbunyi — cegah bunyi beruntun saat koneksi Bluetooth naik-turun cepat. */
function bolehBunyi(): boolean {
  const kini = Date.now();
  if (kini - terakhirBunyi < 250) return false;
  terakhirBunyi = kini;
  return true;
}

/** Bunyi "controller terhubung". Mengembalikan false kalau audio masih diblokir browser. */
export function bunyiTerhubung(): boolean {
  const c = ambilCtx();
  if (!c || c.state !== "running") return false;
  if (!bolehBunyi()) return true;
  const t = c.currentTime + 0.02;
  nada(c, 523.25, t, 0.16, "sine", 0.25); // C5
  nada(c, 659.25, t + 0.1, 0.16, "sine", 0.25); // E5
  nada(c, 783.99, t + 0.2, 0.3, "sine", 0.28); // G5
  return true;
}

/** Bunyi "controller terputus". Mengembalikan false kalau audio masih diblokir browser. */
export function bunyiTerputus(): boolean {
  const c = ambilCtx();
  if (!c || c.state !== "running") return false;
  if (!bolehBunyi()) return true;
  const t = c.currentTime + 0.02;
  nada(c, 392.0, t, 0.22, "triangle", 0.3); // G4
  nada(c, 261.63, t + 0.18, 0.4, "triangle", 0.32); // C4
  return true;
}
