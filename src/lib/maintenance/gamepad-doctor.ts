/**
 * "Dokter Stik" — analisa kesehatan controller dari rekaman Gamepad API.
 *
 * Modul murni (tanpa DOM/React) supaya setiap ambang dan diagnosanya bisa diuji
 * (gamepad-doctor.test.ts). Layar merekam sampel mentah navigator.getGamepads() selama beberapa
 * langkah uji, lalu menyerahkannya ke fungsi-fungsi di sini.
 *
 * SEBERAPA BISA DIPERCAYA — ditulis terang-terangan karena hasilnya dipakai memutuskan stik
 * boleh disewakan atau tidak:
 *   - Nilai stick/trigger/tombol adalah nilai yang DILAPORKAN controller lewat driver ke browser,
 *     bukan pengukuran listrik langsung. Untuk DualShock 4 / DualSense lewat USB atau Bluetooth di
 *     Chrome/Edge, itu nilai mentah hardware (resolusi 8-bit, langkah ±0,008) tanpa deadzone —
 *     cukup untuk drift, jangkauan, keseimbangan, tombol mati/nyangkut, dan trigger.
 *   - DualShock 3 terbaca lewat driver (DsHidMini mode XInput). Mode itu TIDAK meneruskan tekanan
 *     tombol wajah/D-pad; tombol-tombol itu terbaca 0/1. Stick dan L2/R2 tetap analog.
 *   - Yang TIDAK bisa diukur dari browser: baterai, getaran, sensor gerak, port charge, tegangan.
 *   - Ambang di AMBANG adalah ambang praktis servis stik rental, bukan standar pabrik Sony.
 */

export interface SampelTombol {
  pressed: boolean;
  value: number;
}

export interface Sampel {
  /** performance.now() saat sampel diambil (ms). */
  t: number;
  axes: number[];
  buttons: SampelTombol[];
}

export type Tingkat = "ok" | "ringan" | "sedang" | "berat" | "belum";

export interface Temuan {
  kode: string;
  komponen: string;
  tingkat: Tingkat;
  judul: string;
  /** Angka yang terukur, dalam kalimat. */
  detail: string;
  penyebab?: string;
  rekomendasi?: string;
}

/* ================= AMBANG ================= */

export const AMBANG = {
  /** Pergeseran titik tengah saat stick dilepas (0 = tengah, 1 = mentok). */
  DRIFT: { ringan: 0.06, sedang: 0.12, berat: 0.2 },
  /** Simpangan baku getaran nilai saat diam. Kuantisasi 8-bit sendiri ≈ 0,004–0,008. */
  NOISE: { ringan: 0.012, sedang: 0.025, berat: 0.05 },
  /** Jangkauan terlemah dari 4 arah (atas/bawah/kiri/kanan) saat stick diputar mentok. */
  JANGKAUAN: { ringan: 0.95, sedang: 0.88, berat: 0.75 },
  /** Selisih jangkauan arah berlawanan (mis. kiri 0,98 vs kanan 0,80 = 0,18). */
  ASIMETRI: { ringan: 0.1, sedang: 0.18, berat: 0.3 },
  /** Sektor putaran dianggap "dead spot" bila radius maksimumnya di bawah ini. */
  DEAD_SPOT: 0.75,
  /** Jumlah sektor 360° untuk uji putar, dan minimal sektor yang harus tersentuh agar sah. */
  SEKTOR: 16,
  SEKTOR_MIN: 13,
  /** Trigger/tombol analog harus mencapai minimal ini saat ditekan penuh. */
  TEKANAN_PENUH: 0.9,
  /** Nilai trigger saat dilepas di atas ini = tidak kembali penuh. */
  TRIGGER_DIAM: 0.06,
  /** Dua kali "tekan" dalam jarak ini = pantulan kontak (bounce). */
  BOUNCE_MS: 45,
  /** Minimal durasi rekaman agar sah (ms). */
  DURASI_DIAM_MIN: 2500,
  DURASI_PUTAR_MIN: 3000,
} as const;

const BOBOT: Record<Tingkat, number> = { ok: 0, belum: 0, ringan: 5, sedang: 15, berat: 30 };

export const NAMA_TOMBOL_STANDAR = [
  "Cross (X)", "Circle (O)", "Square (□)", "Triangle (△)",
  "L1", "R1", "L2", "R2",
  "Select/Share", "Start/Options", "L3 (klik stick kiri)", "R3 (klik stick kanan)",
  "D-pad Atas", "D-pad Bawah", "D-pad Kiri", "D-pad Kanan", "Tombol PS/Home",
];

export function namaTombol(i: number, standar: boolean): string {
  return standar && NAMA_TOMBOL_STANDAR[i] ? NAMA_TOMBOL_STANDAR[i] : `Tombol #${i}`;
}

/* ================= STATISTIK DASAR ================= */

const rata = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const simpanganBaku = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = rata(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (xs.length - 1));
};
const bulat = (n: number, d = 2) => Number(n.toFixed(d));
const pct = (n: number) => `${Math.round(n * 100)}%`;

function tingkatNaik(nilai: number, a: { ringan: number; sedang: number; berat: number }): Tingkat {
  if (nilai >= a.berat) return "berat";
  if (nilai >= a.sedang) return "sedang";
  if (nilai >= a.ringan) return "ringan";
  return "ok";
}
/** Untuk ukuran yang makin KECIL makin buruk (jangkauan). */
function tingkatTurun(nilai: number, a: { ringan: number; sedang: number; berat: number }): Tingkat {
  if (nilai < a.berat) return "berat";
  if (nilai < a.sedang) return "sedang";
  if (nilai < a.ringan) return "ringan";
  return "ok";
}

export const STICK = [
  { nama: "Stick kiri", x: 0, y: 1 },
  { nama: "Stick kanan", x: 2, y: 3 },
] as const;

const durasi = (s: Sampel[]) => (s.length > 1 ? s[s.length - 1].t - s[0].t : 0);

/* ================= UJI 1: DIAM ================= */

export interface HasilDiamStick {
  nama: string;
  offsetX: number;
  offsetY: number;
  offset: number;
  noise: number;
}

/**
 * Stick & tombol TIDAK disentuh. Mengukur: pergeseran titik tengah (drift), getaran nilai
 * (noise — potensiometer kotor/aus), tombol yang terbaca ditekan sendiri (nyangkut), dan trigger
 * yang tidak kembali ke nol.
 */
export function analisaDiam(sampel: Sampel[], standar: boolean): { stick: HasilDiamStick[]; temuan: Temuan[] } {
  const temuan: Temuan[] = [];
  if (sampel.length < 10 || durasi(sampel) < AMBANG.DURASI_DIAM_MIN) {
    return { stick: [], temuan: [{ kode: "diam_kurang", komponen: "Uji diam", tingkat: "belum", judul: "Rekaman terlalu singkat", detail: "Ulangi uji diam minimal 3 detik tanpa menyentuh stik." }] };
  }

  const stick: HasilDiamStick[] = [];
  for (const s of STICK) {
    const xs = sampel.map((p) => p.axes[s.x]).filter((v) => typeof v === "number");
    const ys = sampel.map((p) => p.axes[s.y]).filter((v) => typeof v === "number");
    if (xs.length < 10 || ys.length < 10) continue;
    const offsetX = rata(xs);
    const offsetY = rata(ys);
    const offset = Math.hypot(offsetX, offsetY);
    const noise = Math.max(simpanganBaku(xs), simpanganBaku(ys));
    stick.push({ nama: s.nama, offsetX: bulat(offsetX, 3), offsetY: bulat(offsetY, 3), offset: bulat(offset, 3), noise: bulat(noise, 4) });

    const tDrift = tingkatNaik(offset, AMBANG.DRIFT);
    temuan.push({
      kode: "drift",
      komponen: s.nama,
      tingkat: tDrift,
      judul: tDrift === "ok" ? "Titik tengah normal" : "Drift (titik tengah bergeser)",
      detail: `Bergeser ${pct(offset)} dari tengah (X ${offsetX >= 0 ? "+" : ""}${bulat(offsetX, 2)}, Y ${offsetY >= 0 ? "+" : ""}${bulat(offsetY, 2)}).`,
      ...(tDrift === "ok"
        ? {}
        : {
            penyebab: "Potensiometer analog aus atau kotor, atau pegas pengembali stick melemah.",
            rekomendasi:
              tDrift === "ringan"
                ? "Masih tertutup deadzone kebanyakan game. Semprot contact cleaner ke celah stick sambil diputar-putar, lalu uji ulang."
                : tDrift === "sedang"
                  ? "Karakter bisa jalan sendiri di game yang deadzone-nya kecil. Bersihkan potensiometer (bongkar, contact cleaner/IPA 99%); bila tidak membaik, ganti modul analog."
                  : "Stik tidak layak disewakan. Ganti modul analog (potensiometer) — pertimbangkan modul Hall-effect yang tidak aus.",
          }),
    });

    const tNoise = tingkatNaik(noise, AMBANG.NOISE);
    if (tNoise !== "ok") {
      temuan.push({
        kode: "noise",
        komponen: s.nama,
        tingkat: tNoise,
        judul: "Nilai bergetar saat diam (jitter)",
        detail: `Simpangan nilai ${bulat(noise, 3)} padahal stick tidak disentuh.`,
        penyebab: "Jalur karbon potensiometer kotor/aus, solderan retak, atau kabel flex longgar.",
        rekomendasi: "Bersihkan potensiometer; periksa solderan kaki modul analog. Jika tetap bergetar, ganti modul analog.",
      });
    }
  }

  // Tombol yang terbaca ditekan tanpa disentuh.
  const nTombol = Math.max(0, ...sampel.map((p) => p.buttons.length));
  for (let i = 0; i < nTombol; i++) {
    const vals = sampel.map((p) => p.buttons[i]?.value ?? 0);
    const ditekan = sampel.filter((p) => p.buttons[i]?.pressed).length / sampel.length;
    const adalahTrigger = standar && (i === 6 || i === 7);
    if (adalahTrigger) {
      const diam = rata(vals);
      if (diam > AMBANG.TRIGGER_DIAM) {
        temuan.push({
          kode: "trigger_diam",
          komponen: namaTombol(i, standar),
          tingkat: diam > 0.25 ? "berat" : "sedang",
          judul: "Trigger tidak kembali penuh",
          detail: `Terbaca ${pct(diam)} padahal tidak ditekan.`,
          penyebab: "Pegas trigger lemah/patah, atau trigger tersangkut kotoran/casing.",
          rekomendasi: "Bersihkan sela trigger; ganti pegas trigger bila perlu.",
        });
      }
    } else if (ditekan > 0.5 || rata(vals) > 0.3) {
      temuan.push({
        kode: "tombol_nyangkut",
        komponen: namaTombol(i, standar),
        tingkat: "berat",
        judul: "Tombol terbaca ditekan sendiri (nyangkut)",
        detail: `Terbaca ditekan ${pct(ditekan)} waktu tanpa disentuh.`,
        penyebab: "Tombol macet oleh kotoran/tumpahan minuman, karet tombol robek, atau jalur PCB korsleting.",
        rekomendasi: "Bongkar, bersihkan tombol & PCB dengan IPA 99%, ganti karet konduktif. Jangan disewakan sebelum diperbaiki.",
      });
    }
  }

  return { stick, temuan };
}

/* ================= UJI 2: PUTAR ================= */

export interface HasilPutarStick {
  nama: string;
  kanan: number;
  kiri: number;
  bawah: number;
  atas: number;
  /** Radius maksimum per sektor (0 = sektor tidak tersentuh). */
  sektor: number[];
  sektorTersentuh: number;
  rataRadiusLuar: number;
}

/**
 * Stick diputar mentok melingkar beberapa kali. Mengukur: jangkauan tiap arah, keseimbangan kiri-
 * kanan & atas-bawah, dan "dead spot" (sudut yang tidak mencapai tepi).
 */
export function analisaPutar(sampel: Sampel[]): { stick: HasilPutarStick[]; temuan: Temuan[] } {
  const temuan: Temuan[] = [];
  if (sampel.length < 20 || durasi(sampel) < AMBANG.DURASI_PUTAR_MIN) {
    return { stick: [], temuan: [{ kode: "putar_kurang", komponen: "Uji putar", tingkat: "belum", judul: "Rekaman terlalu singkat", detail: "Ulangi: putar kedua stick mentok melingkar minimal 3 kali putaran." }] };
  }

  const stick: HasilPutarStick[] = [];
  for (const s of STICK) {
    let kanan = 0, kiri = 0, bawah = 0, atas = 0;
    const sektor = new Array<number>(AMBANG.SEKTOR).fill(0);
    for (const p of sampel) {
      const x = p.axes[s.x] ?? 0;
      const y = p.axes[s.y] ?? 0;
      if (x > kanan) kanan = x;
      if (-x > kiri) kiri = -x;
      if (y > bawah) bawah = y; // sumbu Y Gamepad API: positif = bawah
      if (-y > atas) atas = -y;
      const r = Math.hypot(x, y);
      if (r > 0.3) {
        const sudut = (Math.atan2(y, x) + 2 * Math.PI) % (2 * Math.PI);
        const k = Math.min(AMBANG.SEKTOR - 1, Math.floor((sudut / (2 * Math.PI)) * AMBANG.SEKTOR));
        if (r > sektor[k]) sektor[k] = r;
      }
    }
    const tersentuh = sektor.filter((r) => r > 0).length;
    const luar = sektor.filter((r) => r > 0);
    const hasil: HasilPutarStick = {
      nama: s.nama,
      kanan: bulat(Math.min(kanan, 1.5), 3),
      kiri: bulat(Math.min(kiri, 1.5), 3),
      bawah: bulat(Math.min(bawah, 1.5), 3),
      atas: bulat(Math.min(atas, 1.5), 3),
      sektor: sektor.map((r) => bulat(r, 3)),
      sektorTersentuh: tersentuh,
      rataRadiusLuar: bulat(rata(luar), 3),
    };
    stick.push(hasil);

    if (tersentuh < AMBANG.SEKTOR_MIN) {
      temuan.push({
        kode: "putar_tidak_penuh",
        komponen: s.nama,
        tingkat: "belum",
        judul: "Putaran belum lengkap",
        detail: `Baru ${tersentuh} dari ${AMBANG.SEKTOR} arah yang tersentuh. Ulangi dengan memutar mentok penuh melingkar.`,
      });
      continue;
    }

    const arah = [
      { n: "kanan", v: kanan },
      { n: "kiri", v: kiri },
      { n: "bawah", v: bawah },
      { n: "atas", v: atas },
    ];
    const terlemah = arah.reduce((a, b) => (b.v < a.v ? b : a));
    const tJ = tingkatTurun(terlemah.v, AMBANG.JANGKAUAN);
    temuan.push({
      kode: "jangkauan",
      komponen: s.nama,
      tingkat: tJ,
      judul: tJ === "ok" ? "Jangkauan penuh ke semua arah" : `Jangkauan kurang ke arah ${terlemah.n}`,
      detail: `Kanan ${pct(kanan)}, kiri ${pct(kiri)}, atas ${pct(atas)}, bawah ${pct(bawah)}.`,
      ...(tJ === "ok"
        ? {}
        : {
            penyebab: "Potensiometer aus di ujung jalurnya, atau gerak stick tertahan (casing/cincin karet/kotoran).",
            rekomendasi:
              tJ === "ringan"
                ? "Umumnya belum terasa di game. Bersihkan sela stick dan uji ulang."
                : "Karakter tidak bisa lari/berbelok penuh. Bersihkan; bila tetap, ganti modul analog.",
          }),
    });

    const asimX = Math.abs(kanan - kiri);
    const asimY = Math.abs(bawah - atas);
    const asim = Math.max(asimX, asimY);
    const tA = tingkatNaik(asim, AMBANG.ASIMETRI);
    if (tA !== "ok") {
      temuan.push({
        kode: "asimetri",
        komponen: s.nama,
        tingkat: tA,
        judul: "Keseimbangan analog tidak rata",
        detail: asimX >= asimY ? `Kanan ${pct(kanan)} vs kiri ${pct(kiri)} (selisih ${pct(asimX)}).` : `Atas ${pct(atas)} vs bawah ${pct(bawah)} (selisih ${pct(asimY)}).`,
        penyebab: "Potensiometer aus sebelah atau modul analog bengkok/miring setelah jatuh.",
        rekomendasi: "Periksa kedudukan modul analog; ganti modul bila selisih tetap ada setelah dibersihkan.",
      });
    }

    const dead = sektor.map((r, i) => ({ r, i })).filter((x) => x.r > 0 && x.r < AMBANG.DEAD_SPOT);
    if (dead.length > 0) {
      const derajat = dead.map((d) => Math.round((d.i * 360) / AMBANG.SEKTOR)).join("°, ") + "°";
      temuan.push({
        kode: "dead_spot",
        komponen: s.nama,
        tingkat: dead.length >= 3 ? "berat" : "sedang",
        judul: "Ada sudut yang tidak mencapai tepi (dead spot)",
        detail: `${dead.length} sektor di bawah ${pct(AMBANG.DEAD_SPOT)} (sekitar sudut ${derajat}).`,
        penyebab: "Jalur potensiometer tergerus di titik tertentu, atau ada benda/kotoran yang menahan gerak di arah itu.",
        rekomendasi: "Bersihkan; bila dead spot tetap di sudut yang sama, ganti modul analog.",
      });
    }
  }
  return { stick, temuan };
}

/* ================= UJI 3: TOMBOL & TEKANAN ================= */

export interface HasilTombol {
  index: number;
  nama: string;
  pernahDitekan: boolean;
  jumlahTekan: number;
  maxNilai: number;
  analog: boolean;
  bounce: number;
}

/**
 * Setiap tombol ditekan penuh beberapa kali. Mengukur: tombol yang tidak merespons, tekanan
 * maksimum (tombol analog/berbasis tekanan), dan pantulan kontak (satu tekan terbaca dua kali).
 */
export function analisaTombol(sampel: Sampel[], standar: boolean): { tombol: HasilTombol[]; temuan: Temuan[] } {
  const temuan: Temuan[] = [];
  const nTombol = Math.max(0, ...sampel.map((p) => p.buttons.length));
  const tombol: HasilTombol[] = [];

  for (let i = 0; i < nTombol; i++) {
    let sebelum = false;
    let lepasTerakhir = -Infinity;
    let jumlahTekan = 0;
    let bounce = 0;
    let maxNilai = 0;
    let analog = false;
    for (const p of sampel) {
      const b = p.buttons[i];
      if (!b) continue;
      if (b.value > maxNilai) maxNilai = b.value;
      if (b.value > 0.05 && b.value < 0.95) analog = true;
      if (b.pressed && !sebelum) {
        jumlahTekan++;
        if (p.t - lepasTerakhir < AMBANG.BOUNCE_MS) bounce++;
      }
      if (!b.pressed && sebelum) lepasTerakhir = p.t;
      sebelum = b.pressed;
    }
    const h: HasilTombol = { index: i, nama: namaTombol(i, standar), pernahDitekan: jumlahTekan > 0, jumlahTekan, maxNilai: bulat(maxNilai, 3), analog, bounce };
    tombol.push(h);

    if (!h.pernahDitekan) {
      // Mapping non-standar sering melaporkan "tombol" fiktif (slot kosong) — tanpa daftar tombol
      // yang pasti ada, tidak-ditekan tidak bisa dibedakan dari tidak-ada. Jangan vonis rusak.
      if (!standar) continue;
      temuan.push({
        kode: "tombol_mati",
        komponen: h.nama,
        tingkat: "sedang",
        judul: "Tidak merespons (atau belum ditekan)",
        detail: "Tidak pernah terbaca ditekan selama uji. Tekan sekali lagi dengan mantap; bila tetap tidak terbaca, tombol bermasalah.",
        penyebab: "Karet konduktif di bawah tombol aus/kotor, jalur PCB putus, atau (L1/R1) mikro-switch rusak.",
        rekomendasi: "Bersihkan pad PCB & karet dengan IPA 99%; ganti karet konduktif atau switch tombol.",
      });
      continue;
    }
    if (h.analog && h.maxNilai < AMBANG.TEKANAN_PENUH && !(standar && (i === 6 || i === 7))) {
      temuan.push({
        kode: "tekanan_kurang",
        komponen: h.nama,
        tingkat: h.maxNilai < 0.7 ? "sedang" : "ringan",
        judul: "Tidak mencapai tekanan penuh",
        detail: `Tekanan maksimum ${pct(h.maxNilai)}.`,
        penyebab: "Lapisan karbon di karet konduktif menipis (tombol berbasis tekanan).",
        rekomendasi: "Ganti karet konduktif tombol.",
      });
    }
    if (h.bounce >= 2) {
      temuan.push({
        kode: "bounce",
        komponen: h.nama,
        tingkat: h.bounce >= 4 ? "sedang" : "ringan",
        judul: "Satu tekan terbaca berkali-kali (bouncing)",
        detail: `${h.bounce} kali terbaca ganda dalam <${AMBANG.BOUNCE_MS} ms.`,
        penyebab: "Kontak tombol kotor/oksidasi atau karet konduktif retak.",
        rekomendasi: "Bersihkan pad PCB & karet tombol; ganti karet bila tetap.",
      });
    }
  }
  return { tombol, temuan };
}

/* ================= UJI 4: TRIGGER L2/R2 ================= */

export interface HasilTrigger {
  nama: string;
  maks: number;
  jumlahLevel: number;
  loncatanTerbesar: number;
}

/**
 * L2 & R2 ditarik perlahan dari lepas sampai penuh beberapa kali. Mengukur: bisa penuh atau tidak,
 * kehalusan (jumlah level berbeda yang terbaca), dan loncatan nilai (sensor kotor).
 * Hanya untuk mapping standar (indeks 6 & 7).
 */
export function analisaTrigger(sampel: Sampel[], standar: boolean): { trigger: HasilTrigger[]; temuan: Temuan[] } {
  const temuan: Temuan[] = [];
  const trigger: HasilTrigger[] = [];
  if (!standar) return { trigger, temuan };

  for (const i of [6, 7]) {
    const vals = sampel.map((p) => p.buttons[i]?.value ?? 0);
    const nama = namaTombol(i, true);
    const maks = Math.max(0, ...vals);
    const level = Array.from(new Set(vals.map((v) => Math.round(v * 100)))).sort((a, b) => a - b);
    let loncatan = 0;
    for (let k = 1; k < level.length; k++) loncatan = Math.max(loncatan, (level[k] - level[k - 1]) / 100);
    trigger.push({ nama, maks: bulat(maks, 3), jumlahLevel: level.length, loncatanTerbesar: bulat(loncatan, 2) });

    if (maks < 0.05) {
      temuan.push({
        kode: "trigger_mati",
        komponen: nama,
        tingkat: "sedang",
        judul: "Tidak terbaca (atau belum ditarik)",
        detail: "Nilai tidak pernah naik selama uji.",
        penyebab: "Sensor trigger rusak, kabel flex trigger lepas, atau karet konduktif trigger aus.",
        rekomendasi: "Periksa flex & sensor trigger; ganti bila perlu.",
      });
      continue;
    }
    const tP = maks < 0.7 ? "sedang" : maks < AMBANG.TEKANAN_PENUH ? "ringan" : "ok";
    temuan.push({
      kode: "trigger_penuh",
      komponen: nama,
      tingkat: tP,
      judul: tP === "ok" ? "Trigger mencapai tekanan penuh" : "Trigger tidak bisa ditarik penuh",
      detail: `Maksimum ${pct(maks)}, ${level.length} tingkat nilai berbeda terbaca.`,
      ...(tP === "ok" ? {} : { penyebab: "Sensor/karet trigger aus, atau gerak trigger tertahan casing.", rekomendasi: "Bersihkan dan periksa mekanik trigger; ganti sensor/karet trigger." }),
    });
    if (level.length >= 5 && loncatan > 0.35) {
      temuan.push({
        kode: "trigger_loncat",
        komponen: nama,
        tingkat: "ringan",
        judul: "Nilai trigger meloncat, tidak halus",
        detail: `Ada loncatan ${pct(loncatan)} sekaligus saat ditarik perlahan.`,
        penyebab: "Permukaan sensor/karet konduktif trigger kotor atau aus sebagian.",
        rekomendasi: "Bersihkan sensor trigger; ganti bila tetap meloncat.",
      });
    }
    if (level.length < 4 && maks >= AMBANG.TEKANAN_PENUH) {
      temuan.push({
        kode: "trigger_digital",
        komponen: nama,
        tingkat: "ok",
        judul: "Trigger terbaca digital (hanya on/off)",
        detail: "Hanya terbaca lepas/penuh. Normal bila ditarik cepat, atau pada stik KW/driver tertentu.",
      });
    }
  }
  return { trigger, temuan };
}

/* ================= RINGKASAN ================= */

export type Vonis = "layak" | "catatan" | "tidak_layak" | "belum_lengkap";

export interface Laporan {
  skor: number;
  vonis: Vonis;
  judulVonis: string;
  saranVonis: string;
  temuan: Temuan[];
  masalah: Temuan[];
}

const URUT: Record<Tingkat, number> = { berat: 0, sedang: 1, ringan: 2, belum: 3, ok: 4 };

export function susunLaporan(semua: Temuan[]): Laporan {
  const temuan = [...semua].sort((a, b) => URUT[a.tingkat] - URUT[b.tingkat]);
  const masalah = temuan.filter((t) => t.tingkat === "ringan" || t.tingkat === "sedang" || t.tingkat === "berat");
  const skor = Math.max(0, 100 - masalah.reduce((s, t) => s + BOBOT[t.tingkat], 0));
  const belum = temuan.some((t) => t.tingkat === "belum");
  const adaBerat = masalah.some((t) => t.tingkat === "berat");

  let vonis: Vonis;
  if (adaBerat || skor < 60) vonis = "tidak_layak";
  else if (belum) vonis = "belum_lengkap";
  else if (skor < 85) vonis = "catatan";
  else vonis = "layak";

  const JUDUL: Record<Vonis, [string, string]> = {
    layak: ["Layak disewakan", "Tidak ada masalah berarti. Ulangi pengecekan rutin tiap minggu atau setelah stik jatuh/terkena tumpahan."],
    catatan: ["Layak dengan catatan", "Masih bisa dipakai, tapi jadwalkan pembersihan/servis sebelum masalahnya memburuk dan dikeluhkan pelanggan."],
    tidak_layak: ["Tidak layak disewakan", "Tarik dari unit dan servis dulu. Pelanggan akan merasakan masalah ini dan bisa mengeluh atau meminta kompensasi."],
    belum_lengkap: ["Pengujian belum lengkap", "Beberapa langkah belum sah (terlalu singkat atau putaran belum penuh). Ulangi langkah bertanda \"Belum\" sebelum mengambil keputusan."],
  };
  return { skor, vonis, judulVonis: JUDUL[vonis][0], saranVonis: JUDUL[vonis][1], temuan, masalah };
}
