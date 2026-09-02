"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { fetchJsonObject, fetchJsonArray } from "@/lib/api/fetch-json";
import { useAuth, type AuthUser } from "@/lib/auth/client";
import { hasPermission, StaffRole } from "@/lib/auth/permissions";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { getDevicePrinterSettings, saveDevicePrinterSettings, clearDevicePrinterSettings, type DevicePrinterSettings } from "@/lib/printer/deviceSettings";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { SEA_BANKS, findSeaBank } from "@/lib/data/sea-banks";
import "@/lib/i18n/dict-settings";

const TABS = ["Business & Tax", "Cabang", "Satuan", "Banner Iklan", "Notifikasi", "Feature Management", "Audit Log", "Akun Saya"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABEL_KEYS: Record<Tab, { key: string; fallback: string }> = {
  "Business & Tax": { key: "settings.tab.businessTax", fallback: "Business & Tax" },
  "Cabang": { key: "settings.tab.branch", fallback: "Cabang" },
  "Satuan": { key: "settings.tab.unit", fallback: "Satuan" },
  "Banner Iklan": { key: "settings.tab.banner", fallback: "Banner Iklan" },
  "Notifikasi": { key: "settings.tab.notification", fallback: "Notifikasi" },
  "Feature Management": { key: "settings.tab.featureManagement", fallback: "Feature Management" },
  "Audit Log": { key: "settings.tab.auditLog", fallback: "Audit Log" },
  "Akun Saya": { key: "settings.tab.myAccount", fallback: "Akun Saya" },
};

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("Business & Tax");
  const [outletId, setOutletId] = useState<string | null>(null);
  const { user } = useAuth();
  const { t } = useDashboardLang();
  const role = (user?.role ?? "cashier") as StaffRole;
  const canManage = hasPermission(role, "manage_settings");
  const isSuperuser = role === "superuser" || role === "owner"; // the two full-authority roles.

  useEffect(() => {
    fetchJsonObject<{ id: string }>("/api/outlets/default").then((o) => { if (o) setOutletId(o.id); });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold gm-gradient-title">{t("settings.header.title", "Pengaturan")}</h1>
        <p className="text-sm text-neutral-500">
          {t("settings.header.subtitle", "Business profile, pajak, printer, cabang, notifikasi, dan audit trail sistem.")}
          {!canManage && ` ${t("settings.header.viewOnlyNote", "Kamu hanya bisa melihat — hanya Superuser/Manager yang bisa mengubah pengaturan.")}`}
        </p>
        <p className="text-xs text-neutral-600 mt-1">
          {t("settings.header.paymentNotePrefix", "Pengaturan metode pembayaran ada di ")}
          <Link href="/dashboard/payments" className="text-emerald-400 underline">{t("settings.header.paymentNoteLink", "halaman Pembayaran")}</Link>
          {t("settings.header.staffNoteMiddle", ". Manajemen user & role ada di ")}
          <Link href="/dashboard/staff" className="text-emerald-400 underline">{t("settings.header.staffNoteLink", "Staf & Hak Akses")}</Link>.
          {isSuperuser && (
            <>
              {" "}
              {t("settings.header.resetDataPrefix", '"Hapus Semua Data (Reset Total)" sekarang ada di ')}
              <Link href="/dashboard/admin" className="text-rose-400 underline">{t("settings.header.adminDataLink", "halaman Admin Data")}</Link>.
            </>
          )}
        </p>
      </div>

      <div className="flex gap-1 border-b border-neutral-800 overflow-x-auto">
        {TABS.map((tb) => (
          <button key={tb} onClick={() => setTab(tb)} className={`px-3 py-2 text-sm whitespace-nowrap ${tab === tb ? "border-b-2 border-emerald-500 text-emerald-400" : "text-neutral-500 hover:text-neutral-300"}`}>{t(TAB_LABEL_KEYS[tb].key, TAB_LABEL_KEYS[tb].fallback)}</button>
        ))}
      </div>

      {!outletId ? null : tab === "Business & Tax" ? (
        <BusinessTaxTab outletId={outletId} canManage={canManage} />
      ) : tab === "Cabang" ? (
        <BranchTab outletId={outletId} canManage={canManage} onSwitched={setOutletId} />
      ) : tab === "Satuan" ? (
        <UnitTab outletId={outletId} canManage={canManage} />
      ) : tab === "Banner Iklan" ? (
        <BannerTab outletId={outletId} canManage={canManage} />
      ) : tab === "Notifikasi" ? (
        <NotificationTab outletId={outletId} canManage={canManage} />
      ) : tab === "Feature Management" ? (
        <FeatureManagementTab outletId={outletId} isSuperuser={isSuperuser} />
      ) : tab === "Audit Log" ? (
        <AuditLogTab outletId={outletId} />
      ) : (
        <MyAccountTab />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1 block">
      <div className="text-xs text-neutral-500">{label}</div>
      {children}
    </label>
  );
}

const inputCls = "w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm disabled:opacity-60";

function BookingLinkShare({ slug }: { slug: string | null | undefined }) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");
  const { t } = useDashboardLang();
  // Each outlet gets its own /book/[slug] link — never the bare /book route, which
  // (deliberately) no longer resolves to any specific outlet. See src/lib/outlets/slug.ts.
  useEffect(() => { if (slug) setUrl(`${window.location.origin}/book/${slug}`); }, [slug]);
  if (!url) return null;
  return (
    <div className="flex items-center gap-2">
      <input readOnly value={url} className={inputCls + " flex-1"} onFocus={(e) => e.target.select()} />
      <Button
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? t("settings.bookingLink.copied", "Tersalin!") : t("settings.bookingLink.copyButton", "Salin Link")}
      </Button>
    </div>
  );
}

function BusinessTaxTab({ outletId, canManage }: { outletId: string; canManage: boolean }) {
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const { t } = useDashboardLang();

  const load = () => fetchJsonObject(`/api/settings/outlet?outletId=${outletId}`).then(setForm);
  useEffect(() => { load(); }, [outletId]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/outlet", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, outletId }) });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      setForm(data);
      showAlert(t("settings.businessTax.savedAlert", "Pengaturan disimpan."));
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file: File) => {
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/settings/logo", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      const patchRes = await fetch("/api/settings/outlet", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ outletId, logoUrl: data.url }) });
      const patched = await patchRes.json();
      if (!patchRes.ok) return showAlert(patched.error);
      setForm(patched);
    } finally {
      setUploadingLogo(false);
    }
  };

  if (!form) return <div className="text-sm text-neutral-500">{t("settings.common.loading", "Memuat...")}</div>;

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h2 className="font-medium">{t("settings.businessTax.profileHeading", "Profil Bisnis")}</h2>
        <p className="text-xs text-neutral-500">{t("settings.businessTax.profileDesc", "Nama bisnis dan logo tampil di kop laporan keuangan (Excel/PDF) yang diunduh dari halaman Accounting.")}</p>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center overflow-hidden shrink-0">
            {form.logoUrl ? <img src={form.logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <span className="text-xs text-neutral-600">{t("settings.businessTax.noLogo", "No logo")}</span>}
          </div>
          {canManage && (
            <label className="text-xs">
              <span className="inline-block rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 cursor-pointer hover:bg-neutral-700">{uploadingLogo ? t("settings.common.uploading", "Mengunggah...") : t("settings.businessTax.uploadLogoButton", "Upload Logo")}</span>
              <input type="file" accept=".png,.jpg,.jpeg,.webp,.svg" className="hidden" disabled={uploadingLogo} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }} />
            </label>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("settings.field.businessName", "Nama Bisnis")}><input className={inputCls} disabled={!canManage} value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label={t("settings.field.phone", "Telepon")}><input className={inputCls} disabled={!canManage} value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label={t("settings.field.address", "Alamat")}><input className={inputCls} disabled={!canManage} value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <Field label={t("settings.field.outletCountry", "Negara")}>
            <select className={inputCls} disabled={!canManage} value={form.outletCountry ?? ""} onChange={(e) => setForm({ ...form, outletCountry: e.target.value || null })}>
              <option value="">{t("settings.field.outletCountryPlaceholder", "Pilih negara")}</option>
              {SEA_BANKS.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </Field>
          <Field label={t("settings.field.province", "Provinsi")}><input className={inputCls} disabled={!canManage} value={form.province ?? ""} onChange={(e) => setForm({ ...form, province: e.target.value })} /></Field>
          <Field label={t("settings.field.city", "Kota")}><input className={inputCls} disabled={!canManage} value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
          <Field label={t("settings.field.postalCode", "Kode Pos")}><input className={inputCls} disabled={!canManage} value={form.postalCode ?? ""} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} /></Field>
          <Field label={t("settings.field.wifiSsid", "WiFi SSID")}><input className={inputCls} disabled={!canManage} value={form.wifiSsid ?? ""} onChange={(e) => setForm({ ...form, wifiSsid: e.target.value })} /></Field>
          <Field label={t("settings.field.wifiPassword", "WiFi Password")}><input className={inputCls} disabled={!canManage} value={form.wifiPassword ?? ""} onChange={(e) => setForm({ ...form, wifiPassword: e.target.value })} /></Field>
        </div>
        <p className="text-xs text-neutral-500">
          {t("settings.field.outletCountryDesc", "Negara dipakai NEXBILL untuk menentukan mata uang tampilan Billing dan bahasa terjemahan otomatis balasan Support — tidak perlu diatur terpisah.")}
        </p>
      </Card>

      <BankInfoCard form={form} setForm={setForm} canManage={canManage} t={t} />

      <Card className="space-y-3">
        <h2 className="font-medium">{t("settings.businessTax.taxBillingHeading", "Pajak & Billing")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label={t("settings.field.taxPercent", "Pajak (%)")}><input type="number" className={inputCls} disabled={!canManage} value={form.taxPercent ?? 0} onChange={(e) => setForm({ ...form, taxPercent: Number(e.target.value) })} /></Field>
          <Field label={t("settings.field.serviceChargePercent", "Service Charge (%)")}><input type="number" className={inputCls} disabled={!canManage} value={form.serviceChargePercent ?? 0} onChange={(e) => setForm({ ...form, serviceChargePercent: Number(e.target.value) })} /></Field>
          <Field label={t("settings.field.billingRoundingMinutes", "Pembulatan Billing (menit)")}><input type="number" className={inputCls} disabled={!canManage} value={form.billingRoundingMinutes ?? 15} onChange={(e) => setForm({ ...form, billingRoundingMinutes: Number(e.target.value) })} /></Field>
          <Field label={t("settings.field.expenseApprovalThreshold", "Batas Approval Expense (Rp)")}><input type="number" className={inputCls} disabled={!canManage} value={form.expenseApprovalThreshold ?? 0} onChange={(e) => setForm({ ...form, expenseApprovalThreshold: Number(e.target.value) })} /></Field>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-medium">{t("settings.businessTax.salesTargetHeading", "Target Penjualan (BEP)")}</h2>
        <p className="text-xs text-neutral-500">{t("settings.businessTax.salesTargetDesc", "Target omzet bulanan sebagai acuan Break-Even Point (BEP). Sistem otomatis membagi target ini ke target harian (dibagi jumlah hari di bulan berjalan) dan menampilkannya di widget Breakdown Pendapatan per Sumber pada halaman Ringkasan.")}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label={t("settings.field.salesTargetMonthly", "Target Omzet Bulanan (Rp)")}>
            <input
              type="number"
              className={inputCls}
              disabled={!canManage}
              placeholder={t("settings.businessTax.salesTargetPlaceholder", "Kosongkan jika belum ada target")}
              value={form.salesTargetMonthly ?? ""}
              onChange={(e) => setForm({ ...form, salesTargetMonthly: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </Field>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-medium">{t("settings.businessTax.bookingHeading", "Booking / Reservasi")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Field label={t("settings.field.bookingBufferMinutes", "Buffer Antar Booking (menit)")}><input type="number" className={inputCls} disabled={!canManage} value={form.bookingBufferMinutes ?? 0} onChange={(e) => setForm({ ...form, bookingBufferMinutes: Number(e.target.value) })} /></Field>
          <Field label={t("settings.field.bookingAutoReleaseMinutes", "Auto-release Jika Belum Check-in (menit)")}><input type="number" className={inputCls} disabled={!canManage} value={form.bookingAutoReleaseMinutes ?? 15} onChange={(e) => setForm({ ...form, bookingAutoReleaseMinutes: Number(e.target.value) })} /></Field>
          <Field label={t("settings.field.bookingMinLeadMinutes", "Minimal Lead Time Booking Online/WA (menit)")}><input type="number" className={inputCls} disabled={!canManage} value={form.bookingMinLeadMinutes ?? 0} onChange={(e) => setForm({ ...form, bookingMinLeadMinutes: Number(e.target.value) })} /></Field>
        </div>

        <div className="border-t border-neutral-800 pt-3 space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" disabled={!canManage} checked={form.acceptOnlineBooking ?? true} onChange={(e) => setForm({ ...form, acceptOnlineBooking: e.target.checked })} /> {t("settings.businessTax.acceptOnlineBooking", "Terima Booking Online (halaman publik outlet ini di bawah)")}
          </label>
          <p className="text-xs text-neutral-500">{t("settings.businessTax.acceptOnlineBookingDesc", "Kalau dimatikan, halaman booking outlet ini tetap menampilkan status ketersediaan unit tapi form booking disembunyikan — cocok saat tutup sementara atau acara privat.")}</p>
          <BookingLinkShare slug={form.slug} />
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-medium">{t("settings.businessTax.receiptFooterHeading", "Footer Struk")}</h2>
        <p className="text-xs text-neutral-500">{t("settings.businessTax.receiptFooterDesc", 'Teks bebas di bagian bawah struk (mis. info promo, media sosial, alamat cabang lain) — berlaku sama untuk semua PC di outlet ini. Pengaturan printer & lebar kertas ada di kartu "Printer" di bawah, per komputer masing-masing.')}</p>
        <Field label={t("settings.field.receiptFooterText", "Footer Struk")}><input className={inputCls} disabled={!canManage} value={form.receiptFooterText ?? ""} onChange={(e) => setForm({ ...form, receiptFooterText: e.target.value })} /></Field>
      </Card>

      {canManage && <Button onClick={save} disabled={saving}>{saving ? t("settings.common.saving", "Menyimpan...") : t("settings.businessTax.saveButton", "Simpan Pengaturan")}</Button>}

      <PrinterCard outletId={outletId} />
    </div>
  );
}

const OTHER_BANK_VALUE = "__other__";

/**
 * Bank account info for receiving referral commission payouts (see /dashboard/referral and
 * /platform-admin/referrals) — pencairan dilakukan 1x seminggu setiap hari Senin (lihat
 * lib/referral/service.ts). Country -> Bank select is a convenience lookup into
 * lib/data/sea-banks.ts that auto-fills the SWIFT/BIC code; picking "Bank lainnya" (or having a
 * bankName that isn't in the list for the selected country, e.g. legacy data) reveals free-text
 * inputs instead, since the bundled list only covers major banks and isn't guaranteed current —
 * see the doc comment on SEA_BANKS. Saved together with the rest of this tab via the shared
 * Simpan Pengaturan button, not its own save action.
 */
function BankInfoCard({ form, setForm, canManage, t }: { form: any; setForm: (f: any) => void; canManage: boolean; t: (key: string, fallback?: string) => string }) {
  const countryBanks = SEA_BANKS.find((c) => c.code === form.bankCountry)?.banks ?? [];
  const isKnownBank = countryBanks.some((b) => b.name === form.bankName);
  const bankSelectValue = !form.bankCountry ? "" : form.bankName && !isKnownBank ? OTHER_BANK_VALUE : form.bankName ?? "";
  const showManualBankFields = !form.bankCountry || bankSelectValue === OTHER_BANK_VALUE || (form.bankName && !isKnownBank);

  return (
    <Card className="space-y-3">
      <h2 className="font-medium">{t("settings.businessTax.bankHeading", "Rekening Bank (untuk Pencairan Komisi Referral)")}</h2>
      <p className="text-xs text-neutral-500">
        {t(
          "settings.businessTax.bankDesc",
          "Dipakai tim NEXBILL untuk mentransfer komisi program referral kamu — pencairan dilakukan 1x seminggu setiap hari Senin. Pastikan nomor rekening dan nama pemilik rekening sudah benar."
        )}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label={t("settings.field.bankCountry", "Negara Bank")}>
          <select
            className={inputCls}
            disabled={!canManage}
            value={form.bankCountry ?? ""}
            onChange={(e) => setForm({ ...form, bankCountry: e.target.value || null, bankName: null, bankSwiftCode: null })}
          >
            <option value="">{t("settings.field.bankCountryPlaceholder", "Pilih negara")}</option>
            {SEA_BANKS.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </Field>
        <Field label={t("settings.field.bankName", "Bank")}>
          <select
            className={inputCls}
            disabled={!canManage || !form.bankCountry}
            value={bankSelectValue}
            onChange={(e) => {
              if (e.target.value === OTHER_BANK_VALUE || e.target.value === "") {
                setForm({ ...form, bankName: e.target.value === OTHER_BANK_VALUE ? "" : null, bankSwiftCode: "" });
                return;
              }
              const picked = findSeaBank(form.bankCountry, e.target.value);
              setForm({ ...form, bankName: e.target.value, bankSwiftCode: picked?.swift ?? "" });
            }}
          >
            <option value="">{t("settings.field.bankNamePlaceholder", "Pilih bank")}</option>
            {countryBanks.map((b) => (
              <option key={b.name} value={b.name}>{b.name}</option>
            ))}
            <option value={OTHER_BANK_VALUE}>{t("settings.field.bankOther", "Bank lainnya (isi manual)")}</option>
          </select>
        </Field>
        {showManualBankFields && (
          <Field label={t("settings.field.bankNameManual", "Nama Bank (manual)")}>
            <input className={inputCls} disabled={!canManage} value={form.bankName ?? ""} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder={t("settings.field.bankNameManualPlaceholder", "mis. Bank ABC")} />
          </Field>
        )}
        <Field label={t("settings.field.bankSwiftCode", "SWIFT / BIC Code")}>
          <input className={inputCls} disabled={!canManage} value={form.bankSwiftCode ?? ""} onChange={(e) => setForm({ ...form, bankSwiftCode: e.target.value.toUpperCase() })} placeholder="XXXXXXXX" />
        </Field>
        <Field label={t("settings.field.bankAccountNumber", "Nomor Rekening")}>
          <input className={inputCls} disabled={!canManage} value={form.bankAccountNumber ?? ""} onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })} />
        </Field>
        <Field label={t("settings.field.bankAccountHolderName", "Nama Pemilik Rekening")}>
          <input className={inputCls} disabled={!canManage} value={form.bankAccountHolderName ?? ""} onChange={(e) => setForm({ ...form, bankAccountHolderName: e.target.value })} />
        </Field>
      </div>
      <p className="text-[11px] text-neutral-600">
        {t("settings.businessTax.bankSwiftNote", "Daftar bank & SWIFT code adalah referensi bank-bank utama di Asia Tenggara — selalu cek ulang kode SWIFT dengan bank kamu sebelum digunakan untuk transfer internasional.")}
      </p>
    </Card>
  );
}

/**
 * The one printer settings section — deliberately singular (no separate
 * "outlet default" vs "this PC" cards, which was confusing). Stored in THIS
 * browser's localStorage only, per PC, since that's the only thing that's
 * actually true for a printer: it's plugged into one specific computer, not
 * "the outlet" as a whole. Any logged-in staff can set this for the PC
 * they're using (no manage_settings gate — it only affects their own
 * machine's receipt rendering).
 *
 * No browser lets a website read the list of printers installed on the
 * computer — that's blocked everywhere for privacy, not a NEXBILL
 * limitation. Clicking "Cetak Struk" already opens the OS/browser's own
 * print dialog, which DOES auto-detect every printer connected to that PC —
 * the cashier picks from that dialog like any other print job. What's saved
 * here is just a label + paper width so NEXBILL renders the receipt at the
 * right width and reminds the cashier which physical printer to expect,
 * nothing more is technically possible without installing separate
 * print-agent software on every PC (a much bigger undertaking).
 */
function PrinterCard({ outletId }: { outletId: string }) {
  const [settings, setSettings] = useState<DevicePrinterSettings | null>(null);
  const [printerName, setPrinterName] = useState("");
  const [paperWidthMm, setPaperWidthMm] = useState<58 | 80>(58);
  const [saved, setSaved] = useState(false);
  const { t } = useDashboardLang();

  useEffect(() => {
    const existing = getDevicePrinterSettings(outletId);
    setSettings(existing);
    setPrinterName(existing?.printerName ?? "");
    setPaperWidthMm(existing?.paperWidthMm ?? 58);
  }, [outletId]);

  const save = () => {
    saveDevicePrinterSettings(outletId, { printerName: printerName.trim(), paperWidthMm });
    setSettings({ printerName: printerName.trim(), paperWidthMm });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const reset = () => {
    clearDevicePrinterSettings(outletId);
    setSettings(null);
    setPrinterName("");
    setPaperWidthMm(58);
  };

  return (
    <Card className="space-y-3">
      <h2 className="font-medium">{t("settings.printer.heading", "Printer")}</h2>
      <p className="text-xs text-neutral-500">
        {t("settings.printer.descPrefix", 'Saat klik "Cetak Struk", browser otomatis membuka dialog print yang sudah menampilkan semua printer terhubung ke komputer ini — tinggal pilih di sana, tidak perlu diatur di sini supaya bisa mencetak. Isi di bawah cuma supaya NEXBILL ')}<b>{t("settings.printer.descBold", "mengingat")}</b>{t("settings.printer.descSuffix", " nama printer & lebar kertas komputer ini (mis. PC kasir depan 58mm, PC dapur 80mm) — tersimpan khusus di komputer ini, tidak memengaruhi PC lain di outlet yang sama.")}
      </p>
      {settings && <p className="text-xs text-emerald-400">{t("settings.printer.savedPrefix", "Tersimpan di komputer ini:")} {settings.printerName || t("settings.printer.noNamePlaceholder", "(tanpa nama)")} — {settings.paperWidthMm}mm</p>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Field label={t("settings.field.printerName", "Nama Printer (komputer ini)")}><input className={inputCls} value={printerName} onChange={(e) => setPrinterName(e.target.value)} placeholder={t("settings.printer.namePlaceholder", "mis. Epson TM-T82 Kasir Depan")} /></Field>
        <Field label={t("settings.field.printerPaperWidth", "Lebar Kertas (komputer ini)")}>
          <select className={inputCls} value={paperWidthMm} onChange={(e) => setPaperWidthMm(Number(e.target.value) as 58 | 80)}>
            <option value={58}>58mm</option><option value={80}>80mm</option>
          </select>
        </Field>
      </div>
      <div className="flex gap-2">
        <Button onClick={save} className="text-xs">{saved ? t("settings.printer.savedButton", "Tersimpan!") : t("settings.printer.saveButton", "Simpan untuk Komputer Ini")}</Button>
        {settings && <Button variant="secondary" className="text-xs" onClick={reset}>{t("settings.common.delete", "Hapus")}</Button>}
      </div>
    </Card>
  );
}

function BranchTab({ outletId, canManage, onSwitched }: { outletId: string; canManage: boolean; onSwitched: (id: string) => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", address: "", phone: "" });
  const [switching, setSwitching] = useState<string | null>(null);
  const { t } = useDashboardLang();

  // /api/outlets only ever returns the single CURRENT active outlet (by design — see its doc
  // comment), so it can never list OTHER linked branches to switch into. /api/dashboard/all-outlets
  // is the real "every branch this account is linked to" source (same one the Ringkasan Semua
  // Outlet page uses) — includes archived outlets too, tagged (nonaktif) below since those can't
  // be switched into (managing/reactivating them lives on the Semua Outlet page, not here).
  const load = () => fetchJsonObject<{ outlets: any[] }>("/api/dashboard/all-outlets").then((d) => setRows(d?.outlets ?? []));
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name) return showAlert(t("settings.branch.nameRequiredAlert", "Nama cabang wajib diisi."));
    const res = await fetch("/api/outlets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setForm({ name: "", address: "", phone: "" });
    load();
  };

  const switchTo = async (id: string) => {
    setSwitching(id);
    try {
      const res = await fetch("/api/session/switch-outlet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ outletId: id }) });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      onSwitched(id);
      window.location.reload(); // simplest way to guarantee every page's already-cached outletId state resets
    } finally {
      setSwitching(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-neutral-500">{t("settings.branch.explainer", 'Cabang aktif menentukan data yang ditampilkan di seluruh halaman (Rental, POS, Accounting, dst). Ganti cabang aktif dengan tombol "Pakai Cabang Ini".')}</p>

      {canManage && (
        <Card className="space-y-3">
          <h2 className="font-medium">{t("settings.branch.addHeading", "Tambah Cabang Baru")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <input className={inputCls} placeholder={t("settings.field.branchName", "Nama Cabang")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className={inputCls} placeholder={t("settings.field.addressOptional", "Alamat (opsional)")} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <input className={inputCls} placeholder={t("settings.field.phoneOptional", "Telepon (opsional)")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <Button onClick={create}>{t("settings.branch.addButton", "Tambah Cabang")}</Button>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {rows.filter((o) => o.isActive !== false).map((o) => (
          <Card key={o.id} className={`space-y-2 ${o.id === outletId ? "border-emerald-500/50" : ""}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{o.name} {o.id === outletId && <span className="text-xs text-emerald-400">{t("settings.branch.activeBadge", "(aktif)")}</span>}</div>
                <div className="text-xs text-neutral-500">{o.address || "-"} {o.phone ? `· ${o.phone}` : ""}</div>
              </div>
              {o.id !== outletId && <Button variant="secondary" className="text-xs px-2 py-1" onClick={() => switchTo(o.id)} disabled={switching === o.id}>{switching === o.id ? "..." : t("settings.branch.useThisButton", "Pakai Cabang Ini")}</Button>}
            </div>
          </Card>
        ))}
      </div>
      <p className="text-xs text-neutral-600">{t("settings.branch.editNotePrefix", "Edit nama/alamat/telepon dan nonaktifkan/aktifkan cabang ada di halaman ")}<Link href="/dashboard/semua-outlet" className="text-emerald-400 underline">{t("settings.branch.editNoteLink", "Ringkasan Semua Outlet")}</Link>.</p>
    </div>
  );
}

interface UnitRow {
  id: string;
  code: string;
  label: string;
  isActive: boolean;
  sortOrder: number;
}

/**
 * Satuan (unit-of-measure) master list — mirrors the Metode Pembayaran CRUD
 * pattern (payments/page.tsx MethodsPanel). This is the single source of
 * truth for the unit dropdowns on the Inventory page's Produk, Resep/BOM,
 * Belanja Supplier, and Purchase Order tabs, so every screen offers the
 * same option list instead of free-typed, inconsistent units.
 */
function UnitTab({ outletId, canManage }: { outletId: string; canManage: boolean }) {
  const [rows, setRows] = useState<UnitRow[]>([]);
  const [label, setLabel] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { t } = useDashboardLang();

  const load = () => fetchJsonArray<UnitRow>(`/api/units?outletId=${outletId}`).then(setRows);
  useEffect(() => { load(); }, [outletId]);

  const startEdit = (u: UnitRow) => { setEditingId(u.id); setLabel(u.label); setIsActive(u.isActive); };
  const resetForm = () => { setEditingId(null); setLabel(""); setIsActive(true); };

  const save = async () => {
    if (!label.trim()) return showAlert(t("settings.unit.nameRequiredAlert", "Isi nama satuan."));
    const res = await fetch("/api/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, outletId, label, isActive }),
    });
    const out = await res.json();
    if (!res.ok) return showAlert(out.error);
    resetForm();
    load();
  };

  const remove = async (u: UnitRow) => {
    if (!(await showConfirm(t("settings.unit.deleteConfirm", 'Hapus satuan "{label}"? Kalau masih dipakai produk/resep, satuan hanya akan dinonaktifkan (data lama tetap tampil).').replace("{label}", u.label)))) return;
    const res = await fetch(`/api/units/${u.id}`, { method: "DELETE" });
    const out = await res.json();
    if (!res.ok) return showAlert(out.error);
    load();
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-neutral-500">{t("settings.unit.explainer", "Satuan bahan baku & produk (pcs, gram, kg, dll) — dipakai di dropdown halaman Inventory: Produk, Resep/BOM, Belanja Supplier, dan Purchase Order.")}</p>
      <Card className="space-y-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500 border-b border-neutral-800">
              <th className="py-2">{t("settings.unit.table.name", "Nama")}</th>
              <th>{t("settings.unit.table.code", "Kode")}</th>
              <th>{t("settings.unit.table.status", "Status")}</th>
              {canManage && <th></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-b border-neutral-900 align-top">
                <td className="py-2 font-medium">{u.label}</td>
                <td className="text-xs text-neutral-500 font-mono">{u.code}</td>
                <td><Badge status={u.isActive ? "on" : "off"}>{u.isActive ? t("settings.common.active", "Aktif") : t("settings.common.inactive", "Nonaktif")}</Badge></td>
                {canManage && (
                  <td className="flex gap-1 py-2 whitespace-nowrap">
                    <Button variant="ghost" className="text-xs" onClick={() => startEdit(u)}>{t("settings.common.edit", "Edit")}</Button>
                    <Button variant="ghost" className="text-xs text-red-400" onClick={() => remove(u)}>{t("settings.common.delete", "Hapus")}</Button>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={canManage ? 4 : 3} className="py-4 text-center text-neutral-500 text-xs">{t("settings.unit.loadingRow", "Memuat satuan…")}</td></tr>
            )}
          </tbody>
        </table>

        {canManage && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-neutral-800 items-end">
            <input className={inputCls + " sm:col-span-2"} placeholder={t("settings.unit.namePlaceholder", "Nama satuan (mis. Sachet, Botol)")} value={label} onChange={(e) => setLabel(e.target.value)} />
            <label className="flex items-center gap-2 text-xs text-neutral-400">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> {t("settings.common.active", "Aktif")}
            </label>
            <div className="flex gap-1">
              <Button className="text-xs" onClick={save}>{editingId ? t("settings.common.save", "Simpan") : t("settings.unit.addButton", "Tambah Satuan")}</Button>
              {editingId && <Button variant="ghost" className="text-xs" onClick={resetForm}>{t("settings.common.cancel", "Batal")}</Button>}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function NotificationTab({ outletId, canManage }: { outletId: string; canManage: boolean }) {
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const { t } = useDashboardLang();

  const load = () => fetchJsonObject(`/api/settings/outlet?outletId=${outletId}`).then(setForm);
  useEffect(() => { load(); }, [outletId]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/outlet", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, outletId }) });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      setForm(data);
      showAlert(t("settings.notification.savedAlert", "Pengaturan notifikasi disimpan."));
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <div className="text-sm text-neutral-500">{t("settings.common.loading", "Memuat...")}</div>;

  const toggles: { key: string; labelKey: string; labelFallback: string }[] = [
    { key: "notifyLowStock", labelKey: "settings.notification.toggle.lowStock", labelFallback: "Stok Menipis" },
    { key: "notifyPendingApproval", labelKey: "settings.notification.toggle.pendingApproval", labelFallback: "Expense Pending Approval" },
    { key: "notifyShiftVariance", labelKey: "settings.notification.toggle.shiftVariance", labelFallback: "Selisih Kas Shift" },
    { key: "notifyBookingReminder", labelKey: "settings.notification.toggle.bookingReminder", labelFallback: "Reminder Booking" },
  ];

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h2 className="font-medium">{t("settings.notification.heading", "Banner Notifikasi In-App")}</h2>
        <p className="text-xs text-neutral-500">{t("settings.notification.desc", 'Belum ada channel email/SMS/push — ini mengatur banner mana yang tampil di dalam aplikasi (mis. banner "jatuh tempo" di Expense Dashboard).')}</p>
        <div className="grid grid-cols-2 gap-3">
          {toggles.map((tg) => (
            <label key={tg.key} className="flex items-center gap-2 text-sm">
              <input type="checkbox" disabled={!canManage} checked={form[tg.key]} onChange={(e) => setForm({ ...form, [tg.key]: e.target.checked })} /> {t(tg.labelKey, tg.labelFallback)}
            </label>
          ))}
        </div>
      </Card>
      {canManage && <Button onClick={save} disabled={saving}>{saving ? t("settings.common.saving", "Menyimpan...") : t("settings.notification.saveButton", "Simpan Notifikasi")}</Button>}
    </div>
  );
}

interface FeatureFlagRow {
  key: string;
  parentKey: string | null;
  label: string;
  description: string | null;
  enabled: boolean;
  effectiveEnabled: boolean;
  wired: boolean;
  updatedBy: string | null;
  updatedAt: string;
}

/**
 * Feature Management — toggle each module (Home Rental, PPOB, and any future one) ON/OFF
 * independently without ever deleting data. Hard-gated to superuser (not just manage_settings)
 * both here and in the API route, per the requirement that only Superuser can flip these
 * switches. Every module is its own root flag (parentKey: null) — rendered as its own card with
 * its own master switch; turning a module's master flag off greys out its sub-flags (their
 * stored value is preserved, not cleared) without touching any other module. A module with no
 * sub-flags (e.g. PPOB — just one master switch) renders without a sub-features grid at all.
 */
function FeatureManagementTab({ outletId, isSuperuser }: { outletId: string; isSuperuser: boolean }) {
  const [flags, setFlags] = useState<FeatureFlagRow[] | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const { t } = useDashboardLang();

  const load = () => fetchJsonObject<{ flags: FeatureFlagRow[] }>(`/api/feature-flags?outletId=${outletId}`).then((d) => d && setFlags(d.flags));
  useEffect(() => { load(); }, [outletId]);

  const toggle = async (key: string, enabled: boolean) => {
    setBusyKey(key);
    try {
      const res = await fetch(`/api/feature-flags/${key}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      await load();
    } finally {
      setBusyKey(null);
    }
  };

  if (!isSuperuser) {
    return (
      <Card>
        <p className="text-sm text-neutral-500">{t("settings.feature.superuserOnly", "Feature Management hanya bisa diakses oleh Superuser.")}</p>
      </Card>
    );
  }
  if (!flags) return <div className="text-sm text-neutral-500">{t("settings.common.loading", "Memuat...")}</div>;

  // Every module is its own independent root flag (parentKey: null) — group each root with just
  // its own children, so N modules render as N cards instead of only the first root flag found
  // ever being shown (children of every OTHER root would otherwise silently render lumped under
  // whichever root happened to be first, or not at all).
  const roots = flags.filter((f) => f.parentKey === null);
  const childrenByParent = new Map<string, FeatureFlagRow[]>();
  for (const f of flags) {
    if (!f.parentKey) continue;
    childrenByParent.set(f.parentKey, [...(childrenByParent.get(f.parentKey) ?? []), f]);
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <p className="text-xs text-neutral-500">
          {t("settings.feature.explainer", "Aktif/nonaktifkan modul di sini kapan saja tanpa menghapus data — histori transaksi, jurnal accounting, deposit, dan laporan lama tetap tersimpan dan bisa diakses lagi begitu modul diaktifkan kembali.")}
        </p>
      </Card>

      {roots.map((root) => {
        const children = childrenByParent.get(root.key) ?? [];
        return (
          <div key={root.key} className="space-y-3">
            <Card className={`space-y-1 border-2 ${root.enabled ? "border-emerald-600/50" : "border-neutral-800"}`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {root.label}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${root.enabled ? "bg-emerald-500/20 text-emerald-400" : "bg-neutral-800 text-neutral-500"}`}>
                      {root.enabled ? t("settings.feature.on", "ON") : t("settings.feature.off", "OFF")}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">{root.description}</p>
                  {root.updatedAt && <p className="text-[11px] text-neutral-600 mt-1">{t("settings.feature.lastChangedPrefix", "Terakhir diubah:")} {new Date(root.updatedAt).toLocaleString("id-ID")}</p>}
                </div>
                <label className="flex items-center gap-2 shrink-0">
                  <input type="checkbox" checked={root.enabled} disabled={busyKey === root.key} onChange={(e) => toggle(root.key, e.target.checked)} className="w-5 h-5" />
                </label>
              </div>
            </Card>

            {children.length > 0 && (
              <Card className="space-y-3">
                <h2 className="font-medium text-sm">{t("settings.feature.subFeaturesHeading", "Sub-fitur {module}").replace("{module}", root.label)}</h2>
                <p className="text-xs text-neutral-500">
                  {root.enabled
                    ? t("settings.feature.subFeaturesHintEnabled", "Matikan salah satu untuk menyembunyikannya khusus, tanpa mematikan seluruh {module}.").replace("{module}", root.label)
                    : t("settings.feature.subFeaturesHintDisabled", "Aktifkan {module} di atas dulu untuk mengatur sub-fitur ini.").replace("{module}", root.label)}
                </p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {children.map((f) => (
                    <label key={f.key} className={`flex items-start gap-2 text-sm rounded-lg border border-neutral-800 p-2.5 ${!root.enabled ? "opacity-50" : ""}`}>
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={f.enabled}
                        disabled={!root.enabled || busyKey === f.key}
                        onChange={(e) => toggle(f.key, e.target.checked)}
                      />
                      <span>
                        <span className="flex items-center gap-1.5">
                          {f.label}
                          {!f.wired && <span className="text-[10px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400">{t("settings.feature.comingSoonBadge", "Segera")}</span>}
                        </span>
                        <span className="block text-xs text-neutral-500 mt-0.5">{f.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </Card>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface BannerRow {
  id: string;
  imageUrl: string;
  linkUrl: string | null;
  title: string | null;
  sortOrder: number;
  isActive: boolean;
}

/**
 * CRUD for the looping ad/promo banner shown on the public /book page right after the
 * booking form — upload image, optional click-through link, optional title, reorder with
 * up/down (sortOrder), toggle active. The public page only ever sees isActive rows, in
 * sortOrder — this list intentionally shows everything (including inactive) so an owner can
 * stage a banner before switching it live.
 */
function BannerTab({ outletId, canManage }: { outletId: string; canManage: boolean }) {
  const [rows, setRows] = useState<BannerRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState<{ imageUrl: string; title: string; linkUrl: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const { t } = useDashboardLang();

  const load = () => fetchJsonArray<BannerRow>("/api/banners").then(setRows);
  useEffect(() => { load(); }, []);

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/settings/logo", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      setPending({ imageUrl: data.url, title: "", linkUrl: "" });
    } finally {
      setUploading(false);
    }
  };

  const addBanner = async () => {
    if (!pending) return;
    setSaving(true);
    try {
      const res = await fetch("/api/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId,
          imageUrl: pending.imageUrl,
          title: pending.title || undefined,
          linkUrl: pending.linkUrl || undefined,
          sortOrder: rows.length,
        }),
      });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      setPending(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const patchBanner = async (id: string, patch: Record<string, unknown>) => {
    const res = await fetch(`/api/banners/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    load();
  };

  const move = async (row: BannerRow, dir: -1 | 1) => {
    const sorted = [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((r) => r.id === row.id);
    const swapWith = sorted[idx + dir];
    if (!swapWith) return;
    await Promise.all([
      fetch(`/api/banners/${row.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: swapWith.sortOrder }) }),
      fetch(`/api/banners/${swapWith.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: row.sortOrder }) }),
    ]);
    load();
  };

  const removeBanner = async (row: BannerRow) => {
    const confirmMsg = row.title
      ? t("settings.banner.deleteConfirmWithTitle", 'Hapus banner "{title}"?').replace("{title}", row.title)
      : t("settings.banner.deleteConfirmNoTitle", "Hapus banner?");
    if (!(await showConfirm(confirmMsg))) return;
    const res = await fetch(`/api/banners/${row.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    load();
  };

  const sorted = [...rows].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h2 className="font-medium">{t("settings.banner.heading", "Banner Iklan — Halaman Booking Publik")}</h2>
        <p className="text-xs text-neutral-500">
          {t("settings.banner.desc", "Slideshow looping otomatis, tampil di halaman booking publik outlet ini tepat setelah bagian booking. Bisa dipakai untuk iklan sponsor, promo F&B, atau pengumuman event. Klik banner akan membuka Link (opsional) di tab baru.")}
        </p>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3 text-xs text-neutral-400 space-y-1">
          <div className="font-medium text-neutral-300">{t("settings.banner.sizeHeading", "Ukuran gambar (responsive — 1 gambar dipakai untuk semua layar)")}</div>
          <p>
            {t("settings.banner.cropPrefix", "Banner otomatis crop mengikuti lebar layar pengunjung: rasio ")}<span className="text-neutral-200">16:5</span>{t("settings.banner.cropMiddle", " di HP dan ")}<span className="text-neutral-200">21:6</span>{t("settings.banner.cropSuffix", " di layar lebih lebar (tablet/desktop). Supaya tetap tajam & tidak terpotong aneh di kedua rasio:")}
          </p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>{t("settings.banner.resPrefix", "Resolusi disarankan ")}<span className="text-neutral-200">min. 1600×500px</span>{t("settings.banner.resMiddle", ", idealnya ")}<span className="text-neutral-200">2400×750px</span>{t("settings.banner.resSuffix", " (landscape/wide).")}</li>
            <li>{t("settings.banner.centerPrefix", "Taruh teks, logo, atau elemen penting di ")}<span className="text-neutral-200">{t("settings.banner.centerHighlight", "tengah gambar")}</span>{t("settings.banner.centerSuffix", " — bagian kiri/kanan lebih berpotensi terpotong di layar sempit.")}</li>
            <li>{t("settings.banner.formatNote", "Format PNG/JPG/WEBP, maksimal 2MB per gambar.")}</li>
          </ul>
        </div>

        {canManage && (
          <div className="rounded-lg border border-neutral-800 p-3 space-y-2">
            {!pending ? (
              <label className="text-xs">
                <span className="inline-block rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 cursor-pointer hover:bg-neutral-700">{uploading ? t("settings.common.uploading", "Mengunggah...") : t("settings.banner.uploadImageButton", "Upload Gambar Banner")}</span>
                <input type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />
              </label>
            ) : (
              <div className="space-y-2">
                <img src={pending.imageUrl} alt="Preview banner" className="w-full max-h-40 object-cover rounded-lg border border-neutral-700" />
                <div className="grid sm:grid-cols-2 gap-2">
                  <Field label={t("settings.field.bannerTitle", "Judul (opsional, untuk alt text)")}><input className={inputCls} value={pending.title} onChange={(e) => setPending({ ...pending, title: e.target.value })} /></Field>
                  <Field label={t("settings.field.bannerLinkUrl", "Link tujuan saat diklik (opsional)")}><input className={inputCls} placeholder="https://..." value={pending.linkUrl} onChange={(e) => setPending({ ...pending, linkUrl: e.target.value })} /></Field>
                </div>
                <div className="flex gap-2">
                  <Button onClick={addBanner} disabled={saving}>{saving ? t("settings.common.saving", "Menyimpan...") : t("settings.banner.addToSlideshowButton", "Tambah ke Slideshow")}</Button>
                  <Button variant="secondary" onClick={() => setPending(null)}>{t("settings.common.cancel", "Batal")}</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      <div className="space-y-2">
        {sorted.map((b, i) => (
          <Card key={b.id} className="flex items-center gap-3">
            <img src={b.imageUrl} alt={b.title ?? ""} className="w-24 h-14 object-cover rounded-lg border border-neutral-800 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{b.title || t("settings.banner.noTitlePlaceholder", "(tanpa judul)")}</div>
              {b.linkUrl && <div className="text-xs text-neutral-500 truncate">{b.linkUrl}</div>}
              <div className="text-xs text-neutral-600">{t("settings.banner.orderLabel", "Urutan #{n}").replace("{n}", String(i + 1))}</div>
            </div>
            {canManage && (
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" className="text-xs px-2" disabled={i === 0} onClick={() => move(b, -1)}>↑</Button>
                <Button variant="ghost" className="text-xs px-2" disabled={i === sorted.length - 1} onClick={() => move(b, 1)}>↓</Button>
                <Button variant={b.isActive ? "secondary" : "primary"} className="text-xs" onClick={() => patchBanner(b.id, { isActive: !b.isActive })}>
                  {b.isActive ? t("settings.common.active", "Aktif") : t("settings.common.inactive", "Nonaktif")}
                </Button>
                <Button variant="danger" className="text-xs" onClick={() => removeBanner(b)}>{t("settings.common.delete", "Hapus")}</Button>
              </div>
            )}
          </Card>
        ))}
        {sorted.length === 0 && <div className="text-sm text-neutral-500 text-center py-6">{t("settings.banner.emptyState", "Belum ada banner. Upload gambar di atas untuk mulai.")}</div>}
      </div>
    </div>
  );
}

function AuditLogTab({ outletId }: { outletId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [entityType, setEntityType] = useState("");
  const { t } = useDashboardLang();

  useEffect(() => {
    const qs = entityType ? `&entityType=${entityType}` : "";
    fetchJsonArray(`/api/audit-log?outletId=${outletId}${qs}`).then(setRows);
  }, [outletId, entityType]);

  const entityTypes = Array.from(new Set(rows.map((r) => r.entityType)));

  return (
    <div className="space-y-4">
      <select className={inputCls + " max-w-xs"} value={entityType} onChange={(e) => setEntityType(e.target.value)}>
        <option value="">{t("settings.audit.allEntities", "Semua Entitas")}</option>
        {entityTypes.map((et) => <option key={et} value={et}>{et}</option>)}
      </select>
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500 border-b border-neutral-800"><th className="py-2">{t("settings.audit.table.time", "Waktu")}</th><th>{t("settings.audit.table.staff", "Staff")}</th><th>{t("settings.audit.table.action", "Aksi")}</th><th>{t("settings.audit.table.entity", "Entitas")}</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-neutral-900 align-top">
                <td className="py-2 text-xs whitespace-nowrap">{new Date(r.createdAt).toLocaleString("id-ID")}</td>
                <td className="text-xs">{r.staffName ?? "-"}</td>
                <td className="text-xs">{r.action}</td>
                <td className="text-xs">{r.entityType}{r.entityId ? ` #${r.entityId.slice(0, 8)}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="text-sm text-neutral-500 py-4 text-center">{t("settings.audit.emptyState", "Belum ada aktivitas tercatat.")}</div>}
      </Card>
    </div>
  );
}

type TFn = (key: string, fallback?: string) => string;

/** Editable "Nama" field — own display name, same self-service scope as the password/email cards below. */
function ProfileNameCard({ user, refresh, t }: { user: AuthUser | null; refresh: () => void; t: TFn }) {
  const [name, setName] = useState(user?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => { setName(user?.name ?? ""); }, [user?.name]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmed = name.trim();
    if (!trimmed) { setError(t("settings.myAccount.nameRequired", "Nama wajib diisi.")); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: trimmed }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? t("settings.myAccount.failed", "Gagal menyimpan.")); return; }
      refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-3">
      <h2 className="font-medium">{t("settings.myAccount.profileHeading", "Profil")}</h2>
      <p className="text-xs text-neutral-500">{user?.email}</p>
      <form onSubmit={submit} className="space-y-3">
        <Field label={t("settings.myAccount.nameLabel", "Nama")}>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        {error && <div className="text-xs text-rose-400">{error}</div>}
        <Button type="submit" disabled={busy || name.trim() === (user?.name ?? "")}>
          {busy ? t("settings.common.saving", "Menyimpan...") : saved ? t("settings.printer.savedButton", "Tersimpan!") : t("settings.common.save", "Simpan")}
        </Button>
      </form>
    </Card>
  );
}

/** Change the account's login email — password-confirmed (mirrors change-password's own-account, ungated scope) since it changes how the account signs in. */
function ChangeEmailCard({ user, hasPassword, refresh, t }: { user: AuthUser | null; hasPassword: boolean; refresh: () => void; t: TFn }) {
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail, currentPassword: currentPassword || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? t("settings.myAccount.failed", "Gagal mengubah email.")); return; }
      setNewEmail("");
      setCurrentPassword("");
      refresh();
      await showAlert(t("settings.myAccount.emailSavedAlert", "Email berhasil diubah — pakai email baru untuk login berikutnya."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-3">
      <h2 className="font-medium">{t("settings.myAccount.emailHeading", "Ganti Email")}</h2>
      <p className="text-xs text-neutral-500">{t("settings.myAccount.emailDesc", "Email dipakai untuk login — email saat ini: ")}<span className="text-neutral-300">{user?.email}</span>.</p>
      <form onSubmit={submit} className="space-y-3">
        <Field label={t("settings.myAccount.newEmail", "Email Baru")}>
          <input type="email" required className={inputCls} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
        </Field>
        {hasPassword && (
          <Field label={t("settings.myAccount.currentPassword", "Password Saat Ini")}>
            <PasswordInput required className={inputCls} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </Field>
        )}
        {error && <div className="text-xs text-rose-400">{error}</div>}
        <Button type="submit" disabled={busy || !newEmail.trim()}>
          {busy ? t("settings.common.saving", "Menyimpan...") : t("settings.myAccount.emailButton", "Simpan Email Baru")}
        </Button>
      </form>
    </Card>
  );
}

// Every logged-in staffer can manage their own profile/password/email here regardless of
// role/canManage — this is about their own account, not outlet settings, so it's deliberately
// not gated behind the manage_settings permission the way the other tabs are.
function MyAccountTab() {
  const { user, refresh } = useAuth();
  const { t } = useDashboardLang();
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = () => fetchJsonObject<{ hasPassword: boolean }>("/api/auth/change-password").then((r) => { if (r) setHasPassword(r.hasPassword); });
  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) { setError(t("settings.myAccount.tooShort", "Password baru minimal 8 karakter.")); return; }
    if (newPassword !== confirmPassword) { setError(t("settings.myAccount.mismatch", "Konfirmasi password tidak cocok.")); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPassword || undefined, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? t("settings.myAccount.failed", "Gagal mengubah password.")); return; }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setHasPassword(true);
      await showAlert(t("settings.myAccount.savedAlert", "Password berhasil diubah."));
    } finally {
      setBusy(false);
    }
  };

  if (hasPassword === null) return <div className="text-sm text-neutral-500">{t("settings.common.loading", "Memuat...")}</div>;

  return (
    <div className="space-y-4 max-w-md">
      <ProfileNameCard user={user} refresh={refresh} t={t} />
      <ChangeEmailCard user={user} hasPassword={hasPassword} refresh={refresh} t={t} />

      <Card className="space-y-3">
        <h2 className="font-medium">
          {hasPassword ? t("settings.myAccount.changeHeading", "Ganti Password") : t("settings.myAccount.setHeading", "Buat Password")}
        </h2>
        <p className="text-xs text-neutral-500">
          {hasPassword
            ? t("settings.myAccount.changeDesc", "Password kamu dipakai untuk masuk dengan email & password.")
            : t("settings.myAccount.setDesc", "Akun ini terdaftar via Google dan belum punya password. Buat satu supaya kamu juga bisa masuk pakai email & password.")}
        </p>
        <form onSubmit={submit} className="space-y-3">
          {hasPassword && (
            <Field label={t("settings.myAccount.currentPassword", "Password Saat Ini")}>
              <PasswordInput required className={inputCls} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </Field>
          )}
          <Field label={hasPassword ? t("settings.myAccount.newPassword", "Password Baru") : t("settings.myAccount.newPasswordFirst", "Password")}>
            <PasswordInput required placeholder={t("settings.myAccount.minChars", "Minimal 8 karakter")} className={inputCls} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </Field>
          <Field label={t("settings.myAccount.confirmPassword", "Konfirmasi Password")}>
            <PasswordInput required className={inputCls} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </Field>

          {error && <div className="text-xs text-rose-400">{error}</div>}

          <Button type="submit" disabled={busy}>
            {busy
              ? t("settings.common.saving", "Menyimpan...")
              : hasPassword
                ? t("settings.myAccount.changeButton", "Simpan Password Baru")
                : t("settings.myAccount.setButton", "Buat Password")}
          </Button>
        </form>
      </Card>
    </div>
  );
}

