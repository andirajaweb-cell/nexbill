import { describe, it, expect } from "vitest";
import {
  cariKontakDalamTeks,
  pastikanTanpaKontak,
  normalisasiNoHp,
  linkWhatsApp,
  kontakBolehDibuka,
  alasanTarikSah,
} from "./anti-bypass";

describe("cariKontakDalamTeks — yang HARUS tertangkap", () => {
  const kasus: [string, string][] = [
    ["hub 081234567890", "nomor HP"],
    ["0812 3456 7890", "nomor HP"],
    ["0812-3456-7890", "nomor HP"],
    ["0812.3456.7890", "nomor HP"],
    ["+62 812 3456 7890", "nomor HP"],
    ["62812-3456-7890", "nomor HP"],
    ["(0812) 3456 7890", "nomor HP"],
    ["WA 812345678901", "nomor HP"],
    ["chat wa.me/6281234567890", "nomor HP"], // angkanya sendiri sudah nomor HP
    ["klik wa.me/kontakku", "link WhatsApp"],
    ["hubungi via WhatsApp ya", "link WhatsApp"],
    ["t.me/jualstik", "Telegram"],
    ["cek instagram kami", "akun media sosial"],
    ["IG: @outletku", "akun media sosial"],
    ["follow @outlet_ps.bdg", "akun media sosial"],
    ["email: jual@contoh.com", "alamat email"],
    ["lihat https://contoh.com/barang", "link situs"],
    ["www.tokoku.id", "link situs"],
  ];
  for (const [teks, jenis] of kasus) {
    it(`"${teks}" → ${jenis}`, () => expect(cariKontakDalamTeks(teks)).toBe(jenis));
  }
});

describe("cariKontakDalamTeks — yang TIDAK boleh tertangkap (deskripsi barang biasa)", () => {
  const bersih = [
    "Stik PS4 DualShock bekas, masih mulus",
    "Harga Rp 350.000, nego tipis",
    "Kisaran 80.000-85.000 per stik",
    "Rp1.500.000 untuk 3 unit",
    "3 stik @Rp100.000",
    "2 unit @ 50rb",
    "PS5 CFI-1218A seri 2023, garansi habis",
    "Monitor HP 24 inch, 75Hz",
    "Kabel HDMI 2.1 panjang 3 meter",
    "Dipakai 18 bulan, pemakaian 8 jam/hari",
    "",
  ];
  for (const teks of bersih) {
    it(`"${teks}" → bersih`, () => expect(cariKontakDalamTeks(teks)).toBeNull());
  }
  it("null/undefined → bersih", () => {
    expect(cariKontakDalamTeks(null)).toBeNull();
    expect(cariKontakDalamTeks(undefined)).toBeNull();
  });
});

describe("pastikanTanpaKontak", () => {
  it("menyebut isian mana yang bermasalah", () => {
    expect(() => pastikanTanpaKontak({ "Nama Barang": "Stik PS4", Keterangan: "WA 081234567890" })).toThrow(/^Keterangan berisi nomor HP/);
  });
  it("lolos bila semua bersih", () => {
    expect(() => pastikanTanpaKontak({ "Nama Barang": "Stik PS4", Keterangan: "mulus" })).not.toThrow();
  });
});

describe("normalisasiNoHp", () => {
  it("berbagai format → 08…", () => {
    expect(normalisasiNoHp("0812 3456 7890")).toBe("081234567890");
    expect(normalisasiNoHp("+62 812-3456-7890")).toBe("081234567890");
    expect(normalisasiNoHp("6281234567890")).toBe("081234567890");
    expect(normalisasiNoHp("81234567890")).toBe("081234567890");
  });
  it("menolak yang bukan nomor HP", () => {
    for (const x of ["", null, "12345", "0212345678", "0800123456", "08123"]) {
      expect(() => normalisasiNoHp(x)).toThrow(/No\. HP tidak valid/);
    }
  });
  it("link WhatsApp, termasuk nomor lama yang tidak dinormalisasi", () => {
    expect(linkWhatsApp("081234567890")).toBe("https://wa.me/6281234567890");
    expect(linkWhatsApp("+62 812-3456-7890")).toBe("https://wa.me/6281234567890");
    expect(linkWhatsApp("0812 3456 7890")).toBe("https://wa.me/6281234567890");
  });
});

describe("kontakBolehDibuka", () => {
  it("hanya setelah diterima atau selesai", () => {
    expect(kontakBolehDibuka("requested")).toBe(false);
    expect(kontakBolehDibuka("accepted")).toBe(true);
    expect(kontakBolehDibuka("completed")).toBe(true);
    expect(kontakBolehDibuka("rejected")).toBe(false);
    expect(kontakBolehDibuka("cancelled")).toBe(false);
  });
});

describe("alasanTarikSah", () => {
  it("hanya kunci yang dikenal", () => {
    expect(alasanTarikSah("sold_outside")).toBe(true);
    expect(alasanTarikSah("other")).toBe(true);
    expect(alasanTarikSah("sold")).toBe(false);
    expect(alasanTarikSah(undefined)).toBe(false);
    expect(alasanTarikSah("toString")).toBe(false);
  });
});
