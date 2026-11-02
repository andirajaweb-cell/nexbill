import { describe, expect, it } from "vitest";
import { describePlacesError } from "./places";

describe("pesan error Google Places", () => {
  it("alasan dari Google diberi petunjuk perbaikan", () => {
    const msg = describePlacesError(403, {
      error: { status: "PERMISSION_DENIED", message: "The caller does not have permission", details: [{ reason: "API_KEY_SERVICE_BLOCKED" }] },
    });
    expect(msg).toContain("API_KEY_SERVICE_BLOCKED");
    expect(msg).toContain("Places API (New)");
  });
  it("403 tanpa detail tetap memberi langkah cek", () => {
    expect(describePlacesError(403, { error: { message: "The caller does not have permission" } })).toContain("Google Cloud Console");
  });
  it("respons bukan JSON", () => {
    expect(describePlacesError(500, null)).toBe("Google Places API menolak permintaan: HTTP 500");
  });
});
