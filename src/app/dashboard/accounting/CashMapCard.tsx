"use client";
import { Fragment, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { fetchJsonObject } from "@/lib/api/fetch-json";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { useCurrency } from "@/lib/currency/client";
import { coaAccountName } from "@/lib/accounting/coa-data";
import type { CashIssue, CashMapRow } from "@/lib/accounting/audit/cash-accounts";

/**
 * Peta Kas & Bank ↔ Chart of Accounts (tab Audit): setiap sumber dana (Kas Utama, Rekening Bank
 * Utama, QRIS, Saldo Deposit PPOB, ...) berdampingan dengan akun COA-nya, metode pembayaran yang
 * masuk ke sana, saldo buku besar, dan dari transaksi apa saja uangnya datang/pergi.
 */

const FAMILY: Record<string, { label: string; cls: string }> = {
  kas: { label: "Kas 111x", cls: "bg-emerald-500/15 text-emerald-300" },
  bank: { label: "Bank 112x", cls: "bg-sky-500/15 text-sky-300" },
  digital: { label: "Digital/QRIS 113x", cls: "bg-violet-500/15 text-violet-300" },
  deposit: { label: "Deposit PPOB 115x", cls: "bg-amber-500/15 text-amber-300" },
  other: { label: "Bukan kas/bank", cls: "bg-rose-500/15 text-rose-300" },
};

export function CashMapCard({ reloadKey }: { reloadKey: number }) {
  const { t } = useDashboardLang();
  const { formatMoney: rupiah } = useCurrency();
  const [data, setData] = useState<{ issues: CashIssue[]; map: CashMapRow[] } | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    fetchJsonObject<{ issues: CashIssue[]; map: CashMapRow[] }>("/api/accounting/audit/cash-map").then(setData);
  }, [reloadKey]);

  if (!data) return null;
  const flagged = (r: CashMapRow) => data.issues.some((i) => (r.accountCode && i.label.includes(r.accountCode)) || i.label.includes(`"${r.name}"`));

  return (
    <Card className="space-y-2">
      <div>
        <h3 className="font-medium">{t("accounting.audit.cashMapTitle", "Peta Kas & Bank ↔ Chart of Accounts")}</h3>
        <p className="text-xs text-neutral-500">
          {t(
            "accounting.audit.cashMapSub",
            "Setiap sumber dana dan akun COA tempat uangnya dibukukan, metode pembayaran pelanggan yang masuk ke sana, saldo buku besar, dan asal mutasinya. Klik baris untuk rincian per jenis transaksi. Cocokkan saldo dengan uang di laci, mutasi rekening, dashboard QRIS, dan saldo Fastpay."
          )}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="text-left text-xs text-neutral-500 border-b border-neutral-800">
              <th className="py-1.5">{t("accounting.audit.cm.source", "Sumber dana (Kas/Bank)")}</th>
              <th>{t("accounting.audit.cm.coa", "Akun COA")}</th>
              <th>{t("accounting.audit.cm.family", "Golongan")}</th>
              <th>{t("accounting.audit.cm.methods", "Metode pelanggan")}</th>
              <th className="text-right">{t("accounting.audit.cm.in", "Masuk")}</th>
              <th className="text-right">{t("accounting.audit.cm.out", "Keluar")}</th>
              <th className="text-right">{t("accounting.audit.cm.balance", "Saldo buku")}</th>
            </tr>
          </thead>
          <tbody>
            {data.map.map((r) => {
              const key = `${r.cashBankAccountId ?? "none"}-${r.accountCode}`;
              const fam = FAMILY[r.family] ?? FAMILY.other;
              return (
                <Fragment key={key}>
                  <tr className={`border-b border-neutral-900 cursor-pointer hover:bg-neutral-800/40 ${flagged(r) ? "bg-amber-500/5" : ""}`} onClick={() => setOpen(open === key ? null : key)}>
                    <td className="py-1.5">
                      {flagged(r) && <span className="mr-1">⚠️</span>}
                      {r.name}
                      {r.kind && <span className="ml-1 text-[10px] text-neutral-500">({r.kind === "cash" ? "tunai" : "non-tunai"}{r.isDefault ? ", utama" : ""})</span>}
                    </td>
                    <td>{r.accountCode ? `${r.accountCode} ${coaAccountName(t, { code: r.accountCode, name: r.accountName ?? "" })}` : "—"}</td>
                    <td><span className={`rounded px-1.5 py-0.5 text-[10px] ${fam.cls}`}>{fam.label}</span></td>
                    <td className="text-xs text-neutral-400">{r.methods.join(", ") || "—"}</td>
                    <td className="text-right text-emerald-300">{rupiah(r.totalIn)}</td>
                    <td className="text-right text-rose-300">{rupiah(r.totalOut)}</td>
                    <td className={`text-right font-medium ${r.balance < 0 ? "text-rose-400" : ""}`}>{rupiah(r.balance)}</td>
                  </tr>
                  {open === key && (
                    <tr className="bg-neutral-900/50">
                      <td colSpan={7} className="px-3 py-2">
                        {r.bySource.length === 0 ? (
                          <div className="text-xs text-neutral-500">{t("accounting.audit.cm.noFlows", "Belum ada transaksi.")}</div>
                        ) : (
                          <table className="w-full text-xs">
                            <tbody>
                              {r.bySource.map((s) => (
                                <tr key={s.source}>
                                  <td className="py-0.5 text-neutral-400">{s.label}</td>
                                  <td className="text-right text-emerald-300">{s.in ? rupiah(s.in) : "—"}</td>
                                  <td className="text-right text-rose-300">{s.out ? rupiah(s.out) : "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
