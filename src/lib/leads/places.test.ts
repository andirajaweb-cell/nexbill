import { describe, expect, it } from "vitest";
import { normalizePlace, toWhatsappNumber } from "./places";

describe("toWhatsappNumber", () => {
  it("converts local mobile numbers to 62 format", () => {
    expect(toWhatsappNumber("0812-3456-7890")).toBe("6281234567890");
    expect(toWhatsappNumber("+62 812-3456-7890")).toBe("6281234567890");
    expect(toWhatsappNumber("812 3456 7890")).toBe("6281234567890");
  });

  it("rejects landlines and empty values", () => {
    expect(toWhatsappNumber("(021) 555-1234")).toBeNull();
    expect(toWhatsappNumber("+62 21 5551234")).toBeNull();
    expect(toWhatsappNumber("")).toBeNull();
    expect(toWhatsappNumber(null)).toBeNull();
  });
});

describe("normalizePlace", () => {
  it("maps a Places API (New) result", () => {
    const p = normalizePlace({
      id: "ChIJabc",
      displayName: { text: "Rental PS Maju" },
      primaryTypeDisplayName: { text: "Pusat Game" },
      formattedAddress: "Jl. Merdeka No. 1, Bekasi",
      addressComponents: [
        { longText: "Bekasi Timur", types: ["administrative_area_level_3"] },
        { longText: "Kota Bekasi", types: ["administrative_area_level_2", "political"] },
      ],
      nationalPhoneNumber: "0812-1111-2222",
      internationalPhoneNumber: "+62 812-1111-2222",
      googleMapsUri: "https://maps.google.com/?cid=1",
      location: { latitude: -6.2, longitude: 107 },
      rating: 4.6,
      userRatingCount: 88,
      businessStatus: "OPERATIONAL",
    });
    expect(p).toMatchObject({
      placeId: "ChIJabc",
      name: "Rental PS Maju",
      category: "Pusat Game",
      city: "Kota Bekasi",
      phone: "0812-1111-2222",
      waNumber: "6281211112222",
      website: null,
      rating: 4.6,
      reviewCount: 88,
    });
  });

  it("drops results without id or name", () => {
    expect(normalizePlace({ displayName: { text: "x" } })).toBeNull();
    expect(normalizePlace({ id: "a" })).toBeNull();
  });
});
