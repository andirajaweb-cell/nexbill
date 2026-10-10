import { describe, it, expect } from "vitest";
import { PAGE_GUIDES_ID } from "./page-guides";
import { PAGE_GUIDE_BOOKS } from "./page-guides-book";

/* Setiap terjemahan wajib punya halaman, jumlah langkah, dan jumlah catatan yang sama dengan sumber Indonesia. */
const source = PAGE_GUIDES_ID;
const others = Object.entries(PAGE_GUIDE_BOOKS).filter(([lang]) => lang !== "id");

describe.each(others)("page guide book: %s", (lang, book) => {
  it("is a real translation", () => {
    expect(book).not.toBe(source);
    expect(book.pages.rental.summary).not.toBe(source.pages.rental.summary);
  });

  it("has the same pages and item counts", () => {
    expect(Object.keys(book.pages).sort()).toEqual(Object.keys(source.pages).sort());
    for (const [key, page] of Object.entries(source.pages)) {
      const tr = book.pages[key as keyof typeof book.pages];
      expect(tr.summary.trim(), `${lang} ${key}`).not.toBe("");
      expect(tr.steps.length, `${lang} ${key}.steps`).toBe(page.steps.length);
      expect(tr.tips.length, `${lang} ${key}.tips`).toBe(page.tips.length);
      for (const s of [...tr.steps, ...tr.tips]) expect(s.trim()).not.toBe("");
    }
  });

  it("has every UI label", () => {
    for (const k of Object.keys(source.ui)) expect(book.ui[k as keyof typeof book.ui].trim()).not.toBe("");
  });
});
