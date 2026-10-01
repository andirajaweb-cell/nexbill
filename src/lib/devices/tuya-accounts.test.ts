import { describe, it, expect } from "vitest";
import {
  parseTuyaConfig,
  mergeTuyaConfig,
  maskSecret,
  sortAccounts,
  pickAccountForDevice,
  accountsToProbe,
  isNotOwnedError,
  countDevicesPerAccount,
  validateTuyaAccountInput,
} from "./tuya-accounts";

const A = { id: "a", sortOrder: 0, createdAt: "2026-01-01" };
const B = { id: "b", sortOrder: 1, createdAt: "2026-01-02" };
const C = { id: "c", sortOrder: 1, createdAt: "2026-01-01" };

describe("parse/merge config", () => {
  it("parses and trims, ignores junk", () => {
    expect(parseTuyaConfig('{"deviceId":" x1 ","switchCode":"","accountId":"b"}')).toEqual({ deviceId: "x1", accountId: "b" });
    expect(parseTuyaConfig("not json")).toEqual({});
    expect(parseTuyaConfig(null)).toEqual({});
  });
  it("merges without dropping other keys and removes empty", () => {
    const out = JSON.parse(mergeTuyaConfig('{"deviceId":"x","relayAgentId":"r"}', { accountId: "b", switchCode: "" }));
    expect(out).toEqual({ deviceId: "x", relayAgentId: "r", accountId: "b" });
    expect(JSON.parse(mergeTuyaConfig('{"accountId":"b"}', { accountId: undefined }))).toEqual({ accountId: "b" });
    expect(JSON.parse(mergeTuyaConfig('{"accountId":"b"}', { accountId: "" }))).toEqual({});
  });
});

describe("mask", () => {
  it("only shows last 4", () => {
    expect(maskSecret("abcdefgh1234")).toBe("••••••••1234");
    expect(maskSecret("abc")).toBe("••••••••");
    expect(maskSecret(null)).toBe("");
  });
});

describe("account selection", () => {
  it("sorts by order then createdAt", () => {
    expect(sortAccounts([B, C, A]).map((x) => x.id)).toEqual(["a", "c", "b"]);
  });
  it("uses stored account when it exists, else first", () => {
    expect(pickAccountForDevice([A, B], { accountId: "b" })?.id).toBe("b");
    expect(pickAccountForDevice([B, A], { accountId: "gone" })?.id).toBe("a");
    expect(pickAccountForDevice([B, A], {})?.id).toBe("a");
    expect(pickAccountForDevice([], {})).toBeNull();
  });
  it("probes preferred first, no duplicates", () => {
    expect(accountsToProbe([A, B, C], "b").map((x) => x.id)).toEqual(["b", "a", "c"]);
    expect(accountsToProbe([A, B, C]).map((x) => x.id)).toEqual(["a", "c", "b"]);
  });
  it("not-owned codes", () => {
    expect(isNotOwnedError(1106)).toBe(true);
    expect(isNotOwnedError("2009")).toBe(true);
    expect(isNotOwnedError(1004)).toBe(false);
    expect(isNotOwnedError(undefined)).toBe(false);
  });
});

describe("count per account", () => {
  it("counts tuya devices; missing accountId goes to first", () => {
    const counts = countDevicesPerAccount([A, B], [
      { protocol: "tuya", config: '{"deviceId":"1"}' },
      { protocol: "tuya", config: '{"deviceId":"2","accountId":"b"}' },
      { protocol: "tuya", config: '{"deviceId":"3","accountId":"deleted"}' },
      { protocol: "tasmota_mqtt", config: null },
    ]);
    expect(counts).toEqual({ a: 2, b: 1 });
  });
});

describe("validate input", () => {
  it("requires access id and secret for new", () => {
    expect(() => validateTuyaAccountInput({ accessSecret: "s" }, true, "Akun 1")).toThrow(/Access ID/);
    expect(() => validateTuyaAccountInput({ accessId: "i" }, true, "Akun 1")).toThrow(/Secret/);
  });
  it("edit keeps secret when blank, defaults label & region", () => {
    expect(validateTuyaAccountInput({ accessId: " i ", accessSecret: "" }, false, "Akun 2")).toEqual({
      label: "Akun 2", accessId: "i", accessSecret: null, projectCode: null, region: "sg",
    });
  });
  it("rejects unknown region", () => {
    expect(() => validateTuyaAccountInput({ accessId: "i", accessSecret: "s", region: "mars" }, true, "x")).toThrow(/Region/);
  });
});
