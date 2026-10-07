import { describe, it, expect } from "vitest";
import { ACCOUNTING_GUIDE_BOOK_ID, type TabGuideContent } from "./guides";
import { ACCOUNTING_GUIDE_BOOKS } from "./guides-book";

/*
 * Panduan Accounting ditulis dalam Bahasa Indonesia (guides.ts) lalu diterjemahkan ke 5 bahasa.
 * Test ini membuat kelengkapan terjemahannya bisa diaudit: setiap bahasa wajib punya tab yang sama,
 * jumlah butir yang sama di setiap bagian, tahap alur kerja yang sama, dan tidak ada teks kosong —
 * jadi butir yang ditambahkan ke panduan Indonesia tanpa diterjemahkan langsung ketahuan.
 */

const SECTIONS: (keyof Omit<TabGuideContent, "summary">)[] = ["concept", "uses", "watch", "steps"];
const source = ACCOUNTING_GUIDE_BOOK_ID;
const others = Object.entries(ACCOUNTING_GUIDE_BOOKS).filter(([lang]) => lang !== "id");

describe.each(others)("accounting guide book: %s", (lang, book) => {
  it("is a real translation, not the Indonesian source", () => {
    expect(book).not.toBe(source);
    expect(book.tabs["Neraca Saldo"].summary).not.toBe(source.tabs["Neraca Saldo"].summary);
  });

  it("has exactly the same tabs", () => {
    expect(Object.keys(book.tabs).sort()).toEqual(Object.keys(source.tabs).sort());
  });

  it.each(Object.keys(source.tabs))("tab %s has the same number of items per section", (tab) => {
    const t = book.tabs[tab];
    expect(t.summary.trim()).not.toBe("");
    for (const s of SECTIONS) {
      expect(t[s].length, `${lang} ${tab}.${s}`).toBe(source.tabs[tab][s].length);
      for (const item of t[s]) expect(item.trim()).not.toBe("");
    }
  });

  it("has the same workflow stages and golden rules", () => {
    expect(book.workflow.map((w) => w.items.length)).toEqual(source.workflow.map((w) => w.items.length));
    for (const w of book.workflow) expect(w.when.trim()).not.toBe("");
    expect(book.goldenRules.length).toBe(source.goldenRules.length);
  });

  it("translates every UI label", () => {
    expect(Object.keys(book.ui).sort()).toEqual(Object.keys(source.ui).sort());
    for (const [k, v] of Object.entries(book.ui)) expect(v.trim(), k).not.toBe("");
  });
});
