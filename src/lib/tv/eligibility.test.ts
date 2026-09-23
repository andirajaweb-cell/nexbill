import { describe, it, expect } from "vitest";
import { assessTvEligibility, canPairScreen } from "./eligibility";
import { ANDROID_TV_PROTOCOLS, SMART_PLUG_PROTOCOLS } from "@/lib/subscription/config";

describe("assessTvEligibility — aturan pemilik: hanya setup TV Android", () => {
  it("TV analog tidak didukung, apa pun perangkat kontrolnya", () => {
    expect(assessTvEligibility("analog_tv", null).level).toBe("unsupported");
    expect(assessTvEligibility("analog_tv", "android_tv_relay").level).toBe("unsupported");
  });

  it("Smart TV tidak didukung — dengan smart plug Tuya, Tasmota, maupun tanpa perangkat", () => {
    expect(assessTvEligibility("smart_tv", "tuya").level).toBe("unsupported");
    expect(assessTvEligibility("smart_tv", "tasmota_mqtt").level).toBe("unsupported");
    expect(assessTvEligibility("smart_tv", null).level).toBe("unsupported");
  });

  it("tipe TV kosong atau tak dikenal ditolak, bukan dianggap Android", () => {
    expect(assessTvEligibility(null, null).level).toBe("unsupported");
    expect(assessTvEligibility("crt_tv", null).level).toBe("unsupported");
  });

  it("TV Android dengan kontrol ADB adalah setup yang paling cocok", () => {
    const direct = assessTvEligibility("android_tv", "android_tv_adb");
    const relay = assessTvEligibility("android_tv", "android_tv_relay");
    expect(direct.level).toBe("ready");
    expect(relay.level).toBe("ready");
    expect(relay.control).toBe("adb");
  });

  it("TV Android dengan smart plug DIIZINKAN tapi diberi peringatan — plug bisa saja hanya mengontrol konsol", () => {
    for (const protocol of ["tuya", "tasmota_mqtt", "sonoff_ewelink", "http_generic"]) {
      const e = assessTvEligibility("android_tv", protocol);
      expect(e.level).toBe("warning");
      expect(e.control).toBe("smart_plug");
      expect(canPairScreen(e)).toBe(true);
    }
  });

  it("TV Android tanpa perangkat kontrol siap dipakai", () => {
    const e = assessTvEligibility("android_tv", null);
    expect(e.level).toBe("ready");
    expect(e.control).toBe("none");
  });

  it("setiap penolakan menyertakan alasan yang bisa dibaca merchant", () => {
    for (const tvType of ["analog_tv", "smart_tv", null]) {
      const e = assessTvEligibility(tvType, null);
      expect(canPairScreen(e)).toBe(false);
      expect(e.reason.length).toBeGreaterThan(20);
    }
  });
});

describe("daftar protokol tetap sinkron dengan lib/subscription/config.ts", () => {
  // eligibility.ts menyalin daftar protokol alih-alih mengimpornya, supaya tetap murni. Uji ini
  // yang menjaga salinan itu: protokol smart plug baru yang ditambahkan di config.ts tanpa
  // diperbarui di sini akan jatuh ke cabang "tanpa kontrol" dan dilaporkan SIAP — padahal
  // plug-nya bisa memutus daya TV. Kegagalan uji di sini lebih murah daripada merchant yang
  // bingung kenapa layarnya tidak pernah menyala.
  it("setiap protokol smart plug menghasilkan peringatan", () => {
    for (const p of SMART_PLUG_PROTOCOLS) expect(assessTvEligibility("android_tv", p).control).toBe("smart_plug");
  });

  it("setiap protokol Android TV dikenali sebagai ADB", () => {
    for (const p of ANDROID_TV_PROTOCOLS) expect(assessTvEligibility("android_tv", p).control).toBe("adb");
  });
});
