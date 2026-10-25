import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanMapsUrl, directionsUrl, mapEmbedUrl, parseLatLngFromText, whatsappLink } from "./public-profile-core";

describe("profil publik halaman booking", () => {
  it("membaca koordinat dari link Google Maps", () => {
    expect(parseLatLngFromText("https://www.google.com/maps/place/X/@-6.2088,106.8456,17z")).toEqual({ lat: -6.2088, lng: 106.8456 });
    expect(parseLatLngFromText("https://maps.google.com/?q=-7.25,112.75")).toEqual({ lat: -7.25, lng: 112.75 });
    expect(parseLatLngFromText("https://www.google.com/maps/place/X/data=!3d-6.9!4d107.6")).toEqual({ lat: -6.9, lng: 107.6 });
    expect(parseLatLngFromText("-6.2, 106.8")).toEqual({ lat: -6.2, lng: 106.8 });
    expect(parseLatLngFromText("https://maps.app.goo.gl/abc123")).toBeNull();
    expect(parseLatLngFromText("@95,200")).toBeNull();
  });

  it("petunjuk arah: koordinat > link peta > alamat", () => {
    expect(directionsUrl({ latitude: -6.2, longitude: 106.8, mapsUrl: "https://maps.app.goo.gl/x", address: "Jl. A" })).toBe("https://www.google.com/maps/dir/?api=1&destination=-6.2,106.8");
    expect(directionsUrl({ mapsUrl: "https://maps.app.goo.gl/x", address: "Jl. A" })).toBe("https://maps.app.goo.gl/x");
    expect(directionsUrl({ address: "Jl. Merdeka 1" })).toBe("https://www.google.com/maps/dir/?api=1&destination=Jl.%20Merdeka%201");
    expect(directionsUrl({})).toBeNull();
    expect(mapEmbedUrl({ latitude: -6.2, longitude: 106.8 })).toContain("output=embed");
    expect(mapEmbedUrl({ latitude: null, longitude: null })).toBeNull();
  });

  it("link aman & WhatsApp", () => {
    expect(cleanMapsUrl("javascript:alert(1)")).toBeNull();
    expect(cleanMapsUrl("https://maps.app.goo.gl/x")).toBe("https://maps.app.goo.gl/x");
    expect(whatsappLink("0812-3456-7890", "Halo")).toBe("https://wa.me/6281234567890?text=Halo");
    expect(whatsappLink("")).toBeNull();
  });

  it("API publik tidak membocorkan kolom internal outlet", () => {
    const src = readFileSync(join(__dirname, "public-profile.ts"), "utf8");
    expect(src).not.toMatch(/wifiPassword|bankAccount|npwp/i);
  });
});
