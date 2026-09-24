import { describe, it, expect } from "vitest";
import { analisaDiam, analisaPutar, analisaTombol, analisaTrigger, susunLaporan, AMBANG, type Sampel, type Temuan } from "./gamepad-doctor";

const KOSONG = () => Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));

/** n sampel tiap 10 ms dengan sumbu & tombol dari fungsi pembangkit. */
function rekam(n: number, f: (i: number) => { axes?: number[]; buttons?: { pressed: boolean; value: number }[] }): Sampel[] {
  return Array.from({ length: n }, (_, i) => {
    const r = f(i);
    return { t: i * 10, axes: r.axes ?? [0, 0, 0, 0], buttons: r.buttons ?? KOSONG() };
  });
}

const temuanDari = (xs: Temuan[], kode: string, komponen?: string) =>
  xs.find((t) => t.kode === kode && (!komponen || t.komponen === komponen));

describe("analisaDiam", () => {
  it("stick bersih di tengah → drift ok, tanpa noise", () => {
    const { temuan, stick } = analisaDiam(rekam(400, () => ({})), true);
    expect(stick).toHaveLength(2);
    expect(temuanDari(temuan, "drift", "Stick kiri")?.tingkat).toBe("ok");
    expect(temuanDari(temuan, "noise")).toBeUndefined();
  });

  it("stick kiri bergeser 0,15 → drift sedang; 0,25 → berat", () => {
    const sedang = analisaDiam(rekam(400, () => ({ axes: [0.15, 0, 0, 0] })), true);
    expect(temuanDari(sedang.temuan, "drift", "Stick kiri")?.tingkat).toBe("sedang");
    const berat = analisaDiam(rekam(400, () => ({ axes: [0, -0.25, 0, 0] })), true);
    expect(temuanDari(berat.temuan, "drift", "Stick kiri")?.tingkat).toBe("berat");
    expect(temuanDari(berat.temuan, "drift", "Stick kanan")?.tingkat).toBe("ok");
  });

  it("nilai bergetar saat diam → noise terdeteksi", () => {
    const { temuan } = analisaDiam(rekam(400, (i) => ({ axes: [0, 0, i % 2 ? 0.06 : -0.06, 0] })), true);
    expect(temuanDari(temuan, "noise", "Stick kanan")?.tingkat).toBe("berat");
  });

  it("tombol terbaca ditekan tanpa disentuh → nyangkut (berat)", () => {
    const { temuan } = analisaDiam(
      rekam(400, () => {
        const b = KOSONG();
        b[0] = { pressed: true, value: 1 };
        return { buttons: b };
      }),
      true
    );
    expect(temuanDari(temuan, "tombol_nyangkut")?.tingkat).toBe("berat");
  });

  it("trigger R2 tidak kembali ke nol → trigger_diam", () => {
    const { temuan } = analisaDiam(
      rekam(400, () => {
        const b = KOSONG();
        b[7] = { pressed: false, value: 0.12 };
        return { buttons: b };
      }),
      true
    );
    expect(temuanDari(temuan, "trigger_diam")?.komponen).toBe("R2");
    expect(temuanDari(temuan, "tombol_nyangkut")).toBeUndefined();
  });

  it("rekaman terlalu singkat → belum", () => {
    const { temuan } = analisaDiam(rekam(50, () => ({})), true);
    expect(temuan[0].tingkat).toBe("belum");
  });
});

describe("analisaPutar", () => {
  /** Lingkaran radius r (bisa berbeda per arah), sekian putaran. */
  const lingkaran = (rKanan: number, rKiri = rKanan, rAtas = rKanan, rBawah = rKanan, putaran = 3) =>
    rekam(600, (i) => {
      const a = (i / 600) * putaran * 2 * Math.PI;
      const c = Math.cos(a), s = Math.sin(a);
      const x = c >= 0 ? c * rKanan : c * rKiri;
      const y = s >= 0 ? s * rBawah : s * rAtas;
      return { axes: [x, y, x, y] };
    });

  it("lingkaran penuh radius 1 → jangkauan ok, tanpa dead spot", () => {
    const { temuan, stick } = analisaPutar(lingkaran(1));
    expect(stick[0].sektorTersentuh).toBe(AMBANG.SEKTOR);
    expect(temuanDari(temuan, "jangkauan", "Stick kiri")?.tingkat).toBe("ok");
    expect(temuanDari(temuan, "dead_spot")).toBeUndefined();
    expect(temuanDari(temuan, "asimetri")).toBeUndefined();
  });

  it("kiri hanya 0,8 → jangkauan kurang ke kiri + tidak seimbang", () => {
    const { temuan } = analisaPutar(lingkaran(1, 0.8));
    const j = temuanDari(temuan, "jangkauan", "Stick kiri");
    expect(j?.tingkat).toBe("sedang");
    expect(j?.judul).toMatch(/kiri/);
    expect(temuanDari(temuan, "asimetri", "Stick kiri")?.tingkat).toBe("sedang");
  });

  it("stick tidak diputar penuh → belum (bukan vonis rusak)", () => {
    const setengah = rekam(600, (i) => {
      const a = (i / 600) * Math.PI; // hanya setengah lingkaran
      return { axes: [Math.cos(a), Math.sin(a), Math.cos(a), Math.sin(a)] };
    });
    const { temuan } = analisaPutar(setengah);
    expect(temuanDari(temuan, "putar_tidak_penuh")?.tingkat).toBe("belum");
    expect(temuanDari(temuan, "jangkauan")).toBeUndefined();
  });

  it("sudut tertentu hanya 0,6 → dead spot", () => {
    // Pita 85°–117° menutupi SELURUH sektor 90°–112,5° dengan margin. Batas yang pas di 90° gagal:
    // pembulatan floating-point membuat titik "89,999…°" (radius 1) oleh atan2 dihitung 90,000…°,
    // sehingga masuk sektor itu dan menutupi dead spot-nya.
    const s = rekam(600, (i) => {
      const a = (i / 600) * 3 * 2 * Math.PI;
      const deg = ((a * 180) / Math.PI) % 360;
      const r = deg >= 85 && deg < 117 ? 0.6 : 1;
      return { axes: [Math.cos(a) * r, Math.sin(a) * r, Math.cos(a), Math.sin(a)] };
    });
    const { temuan } = analisaPutar(s);
    expect(temuanDari(temuan, "dead_spot", "Stick kiri")).toBeDefined();
    expect(temuanDari(temuan, "dead_spot", "Stick kanan")).toBeUndefined();
  });
});

describe("analisaTombol", () => {
  const tekanSemua = (kecuali: number[] = [], nilaiMaks = 1) =>
    rekam(17 * 20, (i) => {
      const b = KOSONG();
      const idx = Math.floor(i / 20);
      if (!kecuali.includes(idx) && i % 20 < 10) b[idx] = { pressed: true, value: nilaiMaks };
      return { buttons: b };
    });

  it("semua tombol ditekan penuh → tanpa masalah", () => {
    const { temuan, tombol } = analisaTombol(tekanSemua(), true);
    expect(tombol.every((t) => t.pernahDitekan)).toBe(true);
    expect(temuan).toHaveLength(0);
  });

  it("tombol Circle tidak pernah terbaca → tombol_mati", () => {
    const { temuan } = analisaTombol(tekanSemua([1]), true);
    expect(temuanDari(temuan, "tombol_mati")?.komponen).toBe("Circle (O)");
  });

  it("mapping non-standar: slot tak ditekan tidak divonis rusak", () => {
    const { temuan } = analisaTombol(tekanSemua([5, 6, 7]), false);
    expect(temuanDari(temuan, "tombol_mati")).toBeUndefined();
  });

  it("tombol analog hanya 60% → tekanan kurang", () => {
    const { temuan } = analisaTombol(tekanSemua([], 0.6), true);
    expect(temuanDari(temuan, "tekanan_kurang")?.tingkat).toBe("sedang");
  });

  it("satu tekan terbaca ganda cepat → bouncing", () => {
    // pola 1,0,1,0,1,0,1 tiap 10 ms pada tombol 0
    const s = rekam(40, (i) => {
      const b = KOSONG();
      if (i < 8 && i % 2 === 0) b[0] = { pressed: true, value: 1 };
      return { buttons: b };
    });
    const { temuan } = analisaTombol(s, true);
    expect(temuanDari(temuan, "bounce", "Cross (X)")).toBeDefined();
  });
});

describe("analisaTrigger", () => {
  const tarik = (maks: number, langkah = 50) =>
    rekam(langkah * 2, (i) => {
      const b = KOSONG();
      const v = (Math.min(i, langkah) / langkah) * maks;
      b[6] = { pressed: v > 0.1, value: v };
      b[7] = { pressed: v > 0.1, value: v };
      return { buttons: b };
    });

  it("ditarik halus sampai penuh → ok", () => {
    const { temuan, trigger } = analisaTrigger(tarik(1), true);
    expect(trigger[0].jumlahLevel).toBeGreaterThan(20);
    expect(temuan.filter((t) => t.tingkat !== "ok")).toHaveLength(0);
  });

  it("maksimum 0,8 → tidak bisa penuh (ringan)", () => {
    const { temuan } = analisaTrigger(tarik(0.8), true);
    expect(temuanDari(temuan, "trigger_penuh", "L2")?.tingkat).toBe("ringan");
  });

  it("tidak pernah ditarik → trigger_mati", () => {
    const { temuan } = analisaTrigger(rekam(100, () => ({})), true);
    expect(temuanDari(temuan, "trigger_mati", "R2")).toBeDefined();
  });

  it("mapping non-standar → dilewati", () => {
    expect(analisaTrigger(tarik(1), false).trigger).toHaveLength(0);
  });
});

describe("susunLaporan", () => {
  it("tanpa masalah → layak, skor 100", () => {
    const l = susunLaporan([{ kode: "drift", komponen: "Stick kiri", tingkat: "ok", judul: "", detail: "" }]);
    expect(l.skor).toBe(100);
    expect(l.vonis).toBe("layak");
  });
  it("satu masalah berat → tidak layak walau skor 70", () => {
    const l = susunLaporan([{ kode: "drift", komponen: "Stick kiri", tingkat: "berat", judul: "", detail: "" }]);
    expect(l.skor).toBe(70);
    expect(l.vonis).toBe("tidak_layak");
  });
  it("dua masalah sedang → layak dengan catatan", () => {
    const l = susunLaporan([
      { kode: "a", komponen: "x", tingkat: "sedang", judul: "", detail: "" },
      { kode: "b", komponen: "y", tingkat: "ringan", judul: "", detail: "" },
    ]);
    expect(l.skor).toBe(80);
    expect(l.vonis).toBe("catatan");
  });
  it("ada langkah belum sah dan tanpa masalah berat → belum lengkap", () => {
    const l = susunLaporan([{ kode: "putar_tidak_penuh", komponen: "Stick kiri", tingkat: "belum", judul: "", detail: "" }]);
    expect(l.vonis).toBe("belum_lengkap");
  });
});
