"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  analisaDiam,
  analisaPutar,
  analisaTombol,
  analisaTrigger,
  susunLaporan,
  namaTombol,
  STICK,
  AMBANG,
  type Sampel,
  type Temuan,
  type Tingkat,
  type Laporan,
  type HasilPutarStick,
} from "@/lib/maintenance/gamepad-doctor";

/**
 * "Dokter Stik": indikator live (tekanan tombol, posisi & keseimbangan analog) + pemeriksaan
 * terpandu 4 langkah yang menghasilkan skor, analisa kerusakan, dan rekomendasi servis.
 * Seluruh perhitungan ada di lib/maintenance/gamepad-doctor.ts (teruji); komponen ini hanya
 * merekam navigator.getGamepads() dan menampilkan hasilnya.
 */

export interface SnapshotLive {
  index: number;
  id: string;
  mapping: string;
  buttons: { pressed: boolean; value: number }[];
  axes: number[];
}

const pct = (n: number) => `${Math.round((n ?? 0) * 100)}%`;

const WARNA_TINGKAT: Record<Tingkat, string> = {
  ok: "border-emerald-500/30 bg-emerald-500/5 text-emerald-300",
  ringan: "border-sky-500/30 bg-sky-500/5 text-sky-300",
  sedang: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  berat: "border-red-500/40 bg-red-500/10 text-red-300",
  belum: "border-neutral-600 bg-neutral-800/40 text-neutral-300",
};
const LABEL_TINGKAT: Record<Tingkat, string> = { ok: "Baik", ringan: "Ringan", sedang: "Sedang", berat: "Berat", belum: "Belum sah" };

/* ================= INDIKATOR LIVE ================= */

/** Plot lingkaran stick: titik sekarang, jejak 1 detik terakhir, dan garis-tepi terjauh yang pernah dicapai. */
function PlotStick({ x, y, jejak, tepi, label }: { x: number; y: number; jejak: [number, number][]; tepi: number[]; label: string }) {
  const R = 60, C = 70;
  const titikTepi = tepi
    .map((r, i) => {
      if (!r) return null;
      const a = ((i + 0.5) / tepi.length) * 2 * Math.PI;
      return `${C + Math.cos(a) * Math.min(r, 1.3) * R},${C + Math.sin(a) * Math.min(r, 1.3) * R}`;
    })
    .filter(Boolean)
    .join(" ");
  const r = Math.hypot(x, y);
  const sudut = (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
  return (
    <div className="text-center">
      <svg viewBox="0 0 140 140" className="w-36 h-36 mx-auto">
        <circle cx={C} cy={C} r={R} fill="#14141c" stroke="#3a3a46" />
        <circle cx={C} cy={C} r={R * AMBANG.DRIFT.ringan * 2} fill="none" stroke="#3ee08a55" strokeDasharray="2,2" />
        <line x1={C - R} y1={C} x2={C + R} y2={C} stroke="#26262f" />
        <line x1={C} y1={C - R} x2={C} y2={C + R} stroke="#26262f" />
        {titikTepi && <polygon points={titikTepi} fill="none" stroke="#e0a83e" strokeWidth={1.2} opacity={0.8} />}
        {jejak.length > 1 && (
          <polyline points={jejak.map(([jx, jy]) => `${C + jx * R},${C + jy * R}`).join(" ")} fill="none" stroke="#4aa3ff" strokeWidth={1} opacity={0.45} />
        )}
        <circle cx={C + Math.max(-1.2, Math.min(1.2, x)) * R} cy={C + Math.max(-1.2, Math.min(1.2, y)) * R} r={5} fill="#4aa3ff" stroke="#dbeeff" />
      </svg>
      <div className="text-[11px] text-neutral-400">{label}</div>
      <div className="font-mono text-[10px] text-neutral-500">
        X {x.toFixed(3)} · Y {y.toFixed(3)} · r {pct(r)} · {Math.round(sudut)}°
      </div>
    </div>
  );
}

function Bar({ label, value, tanda }: { label: string; value: number; tanda?: boolean }) {
  const v = Math.max(0, Math.min(1, value));
  const warna = v >= AMBANG.TEKANAN_PENUH ? "bg-emerald-400" : v > 0.05 ? "bg-amber-400" : "bg-neutral-700";
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className={`w-28 shrink-0 truncate ${tanda ? "text-neutral-200" : "text-neutral-500"}`}>{label}</span>
      <div className="relative h-2 flex-1 rounded bg-neutral-800">
        <div className={`absolute left-0 top-0 h-2 rounded ${warna}`} style={{ width: `${v * 100}%` }} />
        <div className="absolute top-0 h-2 w-px bg-emerald-300/60" style={{ left: `${AMBANG.TEKANAN_PENUH * 100}%` }} />
      </div>
      <span className="w-9 text-right font-mono text-neutral-400">{pct(v)}</span>
    </div>
  );
}

/** Bar dua arah −1..+1 untuk keseimbangan satu sumbu. */
function BarSumbu({ label, value, min, max }: { label: string; value: number; min: number; max: number }) {
  const v = Math.max(-1, Math.min(1, value));
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-28 shrink-0 text-neutral-500">{label}</span>
      <div className="relative h-2 flex-1 rounded bg-neutral-800">
        <div className="absolute top-0 h-2 w-px bg-neutral-500" style={{ left: "50%" }} />
        {/* jangkauan terjauh yang pernah tercapai di sesi ini */}
        <div className="absolute top-0 h-2 rounded bg-amber-500/25" style={{ left: `${50 - Math.min(1, min) * 50}%`, width: `${(Math.min(1, min) + Math.min(1, max)) * 50}%` }} />
        <div className="absolute top-0 h-2 w-1.5 -ml-[3px] rounded bg-sky-400" style={{ left: `${50 + v * 50}%` }} />
      </div>
      <span className="w-24 text-right font-mono text-neutral-400">{v.toFixed(3)} <span className="text-neutral-600">(−{pct(min)}/+{pct(max)})</span></span>
    </div>
  );
}

export function IndikatorLive({ snap, standar }: { snap: SnapshotLive; standar: boolean }) {
  const jejak = useRef<{ t: number; a: number[] }[]>([]);
  const tepi = useRef<number[][]>([new Array(32).fill(0), new Array(32).fill(0)]);
  const ekstrem = useRef<{ min: number; max: number }[]>([0, 1, 2, 3].map(() => ({ min: 0, max: 0 })));

  const now = typeof performance !== "undefined" ? performance.now() : 0;
  jejak.current.push({ t: now, a: [...snap.axes] });
  while (jejak.current.length && now - jejak.current[0].t > 1000) jejak.current.shift();
  STICK.forEach((s, k) => {
    const x = snap.axes[s.x] ?? 0, y = snap.axes[s.y] ?? 0;
    const r = Math.hypot(x, y);
    if (r > 0.3) {
      const sudut = (Math.atan2(y, x) + 2 * Math.PI) % (2 * Math.PI);
      const i = Math.min(31, Math.floor((sudut / (2 * Math.PI)) * 32));
      if (r > tepi.current[k][i]) tepi.current[k][i] = r;
    }
  });
  snap.axes.slice(0, 4).forEach((v, i) => {
    const e = ekstrem.current[i];
    if (-v > e.min) e.min = -v;
    if (v > e.max) e.max = v;
  });

  const reset = () => {
    tepi.current = [new Array(32).fill(0), new Array(32).fill(0)];
    ekstrem.current = [0, 1, 2, 3].map(() => ({ min: 0, max: 0 }));
  };

  const sumbuTambahan = snap.axes.slice(4);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-neutral-200">Indikator live</h4>
        <button className="text-[11px] text-neutral-500 hover:text-neutral-300" onClick={reset}>Reset garis-tepi</button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {STICK.map((s, k) => (
          <PlotStick
            key={s.nama}
            x={snap.axes[s.x] ?? 0}
            y={snap.axes[s.y] ?? 0}
            jejak={jejak.current.map((j) => [j.a[s.x] ?? 0, j.a[s.y] ?? 0] as [number, number])}
            tepi={tepi.current[k]}
            label={s.nama}
          />
        ))}
      </div>
      <p className="text-[10px] text-neutral-600 text-center">
        Lingkaran putus-putus hijau = batas toleransi titik tengah. Garis oranye = tepi terjauh yang pernah dicapai; putar stick mentok melingkar — garisnya harus membulat penuh tanpa lekukan.
      </p>

      <div className="space-y-1">
        <div className="text-[10px] uppercase tracking-wide text-neutral-500">Keseimbangan analog (nilai sekarang · jangkauan terjauh kiri/atas vs kanan/bawah)</div>
        <BarSumbu label="Kiri X (kiri↔kanan)" value={snap.axes[0] ?? 0} {...ekstrem.current[0]} />
        <BarSumbu label="Kiri Y (atas↔bawah)" value={snap.axes[1] ?? 0} {...ekstrem.current[1]} />
        <BarSumbu label="Kanan X (kiri↔kanan)" value={snap.axes[2] ?? 0} {...ekstrem.current[2]} />
        <BarSumbu label="Kanan Y (atas↔bawah)" value={snap.axes[3] ?? 0} {...ekstrem.current[3]} />
      </div>

      <div className="space-y-1">
        <div className="text-[10px] uppercase tracking-wide text-neutral-500">Tingkat tekanan tombol (garis hijau = batas tekanan penuh {pct(AMBANG.TEKANAN_PENUH)})</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
          {snap.buttons.map((b, i) => (
            <Bar key={i} label={namaTombol(i, standar)} value={b.value || (b.pressed ? 1 : 0)} tanda={b.pressed} />
          ))}
        </div>
        {sumbuTambahan.length > 0 && (
          <div className="mt-2 space-y-1">
            <div className="text-[10px] uppercase tracking-wide text-neutral-500">Sumbu tambahan (tekanan tombol PS3 pada mode driver tertentu, sensor, dsb.)</div>
            {sumbuTambahan.map((v, i) => (
              <Bar key={i} label={`Sumbu #${i + 4}`} value={Math.abs(v)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= PEMERIKSAAN TERPANDU ================= */

type Langkah = "siap" | "diam" | "putar" | "tombol" | "trigger" | "hasil";

const INFO_LANGKAH: Record<Exclude<Langkah, "siap" | "hasil">, { judul: string; instruksi: string; detik?: number }> = {
  diam: { judul: "1. Uji diam", instruksi: "Letakkan stik di meja. JANGAN sentuh stick maupun tombol sampai hitungan selesai.", detik: 5 },
  putar: { judul: "2. Uji putar", instruksi: "Putar KEDUA stick mentok ke tepi, melingkar pelan, minimal 3 putaran searah jarum jam lalu 3 putaran berlawanan.", detik: 10 },
  tombol: { judul: "3. Uji tombol & tekanan", instruksi: "Tekan SETIAP tombol satu per satu sampai mentok (termasuk D-pad, L3/R3, Select, Start, tombol PS). Tombol yang sudah terbaca berubah hijau. Tekan Selesai bila semua sudah." },
  trigger: { judul: "4. Uji trigger L2/R2", instruksi: "Tarik L2 dan R2 PERLAHAN dari lepas sampai mentok, lalu lepas pelan. Ulangi 3 kali.", detik: 8 },
};

function useRekaman(indexGamepad: number) {
  const buf = useRef<Sampel[]>([]);
  const aktif = useRef(false);
  const raf = useRef<number | null>(null);

  const mulai = () => {
    buf.current = [];
    aktif.current = true;
    const tick = () => {
      if (!aktif.current) return;
      const g = navigator.getGamepads ? navigator.getGamepads()[indexGamepad] : null;
      if (g) buf.current.push({ t: performance.now(), axes: [...g.axes], buttons: g.buttons.map((b) => ({ pressed: b.pressed, value: b.value })) });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };
  const berhenti = () => {
    aktif.current = false;
    if (raf.current) cancelAnimationFrame(raf.current);
    return buf.current;
  };
  useEffect(() => () => { aktif.current = false; if (raf.current) cancelAnimationFrame(raf.current); }, []);
  return { mulai, berhenti, buf };
}

export function PemeriksaanTerpandu({ snap, standar, labelController }: { snap: SnapshotLive; standar: boolean; labelController: string }) {
  const [langkah, setLangkah] = useState<Langkah>("siap");
  const [sisa, setSisa] = useState(0);
  const [hasil, setHasil] = useState<Temuan[]>([]);
  const [putar, setPutar] = useState<HasilPutarStick[]>([]);
  const [laporan, setLaporan] = useState<Laporan | null>(null);
  const rek = useRekaman(snap.index);
  const kumpul = useRef<Temuan[]>([]);

  const URUTAN: Langkah[] = standar ? ["diam", "putar", "tombol", "trigger"] : ["diam", "putar", "tombol"];

  const selesaiLangkah = (l: Langkah) => {
    const s = rek.berhenti();
    let t: Temuan[] = [];
    if (l === "diam") t = analisaDiam(s, standar).temuan;
    if (l === "putar") {
      const p = analisaPutar(s);
      t = p.temuan;
      setPutar(p.stick);
    }
    if (l === "tombol") t = analisaTombol(s, standar).temuan;
    if (l === "trigger") t = analisaTrigger(s, standar).temuan;
    kumpul.current = [...kumpul.current, ...t];
    const i = URUTAN.indexOf(l);
    const berikut = URUTAN[i + 1];
    if (berikut) jalankan(berikut);
    else {
      setHasil(kumpul.current);
      setLaporan(susunLaporan(kumpul.current));
      setLangkah("hasil");
    }
  };

  const jalankan = (l: Langkah) => {
    setLangkah(l);
    rek.mulai();
    const info = INFO_LANGKAH[l as keyof typeof INFO_LANGKAH];
    if (info?.detik) setSisa(info.detik);
  };

  // Hitung mundur untuk langkah berwaktu.
  useEffect(() => {
    if (langkah === "siap" || langkah === "hasil" || langkah === "tombol") return;
    if (sisa <= 0) {
      selesaiLangkah(langkah);
      return;
    }
    const id = setTimeout(() => setSisa((n) => n - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sisa, langkah]);

  const mulaiSemua = () => {
    kumpul.current = [];
    setHasil([]);
    setLaporan(null);
    setPutar([]);
    jalankan("diam");
  };

  if (langkah === "siap") {
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-neutral-200">Pemeriksaan terpandu (Dokter Stik)</h4>
        <p className="text-xs text-neutral-400">
          4 langkah ± 1 menit: uji diam (drift & jitter), uji putar (jangkauan, keseimbangan, dead spot), uji tombol (respons, tekanan, bouncing){standar ? ", dan uji trigger L2/R2" : ""}. Hasilnya skor, analisa kerusakan, dan rekomendasi servis.
        </p>
        {!standar && <p className="text-[11px] text-amber-400">Mapping non-standar: uji trigger dilewati dan nama tombol ditampilkan sebagai nomor.</p>}
        <Button className="text-xs" onClick={mulaiSemua}>Mulai Pemeriksaan</Button>
      </div>
    );
  }

  if (langkah !== "hasil") {
    const info = INFO_LANGKAH[langkah];
    const sudah = new Set<number>();
    if (langkah === "tombol") rek.buf.current.forEach((s) => s.buttons.forEach((b, i) => b.pressed && sudah.add(i)));
    return (
      <div className="space-y-3 rounded-lg border border-sky-500/30 bg-sky-500/5 p-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-sky-300">{info.judul}</h4>
          {info.detik && <span className="font-mono text-2xl text-sky-200">{sisa}</span>}
        </div>
        <p className="text-sm text-neutral-200">{info.instruksi}</p>
        {langkah === "tombol" && (
          <>
            <div className="flex flex-wrap gap-1.5">
              {snap.buttons.map((_, i) => (
                <span key={i} className={`rounded px-2 py-0.5 text-[11px] ${sudah.has(i) ? "bg-emerald-500/20 text-emerald-300" : "bg-neutral-800 text-neutral-500"}`}>
                  {namaTombol(i, standar)}
                </span>
              ))}
            </div>
            <Button className="text-xs" onClick={() => selesaiLangkah("tombol")}>Selesai</Button>
          </>
        )}
        <button className="text-[11px] text-neutral-500 hover:text-neutral-300" onClick={() => { rek.berhenti(); setLangkah("siap"); }}>Batalkan pemeriksaan</button>
      </div>
    );
  }

  // HASIL
  if (!laporan) return null;
  const warnaVonis = laporan.vonis === "layak" ? "text-emerald-300 border-emerald-500/40" : laporan.vonis === "catatan" ? "text-amber-300 border-amber-500/40" : laporan.vonis === "tidak_layak" ? "text-red-300 border-red-500/40" : "text-neutral-300 border-neutral-600";
  const baik = hasil.filter((t) => t.tingkat === "ok");
  return (
    <div className="space-y-3 laporan-dokter-stik">
      <div className={`rounded-lg border p-3 ${warnaVonis}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-neutral-500">Hasil pemeriksaan · {labelController} · {new Date().toLocaleString("id-ID")}</div>
            <div className="text-lg font-semibold">{laporan.judulVonis}</div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{laporan.skor}</div>
            <div className="text-[10px] text-neutral-500">skor kesehatan / 100</div>
          </div>
        </div>
        <p className="mt-1 text-xs text-neutral-300">{laporan.saranVonis}</p>
      </div>

      {putar.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
          {putar.map((p) => (
            <div key={p.nama} className="rounded-lg bg-black/30 px-3 py-2">
              <div className="font-medium text-neutral-300">{p.nama} — jangkauan & keseimbangan</div>
              <div className="mt-1 grid grid-cols-4 gap-1 text-center font-mono">
                <div><div className="text-neutral-500">Kiri</div>{pct(p.kiri)}</div>
                <div><div className="text-neutral-500">Kanan</div>{pct(p.kanan)}</div>
                <div><div className="text-neutral-500">Atas</div>{pct(p.atas)}</div>
                <div><div className="text-neutral-500">Bawah</div>{pct(p.bawah)}</div>
              </div>
              <div className="mt-1 text-neutral-500">Arah tersentuh {p.sektorTersentuh}/{AMBANG.SEKTOR} · radius tepi rata-rata {pct(p.rataRadiusLuar)}</div>
            </div>
          ))}
        </div>
      )}

      {laporan.masalah.length === 0 && laporan.vonis !== "belum_lengkap" && <p className="text-sm text-emerald-300">Tidak ditemukan kerusakan.</p>}

      <div className="space-y-2">
        {laporan.temuan.filter((t) => t.tingkat !== "ok").map((t, i) => (
          <div key={i} className={`rounded-lg border px-3 py-2 ${WARNA_TINGKAT[t.tingkat]}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium">{t.komponen}: {t.judul}</span>
              <span className="rounded bg-black/30 px-1.5 py-0.5 text-[10px]">{LABEL_TINGKAT[t.tingkat]}</span>
            </div>
            <div className="text-xs text-neutral-300">{t.detail}</div>
            {t.penyebab && <div className="mt-1 text-xs text-neutral-400"><span className="text-neutral-500">Kemungkinan penyebab:</span> {t.penyebab}</div>}
            {t.rekomendasi && <div className="mt-0.5 text-xs text-neutral-200"><span className="text-neutral-500">Rekomendasi:</span> {t.rekomendasi}</div>}
          </div>
        ))}
      </div>

      {baik.length > 0 && (
        <details className="text-xs text-neutral-400">
          <summary className="cursor-pointer text-neutral-500">Bagian yang normal ({baik.length})</summary>
          <ul className="mt-1 space-y-0.5 pl-4 list-disc">
            {baik.map((t, i) => <li key={i}>{t.komponen}: {t.judul} — {t.detail}</li>)}
          </ul>
        </details>
      )}

      <p className="text-[10px] text-neutral-600">
        Diukur dari nilai yang dilaporkan controller ke browser (bukan alat ukur listrik). Tidak mencakup baterai, getaran, sensor gerak, dan port charge. Stik PS3 lewat driver mode XInput tidak
        melaporkan tekanan tombol wajah/D-pad. Ambang adalah ambang praktis servis stik rental, bukan standar pabrik.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button className="text-xs" onClick={mulaiSemua}>Ulangi Pemeriksaan</Button>
        <Button variant="ghost" className="text-xs" onClick={() => window.print()}>Cetak / Simpan PDF</Button>
        <button className="text-xs text-neutral-500" onClick={() => setLangkah("siap")}>Tutup</button>
      </div>
    </div>
  );
}
