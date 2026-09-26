"use client";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, ShieldCheck, XCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProcessingOverlay } from "@/components/ui/ProcessingOverlay";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { useCurrency } from "@/lib/currency/client";
import type { AuditCheck } from "@/lib/accounting/audit";

interface AuditResponse {
  checkedAt: string;
  checks: AuditCheck[];
  canFix: boolean;
}

const STATUS_STYLE: Record<AuditCheck["status"], { icon: React.ReactNode; border: string }> = {
  ok: { icon: <CheckCircle2 size={18} className="text-emerald-400" />, border: "border-emerald-500/20" },
  warning: { icon: <AlertTriangle size={18} className="text-amber-400" />, border: "border-amber-500/30" },
  error: { icon: <XCircle size={18} className="text-rose-400" />, border: "border-rose-500/40" },
};

/**
 * Tab "Audit" — pemeriksaan mandiri pembukuan dengan prinsip kehati-hatian (lihat
 * lib/accounting/audit). Pemeriksaan berjalan saat tab dibuka / tombol "Periksa Ulang"; perbaikan
 * otomatis hanya untuk role dengan izin jurnal manual, selalu lewat konfirmasi, dan selalu berupa
 * jurnal koreksi/pembalik yang tercatat.
 */
export function AuditTab() {
  const { t } = useDashboardLang();
  const { formatMoney: rupiah } = useCurrency();
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fixing, setFixing] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());

  const load = useCallback(
    () =>
      fetch("/api/accounting/audit")
        .then(async (res) => {
          const body = await res.json();
          if (!res.ok) return showAlert(body.error ?? "Gagal menjalankan audit.");
          setData(body);
        })
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  const run = async () => {
    setLoading(true);
    await load();
  };

  const fix = async (c: AuditCheck) => {
    if (!c.fix || fixing) return;
    if (!(await showConfirm(c.fix.confirm, { title: c.fix.label, confirmLabel: c.fix.label }))) return;
    setFixing(c.code);
    try {
      const res = await fetch("/api/accounting/audit/fix", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: c.code }) });
      const body = await res.json();
      if (!res.ok) return showAlert(body.error ?? "Perbaikan gagal.");
      await showAlert(body.message);
      await run();
    } finally {
      setFixing(null);
    }
  };

  const toggle = (code: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  const checks = data?.checks ?? [];
  const errors = checks.filter((c) => c.status === "error").length;
  const warnings = checks.filter((c) => c.status === "warning").length;

  const renderGroup = (group: AuditCheck["group"], title: string, subtitle: string) => (
    <div className="space-y-2">
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-xs text-neutral-500">{subtitle}</p>
      </div>
      {checks
        .filter((c) => c.group === group)
        .map((c) => {
          const st = STATUS_STYLE[c.status];
          const isOpen = open.has(c.code);
          return (
            <Card key={c.code} className={`space-y-2 ${st.border}`}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{st.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium text-sm">{c.title}</div>
                    <div className="flex gap-2">
                      {c.fix && data?.canFix && (
                        <Button className="text-xs py-1" variant={c.status === "error" ? "primary" : "secondary"} disabled={!!fixing} onClick={() => fix(c)}>
                          {c.fix.label}
                        </Button>
                      )}
                      {c.action && c.status !== "ok" && (
                        <a href={c.action.href} className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-neutral-300 hover:bg-white/5">
                          {c.action.label}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className={`text-sm ${c.status === "ok" ? "text-neutral-400" : "text-neutral-200"}`}>{c.summary}</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">{c.why}</div>
                  {c.items.length > 0 && (
                    <button type="button" className="mt-1 flex items-center gap-1 text-xs text-cyan-400 hover:underline" onClick={() => toggle(c.code)}>
                      {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      {isOpen ? t("accounting.audit.hideDetail", "Sembunyikan rincian") : t("accounting.audit.showDetail", "Lihat rincian ({n})").replace("{n}", String(c.items.length))}
                    </button>
                  )}
                  {isOpen && (
                    <div className="mt-2 max-h-72 overflow-y-auto rounded-lg border border-white/5">
                      <table className="w-full text-xs">
                        <tbody>
                          {c.items.map((it, i) => (
                            <tr key={i} className="border-b border-white/5 align-top">
                              <td className="px-2 py-1.5 text-neutral-200">
                                {it.label}
                                {it.detail && <div className="text-[11px] text-neutral-500">{it.detail}</div>}
                              </td>
                              <td className="px-2 py-1.5 text-right whitespace-nowrap text-neutral-300">{it.amount != null ? rupiah(it.amount) : ""}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
    </div>
  );

  return (
    <div className="space-y-5">
      {(loading || fixing) && (
        <ProcessingOverlay
          message={fixing ? t("accounting.audit.fixing", "Memperbaiki pembukuan…") : t("accounting.audit.running", "Memeriksa pembukuan…")}
          hint={t("accounting.audit.runningHint", "Mencocokkan jurnal dengan transaksi sumbernya. Jangan tutup halaman ini.")}
        />
      )}

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShieldCheck size={22} className="text-cyan-400 mt-0.5" />
          <div>
            <div className="font-medium">{t("accounting.audit.heading", "Audit Pembukuan")}</div>
            <p className="text-xs text-neutral-500 max-w-2xl">
              {t(
                "accounting.audit.subtitle",
                "Pemeriksaan mandiri dengan prinsip kehati-hatian: setiap angka harus berasal dari transaksi nyata, tercatat sekali, seimbang, dan aset tidak dicatat lebih besar dari kenyataan. Perbaikan otomatis selalu berupa jurnal koreksi/pembalik yang tercatat — tidak ada riwayat yang dihapus."
              )}
            </p>
            {data && (
              <p className="text-xs mt-1">
                <span className={errors ? "text-rose-400" : "text-emerald-400"}>{errors} {t("accounting.audit.errors", "temuan")}</span>
                {" · "}
                <span className={warnings ? "text-amber-400" : "text-neutral-500"}>{warnings} {t("accounting.audit.warnings", "peringatan")}</span>
                {" · "}
                <span className="text-neutral-500">
                  {t("accounting.audit.checkedAt", "diperiksa {time}").replace("{time}", new Date(data.checkedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }))}
                </span>
              </p>
            )}
          </div>
        </div>
        <Button onClick={run} disabled={loading || !!fixing}>
          {t("accounting.audit.rerun", "Periksa Ulang")}
        </Button>
      </Card>

      {data && !data.canFix && (
        <p className="text-xs text-neutral-500">{t("accounting.audit.readOnly", "Kamu bisa melihat hasil audit; perbaikan otomatis hanya untuk Owner/Superuser/Akuntan.")}</p>
      )}

      {data && (
        <>
          {renderGroup("integritas", t("accounting.audit.integrityTitle", "Integritas Pembukuan"), t("accounting.audit.integritySub", "Setiap jurnal berasal dari transaksi nyata, tercatat sekali, dan seimbang."))}
          {renderGroup("kehati_hatian", t("accounting.audit.prudenceTitle", "Prinsip Kehati-hatian (SAK EMKM)"), t("accounting.audit.prudenceSub", "Aset tidak dicatat berlebih, kerugian & beban tidak ditunda, dan periode yang sudah dilaporkan dikunci."))}
        </>
      )}
    </div>
  );
}
