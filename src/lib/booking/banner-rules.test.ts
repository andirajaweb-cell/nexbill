import { describe, expect, it } from "vitest";
import { bannerFileProblem, normalizeBannerLink, normalizeBannerTitle, resolveBannerOrder, safeBannerHref } from "./banner-rules";

describe("banner iklan — aturan", () => {
  it("link dirapikan & dibatasi http(s)", () => {
    expect(normalizeBannerLink("")).toBeNull();
    expect(normalizeBannerLink(null)).toBeNull();
    expect(normalizeBannerLink("instagram.com/xtream")).toBe("https://instagram.com/xtream");
    expect(normalizeBannerLink("wa.me/62812")).toBe("https://wa.me/62812");
    expect(normalizeBannerLink(" https://nexbill.id/promo ")).toBe("https://nexbill.id/promo");
    expect(() => normalizeBannerLink("javascript:alert(1)")).toThrow();
    expect(() => normalizeBannerLink("data:text/html,hi")).toThrow();
    expect(() => normalizeBannerLink("promo")).toThrow();
  });
  it("judul", () => {
    expect(normalizeBannerTitle("  Promo   Malam ")).toBe("Promo Malam");
    expect(normalizeBannerTitle("")).toBeNull();
    expect(normalizeBannerTitle("x".repeat(300))?.length).toBe(120);
  });
  it("href publik aman", () => {
    expect(safeBannerHref("javascript:alert(1)")).toBeNull();
    expect(safeBannerHref("https://a.id/x")).toBe("https://a.id/x");
    expect(safeBannerHref("instagram.com")).toBeNull();
  });
  it("urutan", () => {
    expect(resolveBannerOrder(["b", "x", "a", "b"], ["a", "b", "c"])).toEqual(["b", "a", "c"]);
    expect(resolveBannerOrder("bukan", ["a"])).toEqual(["a"]);
  });
  it("file", () => {
    expect(bannerFileProblem("a.svg", 10)).toContain("PNG");
    expect(bannerFileProblem("a.JPG", 10)).toBeNull();
    expect(bannerFileProblem("a.webp", 5 * 1024 * 1024)).toContain("3MB");
  });
});
