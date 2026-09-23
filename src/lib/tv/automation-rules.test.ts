import { describe, it, expect } from "vitest";
import { assessAutomationReadiness, canEnableAutoSwitch, changeInvalidatesVerification, type AgentSnapshot } from "./automation-rules";

/**
 * Yang dijaga di sini: otomatisasi "sesi mulai → pindah HDMI" TIDAK PERNAH bisa menyala untuk TV
 * yang belum terbukti mampu. Kalau lolos, pelanggan yang baru membayar duduk di depan screensaver,
 * bukan PlayStation — kegagalan yang paling terasa di outlet.
 */

const agentV12: AgentSnapshot = {
  name: "PC Kasir",
  status: "online",
  agentVersion: "1.2.0",
  capabilities: ["power", "open_screensaver", "switch_hdmi", "tv_info"],
};
const agentV11: AgentSnapshot = { name: "PC Kasir", status: "online", agentVersion: "1.1", capabilities: ["power"] };

describe("assessAutomationReadiness", () => {
  it("layar tanpa unit tidak punya sesi, jadi tidak bisa diotomatisasi", () => {
    const r = assessAutomationReadiness({ hasUnit: false, deviceProtocol: null, agent: null });
    expect(r.blocker).toBeTruthy();
    expect(r.viaRelay).toBe(false);
  });

  it("unit smart plug (Tuya/Tasmota) diblokir — otomatisasi hanya lewat Relay Agent", () => {
    for (const protocol of ["tuya", "tasmota_mqtt", "android_tv_adb"]) {
      const r = assessAutomationReadiness({ hasUnit: true, deviceProtocol: protocol, agent: null });
      expect(r.blocker).toBeTruthy();
      expect(r.canSwitchHdmi).toBe(false);
    }
  });

  it("unit tanpa perangkat diblokir dengan pesan yang menunjuk ke Kontrol Perangkat", () => {
    const r = assessAutomationReadiness({ hasUnit: true, deviceProtocol: null, agent: null });
    expect(r.blocker).toContain("Kontrol Perangkat");
  });

  it("agent v1.1 diblokir dan pesannya menyebut versinya", () => {
    const r = assessAutomationReadiness({ hasUnit: true, deviceProtocol: "android_tv_relay", agent: agentV11 });
    expect(r.canOpenScreensaver).toBe(false);
    expect(r.canSwitchHdmi).toBe(false);
    expect(r.blocker).toContain("1.1");
  });

  it("agent yang belum pernah melapor versi diblokir, bukan dianggap mampu", () => {
    const r = assessAutomationReadiness({
      hasUnit: true,
      deviceProtocol: "android_tv_relay",
      agent: { name: "PC", status: "offline", agentVersion: null, capabilities: ["power"] },
    });
    expect(r.blocker).toBeTruthy();
  });

  it("agent v1.2 lewat Relay Agent siap, tanpa penghalang", () => {
    const r = assessAutomationReadiness({ hasUnit: true, deviceProtocol: "android_tv_relay", agent: agentV12 });
    expect(r.blocker).toBeNull();
    expect(r.canOpenScreensaver && r.canSwitchHdmi && r.canReadTvInfo).toBe(true);
    expect(r.agentOnline).toBe(true);
  });

  it("agent yang hanya mampu salah satu perintah tetap diblokir — dua-duanya wajib", () => {
    const r = assessAutomationReadiness({
      hasUnit: true,
      deviceProtocol: "android_tv_relay",
      agent: { ...agentV12, capabilities: ["power", "open_screensaver"] },
    });
    expect(r.blocker).toBeTruthy();
  });
});

describe("canEnableAutoSwitch — tiga syarat, semuanya wajib", () => {
  const ready = assessAutomationReadiness({ hasUnit: true, deviceProtocol: "android_tv_relay", agent: agentV12 });

  it("lolos bila agent mampu, port HDMI terisi, dan sudah diverifikasi", () => {
    expect(canEnableAutoSwitch({ readiness: ready, hdmiPort: 2, verifiedAt: "2026-09-23T10:00:00Z" }).ok).toBe(true);
  });

  it("ditolak tanpa port HDMI — sesi mulai tidak tahu harus pindah ke mana", () => {
    expect(canEnableAutoSwitch({ readiness: ready, hdmiPort: null, verifiedAt: "2026-09-23T10:00:00Z" }).ok).toBe(false);
  });

  it("ditolak sebelum staf mengonfirmasi tes dengan mata sendiri", () => {
    expect(canEnableAutoSwitch({ readiness: ready, hdmiPort: 2, verifiedAt: null }).ok).toBe(false);
  });

  it("ditolak untuk agent v1.1 meski port dan verifikasi terisi", () => {
    const old = assessAutomationReadiness({ hasUnit: true, deviceProtocol: "android_tv_relay", agent: agentV11 });
    expect(canEnableAutoSwitch({ readiness: old, hdmiPort: 2, verifiedAt: "2026-09-23T10:00:00Z" }).ok).toBe(false);
  });
});

describe("changeInvalidatesVerification — tes berlaku untuk kombinasi yang dites saja", () => {
  const before = { rentalUnitId: "u1", hdmiPort: 2, browserPackage: "com.contoh.browser" };

  it("mengganti port HDMI membatalkan verifikasi", () => {
    expect(changeInvalidatesVerification(before, { hdmiPort: 3 })).toBe(true);
  });

  it("mengganti browser membatalkan verifikasi", () => {
    expect(changeInvalidatesVerification(before, { browserPackage: "com.lain.browser" })).toBe(true);
    expect(changeInvalidatesVerification(before, { browserPackage: null })).toBe(true);
  });

  it("memindah layar ke unit lain membatalkan verifikasi", () => {
    expect(changeInvalidatesVerification(before, { rentalUnitId: "u2" })).toBe(true);
  });

  it("menyimpan ulang nilai yang sama TIDAK membatalkan verifikasi", () => {
    expect(changeInvalidatesVerification(before, { hdmiPort: 2, browserPackage: "com.contoh.browser", rentalUnitId: "u1" })).toBe(false);
  });

  it("perubahan yang tidak menyentuh ketiganya tidak membatalkan apa pun", () => {
    expect(changeInvalidatesVerification(before, {})).toBe(false);
  });

  it("string kosong dan null diperlakukan sama untuk browser", () => {
    const noBrowser = { rentalUnitId: "u1", hdmiPort: 2, browserPackage: null };
    expect(changeInvalidatesVerification(noBrowser, { browserPackage: "" })).toBe(false);
  });
});
