import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/*
 * "+ Aset Baru" di Daftar Aset = mendata aset yang SUDAH dimiliki outlet: tidak boleh ada kas keluar
 * atau utang. Pembelian baru (kas keluar / utang) hanya lewat "+ Pembelian Aset" (/api/asset-purchases).
 */
const root = join(__dirname, "..", "..");
const api = readFileSync(join(root, "app", "api", "assets", "route.ts"), "utf8");
const page = readFileSync(join(root, "app", "dashboard", "assets", "page.tsx"), "utf8");

describe("mendata aset yang sudah dimiliki", () => {
  it("API selalu mencatat sebagai saldo awal, tanpa akun kas", () => {
    const post = api.slice(api.indexOf("export async function POST"));
    expect(post).toContain('funding: "opening_balance"');
    expect(post).toContain("cashBankAccountId: null");
    expect(post).not.toMatch(/body\.(funding|cashBankAccountId|recordAsPayable|paymentMethod)/);
  });

  it("form Aset Baru tidak meminta sumber kas atau utang", () => {
    const start = page.indexOf('t("assets.formTitle"');
    const form = page.slice(start, page.indexOf('t("assets.saveAsset"', start));
    expect(form).not.toMatch(/cashBankAccountId|recordAsPayable|paymentMethod/);
    expect(page).not.toContain("assets.alertSelectCashOrPayable");
  });
});
