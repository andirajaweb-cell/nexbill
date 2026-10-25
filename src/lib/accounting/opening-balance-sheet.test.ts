import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { buildOpeningBalanceWorkbook, parseAmount, parseOpeningBalanceRows, parseOpeningBalanceWorkbook, type ObAccount } from "./opening-balance-sheet";

const acc = (code: string, type: string, normalBalance: string, extra: Partial<ObAccount> = {}): ObAccount => ({
  id: `id-${code}`, code, name: `Akun ${code}`, type, normalBalance, isPostingAllowed: true, isActive: true, ...extra,
});
const ACCOUNTS: ObAccount[] = [
  acc("1100", "asset", "debit", { isPostingAllowed: false }),
  acc("1111", "asset", "debit"),
  acc("1121", "asset", "debit"),
  acc("1141", "asset", "debit"),
  acc("1161", "asset", "debit"),
  acc("1211", "asset", "debit"),
  acc("2111", "liability", "credit"),
  acc("3100", "equity", "credit"),
  acc("3400", "equity", "credit"),
  acc("6999", "expense", "debit", { isActive: false }),
];
const H = ["Kode Akun", "Nama Akun", "Golongan", "Saldo Normal", "Debit", "Kredit"];

describe("parseAmount — angka dari ekspor aplikasi lain", () => {
  it("format Indonesia, Inggris, Rp, kosong, negatif", () => {
    expect(parseAmount(1500000)).toBe(1500000);
    expect(parseAmount("1.500.000")).toBe(1500000);
    expect(parseAmount("1,500,000")).toBe(1500000);
    expect(parseAmount("Rp 1.500.000,50")).toBe(1500000.5);
    expect(parseAmount("")).toBe(0);
    expect(parseAmount("(250.000)")).toBe(-250000);
    expect(parseAmount("abc")).toBeNull();
  });
});

describe("parseOpeningBalanceRows", () => {
  it("membaca baris seimbang dan melewati akun bersaldo nol", () => {
    const r = parseOpeningBalanceRows([H, ["1111", "", "", "", "2.000.000", ""], ["1121", "", "", "", 3000000, ""], ["2111", "", "", "", "", "1.000.000"], ["3100", "", "", "", "", "4.000.000"], ["1141", "", "", "", "", ""]], ACCOUNTS, "id");
    expect(r.errors).toEqual([]);
    expect(r.lines.map((l) => l.code)).toEqual(["1111", "1121", "2111", "3100"]);
    expect(r.totalDebit).toBe(5000000);
    expect(r.totalCredit).toBe(5000000);
    expect(r.balancingAmount).toBeNull();
  });

  it("selisih ditampung otomatis ke 3400 Ekuitas Saldo Awal", () => {
    const r = parseOpeningBalanceRows([H, ["1111", "", "", "", "2.000.000", ""], ["2111", "", "", "", "", "500.000"]], ACCOUNTS, "id");
    const eq = r.lines.find((l) => l.code === "3400")!;
    expect(eq.credit).toBe(1500000);
    expect(r.totalDebit).toBe(r.totalCredit);
    expect(r.warnings.some((w) => w.includes("3400"))).toBe(true);
  });

  it("menolak kode tak dikenal, akun induk, nonaktif, dua sisi, negatif, duplikat", () => {
    const r = parseOpeningBalanceRows(
      [H, ["9999", "", "", "", 1, ""], ["1100", "", "", "", 1, ""], ["6999", "", "", "", 1, ""], ["1121", "", "", "", 5, 5], ["1141", "", "", "", "-10", ""], ["1111", "", "", "", 10, ""], ["1111", "", "", "", 20, ""]],
      ACCOUNTS,
      "id"
    );
    expect(r.errors.map((e) => e.row)).toEqual([2, 3, 4, 5, 6, 8]);
    expect(r.lines.find((l) => l.code === "1111")?.debit).toBe(10);
  });

  it("memperingatkan persediaan & aset tetap (risiko dobel dengan impor Inventori/Aset)", () => {
    const r = parseOpeningBalanceRows([H, ["1161", "", "", "", 100, ""], ["1211", "", "", "", 200, ""], ["3100", "", "", "", "", 300]], ACCOUNTS, "en");
    expect(r.warnings.length).toBe(2);
  });

  it("judul kolom Inggris & urutan kolom bebas", () => {
    const r = parseOpeningBalanceRows([["Credit", "Debit", "Account Code"], ["", 100, "1111"], [100, "", "3100"]], ACCOUNTS, "en");
    expect(r.errors).toEqual([]);
    expect(r.lines.length).toBe(2);
  });

  it("tanpa judul kolom → satu error jelas", () => {
    const r = parseOpeningBalanceRows([["a", "b"], ["1", "2"]], ACCOUNTS, "id");
    expect(r.errors.length).toBe(1);
    expect(r.lines).toEqual([]);
  });
});

describe("template ↔ impor bolak-balik", () => {
  it("template berisi akun postable aktif saja dan bisa dibaca kembali", () => {
    const buf = buildOpeningBalanceWorkbook(ACCOUNTS, "id");
    const wb = XLSX.read(buf, { type: "buffer" });
    expect(wb.SheetNames).toEqual(["Saldo Awal", "Petunjuk"]);
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets["Saldo Awal"], { header: 1 });
    const codes = rows.slice(1).map((r) => String(r[0]));
    expect(codes).not.toContain("1100");
    expect(codes).not.toContain("6999");
    // isi dua sel lalu baca ulang
    rows[1 + codes.indexOf("1111")][4] = 750000;
    rows[1 + codes.indexOf("3100")][5] = 750000;
    const wb2 = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb2, XLSX.utils.aoa_to_sheet(rows), "Saldo Awal");
    const res = parseOpeningBalanceWorkbook(XLSX.write(wb2, { type: "buffer", bookType: "xlsx" }) as Buffer, ACCOUNTS, "id");
    expect(res.errors).toEqual([]);
    expect(res.lines.map((l) => [l.code, l.debit, l.credit])).toEqual([["1111", 750000, 0], ["3100", 0, 750000]]);
  });
});
