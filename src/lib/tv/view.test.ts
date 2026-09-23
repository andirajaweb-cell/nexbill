import { describe, it, expect } from "vitest";
import { computeUnitView, effectiveElapsedMs, formatDuration, isNightMode, nightDimOpacity, type TvSessionInput } from "./view";

/**
 * Yang diuji di sini adalah dua hal yang paling mudah salah TANPA KETAHUAN: batas mode malam yang
 * melewati tengah malam, dan sisa waktu pada sesi berdurasi tetap. Keduanya gagal dalam diam —
 * mode malam yang tidak pernah menyala tidak memunculkan galat apa pun, dan sisa waktu yang meleset
 * baru ketahuan saat pelanggan protes di depan kasir.
 */

// 2026-09-23 10:00 WIB = 03:00 UTC. Seluruh uji jam di bawah memakai instant UTC eksplisit, bukan
// waktu lokal mesin — kalau tidak, hasil uji akan berbeda antara laptop developer dan CI.
const wib = (h: number, m = 0) => new Date(Date.UTC(2026, 8, 23, h - 7, m, 0));

const session = (over: Partial<TvSessionInput> = {}): TvSessionInput => ({
  status: "running",
  startedAt: "2026-09-23T03:00:00.000Z",
  accumulatedPauseMs: 0,
  pausedAt: null,
  plannedMinutes: null,
  extendedMinutes: 0,
  ...over,
});

const at = (iso: string) => new Date(iso).getTime();

describe("effectiveElapsedMs", () => {
  it("menghitung waktu berjalan dikurangi jeda yang sudah dikreditkan", () => {
    const s = session({ accumulatedPauseMs: 10 * 60_000 });
    expect(effectiveElapsedMs(s, at("2026-09-23T04:00:00.000Z"))).toBe(50 * 60_000);
  });

  it("membekukan hitungan selama sesi masih dijeda", () => {
    // Dijeda pada menit ke-20. Satu jam kemudian, waktu berjalan harus TETAP 20 menit — bukan 80.
    const s = session({ status: "paused", pausedAt: "2026-09-23T03:20:00.000Z" });
    expect(effectiveElapsedMs(s, at("2026-09-23T04:20:00.000Z"))).toBe(20 * 60_000);
  });

  it("tidak pernah negatif meski jam TV lebih lambat dari server", () => {
    expect(effectiveElapsedMs(session(), at("2026-09-23T02:00:00.000Z"))).toBe(0);
  });
});

describe("computeUnitView", () => {
  it("tanpa sesi, status unit yang menentukan", () => {
    expect(computeUnitView("available", null, Date.now()).status).toBe("available");
    expect(computeUnitView("maintenance", null, Date.now()).status).toBe("maintenance");
  });

  it('unit "booked" tetap ditampilkan TERSEDIA — dari depan TV, bilik itu memang masih kosong', () => {
    expect(computeUnitView("booked", null, Date.now()).status).toBe("available");
  });

  it("sesi terbuka tidak punya sisa waktu, hanya waktu berjalan", () => {
    const view = computeUnitView("occupied", session({ plannedMinutes: 0 }), at("2026-09-23T03:30:00.000Z"));
    expect(view.status).toBe("occupied");
    expect(view.remainingSeconds).toBeNull();
    expect(view.elapsedSeconds).toBe(1800);
  });

  it("sesi berdurasi tetap menghitung mundur, termasuk perpanjangan", () => {
    const view = computeUnitView("occupied", session({ plannedMinutes: 60, extendedMinutes: 30 }), at("2026-09-23T03:30:00.000Z"));
    expect(view.remainingSeconds).toBe(60 * 60); // 90 menit total - 30 menit berjalan
    expect(view.isOvertime).toBe(false);
  });

  it("sesi lewat waktu berhenti di nol dan ditandai overtime — tidak pernah tampil angka minus", () => {
    const view = computeUnitView("occupied", session({ plannedMinutes: 60 }), at("2026-09-23T04:30:00.000Z"));
    expect(view.remainingSeconds).toBe(0);
    expect(view.isOvertime).toBe(true);
    expect(view.elapsedSeconds).toBe(90 * 60);
  });

  it("sesi dijeda dilaporkan sebagai paused, bukan occupied", () => {
    const view = computeUnitView("occupied", session({ status: "paused", pausedAt: "2026-09-23T03:10:00.000Z", plannedMinutes: 60 }), at("2026-09-23T05:00:00.000Z"));
    expect(view.status).toBe("paused");
    expect(view.remainingSeconds).toBe(50 * 60); // beku di menit ke-10
  });
});

describe("isNightMode", () => {
  it("rentang biasa dalam satu hari", () => {
    expect(isNightMode(13, 15, wib(14))).toBe(true);
    expect(isNightMode(13, 15, wib(12))).toBe(false);
    expect(isNightMode(13, 15, wib(15))).toBe(false); // batas akhir eksklusif
  });

  it("RENTANG MELEWATI TENGAH MALAM — inilah kasus yang dibuatkan fungsi ini", () => {
    // 23 -> 6. Perbandingan naif `hour >= 23 && hour < 6` selalu false, jadi mode malam tidak akan
    // pernah menyala sama sekali. Empat penegasan berikut yang menjaganya.
    expect(isNightMode(23, 6, wib(23, 30))).toBe(true);
    expect(isNightMode(23, 6, wib(2))).toBe(true);
    expect(isNightMode(23, 6, wib(5, 59))).toBe(true);
    expect(isNightMode(23, 6, wib(6))).toBe(false);
    expect(isNightMode(23, 6, wib(14))).toBe(false);
  });

  it("mulai dan selesai sama diperlakukan sebagai TIDAK PERNAH, bukan selalu", () => {
    // Layar yang gelap seharian karena salah ketik jauh lebih merepotkan daripada yang tak pernah redup.
    expect(isNightMode(22, 22, wib(22, 30))).toBe(false);
    expect(isNightMode(22, 22, wib(3))).toBe(false);
  });

  it("memakai jam WIB, bukan jam UTC", () => {
    // 20:00 UTC = 03:00 WIB keesokan harinya — masuk rentang malam 23->6 menurut jam outlet,
    // sedangkan menurut jam UTC (20) tidak. Kalau uji ini gagal, fungsinya membaca jam server.
    expect(isNightMode(23, 6, new Date("2026-09-23T20:00:00.000Z"))).toBe(true);
  });
});

describe("nightDimOpacity", () => {
  it("nol saat mode malam dimatikan", () => {
    expect(nightDimOpacity(false, 60, 23, 6, wib(2))).toBe(0);
  });

  it("nol di luar jam malam", () => {
    expect(nightDimOpacity(true, 60, 23, 6, wib(14))).toBe(0);
  });

  it("meredupkan sesuai persentase di dalam jam malam", () => {
    expect(nightDimOpacity(true, 60, 23, 6, wib(2))).toBeCloseTo(0.6);
  });

  it("tidak pernah mencapai hitam total — supaya TV tidak dikira mati lalu dicabut", () => {
    expect(nightDimOpacity(true, 100, 23, 6, wib(2))).toBeCloseTo(0.9);
    expect(nightDimOpacity(true, -20, 23, 6, wib(2))).toBe(0);
  });
});

describe("formatDuration", () => {
  it("menampilkan jam hanya bila memang ada", () => {
    expect(formatDuration(5130)).toBe("01:25:30");
    expect(formatDuration(1530)).toBe("25:30");
    expect(formatDuration(0)).toBe("00:00");
  });

  it("null menjadi placeholder, bukan NaN di layar pelanggan", () => {
    expect(formatDuration(null)).toBe("--:--");
    expect(formatDuration(Number.NaN)).toBe("--:--");
  });
});
