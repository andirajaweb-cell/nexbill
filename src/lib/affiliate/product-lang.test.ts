import { describe, it, expect } from "vitest";
import { pickProductLang } from "./product-lang";

/*
 * Uji pemilihan bahasa produk afiliasi (2026-09-23).
 *
 * Yang dijaga di sini bukan kualitas terjemahannya — itu urusan model — melainkan satu janji:
 * kartu produk TIDAK PERNAH tampil kosong atau rusak, apa pun keadaan kolom terjemahannya. Produk
 * yang belum diterjemahkan, yang JSON-nya rusak, atau yang cuma sebagian bahasanya jadi, semuanya
 * harus tetap tampil utuh dalam Bahasa Indonesia. Kegagalan penerjemah boleh mengurangi kenyamanan,
 * tidak boleh menghilangkan produknya dari etalase.
 */

const produk = {
  title: "ZBT 500Mbps Modem WiFi 4G",
  description: "Internet ISP mati bukan berarti rental berhenti.",
  category: "Jaringan & WiFi",
  translationsJson: JSON.stringify({
    en: { title: "ZBT 500Mbps 4G WiFi Modem", description: "An ISP outage doesn't have to stop the rental.", category: "Network & WiFi" },
    vi: { title: "Modem WiFi 4G ZBT 500Mbps", description: "Mất internet không có nghĩa là dừng cho thuê.", category: "Mạng & WiFi" },
  }),
};

describe("pickProductLang — jalur normal", () => {
  it("mengembalikan teks asli untuk Bahasa Indonesia tanpa menyentuh JSON", () => {
    expect(pickProductLang(produk, "id")).toEqual({
      title: "ZBT 500Mbps Modem WiFi 4G",
      description: "Internet ISP mati bukan berarti rental berhenti.",
      category: "Jaringan & WiFi",
    });
  });

  it("mengembalikan terjemahan untuk bahasa yang tersedia", () => {
    const hasil = pickProductLang(produk, "en");
    expect(hasil.title).toBe("ZBT 500Mbps 4G WiFi Modem");
    expect(hasil.category).toBe("Network & WiFi");
  });
});

describe("pickProductLang — cadangan yang menjaga kartu tetap terisi", () => {
  it("bahasa yang belum diterjemahkan jatuh ke Bahasa Indonesia, bukan kosong", () => {
    // "th" tidak ada di JSON di atas.
    expect(pickProductLang(produk, "th").title).toBe("ZBT 500Mbps Modem WiFi 4G");
  });

  it("produk tanpa kolom terjemahan sama sekali tetap tampil utuh", () => {
    const tanpaTerjemahan = { title: "Kabel HDMI 2m", description: "Kabel pengganti", category: "Aksesoris", translationsJson: null };
    expect(pickProductLang(tanpaTerjemahan, "vi")).toEqual({
      title: "Kabel HDMI 2m",
      description: "Kabel pengganti",
      category: "Aksesoris",
    });
  });

  it("JSON rusak tidak melempar dan tidak mengosongkan kartu", () => {
    const rusak = { ...produk, translationsJson: "{bukan json" };
    expect(() => pickProductLang(rusak, "en")).not.toThrow();
    expect(pickProductLang(rusak, "en").title).toBe("ZBT 500Mbps Modem WiFi 4G");
  });

  it("terjemahan tanpa judul dianggap tidak ada", () => {
    // Judul kosong akan membuat kartu tampak rusak — lebih baik pakai Bahasa Indonesia.
    const judulKosong = { ...produk, translationsJson: JSON.stringify({ en: { title: "", description: "x", category: "y" } }) };
    expect(pickProductLang(judulKosong, "en").title).toBe("ZBT 500Mbps Modem WiFi 4G");
  });

  it("deskripsi dan kategori jatuh ke Indonesia SATU PER SATU, bukan membuang seluruh terjemahan", () => {
    // Judulnya berhasil diterjemahkan tapi deskripsinya tidak — judulnya tetap dipakai.
    const sebagian = { ...produk, translationsJson: JSON.stringify({ ms: { title: "Modem WiFi 4G ZBT", description: null, category: null } }) };
    const hasil = pickProductLang(sebagian, "ms");

    expect(hasil.title).toBe("Modem WiFi 4G ZBT");
    expect(hasil.description).toBe("Internet ISP mati bukan berarti rental berhenti.");
    expect(hasil.category).toBe("Jaringan & WiFi");
  });

  it("produk tanpa deskripsi dan kategori tidak menghasilkan undefined", () => {
    const minimal = { title: "Stik PS4", translationsJson: null };
    expect(pickProductLang(minimal, "en")).toEqual({ title: "Stik PS4", description: null, category: null });
  });
});
