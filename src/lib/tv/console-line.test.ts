import { describe, expect, it } from "vitest";
import { consoleLabel, consoleLine } from "./console-line";

describe("baris konsol layar TV", () => {
  it("mengikuti unit yang ada, urut generasi, PS2/PS3 ikut", () => {
    expect(consoleLine(["ps5", "ps2", "driving_simulator", "ps3", "ps4_pro", "ps4"])).toBe("PS2 • PS3 • PS4 • PS5 • Driving Simulator");
    expect(consoleLine(["ps3", "ps3"])).toBe("PS3");
    expect(consoleLine(["ps5_slim"])).toBe("PS5");
    expect(consoleLine([])).toBeNull();
  });
  it("label unit tetap rinci", () => {
    expect(consoleLabel("ps4_pro")).toBe("PS4 Pro");
    expect(consoleLabel("driving_simulator")).toBe("Driving Simulator");
    expect(consoleLabel(null)).toBeNull();
  });
});
