import { describe, expect, it } from "vitest";
import { STARTER_ANSWERS } from "./starter-answers";
import {
  composeTier1Reply,
  detectIntent,
  feedbackData,
  isFeedbackEcho,
  nameVar,
  nextTier,
  parseFeedbackData,
  tier1Match,
} from "./tiers";

const chunks = STARTER_ANSWERS.map((a) => ({ source: "Jawaban tim NEXBILL", title: a.question, text: `${a.answer}\n(${a.topic})` }));
const keyOf = (title: string) => STARTER_ANSWERS.find((a) => a.question === title)?.key;

describe("niat pesan", () => {
  it("mengenali sapaan, terima kasih, minta staf, tanya bot, belum beres, samar", () => {
    expect(detectIntent("Halo kak")).toBe("greeting");
    expect(detectIntent("pagi")).toBe("greeting");
    expect(detectIntent("makasih")).toBe("thanks");
    expect(detectIntent("saya mau bicara dengan tim")).toBe("human");
    expect(detectIntent("/tim")).toBe("human");
    expect(detectIntent("ini bot ya?")).toBe("is_bot");
    expect(detectIntent("masih belum bisa")).toBe("not_resolved");
    expect(detectIntent("Caranya bagaimana")).toBe("vague");
    expect(detectIntent("Tolong bantuannya setting")).toBe("vague");
    expect(detectIntent("cara tutup shift")).toBe("question");
  });
});

describe("tingkat 1 (FAQ tanpa AI)", () => {
  it("yakin untuk pertanyaan umum yang jelas", () => {
    for (const [q, key] of [
      ["lupa password", "lupa-password"],
      ["kode pairing ditolak", "tv-kode-ditolak"],
      ["smart plug tuya tidak merespons", "smart-plug-tuya"],
      ["cara membuat voucher diskon", "voucher"],
    ] as const) {
      const m = tier1Match(q, chunks);
      expect(m?.confident, q).toBe(true);
      expect(keyOf(m!.chunk.title), q).toBe(key);
    }
  });
  it("tidak menebak untuk pertanyaan samar atau di luar FAQ", () => {
    expect(tier1Match("Caranya bagaimana", chunks)).toBeNull();
    expect(tier1Match("integrasi gojek", chunks)?.confident ?? false).toBe(false);
    expect(tier1Match("bagaimana cara reset pabrik tv", chunks)?.confident ?? false).toBe(false);
  });
  it("balasan bergaya tim: sapaan nama, isi jawaban, ajakan menekan tombol", () => {
    const m = tier1Match("lupa password", chunks)!;
    const r = composeTier1Reply(m, { name: "Budi Santoso", seed: "x" });
    expect(r).toContain("Kak Budi");
    expect(r).toContain("Belum terselesaikan");
    expect(r).not.toMatch(/Sumber:|bot|AI/);
    expect(composeTier1Reply(m, { name: "Budi", frustrated: true, seed: "x" })).toMatch(/maaf/i);
  });
});

describe("tingkat & tombol", () => {
  it("naik satu tingkat: FAQ → AI → staf", () => {
    expect(nextTier("faq")).toBe("ai");
    expect(nextTier("ai")).toBe("team");
    expect(nextTier(null)).toBe("team");
  });
  it("callback_data tombol ≤ 64 byte dan bisa diurai", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    const d = feedbackData("team", id);
    expect(Buffer.byteLength(d)).toBeLessThanOrEqual(64);
    expect(parseFeedbackData(d)).toEqual({ kind: "team", logId: id });
    expect(parseFeedbackData("fb:hapus:1")).toBeNull();
    expect(parseFeedbackData(undefined)).toBeNull();
  });
  it("baris tombol bukan uraian masalah; sapaan nama per bahasa", () => {
    expect(isFeedbackEcho("❌ Belum terselesaikan")).toBe(true);
    expect(isFeedbackEcho("TV mati")).toBe(false);
    expect(nameVar("Budi Santoso", "id")).toBe(" Kak Budi");
    expect(nameVar("Staf", "id")).toBe(" Kak");
    expect(nameVar("Somchai", "th")).toBe(", Somchai");
    expect(nameVar(null, "en")).toBe("");
  });
});
