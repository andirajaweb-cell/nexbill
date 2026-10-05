import { describe, it, expect } from "vitest";
import { layoutBookingMap, mapWindow, timeAtPosition } from "./booking-map";

const iso = (y: number, mo: number, d: number, h: number, mi = 0) => new Date(y, mo - 1, d, h, mi).toISOString();
const units = [
  { id: "u2", name: "PS 10", consoleType: "ps4" },
  { id: "u1", name: "PS 2", consoleType: "ps4" },
  { id: "u3", name: "Lama", consoleType: "ps3", isActive: false },
];

describe("booking map", () => {
  const w = mapWindow("2026-10-05");
  it("jendela 08.00 s/d 08.00 besok", () => {
    expect(w.start.getHours()).toBe(8);
    expect(w.end.getTime() - w.start.getTime()).toBe(24 * 3600_000);
  });

  it("urut nama numerik, unit arsip disembunyikan, posisi blok benar", () => {
    const rows = layoutBookingMap([{ id: "b1", rentalUnitId: "u1", consoleType: null, scheduledStart: iso(2026, 10, 5, 20), scheduledEnd: iso(2026, 10, 5, 22), status: "confirmed" }], units, w);
    expect(rows.map((r) => r.label)).toEqual(["PS 2", "PS 10"]);
    const blk = rows[0].blocks[0];
    expect(blk.left).toBeCloseTo((12 / 24) * 100);
    expect(blk.width).toBeCloseTo((2 / 24) * 100);
  });

  it("booking lewat tengah malam tetap utuh; yang di luar jendela & batal disembunyikan", () => {
    const rows = layoutBookingMap(
      [
        { id: "a", rentalUnitId: "u1", consoleType: null, scheduledStart: iso(2026, 10, 5, 22, 30), scheduledEnd: iso(2026, 10, 6, 4, 30), status: "pending" },
        { id: "b", rentalUnitId: "u1", consoleType: null, scheduledStart: iso(2026, 10, 4, 10), scheduledEnd: iso(2026, 10, 4, 12), status: "pending" },
        { id: "c", rentalUnitId: "u1", consoleType: null, scheduledStart: iso(2026, 10, 5, 12), scheduledEnd: iso(2026, 10, 5, 13), status: "cancelled" },
      ],
      units,
      w
    );
    expect(rows[0].blocks.map((b) => b.booking.id)).toEqual(["a"]);
    expect(rows[0].blocks[0].clippedEnd).toBe(false);
  });

  it("tumpang tindih → lajur kedua; tanpa unit → baris per konsol", () => {
    const rows = layoutBookingMap(
      [
        { id: "a", rentalUnitId: "u1", consoleType: null, scheduledStart: iso(2026, 10, 5, 19), scheduledEnd: iso(2026, 10, 5, 21), status: "confirmed" },
        { id: "b", rentalUnitId: "u1", consoleType: null, scheduledStart: iso(2026, 10, 5, 20), scheduledEnd: iso(2026, 10, 5, 22), status: "waitlisted" },
        { id: "c", rentalUnitId: "u1", consoleType: null, scheduledStart: iso(2026, 10, 5, 21), scheduledEnd: iso(2026, 10, 5, 23), status: "confirmed" },
        { id: "d", rentalUnitId: null, consoleType: "ps5", scheduledStart: iso(2026, 10, 5, 15), scheduledEnd: iso(2026, 10, 5, 16), status: "pending" },
      ],
      units,
      w,
      { unassignedLabel: (ct) => `Belum dapat unit ${ct ?? ""}`.trim() }
    );
    const ps2 = rows[0];
    expect(ps2.blocks.map((b) => [b.booking.id, b.lane])).toEqual([["a", 0], ["b", 1], ["c", 0]]);
    expect(ps2.lanes).toBe(2);
    expect(rows[2].label).toBe("Belum dapat unit ps5");
  });

  it("klik posisi → jam dibulatkan 30 menit", () => {
    const t = timeAtPosition(w, 0.5 + 10 / (24 * 60));
    expect(t.getHours()).toBe(20);
    expect(t.getMinutes()).toBe(0);
  });
});
