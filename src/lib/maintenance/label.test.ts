import { describe, expect, it } from "vitest";
import { clampText, isLabelSize, maintenanceTicketNumber, parseLabelIds } from "./label";

describe("maintenanceTicketNumber", () => {
  it("tanggal masuk kalender WIB + 4 karakter id", () => {
    // 21 Nov 2026 23:30 WIB = 21 Nov 16:30 UTC
    expect(maintenanceTicketNumber({ id: "e9abaa17-12d5-4670", maintenanceDate: "2026-11-21T16:30:00.000Z" })).toBe("MT-261121-E9AB");
    // 22 Nov 01:00 WIB = 21 Nov 18:00 UTC → tanggal outlet 22 Nov
    expect(maintenanceTicketNumber({ id: "abcd1234", maintenanceDate: "2026-11-21T18:00:00.000Z" })).toBe("MT-261122-ABCD");
  });
  it("tanggal rusak tidak membuat error", () => {
    expect(maintenanceTicketNumber({ id: "x-y-z-w-1", maintenanceDate: "bukan tanggal" })).toBe("MT-000000-XYZW");
  });
});

describe("parseLabelIds", () => {
  it("unik, bersih, maks. 50", () => {
    expect(parseLabelIds("abcd-1, abcd-1,efgh-2,,<script>")).toEqual(["abcd-1", "efgh-2"]);
    expect(parseLabelIds(null)).toEqual([]);
    expect(parseLabelIds(Array.from({ length: 60 }, (_, i) => `id-${1000 + i}`).join(","))).toHaveLength(50);
  });
});

describe("label helpers", () => {
  it("ukuran label dikenal", () => {
    expect(isLabelSize("thermal58")).toBe(true);
    expect(isLabelSize("a4")).toBe(false);
  });
  it("memotong teks panjang di batas kata", () => {
    expect(clampText("Layar TV bergaris setelah listrik padam kemarin malam", 30)).toBe("Layar TV bergaris setelah…");
    expect(clampText("  pendek  ", 30)).toBe("pendek");
    expect(clampText(null, 10)).toBe("");
  });
});
