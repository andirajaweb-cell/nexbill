import { describe, expect, it } from "vitest";
import { assetDateYmd, filterAssets, filterFromParams, filterToParams, isFilterActive, summarizeAssets } from "./asset-filter";
import { parseAmount, parseAssetDate, parseAssetRows, resolveAssetCategory } from "./asset-import-parse";

const A = (over: Partial<Parameters<typeof filterAssets>[0][number]> = {}) => ({
  name: "PS5 Unit 1",
  category: "playstation",
  status: "active",
  notes: null,
  disposalReason: null,
  rentalUnitId: null,
  acquisitionDate: "2026-03-10T05:00:00.000Z",
  acquisitionCost: 8_000_000,
  accumulatedDepreciation: 1_000_000,
  ...over,
});

describe("filterAssets", () => {
  const list = [
    A({ name: "PS5 Unit 1", rentalUnitId: "u1" }),
    A({ name: "TV 43", category: "tv", acquisitionDate: "2026-06-01T05:00:00.000Z" }),
    A({ name: "Kursi Gaming", category: "furniture", status: "disposed", disposalReason: "rusak patah" }),
    A({ name: "Stik cadangan", category: "controller", status: "under_maintenance" }),
  ];

  it("kategori, status, dan unit", () => {
    expect(filterAssets(list, { category: "tv" }).map((a) => a.name)).toEqual(["TV 43"]);
    expect(filterAssets(list, { status: "not_disposed" })).toHaveLength(3);
    expect(filterAssets(list, { status: "disposed" }).map((a) => a.name)).toEqual(["Kursi Gaming"]);
    expect(filterAssets(list, { unit: "linked" }).map((a) => a.name)).toEqual(["PS5 Unit 1"]);
    expect(filterAssets(list, { unit: "unlinked" })).toHaveLength(3);
  });

  it("pencarian menjangkau alasan pelepasan & nama unit PS", () => {
    expect(filterAssets(list, { q: "patah" }).map((a) => a.name)).toEqual(["Kursi Gaming"]);
    expect(filterAssets(list, { q: "tv 7" }, { u1: "TV 7" }).map((a) => a.name)).toEqual(["PS5 Unit 1"]);
  });

  it("rentang tanggal perolehan (inklusif, zona WIB)", () => {
    expect(filterAssets(list, { from: "2026-06-01" }).map((a) => a.name)).toEqual(["TV 43"]);
    expect(filterAssets(list, { to: "2026-05-31" })).toHaveLength(3);
    // 17:30 UTC = 00:30 WIB hari berikutnya
    expect(assetDateYmd("2026-06-01T17:30:00.000Z")).toBe("2026-06-02");
  });

  it("ringkasan & parameter URL bolak-balik", () => {
    expect(summarizeAssets(list.slice(0, 2))).toEqual({ count: 2, cost: 16_000_000, accumulated: 2_000_000, bookValue: 14_000_000 });
    const f = { q: "ps", category: "playstation", status: "active", from: "2026-01-01" };
    expect(filterFromParams(filterToParams(f))).toMatchObject(f);
    expect(isFilterActive({})).toBe(false);
    expect(isFilterActive({ q: "  " })).toBe(false);
    expect(isFilterActive({ unit: "linked" })).toBe(true);
    expect(filterFromParams(new URLSearchParams("from=kemarin")).from).toBeUndefined();
  });
});

describe("parser upload", () => {
  it("kategori multi-bahasa & sinonim", () => {
    expect(resolveAssetCategory("PS5")).toBe("playstation");
    expect(resolveAssetCategory(" Kendaraan ")).toBe("vehicle");
    expect(resolveAssetCategory("stik")).toBe("controller");
    expect(resolveAssetCategory("kulkas")).toBeNull();
  });

  it("tanggal: serial Excel, ISO, DD/MM/YYYY, kosong, salah", () => {
    expect(parseAssetDate(46023)).toBe("2026-01-01");
    expect(parseAssetDate("2026-02-28")).toBe("2026-02-28");
    expect(parseAssetDate("05/03/2026")).toBe("2026-03-05");
    expect(parseAssetDate("")).toBe("");
    expect(parseAssetDate("31/02/2026")).toBeNull();
    expect(parseAssetDate("besok")).toBeNull();
  });

  it("angka Rupiah", () => {
    expect(parseAmount("Rp 1.500.000")).toBe(1_500_000);
    expect(parseAmount("2,000,000")).toBe(2_000_000);
    expect(parseAmount(750000)).toBe(750_000);
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
  });

  const ctx = {
    rentalUnits: [{ id: "u1", name: "TV 1" }, { id: "u2", name: "TV 2" }],
    takenRentalUnitIds: new Set(["u2"]),
    today: "2026-09-30",
  };
  const header = ["Nama", "Kategori", "Qty", "Harga", "Sisa", "Umur", "Tanggal", "Unit"];

  it("baris valid dikelompokkan per tanggal; error dilaporkan per baris", () => {
    const r = parseAssetRows(
      [
        header,
        ["PS5", "PlayStation", 1, 8_000_000, 1_000_000, 36, "2026-01-15", "tv 1"],
        ["Stik DS4", "controller", 4, "Rp 600.000", "", 12, "2026-01-15", ""],
        ["TV 43", "tv", "", 3_500_000, 0, 60, "", ""],
        [],
        ["", "tv", 1, 1, 0, 1],
        ["Kulkas", "kulkas", 1, 1_000_000, 0, 12],
        ["PS4", "ps4", 1, 4_000_000, 0, 36, "", "TV 2"],
        ["PS3", "ps3", 1, 1_000_000, 1_000_000, 36],
        ["Masa depan", "tv", 1, 1_000_000, 0, 12, "2027-01-01"],
        ["Stik x2", "stik", 2, 500_000, 0, 12, "", "TV 1"],
      ],
      ctx
    );
    expect(r.totalRows).toBe(9);
    expect(r.items.map((i) => i.name)).toEqual(["PS5", "Stik DS4", "TV 43"]);
    // baris 1 = header, baris 5 kosong (dilewati) → error di baris 6–11
    expect(r.errors.map((e) => e.row)).toEqual([6, 7, 8, 9, 10, 11]);
    expect(r.groups.map((g) => g.date)).toEqual(["2026-01-15", ""]);
    expect(r.groups[0].units).toBe(5);
    expect(r.groups[0].total).toBe(8_000_000 + 4 * 600_000);
    expect(r.units).toBe(6);
    expect(r.items[0].rentalUnitId).toBe("u1");
  });

  it("bolak-balik lewat file Excel sungguhan (sel tanggal, teks, angka)", async () => {
    const XLSX = await import("xlsx");
    const sheet = XLSX.utils.aoa_to_sheet([
      header,
      ["PS5", "PlayStation", 1, 8_000_000, 1_000_000, 36, new Date(2026, 0, 15), "TV 1"],
      ["Stik", "Controller", 2, "Rp 600.000", "", 12, "15/01/2026", ""],
    ], { cellDates: true });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "Aset");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const back = XLSX.read(buf, { type: "buffer", cellDates: true });
    const rows = XLSX.utils.sheet_to_json<unknown[]>(back.Sheets[back.SheetNames[0]], { header: 1, blankrows: false, raw: true });
    const r = parseAssetRows(rows, ctx);
    expect(r.errors).toEqual([]);
    expect(r.groups.map((g) => g.date)).toEqual(["2026-01-15"]);
    expect(r.units).toBe(3);
  });

  it("unit PS yang sama di dua baris ditolak", () => {
    const r = parseAssetRows([header, ["A", "tv", 1, 1_000_000, 0, 12, "", "TV 1"], ["B", "tv", 1, 1_000_000, 0, 12, "", "TV 1"]], ctx);
    expect(r.items).toHaveLength(1);
    expect(r.errors[0].error).toContain("lebih dari satu baris");
  });
});
