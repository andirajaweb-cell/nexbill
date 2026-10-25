"use client";
import { Fragment, useState } from "react";
import { PLAN_MATRIX_UI, resolvePlanMatrix, type MatrixCell, type MatrixLang } from "@/lib/subscription/plan-matrix";

/**
 * "Bandingkan paket" di #harga nexbill.id — checklist fitur Starter vs Pro. Isinya dari
 * lib/subscription/plan-matrix.ts (centang dihitung dari aturan paket), harga dari /api/public/pricing.
 * Tertutup secara bawaan supaya halaman tetap ringkas; tabel tetap ada di HTML untuk mesin pencari.
 */
export function PlanCompare({ lang, minUnits, multiDiscountPct, starterPrice, proPrice }: { lang: MatrixLang; minUnits: number; multiDiscountPct: number; starterPrice: string; proPrice: string }) {
  const [open, setOpen] = useState(false);
  const ui = PLAN_MATRIX_UI[lang] ?? PLAN_MATRIX_UI.id;
  const groups = resolvePlanMatrix(lang, { minUnits, multiDiscountPct });

  const cell = (c: MatrixCell) =>
    c.kind === "yes" ? (
      <span className="pc-yes" aria-label={ui.yes} title={ui.yes}>✓</span>
    ) : c.kind === "no" ? (
      <span className="pc-no" aria-label={ui.no} title={ui.no}>—</span>
    ) : (
      <span className="pc-text">{c.text}</span>
    );

  return (
    <div className="plan-compare">
      <button type="button" className="plan-compare-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? ui.hide : ui.show} <span aria-hidden="true">{open ? "▲" : "▼"}</span>
      </button>
      <div className="plan-compare-body" hidden={!open}>
        <h3 className="plan-compare-title">{ui.title}</h3>
        <p className="plan-compare-sub">{ui.sub}</p>
        <div className="plan-compare-scroll">
          <table className="plan-compare-table">
            <thead>
              <tr>
                <th scope="col">{ui.feature}</th>
                <th scope="col">
                  Starter
                  <span className="pc-price">{starterPrice}</span>
                </th>
                <th scope="col" className="pc-pro">
                  Pro
                  <span className="pc-price">{proPrice}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <Fragment key={g.key}>
                  <tr className="pc-group">
                    <th scope="colgroup" colSpan={3}>{g.label}</th>
                  </tr>
                  {g.rows.map((r) => (
                    <tr key={r.key}>
                      <th scope="row">{r.label}</th>
                      <td>{cell(r.starter)}</td>
                      <td className="pc-pro">{cell(r.pro)}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <p className="plan-compare-note">{ui.trial}</p>
      </div>
    </div>
  );
}
