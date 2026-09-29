import { describe, expect, it } from "vitest";
import {
  DEFAULT_WA_TEMPLATES,
  LINK_DAFTAR,
  WA_TEMPLATE_STAGES,
  leadWaNumber,
  missingLeadFields,
  parseWaTemplateInput,
  placeholdersIn,
  renderWaTemplate,
  templatesForStage,
  unknownPlaceholders,
  waMeLink,
} from "./wa-template";

const lengkap = { name: "Galaxy PS", contactName: "Rudi", city: "Bandung", area: "Majalaya", unitCount: 6, currentBilling: "stopwatch", painPoints: "selisih kas" };
const minim = { name: "Galaxy PS" };

describe("renderWaTemplate", () => {
  it("mengisi placeholder dari data lead", () => {
    expect(renderWaTemplate("Halo {sapaan}, {nama_usaha} punya {jumlah_unit}.", lengkap, "Andi")).toBe("Halo Kak Rudi, Galaxy PS punya 6 unit.");
  });

  it("memakai kalimat cadangan saat data kosong", () => {
    expect(renderWaTemplate("Halo {sapaan}, masih pakai {billing_sekarang}? — {nama_admin}", minim)).toBe(
      "Halo Kak, masih pakai catatan manual/stopwatch? — tim NEXBILL"
    );
  });

  it("jumlah unit 0 dianggap belum diketahui", () => {
    expect(renderWaTemplate("{jumlah_unit}", { name: "X", unitCount: 0 })).toBe("beberapa unit");
  });

  it("placeholder tak dikenal dibiarkan apa adanya", () => {
    expect(renderWaTemplate("Halo {nama_usaha} {harga}", minim)).toBe("Halo Galaxy PS {harga}");
  });

  it("link konstan selalu terisi", () => {
    expect(renderWaTemplate("{link_daftar}", minim)).toBe(LINK_DAFTAR);
  });
});

describe("placeholder & field kosong", () => {
  it("mendaftar placeholder unik sesuai urutan", () => {
    expect(placeholdersIn("{a_b} {nama_usaha} {a_b}")).toEqual(["a_b", "nama_usaha"]);
    expect(unknownPlaceholders("{a_b} {nama_usaha}")).toEqual(["a_b"]);
  });

  it("menyebut field lead yang perlu dilengkapi, tanpa duplikat", () => {
    expect(missingLeadFields("{sapaan} {nama_kontak} {kota} {nama_usaha} {nama_admin}", minim, "")).toEqual(["Nama Pemilik / Kontak", "Kota"]);
    expect(missingLeadFields("{sapaan} {kota}", lengkap)).toEqual([]);
  });
});

describe("leadWaNumber", () => {
  it("memakai waNumber bila valid, kalau tidak dari telepon", () => {
    expect(leadWaNumber("6281234567890", "0899")).toBe("6281234567890");
    expect(leadWaNumber(null, "0812-3456-7890")).toBe("6281234567890");
    expect(leadWaNumber(null, "+62 812 3456 7890")).toBe("6281234567890");
    expect(leadWaNumber(null, "022-1234567")).toBeNull();
    expect(leadWaNumber(null, null)).toBeNull();
  });
});

describe("waMeLink", () => {
  it("meng-encode teks termasuk baris baru & emoji", () => {
    expect(waMeLink("628123", "a b\n🙏")).toBe("https://wa.me/628123?text=a%20b%0A%F0%9F%99%8F");
  });
});

describe("parseWaTemplateInput", () => {
  const base = { stage: "baru", element: "masalah", title: "Judul", body: "Halo {nama_usaha}" };

  it("menerima input lengkap dan mengisi default", () => {
    const r = parseWaTemplateInput(base);
    expect(r).toEqual({ ok: true, value: { stage: "baru", element: "masalah", title: "Judul", body: "Halo {nama_usaha}", sortOrder: 0, isActive: true } });
  });

  it("menolak tahap/unsur/judul/isi yang salah", () => {
    expect(parseWaTemplateInput({ ...base, stage: "x" }).ok).toBe(false);
    expect(parseWaTemplateInput({ ...base, element: "x" }).ok).toBe(false);
    expect(parseWaTemplateInput({ ...base, title: "  " }).ok).toBe(false);
    expect(parseWaTemplateInput({ ...base, body: "" }).ok).toBe(false);
  });

  it("menolak placeholder tak dikenal", () => {
    const r = parseWaTemplateInput({ ...base, body: "Harga {harga}" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("{harga}");
  });

  it("mode parsial hanya memvalidasi field yang dikirim", () => {
    expect(parseWaTemplateInput({ isActive: false }, true)).toEqual({ ok: true, value: { isActive: false } });
  });
});

describe("templatesForStage", () => {
  it("tahap yang sama dulu, lalu umum; yang nonaktif dibuang", () => {
    const all = [
      { id: "u", stage: "umum", isActive: true, sortOrder: 0 },
      { id: "b2", stage: "baru", isActive: true, sortOrder: 20 },
      { id: "b1", stage: "baru", isActive: true, sortOrder: 10 },
      { id: "off", stage: "baru", isActive: false, sortOrder: 0 },
      { id: "d", stage: "demo", isActive: true, sortOrder: 0 },
    ];
    expect(templatesForStage(all, "baru").map((t) => t.id)).toEqual(["b1", "b2", "u"]);
  });
});

describe("template bawaan", () => {
  it("semuanya valid dan setiap tahap punya minimal satu template", () => {
    for (const t of DEFAULT_WA_TEMPLATES) expect(parseWaTemplateInput({ ...t }).ok).toBe(true);
    for (const s of WA_TEMPLATE_STAGES) expect(DEFAULT_WA_TEMPLATES.some((t) => t.stage === s)).toBe(true);
  });

  it("judul unik per tahap (dipakai untuk mencegah duplikat saat dipasang)", () => {
    const keys = DEFAULT_WA_TEMPLATES.map((t) => `${t.stage}|${t.title}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
