import { describe, it, expect } from "vitest";
import { ALL_PLAN_FEATURES, TIER_FEATURES } from "./pricing";
import { PLAN_MATRIX, PLAN_MATRIX_UI, resolvePlanMatrix, type MatrixLang } from "./plan-matrix";

const LANGS: MatrixLang[] = ["id", "en", "ms", "th", "vi", "fil"];

/*
 * Penjaga "tabel perbandingan paket di nexbill.id selalu ikut fitur terbaru":
 *  - setiap PlanFeature punya baris di tabel (fitur baru yang lupa ditambahkan → tes gagal);
 *  - centang baris berfitur selalu sama dengan TIER_FEATURES (pindah paket → tabel ikut);
 *  - setiap baris & teks lengkap 6 bahasa.
 */
describe("plan matrix (nexbill.id #harga)", () => {
  it("setiap PlanFeature tampil di tabel perbandingan", () => {
    const covered = new Set(PLAN_MATRIX.flatMap((g) => g.rows.map((r) => r.feature).filter(Boolean)));
    expect(ALL_PLAN_FEATURES.filter((f) => !covered.has(f))).toEqual([]);
  });

  it("centang dihitung dari TIER_FEATURES", () => {
    const groups = resolvePlanMatrix("id", { minUnits: 5, multiDiscountPct: 20 });
    for (const g of PLAN_MATRIX) {
      for (const r of g.rows) {
        if (!r.feature) continue;
        const resolved = groups.find((x) => x.key === g.key)!.rows.find((x) => x.key === r.key)!;
        expect(resolved.starter.kind).toBe(TIER_FEATURES.starter.includes(r.feature) ? "yes" : "no");
        expect(resolved.pro.kind).toBe(TIER_FEATURES.pro.includes(r.feature) ? "yes" : "no");
      }
    }
  });

  it("setiap baris berjenis jelas dan lengkap 6 bahasa", () => {
    for (const g of PLAN_MATRIX) {
      for (const l of LANGS) expect(g.label[l]?.trim()).toBeTruthy();
      for (const r of g.rows) {
        const kinds = [r.feature, r.all, r.text, r.ai].filter(Boolean).length;
        expect(kinds, r.key).toBe(1);
        for (const l of LANGS) {
          expect(r.label[l]?.trim(), `${r.key}.${l}`).toBeTruthy();
          if (r.text) {
            expect(r.text.starter[l]?.trim()).toBeTruthy();
            expect(r.text.pro[l]?.trim()).toBeTruthy();
          }
        }
      }
    }
    for (const l of LANGS) for (const v of Object.values(PLAN_MATRIX_UI[l])) expect(v.trim()).toBeTruthy();
  });

  it("placeholder harga live terisi", () => {
    const rows = resolvePlanMatrix("en", { minUnits: 7, multiDiscountPct: 25 }).flatMap((g) => g.rows);
    const text = JSON.stringify(rows);
    expect(text).toContain("min. 7");
    expect(text).toContain("25%");
    expect(text).not.toMatch(/\{(min|pct)\}/);
  });

  it("kunci baris unik", () => {
    const keys = PLAN_MATRIX.flatMap((g) => g.rows.map((r) => r.key));
    expect(new Set(keys).size).toBe(keys.length);
  });
});
