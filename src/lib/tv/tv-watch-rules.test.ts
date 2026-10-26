import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseTvEvent, TV_STAFF_TEST_KIND } from "./tv-session-rules";

describe("kejadian mode staf dari TV", () => {
  const id = "3f1e2d4c-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
  it("menerima tes 10 menit yang sah", () => {
    expect(parseTvEvent({ id, kind: TV_STAFF_TEST_KIND, at: "2026-10-26T03:00:00Z", minutes: 10 })).toMatchObject({ ok: true, event: { minutes: 10 } });
  });
  it("menolak bentuk yang salah", () => {
    expect(parseTvEvent({ id: "x", kind: TV_STAFF_TEST_KIND, at: "2026-10-26T03:00:00Z", minutes: 10 }).ok).toBe(false);
    expect(parseTvEvent({ id, kind: "payCash", at: "2026-10-26T03:00:00Z", minutes: 10 }).ok).toBe(false);
    expect(parseTvEvent({ id, kind: TV_STAFF_TEST_KIND, at: "kemarin", minutes: 10 }).ok).toBe(false);
    expect(parseTvEvent({ id, kind: TV_STAFF_TEST_KIND, at: "2026-10-26T03:00:00Z", minutes: 999 }).ok).toBe(false);
  });
  it("aksi TV yang ditolak tetap dicatat agar terlihat di dashboard", () => {
    const src = readFileSync(join(__dirname, "tv-sessions.ts"), "utf8");
    const sync = src.slice(src.indexOf("export async function syncTvActions"));
    expect(sync).toMatch(/for \(const rej of rejected\)[\s\S]*insert\(offlineSyncActions\)[\s\S]*status: "failed"/);
  });
});
