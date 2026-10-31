import { describe, expect, it } from "vitest";
import { findProductByCode, groupProductsByCategory, matchesProductQuery, sortProductsByName } from "./product-search";

const P = [
  { id: "1", name: "Teh Botol 10", category: "drink", sku: "TB10", barcode: "8991002101234" },
  { id: "2", name: "teh botol 2", category: "drink", sku: null, barcode: null },
  { id: "3", name: "Ayam Goreng Pedas", category: "food", sku: "AGP", barcode: "8990000000011" },
  { id: "4", name: "Kacang Atom Besar 35gr", category: "snack", sku: null, barcode: " 8992222000001 " },
  { id: "5", name: "Biskitop Stik", category: "snack", sku: null, barcode: null },
];

describe("matchesProductQuery", () => {
  it("multi kata urutan bebas", () => {
    expect(matchesProductQuery(P[2], "pedas ayam")).toBe(true);
    expect(matchesProductQuery(P[2], "ayam bakar")).toBe(false);
  });
  it("sebagian barcode / SKU", () => {
    expect(matchesProductQuery(P[0], "21012")).toBe(true);
    expect(matchesProductQuery(P[0], "tb1")).toBe(true);
  });
  it("kosong = semua", () => {
    expect(matchesProductQuery(P[1], "  ")).toBe(true);
  });
});

describe("findProductByCode", () => {
  it("cocok persis barcode/SKU, abaikan spasi & huruf besar", () => {
    expect(findProductByCode(P, "8991002101234")?.id).toBe("1");
    expect(findProductByCode(P, "agp")?.id).toBe("3");
    expect(findProductByCode(P, "8992222000001")?.id).toBe("4");
  });
  it("sebagian kode tidak dianggap scan", () => {
    expect(findProductByCode(P, "899100")).toBeUndefined();
    expect(findProductByCode(P, "")).toBeUndefined();
  });
});

describe("urutan abjad", () => {
  it("tidak peka huruf besar & angka natural", () => {
    expect(sortProductsByName(P.slice(0, 2)).map((p) => p.id)).toEqual(["2", "1"]);
  });
  it("kategori urut label, produk urut nama", () => {
    const labels: Record<string, string> = { drink: "Minuman", food: "Makanan", snack: "Camilan" };
    const g = groupProductsByCategory(P, (c) => labels[c]);
    expect(g.map((x) => x.label)).toEqual(["Camilan", "Makanan", "Minuman"]);
    expect(g[0].items.map((p) => p.name)).toEqual(["Biskitop Stik", "Kacang Atom Besar 35gr"]);
  });
  it("label kosong jatuh ke kode", () => {
    const g = groupProductsByCategory([{ id: "x", name: "A", category: "frozen_food" }], () => "");
    expect(g[0].label).toBe("frozen food");
  });
});
