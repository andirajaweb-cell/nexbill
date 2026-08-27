"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fetchJsonObject } from "@/lib/api/fetch-json";
import { Share2, Copy, Users, Wallet, Check, AlertTriangle, CalendarClock } from "lucide-react";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-referral";

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;

const TIER_LABEL_KEYS: Record<string, { key: string; fallback: string }> = {
  customer: { key: "referral.tier.customer", fallback: "Customer" },
  affiliate: { key: "referral.tier.affiliate", fallback: "Affiliate" },
  master_partner: { key: "referral.tier.masterPartner", fallback: "Master Partner" },
};

const CONVERSION_STATUS_BADGE: Record<string, string> = { trial: "pending", active: "success", churned: "failed" };
const CONVERSION_STATUS_LABEL_KEYS: Record<string, { key: string; fallback: string }> = {
  trial: { key: "referral.status.trial", fallback: "Masa Percobaan" },
  active: { key: "referral.status.active", fallback: "Aktif" },
  churned: { key: "referral.status.churned", fallback: "Berhenti" },
};

interface Partner {
  id: string;
  code: string;
  tier: keyof typeof TIER_LABEL_KEYS;
  commissionPercent: number;
  isActive: boolean;
  totalReferrals: number;
  totalCommissionEarned: number;
  balanceAvailable: number;
}
interface ReferralRow {
  id: string;
  refereeOutletName: string;
  status: keyof typeof CONVERSION_STATUS_BADGE;
  createdAt: string;
}
interface CommissionRow {
  id: string;
  amount: number;
  commissionPercent: number;
  sourceInvoiceAmount: number;
  createdAt: string;
}
interface PayoutRow {
  id: string;
  amount: number;
  method: string | null;
  createdAt: string;
}
interface Data {
  partner: Partner;
  referrals: ReferralRow[];
  commissions: CommissionRow[];
  payouts: PayoutRow[];
  payoutCadenceLabel: string;
  nextPayoutDate: string;
  bank: { bankName: string | null; bankAccountNumber: string | null } | null;
  bankInfoComplete: boolean;
}

export default function ReferralPage() {
  const { t } = useDashboardLang();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchJsonObject<Data>("/api/referral")
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  const link = useMemo(() => {
    if (!data || typeof window === "undefined") return "";
    return `${window.location.origin}/daftar?ref=${data.partner.code}`;
  }, [data]);

  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (non-HTTPS/older browser) — the code/link is still selectable text on screen.
    }
  };

  if (loading) {
    return <p className="text-sm text-neutral-500">{t("referral.loading", "Memuat data referral...")}</p>;
  }
  if (!data) {
    return <p className="text-sm text-red-400">{t("referral.loadError", "Gagal memuat data referral.")}</p>;
  }

  const { partner, referrals, commissions, payouts, nextPayoutDate, bankInfoComplete } = data;
  const tierMeta = TIER_LABEL_KEYS[partner.tier] ?? TIER_LABEL_KEYS.customer;
  const nextPayoutLabel = new Date(nextPayoutDate + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold text-emerald-300 flex items-center gap-2">
          <Share2 className="w-6 h-6" />
          {t("referral.title", "Program Referral")}
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          {t(
            "referral.subtitle",
            "Ajak outlet lain berlangganan NEXBILL lewat link referral kamu — mereka dapat diskon 20% di tagihan pertama, kamu dapat komisi berulang setiap bulan selama outlet itu terus berlangganan."
          )}
        </p>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div>
            <div className="text-xs text-neutral-500">{t("referral.yourCode", "Kode Referral Kamu")}</div>
            <div className="text-2xl font-mono font-bold text-emerald-300 tracking-wider">{partner.code}</div>
          </div>
          <Badge status={partner.isActive ? "success" : "failed"}>{t(tierMeta.key, tierMeta.fallback)}</Badge>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
          <span className="text-xs text-neutral-400 truncate flex-1">{link}</span>
          <Button variant="secondary" onClick={copyLink} className="shrink-0">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? t("referral.copied", "Tersalin!") : t("referral.copyLink", "Salin Link")}
          </Button>
        </div>
        <p className="text-xs text-neutral-500 mt-2">
          {t("referral.commissionNote", "Komisi kamu saat ini")}: <span className="text-emerald-300 font-semibold">{partner.commissionPercent}%</span> {t("referral.commissionNoteSuffix", "dari setiap tagihan langganan yang dibayar outlet yang kamu referensikan.")}
        </p>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-neutral-400 text-xs mb-1">
            <Users className="w-4 h-4" /> {t("referral.totalReferrals", "Total Referral")}
          </div>
          <div className="text-xl font-bold text-neutral-100">{partner.totalReferrals}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-neutral-400 text-xs mb-1">
            <Wallet className="w-4 h-4" /> {t("referral.balanceAvailable", "Saldo Komisi Tersedia")}
          </div>
          <div className="text-xl font-bold text-emerald-300">{rupiah(partner.balanceAvailable)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-neutral-400 text-xs mb-1">
            <Wallet className="w-4 h-4" /> {t("referral.totalEarned", "Total Komisi Sepanjang Waktu")}
          </div>
          <div className="text-xl font-bold text-neutral-100">{rupiah(partner.totalCommissionEarned)}</div>
        </Card>
      </div>

      <Card className="p-4 border-cyan-400/20">
        <div className="flex items-start gap-2.5">
          <CalendarClock className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
          <div>
            <div className="text-sm text-cyan-200 font-medium">{t("referral.payoutCadenceTitle", "Jadwal Pencairan Komisi")}</div>
            <p className="text-xs text-neutral-400 mt-0.5">
              {t("referral.payoutCadenceDesc", "Komisi dicairkan 1x seminggu setiap hari Senin.")} {t("referral.nextPayoutPrefix", "Estimasi pencairan berikutnya:")} <span className="text-neutral-200">{nextPayoutLabel}</span>.
            </p>
          </div>
        </div>
      </Card>

      {!bankInfoComplete && (
        <Card className="p-4 border-amber-400/30 bg-amber-500/5">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm text-amber-200 font-medium">{t("referral.bankMissingTitle", "Rekening Bank Belum Diisi")}</div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {t("referral.bankMissingDesc", "Lengkapi nomor rekening dan bank di Pengaturan supaya komisi kamu bisa dicairkan.")}
              </p>
              <Link href="/dashboard/settings" className="inline-block mt-2 text-xs text-amber-300 underline">
                {t("referral.bankMissingCta", "Isi Rekening Bank →")}
              </Link>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <h2 className="gm-heading font-semibold mb-3">{t("referral.referredOutlets", "Outlet yang Kamu Referensikan")}</h2>
        {referrals.length === 0 ? (
          <p className="text-sm text-neutral-500">{t("referral.noReferralsYet", "Belum ada outlet yang mendaftar lewat link kamu.")}</p>
        ) : (
          <div className="space-y-2">
            {referrals.map((r) => {
              const meta = CONVERSION_STATUS_LABEL_KEYS[r.status] ?? CONVERSION_STATUS_LABEL_KEYS.trial;
              return (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
                  <div className="text-sm text-neutral-200">{r.refereeOutletName}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500">{new Date(r.createdAt).toLocaleDateString("id-ID")}</span>
                    <Badge status={CONVERSION_STATUS_BADGE[r.status]}>{t(meta.key, meta.fallback)}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="gm-heading font-semibold mb-3">{t("referral.commissionHistory", "Riwayat Komisi")}</h2>
        {commissions.length === 0 ? (
          <p className="text-sm text-neutral-500">{t("referral.noCommissionsYet", "Belum ada komisi yang masuk.")}</p>
        ) : (
          <div className="space-y-2">
            {commissions.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm">
                <div className="text-neutral-300">
                  {c.commissionPercent}% {t("referral.of", "dari")} {rupiah(c.sourceInvoiceAmount)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500">{new Date(c.createdAt).toLocaleDateString("id-ID")}</span>
                  <span className="font-semibold text-emerald-300">+{rupiah(c.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {payouts.length > 0 && (
        <Card className="p-4">
          <h2 className="gm-heading font-semibold mb-3">{t("referral.payoutHistory", "Riwayat Pencairan")}</h2>
          <div className="space-y-2">
            {payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm">
                <div className="text-neutral-300">{p.method ?? "-"}</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500">{new Date(p.createdAt).toLocaleDateString("id-ID")}</span>
                  <span className="font-semibold text-neutral-100">-{rupiah(p.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4">
        <h2 className="gm-heading font-semibold mb-2">{t("referral.howItWorksTitle", "Cara Kerja")}</h2>
        <ul className="text-xs text-neutral-500 space-y-1.5 leading-relaxed list-disc pl-4">
          <li>{t("referral.how1", "Bagikan link/kode referral kamu ke pemilik usaha rental PS lain.")}</li>
          <li>{t("referral.how2", "Outlet baru yang mendaftar lewat link kamu otomatis dapat diskon 20% di tagihan langganan pertama mereka.")}</li>
          <li>{t("referral.how3", "Kamu dapat komisi setiap kali outlet itu membayar tagihan langganan bulanan — selama mereka terus berlangganan, komisi terus mengalir.")}</li>
          <li>{t("referral.how4", "Saldo komisi dicairkan tim NEXBILL 1x seminggu setiap hari Senin, ke rekening bank yang kamu isi di Pengaturan.")}</li>
          <li>{t("referral.how5", "Referrer aktif/berprestasi bisa diupgrade ke tier Affiliate atau Master Partner dengan komisi lebih tinggi oleh tim NEXBILL.")}</li>
        </ul>
      </Card>
    </div>
  );
}
