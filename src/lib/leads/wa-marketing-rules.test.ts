import { describe, expect, it } from "vitest";
import {
  ADMIN_PHONE_NAME,
  ADMIN_PHONE_PREFIX,
  BOT_REPLY_PREFIX,
  botMayReply,
  conversationTurns,
  featureFactLines,
  formatRp,
  guessLang,
  handoffNotifyDue,
  HANDOFF_NOTE,
  INBOUND_PREFIX,
  isGreetingOrPrefill,
  isOptOut,
  leadPatchFrom,
  MARKETING_BOT_NAME,
  MARKETING_LANGS,
  marketingSystemPrompt,
  menuReply,
  MK_TEXT,
  outletNameFromPrefill,
  parseMarketingAi,
  parseMenuChoice,
  parseOnOff,
  placeholderLeadName,
  wantsHuman,
  type LeadActivityLite,
  type MarketingFacts,
} from "./wa-marketing-rules";

const NOW = new Date("2026-11-22T10:00:00.000Z");
const ago = (min: number) => new Date(NOW.getTime() - min * 60_000).toISOString();
const act = (p: Partial<LeadActivityLite>): LeadActivityLite => ({ type: "whatsapp", content: "", createdBy: null, createdByName: null, createdAt: ago(5), ...p });

const FACTS: MarketingFacts = {
  starterPerUnit: 6000,
  starterMinUnits: 5,
  proFlat: 199000,
  multiDiscountPct: 20,
  annualMonthsCharged: 10,
  annualMonthsGranted: 12,
  aiAddonMonthly: 149000,
  trialDays: 30,
  siteUrl: "https://www.nexbill.id",
};

describe("pesan masuk", () => {
  it("menebak bahasa dari pesan isi-otomatis situs", () => {
    expect(guessLang("Halo Admin NEXBILL, saya ingin berlangganan NEXBILL")).toBe("id");
    expect(guessLang("Hello NEXBILL Admin, I would like to subscribe")).toBe("en");
    expect(guessLang("Helo Admin NEXBILL, saya ingin melanggan NEXBILL")).toBe("ms");
    expect(guessLang("สวัสดีแอดมิน NEXBILL")).toBe("th");
    expect(guessLang("Xin chào Admin NEXBILL, tôi muốn đăng ký")).toBe("vi");
    expect(guessLang("Hello NEXBILL Admin, gusto kong mag-subscribe")).toBe("fil");
    expect(guessLang("👍", "en")).toBe("en");
  });

  it("mengambil nama outlet dari pesan isi-otomatis", () => {
    expect(outletNameFromPrefill("Halo Admin NEXBILL, saya ingin berlangganan. Nama outlet: Arena PS Jaya")).toBe("Arena PS Jaya");
    expect(outletNameFromPrefill("Outlet name: Game Zone.")).toBe("Game Zone");
    expect(outletNameFromPrefill("Nama outlet: ")).toBeNull();
    expect(outletNameFromPrefill("Nama outlet: ...")).toBeNull();
    expect(outletNameFromPrefill("harga berapa?")).toBeNull();
  });

  it("opt-out & minta manusia", () => {
    expect(isOptOut("STOP")).toBe(true);
    expect(isOptOut("jangan hubungi saya lagi")).toBe(true);
    expect(isOptOut("stop kontak bisa otomatis?")).toBe(false);
    expect(wantsHuman("admin")).toBe(true);
    expect(wantsHuman("bisa bicara dengan admin?")).toBe(true);
    expect(wantsHuman("tolong telepon saya")).toBe(true);
    expect(wantsHuman("Halo Admin NEXBILL, saya ingin berlangganan")).toBe(false);
  });

  it("sapaan / pesan isi-otomatis vs pertanyaan nyata", () => {
    expect(isGreetingOrPrefill("Halo Admin NEXBILL, saya ingin berlangganan NEXBILL untuk rental PS saya. Nama outlet: Arena")).toBe(true);
    expect(isGreetingOrPrefill("halo min")).toBe(true);
    expect(isGreetingOrPrefill("Assalamualaikum")).toBe(true);
    expect(isGreetingOrPrefill("P")).toBe(true);
    expect(isGreetingOrPrefill("halo, harga untuk 10 unit berapa?")).toBe(false);
    expect(isGreetingOrPrefill("bisa matikan TV otomatis kalau waktu habis")).toBe(false);
  });

  it("menu angka", () => {
    expect(parseMenuChoice("1")).toBe("price");
    expect(parseMenuChoice(" 4. ")).toBe("human");
    expect(parseMenuChoice("5")).toBe("customer");
    expect(parseMenuChoice("6")).toBeNull();
    expect(parseMenuChoice("10 unit")).toBeNull();
  });

  it("saklar env", () => {
    expect(parseOnOff(undefined, true)).toBe(true);
    expect(parseOnOff("off", true)).toBe(false);
    expect(parseOnOff("on", false)).toBe(true);
  });
});

describe("botMayReply", () => {
  const base = { source: "whatsapp", status: "baru", activities: [] as LeadActivityLite[], now: NOW, takeoverHours: 24 };

  it("hanya lead sumber WhatsApp dengan status awal", () => {
    expect(botMayReply(base)).toEqual({ ok: true });
    expect(botMayReply({ ...base, source: "google_maps" })).toEqual({ ok: false, reason: "not_whatsapp_lead" });
    expect(botMayReply({ ...base, status: "demo" })).toEqual({ ok: false, reason: "status" });
    expect(botMayReply({ ...base, status: "tidak_tertarik" })).toEqual({ ok: false, reason: "status" });
  });

  it("diam saat admin sedang menangani (dashboard atau HP)", () => {
    expect(botMayReply({ ...base, activities: [act({ createdBy: "admin-1", createdByName: "Andi", createdAt: ago(60) })] })).toEqual({ ok: false, reason: "human_active" });
    expect(botMayReply({ ...base, activities: [act({ createdByName: ADMIN_PHONE_NAME, content: `${ADMIN_PHONE_PREFIX}oke kak`, createdAt: ago(30) })] })).toEqual({ ok: false, reason: "human_active" });
    // sentuhan admin sudah lewat 24 jam → bot boleh lagi
    expect(botMayReply({ ...base, activities: [act({ createdBy: "admin-1", createdAt: ago(25 * 60) })] })).toEqual({ ok: true });
    // catatan admin biasa bukan pengambilalihan
    expect(botMayReply({ ...base, activities: [act({ type: "catatan", createdBy: "admin-1", content: "prospek bagus" })] })).toEqual({ ok: true });
  });

  it("saklar #bot-off / #bot-on lewat catatan", () => {
    const off = act({ type: "catatan", content: "Saya tangani sendiri #bot-off", createdAt: ago(3000) });
    expect(botMayReply({ ...base, activities: [off] })).toEqual({ ok: false, reason: "switched_off" });
    const on = act({ type: "catatan", content: "#bot-on lagi", createdAt: ago(10) });
    expect(botMayReply({ ...base, activities: [off, on] })).toEqual({ ok: true });
  });

  it("rem banjir & batas balasan per jam", () => {
    const flood = Array.from({ length: 11 }, () => act({ content: `${INBOUND_PREFIX}halo` }));
    expect(botMayReply({ ...base, activities: flood })).toEqual({ ok: false, reason: "flood" });
    const many = Array.from({ length: 12 }, () => act({ createdByName: MARKETING_BOT_NAME, content: `${BOT_REPLY_PREFIX}x` }));
    expect(botMayReply({ ...base, activities: many })).toEqual({ ok: false, reason: "rate_limited" });
  });

  it("notifikasi admin sekali per 6 jam", () => {
    expect(handoffNotifyDue([], NOW)).toBe(true);
    expect(handoffNotifyDue([act({ type: "status", content: `${HANDOFF_NOTE}: minta admin`, createdAt: ago(60) })], NOW)).toBe(false);
    expect(handoffNotifyDue([act({ type: "status", content: `${HANDOFF_NOTE}: minta admin`, createdAt: ago(7 * 60) })], NOW)).toBe(true);
  });
});

describe("conversationTurns", () => {
  it("giliran bergantian, diawali & diakhiri pelanggan", () => {
    const turns = conversationTurns([
      act({ content: `${BOT_REPLY_PREFIX}sapaan lama`, createdAt: ago(50) }),
      act({ content: `${INBOUND_PREFIX}harga?`, createdAt: ago(40) }),
      act({ content: `${INBOUND_PREFIX}untuk 8 unit`, createdAt: ago(39) }),
      act({ content: `${BOT_REPLY_PREFIX}Starter Rp48.000`, createdAt: ago(38) }),
      act({ type: "catatan", content: "catatan internal", createdBy: "a", createdAt: ago(37) }),
      act({ content: `${INBOUND_PREFIX}oke daftar dimana`, createdAt: ago(1) }),
    ]);
    expect(turns.map((t) => t.role)).toEqual(["user", "assistant", "user"]);
    expect(turns[0].content).toBe("harga?\nuntuk 8 unit");
    expect(turns[2].content).toBe("oke daftar dimana");
  });
});

describe("parseMarketingAi", () => {
  it("JSON valid (boleh dibungkus teks/kode)", () => {
    const r = parseMarketingAi('```json\n{"reply":"Halo **Kak**","intent":"subscribe","handoff":false,"extracted":{"outletName":"Arena PS","city":"Bandung","unitCount":"8","currentBilling":null,"contactName":"null"}}\n```');
    expect(r).toEqual({
      reply: "Halo *Kak*",
      intent: "subscribe",
      handoff: false,
      extracted: { outletName: "Arena PS", city: "Bandung", unitCount: 8, currentBilling: null, contactName: null },
    });
  });
  it("intent tak dikenal → other; human → handoff; unit tidak masuk akal dibuang", () => {
    expect(parseMarketingAi('{"reply":"ok","intent":"beli"}')?.intent).toBe("other");
    expect(parseMarketingAi('{"reply":"ok","intent":"human"}')?.handoff).toBe(true);
    expect(parseMarketingAi('{"reply":"ok","extracted":{"unitCount":5000}}')?.extracted.unitCount).toBeNull();
  });
  it("tanpa JSON / tanpa reply → null", () => {
    expect(parseMarketingAi("Halo kak")).toBeNull();
    expect(parseMarketingAi('{"intent":"question"}')).toBeNull();
    expect(parseMarketingAi("{rusak")).toBeNull();
  });
});

describe("leadPatchFrom", () => {
  const lead = { name: "Prospek WA · Budi", city: null, unitCount: null, currentBilling: null, contactName: "Budi", temperature: "warm" as const };
  it("mengisi yang kosong saja, nama placeholder diganti nama outlet", () => {
    expect(leadPatchFrom(lead, { outletName: "Arena PS", city: "Bandung", unitCount: 8, currentBilling: "manual", contactName: "Pak Budi" }, "subscribe")).toEqual({
      name: "Arena PS",
      city: "Bandung",
      unitCount: 8,
      currentBilling: "manual",
      temperature: "hot",
    });
  });
  it("nama yang sudah diisi admin tidak ditimpa", () => {
    expect(leadPatchFrom({ ...lead, name: "Arena PS Jaya" }, { outletName: "Arena", city: null, unitCount: null, currentBilling: null, contactName: null }, "question")).toEqual({});
  });
  it("nama placeholder", () => {
    expect(placeholderLeadName("Budi 🎮", "6281234567890")).toBe("Prospek WA · Budi");
    expect(placeholderLeadName(null, "6281234567890")).toBe("Prospek WA · 081234567890");
  });
});

describe("fakta & teks", () => {
  it("format rupiah", () => {
    expect(formatRp(6000)).toBe("Rp6.000");
    expect(formatRp(199000)).toBe("Rp199.000");
  });
  it("prompt memuat harga & daftar fitur dari tabel paket", () => {
    const p = marketingSystemPrompt(FACTS);
    expect(p).toContain("Rp6.000 per unit per bulan, minimal 5 unit (= Rp30.000/bulan");
    expect(p).toContain("Rp199.000 per outlet per bulan");
    expect(p).toContain("https://www.nexbill.id/daftar");
    expect(featureFactLines(FACTS).length).toBeGreaterThan(5);
  });
  it("teks tetap lengkap 6 bahasa & placeholder terisi", () => {
    for (const entry of Object.values(MK_TEXT)) for (const l of MARKETING_LANGS) expect((entry as Record<string, string>)[l]?.length).toBeGreaterThan(10);
    const price = menuReply("price", "id", FACTS);
    expect(price).toContain("Rp6.000/unit/bulan");
    expect(price).not.toMatch(/\{[a-z]+\}/i);
    expect(menuReply("trial", "en", FACTS)).toContain("https://www.nexbill.id/daftar");
  });
});
