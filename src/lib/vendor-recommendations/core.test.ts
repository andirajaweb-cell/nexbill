import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dailySeries, isLive, isSafeHttpUrl, matchesCountry, parseBenefits, summarizeEvents, toPublic, urlForTarget, wibDay, type VendorRecRow } from "./core";
import { parseVendorRecInput } from "./fields";

const base: VendorRecRow = {
  id: "r1",
  placement: "ppob",
  vendorName: "Fastpay",
  badge: null,
  headline: "H",
  body: null,
  benefitsJson: '["a"," b ",""]',
  promoText: null,
  primaryLabel: "Daftar",
  primaryUrl: "https://www.fastpay.co.id/?FA1013931",
  secondaryLabel: "App",
  secondaryUrl: "javascript:alert(1)",
  infoLabel: "Info",
  infoUrl: "https://www.fastpay.co.id/peluang-ajak-mitra",
  logoUrl: null,
  footnote: null,
  disclosure: "d",
  countries: "ID",
  isActive: true,
  sortOrder: 0,
  startsAt: null,
  endsAt: null,
};

describe("rekomendasi vendor — data", () => {
  it("benefits dibersihkan, JSON rusak jadi kosong", () => {
    expect(parseBenefits(base.benefitsJson)).toEqual(["a", "b"]);
    expect(parseBenefits("{rusak")).toEqual([]);
  });
  it("hanya tautan http(s) yang dipakai — javascript: tidak pernah jadi tombol/tujuan", () => {
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(urlForTarget(base, "secondary")).toBeNull();
    expect(urlForTarget(base, "primary")).toBe(base.primaryUrl);
    expect(urlForTarget(base, "anything-else")).toBe(base.primaryUrl);
    expect(toPublic(base).ctas.map((c) => c.target)).toEqual(["primary", "info"]);
    expect(JSON.stringify(toPublic(base))).not.toContain("fastpay.co.id"); // URL tidak dikirim ke outlet
  });
  it("negara: outlet tanpa negara = Indonesia; '*' = semua", () => {
    expect(matchesCountry("ID", null)).toBe(true);
    expect(matchesCountry("ID", "MY")).toBe(false);
    expect(matchesCountry("ID, my", "MY")).toBe(true);
    expect(matchesCountry("*", "TH")).toBe(true);
  });
  it("jadwal tayang", () => {
    const now = new Date("2026-10-12T05:00:00Z");
    expect(isLive({ isActive: true, startsAt: null, endsAt: null }, now)).toBe(true);
    expect(isLive({ isActive: false, startsAt: null, endsAt: null }, now)).toBe(false);
    expect(isLive({ isActive: true, startsAt: "2026-10-13T00:00:00Z", endsAt: null }, now)).toBe(false);
    expect(isLive({ isActive: true, startsAt: null, endsAt: "2026-10-11T00:00:00Z" }, now)).toBe(false);
  });
  it("validasi form platform-admin menolak tautan non-http dan isian wajib kosong", () => {
    expect(parseVendorRecInput({ vendorName: "X", headline: "H", primaryLabel: "L", primaryUrl: "javascript:x" }, false).error).toBeTruthy();
    expect(parseVendorRecInput({ vendorName: "X", headline: "", primaryLabel: "L", primaryUrl: "https://a.b" }, false).error).toBeTruthy();
    const ok = parseVendorRecInput({ vendorName: "X", headline: "H", primaryLabel: "L", primaryUrl: "https://a.b", benefits: "satu\n\ndua", countries: "id, my" }, false);
    expect(ok.error).toBeUndefined();
    expect(ok.data.benefitsJson).toBe('["satu","dua"]');
    expect(ok.data.countries).toBe("ID,MY");
  });
});

describe("rekomendasi vendor — indikator performa", () => {
  const rows = [
    { outletId: "A", event: "impression", target: null, createdAt: "2026-10-10T03:00:00Z" },
    { outletId: "A", event: "impression", target: null, createdAt: "2026-10-11T03:00:00Z" },
    { outletId: "B", event: "impression", target: null, createdAt: "2026-10-11T04:00:00Z" },
    { outletId: "C", event: "impression", target: null, createdAt: "2026-10-11T05:00:00Z" },
    { outletId: "A", event: "click", target: "primary", createdAt: "2026-10-11T03:01:00Z" },
    { outletId: "A", event: "click", target: "info", createdAt: "2026-10-11T03:02:00Z" },
    { outletId: "C", event: "dismiss", target: null, createdAt: "2026-10-11T05:01:00Z" },
    { outletId: "D", event: "impression", target: null, createdAt: "2026-08-01T00:00:00Z" },
  ];
  it("CTR = outlet unik yang klik ÷ outlet unik yang melihat", () => {
    const s = summarizeEvents(rows, new Date("2026-09-12T00:00:00Z"));
    expect(s.outletsSeen).toBe(3);
    expect(s.impressions).toBe(4);
    expect(s.outletsClicked).toBe(1);
    expect(s.clicks).toBe(2);
    expect(s.clicksByTarget).toEqual({ primary: 1, secondary: 0, info: 1 });
    expect(s.dismisses).toBe(1);
    expect(s.ctr).toBeCloseTo(1 / 3);
    expect(s.dismissRate).toBeCloseTo(1 / 3);
    expect(summarizeEvents([]).ctr).toBeNull();
  });
  it("deret harian memakai tanggal WIB", () => {
    expect(wibDay("2026-10-11T18:30:00Z")).toBe("2026-10-12");
    const d = dailySeries(rows, 3, new Date("2026-10-12T05:00:00Z"));
    expect(d.map((x) => x.day)).toEqual(["2026-10-10", "2026-10-11", "2026-10-12"]);
    expect(d[1]).toEqual({ day: "2026-10-11", seen: 3, clicked: 1 });
  });
});

describe("rekomendasi vendor — isolasi & keamanan route", () => {
  const api = (p: string) => readFileSync(join(__dirname, "..", "..", "app", "api", p, "route.ts"), "utf8");
  it("outlet selalu dari sesi login, tidak pernah dari body/query", () => {
    for (const p of ["vendor-recommendations", "vendor-recommendations/[id]/event", "vendor-recommendations/[id]/go"]) {
      const src = api(p);
      expect(src).toMatch(/session\.outletId/);
      expect(src).not.toMatch(/body\.outletId|searchParams\.get\(["']outletId["']\)/);
    }
  });
  it("/go tidak menerima tujuan dari query (bukan open redirect)", () => {
    const src = api("vendor-recommendations/[id]/go");
    expect(src).toMatch(/urlForTarget\(rec, target\)/);
    expect(src).not.toMatch(/searchParams\.get\(["'](url|to|redirect|next)["']\)/);
  });
  it("route platform-admin wajib login platform-admin", () => {
    for (const p of ["platform-admin/vendor-recommendations", "platform-admin/vendor-recommendations/[id]"]) {
      const src = api(p);
      const handlers = src.match(/export async function (GET|POST|PATCH|DELETE)/g) ?? [];
      expect((src.match(/await requirePlatformAdmin\(\)/g) ?? []).length).toBe(handlers.length);
    }
  });
});
