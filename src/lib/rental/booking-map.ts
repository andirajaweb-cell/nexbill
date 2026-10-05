/**
 * Tata letak "Map Booking": baris = unit, sumbu X = jam dalam satu jendela waktu (bawaan 08.00 hari
 * terpilih s/d 08.00 besok, supaya booking malam s/d dini hari tetap utuh dalam satu baris).
 * Murni (tanpa DB/DOM) supaya bisa diuji.
 */

export interface MapBooking {
  id: string;
  rentalUnitId: string | null;
  consoleType: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
}

export interface MapUnit {
  id: string;
  name: string;
  consoleType: string;
  isActive?: boolean;
}

export interface MapBlock<B extends MapBooking = MapBooking> {
  booking: B;
  /** 0..100 (% dari lebar jendela) */
  left: number;
  width: number;
  /** Baris tumpukan di dalam satu unit bila ada yang tumpang tindih (mis. waiting list). */
  lane: number;
  /** Terpotong di tepi jendela. */
  clippedStart: boolean;
  clippedEnd: boolean;
}

export interface MapRow<B extends MapBooking = MapBooking> {
  key: string;
  unitId: string | null;
  label: string;
  consoleType: string | null;
  blocks: MapBlock<B>[];
  lanes: number;
}

/** Status yang tidak menempati jadwal lagi — disembunyikan dari map bawaan. */
export const MAP_HIDDEN_STATUSES = ["cancelled", "expired"];

export const DEFAULT_DAY_START_HOUR = 8;

/** Jendela waktu untuk tanggal lokal `ymd` ("2026-10-05"), mulai jam `startHour` selama `hours` jam. */
export function mapWindow(ymd: string, startHour = DEFAULT_DAY_START_HOUR, hours = 24) {
  const [y, m, d] = ymd.split("-").map(Number);
  const start = new Date(y, m - 1, d, startHour, 0, 0, 0);
  const end = new Date(start.getTime() + hours * 3600_000);
  return { start, end, hours };
}

export function layoutBookingMap<B extends MapBooking>(
  bookings: B[],
  units: MapUnit[],
  window: { start: Date; end: Date },
  opts: { includeHidden?: boolean; unassignedLabel?: (consoleType: string | null) => string } = {}
): MapRow<B>[] {
  const ws = window.start.getTime();
  const we = window.end.getTime();
  const span = we - ws;
  const visible = bookings.filter((b) => {
    if (!opts.includeHidden && MAP_HIDDEN_STATUSES.includes(b.status)) return false;
    const s = new Date(b.scheduledStart).getTime();
    const e = new Date(b.scheduledEnd).getTime();
    return e > ws && s < we;
  });

  const rows: MapRow<B>[] = units
    .filter((u) => u.isActive !== false)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "id", { numeric: true }))
    .map((u) => ({ key: u.id, unitId: u.id, label: u.name, consoleType: u.consoleType, blocks: [], lanes: 1 }));
  const byUnit = new Map(rows.map((r) => [r.unitId!, r]));

  // Booking "unit apa saja" (belum dapat unit) atau unitnya sudah diarsipkan → baris per jenis konsol.
  const extra = new Map<string, MapRow<B>>();
  const rowFor = (b: B): MapRow<B> => {
    if (b.rentalUnitId && byUnit.has(b.rentalUnitId)) return byUnit.get(b.rentalUnitId)!;
    const ct = b.consoleType && b.consoleType !== "any" ? b.consoleType : null;
    const key = `unassigned:${ct ?? "any"}`;
    if (!extra.has(key)) {
      extra.set(key, { key, unitId: null, label: opts.unassignedLabel ? opts.unassignedLabel(ct) : ct ? `? ${ct.toUpperCase()}` : "?", consoleType: ct, blocks: [], lanes: 1 });
    }
    return extra.get(key)!;
  };

  const sorted = visible.slice().sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));
  for (const b of sorted) {
    const row = rowFor(b);
    const s = Math.max(new Date(b.scheduledStart).getTime(), ws);
    const e = Math.min(new Date(b.scheduledEnd).getTime(), we);
    // Lajur pertama yang sudah kosong pada jam mulai booking ini.
    const laneEnds: number[] = [];
    for (const blk of row.blocks) {
      const end = Math.min(new Date(blk.booking.scheduledEnd).getTime(), we);
      laneEnds[blk.lane] = Math.max(laneEnds[blk.lane] ?? 0, end);
    }
    let lane = 0;
    while (laneEnds[lane] !== undefined && laneEnds[lane] > s) lane++;
    row.blocks.push({
      booking: b,
      left: ((s - ws) / span) * 100,
      width: Math.max(((e - s) / span) * 100, 0.5),
      lane,
      clippedStart: new Date(b.scheduledStart).getTime() < ws,
      clippedEnd: new Date(b.scheduledEnd).getTime() > we,
    });
    row.lanes = Math.max(row.lanes, lane + 1);
  }

  return [...rows, ...extra.values()];
}

/** Waktu (Date) pada posisi x (0..1) di jendela, dibulatkan ke `stepMinutes`. Untuk klik slot kosong. */
export function timeAtPosition(window: { start: Date; end: Date }, ratio: number, stepMinutes = 30): Date {
  const ms = window.start.getTime() + Math.min(Math.max(ratio, 0), 1) * (window.end.getTime() - window.start.getTime());
  const step = stepMinutes * 60_000;
  return new Date(Math.floor(ms / step) * step);
}
