import { describe, expect, it } from "vitest";
import { HELP_GROUP_IDS, type HelpBook, type HelpCategory } from "../types";
import { HELP_BOOK_ID } from "./id";
import { HELP_BOOK_EN } from "./en";
import { HELP_BOOK_MS } from "./ms";
import { HELP_BOOK_TH } from "./th";
import { HELP_BOOK_FIL } from "./fil";
import { HELP_BOOK_VI } from "./vi";
import { mergeWithSource } from "./index";

/** Bentuk sebuah kategori tanpa teksnya: id, grup, dan jumlah langkah/catatan/sub-bagian. */
function shape(c: HelpCategory) {
  return {
    id: c.id,
    group: c.group,
    navHint: Boolean(c.navHint),
    roles: Boolean(c.roles),
    steps: c.steps?.length ?? 0,
    notes: c.notes?.length ?? 0,
    subsections: (c.subsections ?? []).map((s) => ({
      navHint: Boolean(s.navHint),
      intro: Boolean(s.intro),
      steps: s.steps?.length ?? 0,
      notes: s.notes?.length ?? 0,
    })),
  };
}

const BOOKS: [string, HelpBook][] = [
  ["en", HELP_BOOK_EN],
  ["ms", HELP_BOOK_MS],
  ["th", HELP_BOOK_TH],
  ["fil", HELP_BOOK_FIL],
  ["vi", HELP_BOOK_VI],
];

describe("Pusat Bantuan — sumber Bahasa Indonesia", () => {
  it("id kategori unik & semua grup terpakai", () => {
    const ids = HELP_BOOK_ID.categories.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const g of HELP_GROUP_IDS) expect(HELP_BOOK_ID.categories.some((c) => c.group === g)).toBe(true);
  });

  it("id lama tetap ada (deep-link & editan Superuser tidak putus)", () => {
    const ids = new Set(HELP_BOOK_ID.categories.map((c) => c.id));
    for (const old of [
      "konsep-dasar", "setup-outlet-baru", "alur-kerja-rental", "sop-harian", "rental-ps", "billing-board", "booking", "pos",
      "kitchen", "devices", "home-rental", "shift", "transaksi", "ppob", "promo", "membership", "chat", "notifikasi", "inventory",
      "assets", "maintenance", "accounting", "expenses", "other-income", "payments-methods", "reports", "staff", "ai",
      "billing-subscription", "referral", "rekomendasi-produk", "settings", "admin", "semua-outlet",
    ]) {
      expect(ids.has(old), old).toBe(true);
    }
  });

  it("tidak ada teks kosong", () => {
    for (const c of HELP_BOOK_ID.categories) {
      expect(c.label.trim(), c.id).not.toBe("");
      expect(c.summary.trim(), c.id).not.toBe("");
      for (const s of [...(c.steps ?? []), ...(c.notes ?? [])]) expect(s.trim(), c.id).not.toBe("");
    }
  });
});

describe.each(BOOKS)("Pusat Bantuan — terjemahan %s", (lang, book) => {
  it("semua label grup terisi", () => {
    for (const g of HELP_GROUP_IDS) expect(book.groups[g]?.trim(), `${lang}:${g}`).toBeTruthy();
  });

  it("topik & struktur sama persis dengan Bahasa Indonesia", () => {
    expect(book.categories.map(shape)).toEqual(HELP_BOOK_ID.categories.map(shape));
  });

  it("teks benar-benar diterjemahkan (tidak sama dengan Bahasa Indonesia)", () => {
    const sameSummary = book.categories.filter((c, i) => c.summary === HELP_BOOK_ID.categories[i].summary).map((c) => c.id);
    expect(sameSummary).toEqual([]);
  });

  it("digabung ke sumber tanpa kehilangan topik", () => {
    const merged = mergeWithSource(book);
    expect(merged.categories.map((c) => c.id)).toEqual(HELP_BOOK_ID.categories.map((c) => c.id));
    expect(merged.categories[0].label).toBe(book.categories[0].label);
  });
});
