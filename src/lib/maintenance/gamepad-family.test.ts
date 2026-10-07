import { describe, expect, it } from "vitest";
import { detectGamepadFamily, isAndroidUserAgent } from "./gamepad-family";

describe("detectGamepadFamily — Chrome/Edge desktop", () => {
  it.each([
    ["PLAYSTATION(R)3 Controller (STANDARD GAMEPAD Vendor: 054c Product: 0268)", "ps3"],
    ["Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 05c4)", "ps4"],
    ["DUALSHOCK 4 Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)", "ps4"],
    ["DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)", "ps5"],
    ["DualSense Edge Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0df2)", "ps5"],
    ["Unknown Sony pad (Vendor: 054c Product: 1234)", "sony_other"],
    ["Xbox 360 Controller (XInput STANDARD GAMEPAD)", "generic"],
  ])("%s → %s", (id, fam) => expect(detectGamepadFamily(id)).toBe(fam));
});

describe("detectGamepadFamily — Firefox", () => {
  it.each([
    ["054c-0268-PLAYSTATION(R)3 Controller", "ps3"],
    ["54c-9cc-Wireless Controller", "ps4"],
    ["054c-0ce6-DualSense Wireless Controller", "ps5"],
  ])("%s → %s", (id, fam) => expect(detectGamepadFamily(id)).toBe(fam));
});

describe("detectGamepadFamily — Chrome Android (nama perangkat saja)", () => {
  it.each([
    ["Sony PLAYSTATION(R)3 Controller", "ps3"],
    ["PLAYSTATION(R)3 Controller", "ps3"],
    ["Wireless Controller", "ps4"],
    ["Sony Interactive Entertainment Wireless Controller", "ps4"],
    ["Sony Computer Entertainment Wireless Controller", "ps4"],
    ["DualSense Wireless Controller", "ps5"],
    ["Sony Interactive Entertainment DualSense Wireless Controller", "ps5"],
    ["Xbox Wireless Controller", "generic"],
    ["8BitDo Pro 2 Wireless Controller", "generic"],
    ["Pro Controller", "generic"],
    ["", "generic"],
  ])("%s → %s", (id, fam) => expect(detectGamepadFamily(id)).toBe(fam));
});

describe("isAndroidUserAgent", () => {
  it("detects Android Chrome / TWA", () => {
    expect(isAndroidUserAgent("Mozilla/5.0 (Linux; Android 13; SM-A145F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36")).toBe(true);
  });
  it("is false on Windows", () => {
    expect(isAndroidUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/129.0 Safari/537.36")).toBe(false);
  });
});
