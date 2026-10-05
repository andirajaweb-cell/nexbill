import { describe, it, expect } from "vitest";
import { normalizeBarcode, findProductByCode, findBarcodeConflict } from "./barcode";

const products = [
  { id: "a", name: "Aqua 600ml", barcode: "8886008101053", sku: "AQ600", isActive: true },
  { id: "b", name: "Indomie Goreng", barcode: "089686010947", sku: null, isActive: true },
  { id: "c", name: "Teh Lama", barcode: "8999999000001", isActive: false },
  { id: "d", name: "Teh Baru", barcode: "8999999000001", isActive: true },
];

describe("barcode", () => {
  it("normalisasi", () => {
    expect(normalizeBarcode(" 8886 008101053\n")).toBe("8886008101053");
    expect(normalizeBarcode("")).toBeNull();
    expect(normalizeBarcode(null)).toBeNull();
  });
  it("cocok barcode atau SKU, aktif didahulukan", () => {
    expect(findProductByCode(products, "8886008101053")?.id).toBe("a");
    expect(findProductByCode(products, "aq600")?.id).toBe("a");
    expect(findProductByCode(products, "8999999000001")?.id).toBe("d");
    expect(findProductByCode(products, "000")).toBeNull();
  });
  it("konflik hanya dengan produk aktif lain", () => {
    expect(findBarcodeConflict(products, "089686010947")?.id).toBe("b");
    expect(findBarcodeConflict(products, "089686010947", "b")).toBeNull();
    expect(findBarcodeConflict(products, "8999999000001", "d")).toBeNull();
    expect(findBarcodeConflict(products, null)).toBeNull();
  });
});
