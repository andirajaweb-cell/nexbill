import { describe, expect, it } from "vitest";
import { STARTER_ANSWERS, STARTER_TOPICS } from "./starter-answers";
import { searchChunks } from "./knowledge-rules";
import { starterKeyOf, starterTag, topicOfTags } from "./starter-tags";

const chunks = STARTER_ANSWERS.map((a) => ({ source: "Jawaban tim NEXBILL", title: a.question, text: `${a.answer}\n(${a.topic})`, key: a.key }));
const top = (q: string) => (searchChunks(q, chunks, { limit: 3 }) as typeof chunks).map((c) => c.key);

describe("Jawaban Bot bawaan", () => {
  it("lengkap & rapi: key unik, topik sah, setiap topik terisi, jawaban cukup rinci", () => {
    const keys = STARTER_ANSWERS.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(STARTER_ANSWERS.length).toBeGreaterThanOrEqual(80);
    for (const a of STARTER_ANSWERS) {
      expect(STARTER_TOPICS as readonly string[], a.key).toContain(a.topic);
      expect(a.key, a.key).toMatch(/^[a-z0-9-]+$/);
      expect(a.answer.length, a.key).toBeGreaterThan(80);
    }
    for (const t of STARTER_TOPICS) expect(STARTER_ANSWERS.filter((a) => a.topic === t).length, t).toBeGreaterThanOrEqual(3);
  });
  it("tidak menyebut pesaing atau data outlet tertentu", () => {
    for (const a of STARTER_ANSWERS) expect(`${a.question} ${a.answer}`, a.key).not.toMatch(/kula|ceco|alfsmart|xtream/i);
  });
  it("pertanyaan merchant menemukan jawaban yang tepat", () => {
    expect(top("TV tidak bisa install apk sumber tidak dikenal")).toContain("tv-izin-apk");
    expect(top("lupa password akun")).toContain("lupa-password");
    expect(top("selisih kas waktu tutup shift")).toContain("selisih-kas");
    expect(top("kode pairing ditolak kedaluwarsa")).toContain("tv-kode-ditolak");
    expect(top("smart plug tuya tidak merespons")).toContain("smart-plug-tuya");
    expect(top("wifi mati pelanggan sedang main tv")).toContain("offline-tv-main");
    expect(top("struk printer terpotong")).toContain("printer-tidak-cetak");
  });
  it("tag bawaan bisa dibaca balik", () => {
    const t = starterTag("tv-pairing", "NEXBILL TV — instalasi");
    expect(starterKeyOf(t)).toBe("tv-pairing");
    expect(topicOfTags(t)).toBe("NEXBILL TV — instalasi");
    expect(starterKeyOf("bebas")).toBeNull();
    expect(topicOfTags("bebas")).toBe("bebas");
  });
});
