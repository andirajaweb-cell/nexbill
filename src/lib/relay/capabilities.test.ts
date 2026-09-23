import { describe, it, expect } from "vitest";
import {
  ACTION_REQUIRES,
  RELAY_ACTIONS,
  checkActionAllowed,
  isPrivateLanIPv4,
  isRelayAction,
  normalizeHandshake,
  parseStoredCapabilities,
  validateAndroidPackage,
  validateHdmiPort,
} from "./capabilities";

/**
 * Yang dijaga di sini: agent lama (v1.1) yang sudah terpasang di outlet — dan yang membalas
 * "berhasil" untuk perintah yang tidak ia kenal — TIDAK PERNAH menerima perintah baru, sementara
 * perintah lamanya tetap jalan persis seperti sebelumnya.
 */

describe("normalizeHandshake — agent lama tetap diterima, tapi dibatasi", () => {
  it("agent v1.1 yang hanya mengirim token dianggap v1.1 dengan kemampuan power saja", () => {
    const h = normalizeHandshake({});
    expect(h.agentVersion).toBe("1.1");
    expect(h.capabilities).toEqual(["power"]);
    expect(h.reported).toBe(false);
  });

  it("agent v1.2 melaporkan versi dan kemampuannya", () => {
    const h = normalizeHandshake({ agentVersion: "1.2.0", capabilities: ["power", "open_screensaver", "switch_hdmi"] });
    expect(h.agentVersion).toBe("1.2.0");
    expect(h.capabilities).toEqual(["power", "open_screensaver", "switch_hdmi"]);
    expect(h.reported).toBe(true);
  });

  it("kemampuan yang tidak dikenal hub DIBUANG — hub tidak mengizinkan sesuatu yang tidak ia pahami", () => {
    const h = normalizeHandshake({ agentVersion: "1.3.0", capabilities: ["power", "run_any_shell_command", "open_screensaver"] });
    expect(h.capabilities).toEqual(["power", "open_screensaver"]);
  });

  it('"power" selalu ada — agent baru yang lupa mencantumkannya tidak kehilangan kontrol TV dasar', () => {
    expect(normalizeHandshake({ agentVersion: "1.2.0", capabilities: ["switch_hdmi"] }).capabilities).toContain("power");
    expect(normalizeHandshake({ agentVersion: "1.2.0" }).capabilities).toEqual(["power"]);
  });

  it("versi yang formatnya aneh diperlakukan sebagai v1.1, bukan dipercaya", () => {
    for (const bad of ["", "v1.2", "1.2.0-beta; rm", "latest", 12, null]) {
      const h = normalizeHandshake({ agentVersion: bad, capabilities: ["open_screensaver"] });
      expect(h.agentVersion).toBe("1.1");
      expect(h.capabilities).toEqual(["power"]);
    }
  });

  it("urutan kemampuan selalu sama, apa pun urutan kiriman agent", () => {
    const a = normalizeHandshake({ agentVersion: "1.2.0", capabilities: ["switch_hdmi", "power", "tv_info"] });
    const b = normalizeHandshake({ agentVersion: "1.2.0", capabilities: ["tv_info", "switch_hdmi"] });
    expect(a.capabilities).toEqual(b.capabilities);
  });
});

describe("checkActionAllowed — pelindung untuk agent yang sudah terpasang", () => {
  it("agent v1.1 tetap bisa menyalakan, mematikan, dan mengecek TV", () => {
    for (const action of ["turnOn", "turnOff", "getState"] as const) {
      expect(checkActionAllowed(["power"], action, "1.1").ok).toBe(true);
    }
  });

  it("agent v1.1 DITOLAK untuk perintah baru — bukan dibiarkan pura-pura berhasil", () => {
    for (const action of ["openScreensaver", "switchHdmi", "getTvInfo"] as const) {
      const r = checkActionAllowed(["power"], action, "1.1");
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toContain("1.1");
    }
  });

  it("agent v1.2 dengan kemampuan yang sesuai diizinkan", () => {
    expect(checkActionAllowed(["power", "open_screensaver"], "openScreensaver", "1.2.0").ok).toBe(true);
    expect(checkActionAllowed(["power", "switch_hdmi"], "switchHdmi", "1.2.0").ok).toBe(true);
  });

  it("setiap perintah yang dikenal punya kemampuan wajib — tidak ada perintah yang lolos tanpa pemeriksaan", () => {
    for (const action of RELAY_ACTIONS) expect(ACTION_REQUIRES[action]).toBeTruthy();
  });
});

describe("isRelayAction", () => {
  it("mengenali perintah yang ada, menolak yang lain", () => {
    expect(isRelayAction("turnOn")).toBe(true);
    expect(isRelayAction("openScreensaver")).toBe(true);
    expect(isRelayAction("shell")).toBe(false);
    expect(isRelayAction("")).toBe(false);
    expect(isRelayAction(undefined)).toBe(false);
  });
});

describe("parseStoredCapabilities", () => {
  it("kolom kosong atau rusak dibaca sebagai kemampuan v1.1", () => {
    expect(parseStoredCapabilities(null)).toEqual(["power"]);
    expect(parseStoredCapabilities("")).toEqual(["power"]);
    expect(parseStoredCapabilities("bukan json")).toEqual(["power"]);
    expect(parseStoredCapabilities('{"a":1}')).toEqual(["power"]);
  });

  it("membaca kembali nilai yang disimpan hub", () => {
    expect(parseStoredCapabilities('["power","open_screensaver"]')).toEqual(["power", "open_screensaver"]);
  });
});

describe("validateHdmiPort", () => {
  it("hanya menerima bilangan bulat 1-4", () => {
    expect(validateHdmiPort(1)).toBe(1);
    expect(validateHdmiPort(4)).toBe(4);
    for (const bad of [0, 5, -1, 2.5, "2", "2; reboot", null, undefined, Number.NaN]) {
      expect(validateHdmiPort(bad)).toBeNull();
    }
  });
});

describe("validateAndroidPackage — nilainya berakhir di perintah am start di TV", () => {
  it("menerima nama paket Android yang sah", () => {
    expect(validateAndroidPackage("com.android.chrome")).toBe("com.android.chrome");
    expect(validateAndroidPackage("org.mozilla.tv_firefox")).toBe("org.mozilla.tv_firefox");
  });

  it("menolak apa pun yang bisa menyelipkan perintah shell", () => {
    for (const bad of ["com.x; reboot", "com.x && rm -rf /", "com.x`id`", "com.x $(id)", "com x", "'com.x'", "com.x\nreboot"]) {
      expect(validateAndroidPackage(bad)).toBeNull();
    }
  });

  it("menolak bentuk yang bukan nama paket", () => {
    for (const bad of ["chrome", ".com.x", "com..x", "1com.x", "com.1x", "", null, 42]) {
      expect(validateAndroidPackage(bad)).toBeNull();
    }
  });
});

describe("isPrivateLanIPv4", () => {
  it("menerima tiga rentang jaringan lokal", () => {
    expect(isPrivateLanIPv4("192.168.1.50")).toBe(true);
    expect(isPrivateLanIPv4("10.0.0.5")).toBe(true);
    expect(isPrivateLanIPv4("172.16.0.1")).toBe(true);
    expect(isPrivateLanIPv4("172.31.255.254")).toBe(true);
  });

  it("menolak alamat internet dan yang tepat di luar batas rentang", () => {
    for (const bad of ["8.8.8.8", "172.15.0.1", "172.32.0.1", "192.169.1.1", "100.64.0.1", "127.0.0.1"]) {
      expect(isPrivateLanIPv4(bad)).toBe(false);
    }
  });

  it("menolak yang bukan IPv4 sah", () => {
    for (const bad of ["192.168.1.256", "192.168.1", "tv.local", "192.168.1.5; id", "", null]) {
      expect(isPrivateLanIPv4(bad)).toBe(false);
    }
  });
});
