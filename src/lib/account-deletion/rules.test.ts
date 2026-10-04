import { describe, it, expect } from "vitest";
import {
  generateDeletionCode,
  hashDeletionCode,
  checkDeletionCode,
  isValidCodeFormat,
  purgeDueAt,
  isPurgeDue,
  anonymizedEmail,
  maskEmail,
  parseIdList,
  addMinutesIso,
  MAX_CODE_ATTEMPTS,
} from "./rules";

describe("deletion code", () => {
  it("generates 6 digits", () => {
    for (let i = 0; i < 20; i++) expect(generateDeletionCode()).toMatch(/^\d{6}$/);
    expect(isValidCodeFormat("012345")).toBe(true);
    expect(isValidCodeFormat("12345")).toBe(false);
    expect(isValidCodeFormat(123456)).toBe(false);
  });

  it("accepts the right code before expiry, rejects wrong/expired/over-attempted", () => {
    const now = new Date("2026-10-04T10:00:00Z");
    const base = { requestId: "r1", codeHash: hashDeletionCode("r1", "123456"), codeExpiresAt: addMinutesIso(now, 15), attempts: 0, now };
    expect(checkDeletionCode({ ...base, code: "123456" })).toEqual({ ok: true });
    expect(checkDeletionCode({ ...base, code: "654321" })).toEqual({ ok: false, reason: "wrong_code" });
    expect(checkDeletionCode({ ...base, code: "123456", now: new Date("2026-10-04T10:16:00Z") })).toEqual({ ok: false, reason: "expired" });
    expect(checkDeletionCode({ ...base, code: "123456", attempts: MAX_CODE_ATTEMPTS })).toEqual({ ok: false, reason: "too_many_attempts" });
    expect(checkDeletionCode({ ...base, code: "123456", codeHash: null })).toEqual({ ok: false, reason: "no_code" });
  });

  it("binds the code to the request id", () => {
    expect(hashDeletionCode("r1", "123456")).not.toBe(hashDeletionCode("r2", "123456"));
  });
});

describe("schedule & anonymization helpers", () => {
  it("purges 30 days after confirmation", () => {
    const due = purgeDueAt(new Date("2026-10-04T00:00:00Z"));
    expect(due).toBe("2026-11-03T00:00:00.000Z");
    expect(isPurgeDue(due, new Date("2026-11-02T23:59:59Z"))).toBe(false);
    expect(isPurgeDue(due, new Date("2026-11-03T00:00:00Z"))).toBe(true);
    expect(isPurgeDue(null)).toBe(false);
  });
  it("anonymized email is unique per user and masked email hides the local part", () => {
    expect(anonymizedEmail("abc")).toBe("deleted+abc@deleted.nexbill.id");
    expect(maskEmail("andiraja@gmail.com")).toBe("an***@gmail.com");
    expect(maskEmail("bad")).toBe("***");
  });
  it("parses id lists defensively", () => {
    expect(parseIdList('["a","b"]')).toEqual(["a", "b"]);
    expect(parseIdList("not json")).toEqual([]);
    expect(parseIdList('[1,"x",""]')).toEqual(["x"]);
  });
});
