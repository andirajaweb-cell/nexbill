import { describe, expect, it } from "vitest";
import { buildN8nPayload, n8nWebhookUrl, parseN8nResponse } from "./n8n-bridge-rules";
import type { MarketingFacts } from "./wa-marketing-rules";

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

describe("buildN8nPayload", () => {
  const p = buildN8nPayload({
    msg: { id: "m1", text: "berapa harga 8 unit?", mediaOnly: false, phone: "6281234567890", pushName: "Budi" },
    lang: "id",
    isGreeting: false,
    menuChoice: null,
    lead: { id: "L1", isNew: false, name: "Prospek WA · Budi", status: "baru", temperature: "warm", city: null, unitCount: null, currentBilling: null, contactName: "Budi" },
    history: [{ role: "user", content: "berapa harga 8 unit?" }],
    facts: FACTS,
    adminUrl: "https://dashboard.nexbill.id/platform-admin/leads",
    model: "claude-haiku-5-5",
    now: new Date("2026-11-23T03:00:00Z"),
  });
  it("berisi pesan, kontak, lead, riwayat, fakta & tautan", () => {
    expect(p.version).toBe(1);
    expect(p.contact.localPhone).toBe("081234567890");
    expect(p.lead.adminUrl).toContain("/platform-admin/leads");
    expect(p.facts.links.daftar).toBe("https://www.nexbill.id/daftar");
    expect(p.history).toHaveLength(1);
  });
  it("template siap pakai dalam bahasa prospek, placeholder terisi", () => {
    expect(p.templates.price).toContain("Rp6.000/unit/bulan");
    expect(p.templates.welcome).toContain("30");
    for (const t of Object.values(p.templates)) expect(t).not.toMatch(/\{[a-zA-Z]+\}/);
  });
  it("prompt sistem bawaan ikut dikirim", () => {
    expect(p.ai.systemPrompt).toContain("FAKTA HARGA");
    expect(p.ai.model).toBe("claude-haiku-5-5");
  });
});

describe("parseN8nResponse", () => {
  it("objek, string JSON, array, dan bungkus {json}", () => {
    expect(parseN8nResponse({ reply: "Halo **Kak**", intent: "question" })?.reply).toBe("Halo *Kak*");
    expect(parseN8nResponse('{"reply":"ok","menu":true}')?.menu).toBe(true);
    expect(parseN8nResponse([{ reply: "ok" }])?.reply).toBe("ok");
    expect(parseN8nResponse({ json: { reply: "ok" } })?.reply).toBe("ok");
  });
  it("reply null = diam; support/stop tanpa reply tetap sah", () => {
    expect(parseN8nResponse({ reply: null })).toMatchObject({ reply: null, intent: "other" });
    expect(parseN8nResponse({ intent: "support" })).toMatchObject({ reply: null, intent: "support" });
    expect(parseN8nResponse({ reply: "", intent: "stop" })?.intent).toBe("stop");
  });
  it("human → handoff; data kualifikasi divalidasi", () => {
    const r = parseN8nResponse({ reply: "siap", intent: "human", extracted: { unitCount: "12", city: " Majalaya ", outletName: "null" } });
    expect(r?.handoff).toBe(true);
    expect(r?.extracted).toEqual({ outletName: null, city: "Majalaya", unitCount: 12, currentBilling: null, contactName: null });
  });
  it("respons rusak → null (bot pakai otak bawaan)", () => {
    expect(parseN8nResponse("")).toBeNull();
    expect(parseN8nResponse("<html>error</html>")).toBeNull();
    expect(parseN8nResponse({ message: "Workflow was started" })).toBeNull();
    expect(parseN8nResponse({ reply: 42 })).toBeNull();
  });
});

describe("n8nWebhookUrl", () => {
  it("hanya http/https", () => {
    expect(n8nWebhookUrl("http://127.0.0.1:5678/webhook/nexbill-wa")).toBe("http://127.0.0.1:5678/webhook/nexbill-wa");
    expect(n8nWebhookUrl("")).toBeNull();
    expect(n8nWebhookUrl("ftp://x")).toBeNull();
    expect(n8nWebhookUrl("bukan url")).toBeNull();
  });
});
