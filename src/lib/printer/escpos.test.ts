import { describe, it, expect } from "vitest";
import {
  toPrintableAscii,
  wrapText,
  twoColumns,
  buildReceiptEscPos,
  receiptDocFromOrder,
  bytesToBase64,
  chunkBytes,
  testReceiptDoc,
  CHARS_PER_LINE,
} from "./escpos";

const money = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;

describe("toPrintableAscii", () => {
  it("transliterates accents and smart punctuation, replaces the rest", () => {
    expect(toPrintableAscii("Café “Nexbill” – é")).toBe('Cafe "Nexbill" - e');
    expect(toPrintableAscii("ร้าน")).toMatch(/^\?+$/);
    expect(toPrintableAscii("a\r\nb\tc")).toBe("a\nb c");
  });
});

describe("wrapText / twoColumns", () => {
  it("wraps on spaces within width", () => {
    const lines = wrapText("Jalan Merdeka Raya nomor 123 Kota Bandung", 16);
    expect(lines.every((l) => l.length <= 16)).toBe(true);
    expect(lines.join(" ")).toBe("Jalan Merdeka Raya nomor 123 Kota Bandung");
  });
  it("hard-cuts a word longer than the width", () => {
    expect(wrapText("ABCDEFGHIJ", 4)).toEqual(["ABCD", "EFGH", "IJ"]);
  });
  it("right-aligns the value on the same line when it fits", () => {
    const [line] = twoColumns("Subtotal", "Rp25.000", 32);
    expect(line.length).toBe(32);
    expect(line.startsWith("Subtotal")).toBe(true);
    expect(line.endsWith("Rp25.000")).toBe(true);
  });
  it("wraps a long label and keeps the value right-aligned", () => {
    const lines = twoColumns("2x Indomie goreng telur keju spesial pedas level 5", "Rp30.000", 32);
    expect(lines.every((l) => l.length <= 32)).toBe(true);
    expect(lines[lines.length - 1].endsWith("Rp30.000")).toBe(true);
  });
});

describe("buildReceiptEscPos", () => {
  const data = {
    order: { id: "abcdef123456", createdAt: "2026-10-03T10:00:00.000Z", subtotal: 25000, discount: 5000, serviceCharge: 0, tax: 0, roundingAdjustment: 0, total: 20000 },
    items: [
      { description: "Rental PS5 - 1 jam", qty: 1, lineTotal: 15000 },
      { description: "Es teh", qty: 2, lineTotal: 10000 },
    ],
    payments: [{ status: "success", method: "qris" }],
    outlet: { name: "Gaming Corner", address: "Jl. Merdeka 1", phone: "0812", receiptFooterText: "Terima kasih!" },
  };

  it("maps the receipt API data like the HTML receipt", () => {
    const doc = receiptDocFromOrder(data, { formatMoney: money, formatDate: () => "03/10/2026 17.00" });
    expect(doc.meta[0].value).toBe("ABCDEF12");
    expect(doc.totals.map((t) => t.label)).toEqual(["Subtotal", "Diskon", "TOTAL"]);
    expect(doc.totals[1].value).toBe("-Rp5.000");
    expect(doc.payment[0].value).toBe("QRIS");
  });

  it("starts with ESC @ and never exceeds the line width", () => {
    const doc = receiptDocFromOrder(data, { formatMoney: money, formatDate: () => "03/10/2026 17.00" });
    for (const paper of [58, 80] as const) {
      const bytes = buildReceiptEscPos(doc, paper, { cut: true });
      expect([bytes[0], bytes[1]]).toEqual([0x1b, 0x40]);
      expect(Array.from(bytes.slice(-4))).toEqual([0x1d, 0x56, 0x42, 0x00]);
      // Every printable run between line feeds fits the paper width.
      const runs: string[] = [];
      let cur = "";
      for (let i = 0; i < bytes.length; i++) {
        const c = bytes[i];
        if (c === 0x1b || c === 0x1d) {
          // skip command + its parameters (ESC @ = 0 params, ESC t/a/E/d and GS ! = 1, GS V = 2)
          const cmd = bytes[i + 1];
          i += c === 0x1d && cmd === 0x56 ? 3 : cmd === 0x40 ? 1 : 2;
          continue;
        }
        if (c === 0x0a) {
          runs.push(cur);
          cur = "";
        } else cur += String.fromCharCode(c);
      }
      expect(Math.max(...runs.map((r) => r.length))).toBeLessThanOrEqual(CHARS_PER_LINE[paper]);
      expect(bytes.every((c) => c <= 0x7f)).toBe(true);
    }
  });

  it("omits the cut command by default", () => {
    const bytes = buildReceiptEscPos(testReceiptDoc("NEXBILL", 58, "now"), 58);
    expect(Array.from(bytes.slice(-3))).toEqual([0x1b, 0x64, 4]);
  });
});

describe("helpers", () => {
  it("base64 and chunking", () => {
    expect(bytesToBase64(Uint8Array.from([0x1b, 0x40, 0x41]))).toBe("G0BB");
    const chunks = chunkBytes(new Uint8Array(45), 20);
    expect(chunks.map((c) => c.length)).toEqual([20, 20, 5]);
  });
});
