import { describe, expect, it } from "vitest";
import { ACCOUNTING_GUIDES } from "./guides-i18n";

const base = ACCOUNTING_GUIDES.id;

describe("panduan Accounting — 6 bahasa sama lengkapnya", () => {
  for (const [lang, set] of Object.entries(ACCOUNTING_GUIDES)) {
    it(`${lang}: tab & jumlah poin sama dengan Bahasa Indonesia`, () => {
      expect(Object.keys(set.tabs).sort()).toEqual(Object.keys(base.tabs).sort());
      for (const [tab, g] of Object.entries(base.tabs)) {
        const x = set.tabs[tab];
        expect(x.summary.trim().length, `${lang}/${tab}/summary`).toBeGreaterThan(10);
        for (const sec of ["concept", "uses", "watch", "steps"] as const) {
          expect(x[sec].length, `${lang}/${tab}/${sec}`).toBe(g[sec].length);
          x[sec].forEach((s, i) => expect(s.trim().length, `${lang}/${tab}/${sec}[${i}]`).toBeGreaterThan(5));
        }
      }
      expect(set.workflow.length).toBe(base.workflow.length);
      set.workflow.forEach((st, i) => expect(st.items.length, `${lang}/workflow[${i}]`).toBe(base.workflow[i].items.length));
      expect(set.golden.length).toBe(base.golden.length);
    });
  }
});
