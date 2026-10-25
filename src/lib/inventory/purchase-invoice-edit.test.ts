import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { friendlyInvoiceLockError } from "./purchase-invoice-correction";
import { draftTotal, isEmptyDraft, sanitizeDraft } from "../../app/dashboard/inventory/purchase-draft";

const src = readFileSync(join(__dirname, "purchase-invoice-correction.ts"), "utf8");

describe("Edit / batal invoice Belanja Supplier", () => {
  it("jurnal invoice dibuat di dalam transaksi Edit (bukan koneksi baru yang menunggu kunci)", () => {
    const apply = src.slice(src.indexOf("export async function applyInvoiceLines"), src.indexOf("export async function voidPurchaseInvoice"));
    expect(apply).toContain("postPurchaseInvoiceJournal(invoice.id, tx)");
    expect(apply).not.toMatch(/postPurchaseInvoiceJournal\(invoice\.id\)/);
  });

  it("pembayaran ulang ikut transaksi Edit dan memakai akun pilihan", () => {
    const edit = src.slice(src.indexOf("export async function editPurchaseInvoiceLines"));
    expect(edit).toContain("payPurchaseInvoiceTx(tx");
    expect(edit).not.toMatch(/\bpayPurchaseInvoice\(/);
    expect(edit).toContain('payment.mode === "paid"');
  });

  it("edit & batal tidak menunggu kunci tanpa batas", () => {
    expect(src.match(/setInvoiceLockTimeout\(tx\)/g)?.length).toBeGreaterThanOrEqual(2);
    expect(friendlyInvoiceLockError({ code: "55P03" }).message).toMatch(/sedang diproses/);
    expect(friendlyInvoiceLockError(new Error("x")).message).toBe("x");
  });
});

describe("jumlah kueri koreksi invoice (latensi ke database)", () => {
  it("tidak ada kueri per item untuk outlet rata-rata", () => {
    const reverse = src.slice(src.indexOf("export async function reverseInvoiceEffects"), src.indexOf("export interface InvoiceLineInput"));
    expect(reverse).toContain("if (isFifo) await onStockOut");
    expect(reverse).toContain("recomputeCostPricesExcludingRef([...affectedProductIds]");
    expect(reverse).not.toMatch(/for \(const \[productId, qty\] of qtyByProduct\) \{\s*await tx\.update\(products\)/);
    const apply = src.slice(src.indexOf("export async function applyInvoiceLines"), src.indexOf("export async function voidPurchaseInvoice"));
    expect(apply).toContain("isFifo && i < lines.length");
    expect(apply).not.toMatch(/tx\s*\.update\(products\)/);
  });

  it("server aplikasi berada di region yang sama dengan database (Seoul)", () => {
    const cfg = JSON.parse(readFileSync(join(__dirname, "..", "..", "..", "vercel.json"), "utf8"));
    expect(cfg.regions).toEqual(["icn1"]);
  });
});

describe("draf Belanja Supplier", () => {
  it("membersihkan data rusak & menghitung total", () => {
    const d = sanitizeDraft({ supplierId: "s1", purchaseDate: "2026-10-25", cart: [{ productId: "p", qty: 2, unitCost: 1500 }, { productId: "", qty: 1 }, { qty: 3 }], transportCost: 1000, parkingCost: "x", paidNow: false });
    expect(d).toMatchObject({ supplierId: "s1", purchaseDate: "2026-10-25", cart: [{ productId: "p", qty: 2, unitCost: 1500 }], transportCost: 1000, parkingCost: 0, paidNow: false });
    expect(draftTotal(d!)).toBe(4000);
    expect(sanitizeDraft("rusak")).toBeNull();
    expect(sanitizeDraft({ purchaseDate: "kemarin" })?.purchaseDate).toBe("");
  });

  it("form kosong tidak disimpan", () => {
    expect(isEmptyDraft(sanitizeDraft({}))).toBe(true);
    expect(isEmptyDraft(sanitizeDraft({ cart: [{ productId: "p", qty: 1, unitCost: 1 }] }))).toBe(false);
  });
});
