"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fetchJsonObject } from "@/lib/api/fetch-json";
import { showAlert } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-billing";

interface OutletProfile {
  id: string;
  name: string;
  hasNpwp: boolean;
  npwpNumber: string | null;
  nitku: string | null;
  taxpayerName: string | null;
  taxpayerAddress: string | null;
  businessEntityType: string | null;
  businessType: string | null;
}

const ENTITY_TYPES = [
  { value: "perorangan", labelKey: "billing.profile.entity.individual", fallback: "Perorangan" },
  { value: "badan_usaha", labelKey: "billing.profile.entity.corporate", fallback: "Badan Usaha (PT/CV/dll)" },
  { value: "cabang", labelKey: "billing.profile.entity.branch", fallback: "Cabang" },
];

/**
 * "Profil Billing" tab — mirrors Accurate.id's Profil Billing / Faktur Pajak page (NPWP, NITKU,
 * nama & alamat wajib pajak, jenis badan usaha). Deliberately reuses the existing
 * /api/settings/outlet GET+PATCH route (same one the Settings page's Business & Tax tab uses)
 * rather than a parallel API — see EDITABLE_FIELDS in that route for the 7 fields this tab owns.
 */
export function BillingProfileTab() {
  const { t } = useDashboardLang();
  const [profile, setProfile] = useState<OutletProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetchJsonObject<OutletProfile>("/api/settings/outlet");
      setProfile(res);
      setLoading(false);
    })();
  }, []);

  const set = <K extends keyof OutletProfile>(key: K, value: OutletProfile[K]) => {
    setProfile((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const save = async () => {
    if (!profile) return;
    setBusy(true);
    try {
      const res = await fetch("/api/settings/outlet", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hasNpwp: profile.hasNpwp,
          npwpNumber: profile.npwpNumber,
          nitku: profile.nitku,
          taxpayerName: profile.taxpayerName,
          taxpayerAddress: profile.taxpayerAddress,
          businessEntityType: profile.businessEntityType,
          businessType: profile.businessType,
        }),
      });
      const out = await res.json();
      if (!res.ok) return showAlert(out.error);
      showAlert(t("billing.profile.saved", "Profil Billing berhasil disimpan."));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Card className="p-4 text-sm text-neutral-500">{t("billing.loading", "Memuat data langganan...")}</Card>;
  if (!profile) return <Card className="p-4 text-sm text-rose-400">{t("billing.profile.loadFailed", "Gagal memuat profil billing.")}</Card>;

  return (
    <Card className="p-4 space-y-4">
      <div>
        <div className="font-semibold">{t("billing.profile.title", "Profil Billing — Data Faktur Pajak")}</div>
        <p className="text-sm text-neutral-500 mt-1">
          {t("billing.profile.subtitle", "Data ini dipakai untuk mencetak Faktur Pajak/invoice resmi NEXBILL atas nama outlet ini — sama seperti Profil Billing di Accurate.id.")}
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={profile.hasNpwp} onChange={(e) => set("hasNpwp", e.target.checked)} className="rounded" />
        {t("billing.profile.hasNpwp", "Outlet ini memiliki NPWP")}
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-neutral-500 mb-1 block">{t("billing.profile.npwpNumber", "Nomor NPWP")}</label>
          <input
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
            value={profile.npwpNumber ?? ""}
            onChange={(e) => set("npwpNumber", e.target.value)}
            placeholder="00.000.000.0-000.000"
            disabled={!profile.hasNpwp}
          />
        </div>
        <div>
          <label className="text-xs text-neutral-500 mb-1 block">{t("billing.profile.nitku", "NITKU (jika ada)")}</label>
          <input
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
            value={profile.nitku ?? ""}
            onChange={(e) => set("nitku", e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-neutral-500 mb-1 block">{t("billing.profile.taxpayerName", "Nama Wajib Pajak")}</label>
          <input
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
            value={profile.taxpayerName ?? ""}
            onChange={(e) => set("taxpayerName", e.target.value)}
            placeholder={profile.name}
          />
        </div>
        <div>
          <label className="text-xs text-neutral-500 mb-1 block">{t("billing.profile.entityType", "Jenis Badan Usaha")}</label>
          <select
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
            value={profile.businessEntityType ?? ""}
            onChange={(e) => set("businessEntityType", e.target.value)}
          >
            <option value="">{t("billing.profile.entitySelect", "— Pilih —")}</option>
            {ENTITY_TYPES.map((o) => (
              <option key={o.value} value={o.value}>{t(o.labelKey, o.fallback)}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-neutral-500 mb-1 block">{t("billing.profile.taxpayerAddress", "Alamat Wajib Pajak")}</label>
          <input
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
            value={profile.taxpayerAddress ?? ""}
            onChange={(e) => set("taxpayerAddress", e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-neutral-500 mb-1 block">{t("billing.profile.businessType", "Jenis Usaha")}</label>
          <input
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
            value={profile.businessType ?? ""}
            onChange={(e) => set("businessType", e.target.value)}
            placeholder={t("billing.profile.businessTypePlaceholder", "mis. Rental PlayStation / Warnet")}
          />
        </div>
      </div>

      <Button onClick={save} disabled={busy}>
        {busy ? t("billing.common.processing", "Memproses...") : t("billing.profile.save", "Simpan Profil Billing")}
      </Button>
    </Card>
  );
}
