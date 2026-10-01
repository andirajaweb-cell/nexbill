"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { useProsesTunggal } from "@/lib/ui/use-proses-tunggal";
import "@/lib/i18n/dict-settings";

/**
 * Pengaturan → Business & Tax → Integrasi Tuya Cloud API.
 * Outlet bisa mendaftarkan BEBERAPA akun Tuya Cloud API (akun Trial Tuya hanya bisa mengontrol
 * sedikit perangkat). Tiap akun punya status koneksi sendiri dan jumlah perangkat yang memakainya.
 * Secret tidak pernah dikirim ke browser — saat edit, kosongkan kolom secret untuk mempertahankannya.
 */

interface TuyaAccount {
  id: string;
  label: string;
  accessId: string;
  secretMasked: string;
  projectCode: string | null;
  region: string;
  deviceCount: number;
}

type Status = { ok: boolean; message: string } | "testing" | undefined;

const inputCls = "w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm disabled:opacity-60";

const emptyForm = { label: "", accessId: "", accessSecret: "", projectCode: "", region: "sg" };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1 block">
      <div className="text-xs text-neutral-500">{label}</div>
      {children}
    </label>
  );
}

export function TuyaAccountsCard({ canManage }: { canManage: boolean }) {
  const { t } = useDashboardLang();
  const [accounts, setAccounts] = useState<TuyaAccount[]>([]);
  const [trialLimit, setTrialLimit] = useState(8);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<Record<string, Status>>({});
  // null = form tertutup, "new" = tambah akun, selain itu = id akun yang diedit
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const { jalankan, adaYangSibuk } = useProsesTunggal();
  const sedangProses = adaYangSibuk();

  const test = async (id: string) => {
    setStatus((s) => ({ ...s, [id]: "testing" }));
    try {
      const res = await fetch(`/api/settings/tuya-accounts/${id}/test`, { method: "POST" });
      const data = await res.json();
      setStatus((s) => ({ ...s, [id]: { ok: !!data.ok, message: data.message ?? data.error ?? "" } }));
    } catch {
      setStatus((s) => ({ ...s, [id]: { ok: false, message: t("settings.tuya.serverError", "Gagal menghubungi server.") } }));
    }
  };

  const load = async (testAll: boolean) => {
    try {
      const res = await fetch("/api/settings/tuya-accounts");
      const data = await res.json();
      if (!res.ok) return;
      setAccounts(data.accounts ?? []);
      setTrialLimit(data.trialLimit ?? 8);
      // Tes otomatis sekali saat halaman dibuka, supaya status mencerminkan koneksi sebenarnya.
      if (testAll && canManage) for (const a of data.accounts ?? []) void test(a.id);
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openNew = () => {
    setEditing("new");
    setForm({ ...emptyForm, label: `${t("settings.tuya.accountDefaultLabel", "Akun")} ${accounts.length + 1}` });
  };
  const openEdit = (a: TuyaAccount) => {
    setEditing(a.id);
    setForm({ label: a.label, accessId: a.accessId, accessSecret: "", projectCode: a.projectCode ?? "", region: a.region });
  };

  const save = () =>
    jalankan("simpan", async () => {
      const isNew = editing === "new";
      const res = await fetch(isNew ? "/api/settings/tuya-accounts" : `/api/settings/tuya-accounts/${editing}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      const id = isNew ? data.id : editing;
      setEditing(null);
      setForm(emptyForm);
      await load(false);
      if (id) void test(id);
    });

  const remove = async (a: TuyaAccount) => {
    if (a.deviceCount > 0) {
      return showAlert(
        t("settings.tuya.deleteBlocked", 'Akun "{label}" masih dipakai {n} perangkat. Pindahkan atau hapus perangkat itu dulu di Kontrol Perangkat.')
          .replace("{label}", a.label)
          .replace("{n}", String(a.deviceCount)),
      );
    }
    const ok = await showConfirm(t("settings.tuya.deleteConfirm", 'Hapus akun Tuya "{label}" dari outlet ini?').replace("{label}", a.label), {
      tone: "danger",
      confirmLabel: t("settings.tuya.deleteButton", "Hapus"),
    });
    if (!ok) return;
    await jalankan("hapus", async () => {
      const res = await fetch(`/api/settings/tuya-accounts/${a.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      await load(false);
    });
  };

  const regionOptions: [string, string][] = [
    ["sg", t("settings.tuya.regionSg", "Singapore (Indonesia/Malaysia/Thailand/Vietnam)")],
    ["cn", t("settings.tuya.regionCn", "China")],
    ["us", t("settings.tuya.regionUs", "Amerika (Barat)")],
    ["us_e", t("settings.tuya.regionUsE", "Amerika (Timur)")],
    ["eu", t("settings.tuya.regionEu", "Eropa (Tengah)")],
    ["eu_w", t("settings.tuya.regionEuW", "Eropa (Barat)")],
    ["in", t("settings.tuya.regionIn", "India")],
  ];
  const totalDevices = accounts.reduce((n, a) => n + a.deviceCount, 0);

  return (
    <Card className="space-y-3 border border-amber-700/40 bg-amber-950/10">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-medium">{t("settings.tuya.heading", "Integrasi Tuya Cloud API (Smart Plug Tuya)")}</h2>
        {canManage && editing === null && (
          <Button variant="secondary" className="text-xs px-2.5 py-1.5" onClick={openNew}>
            {t("settings.tuya.addAccount", "+ Tambah Akun Tuya")}
          </Button>
        )}
      </div>
      <p className="text-xs text-neutral-500">
        {t(
          "settings.tuya.descMulti",
          "Kalau outlet ini pakai smart plug Tuya Smart Life, daftarkan akun Tuya Cloud API milik outlet sendiri di sini. Akun gratis (Trial) Tuya hanya bisa mengontrol sekitar {max} perangkat — kalau smart plug-mu lebih banyak, buat akun Tuya Cloud kedua (email lain), tautkan sebagian smart plug ke akun itu, lalu tambahkan di sini. Sistem otomatis memakai akun yang benar untuk setiap perangkat."
        ).replace("{max}", String(trialLimit))}
      </p>
      <div className="rounded-lg border border-amber-700/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-300">
        {t(
          "settings.tuya.riskBannerMulti",
          "Penting: setiap akun Tuya Cloud Trial hanya berlaku ~1 bulan dan wajib diperpanjang manual di iot.tuya.com. Kalau satu akun lupa diperpanjang, semua smart plug di akun itu berhenti merespon. Catat tanggal perpanjangan tiap akun. Panduan lengkap di Pusat Bantuan → Kontrol Perangkat."
        )}
      </div>

      {loaded && accounts.length === 0 && editing === null && (
        <p className="text-sm text-neutral-400">{t("settings.tuya.noAccounts", "Belum ada akun Tuya. Tekan \"+ Tambah Akun Tuya\" untuk mulai.")}</p>
      )}

      {accounts.length > 0 && (
        <div className="space-y-2">
          {accounts.map((a) => {
            const st = status[a.id];
            const over = a.deviceCount > trialLimit;
            return (
              <div key={a.id} className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3 space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="font-medium text-sm">{a.label}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {st === "testing" ? (
                      <Badge status="pending">{t("settings.tuya.statusTesting", "Menguji...")}</Badge>
                    ) : st === undefined ? (
                      <Badge status="unknown">{t("settings.tuya.statusUnknown", "Belum diuji")}</Badge>
                    ) : st.ok ? (
                      <Badge status="success">{t("settings.tuya.statusConnected", "Terhubung")}</Badge>
                    ) : (
                      <Badge status="failed">{t("settings.tuya.statusDisconnected", "Tidak terhubung")}</Badge>
                    )}
                    <span className={`text-xs ${over ? "text-amber-400" : "text-neutral-500"}`}>
                      {t("settings.tuya.deviceCount", "{n}/{max} perangkat").replace("{n}", String(a.deviceCount)).replace("{max}", String(trialLimit))}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-neutral-500 break-all">
                  Access ID: {a.accessId} · Secret: {a.secretMasked} · {regionOptions.find(([v]) => v === a.region)?.[1] ?? a.region}
                </div>
                {st && st !== "testing" && !st.ok && (
                  <p className="text-xs text-rose-400/90 rounded-lg bg-rose-500/5 border border-rose-500/20 px-3 py-2">{st.message}</p>
                )}
                {over && (
                  <p className="text-xs text-amber-400">
                    {t("settings.tuya.overLimit", "Akun ini dipakai lebih dari {max} perangkat. Kalau ada smart plug yang tidak merespon, pindahkan sebagian ke akun Tuya lain.").replace("{max}", String(trialLimit))}
                  </p>
                )}
                {canManage && editing === null && (
                  <div className="flex gap-3 pt-1">
                    <button className="text-xs text-amber-400 hover:underline" onClick={() => test(a.id)} disabled={st === "testing"}>
                      {t("settings.tuya.testButton", "Tes Koneksi")}
                    </button>
                    <button className="text-xs text-emerald-400 hover:underline" onClick={() => openEdit(a)}>
                      {t("settings.tuya.editButton", "Edit")}
                    </button>
                    <button className="text-xs text-red-400 hover:underline" onClick={() => remove(a)} disabled={sedangProses}>
                      {t("settings.tuya.deleteButton", "Hapus")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {accounts.length > 1 && (
            <p className="text-xs text-neutral-500">
              {t("settings.tuya.summary", "{accounts} akun · {devices} perangkat Tuya terdaftar.")
                .replace("{accounts}", String(accounts.length))
                .replace("{devices}", String(totalDevices))}
            </p>
          )}
        </div>
      )}

      {canManage && editing !== null && (
        <div className="rounded-lg border border-amber-700/40 p-3 space-y-3">
          <div className="text-sm font-medium">
            {editing === "new" ? t("settings.tuya.formNewTitle", "Tambah Akun Tuya") : t("settings.tuya.formEditTitle", "Edit Akun Tuya")}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t("settings.tuya.accountLabel", "Nama akun (bebas, mis. \"Akun Bilik 9–16\")")}>
              <input className={inputCls} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            </Field>
            <Field label={t("settings.tuya.region", "Data Center / Region")}>
              <select className={inputCls} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>
                {regionOptions.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </Field>
            <Field label={t("settings.tuya.accessId", "Access ID / Client ID")}>
              <input className={inputCls} value={form.accessId} onChange={(e) => setForm({ ...form, accessId: e.target.value })} placeholder="abcdef1234567890" />
            </Field>
            <Field label={t("settings.tuya.accessSecret", "Access Secret / Client Secret")}>
              <input
                type="password"
                className={inputCls}
                value={form.accessSecret}
                onChange={(e) => setForm({ ...form, accessSecret: e.target.value })}
                placeholder={editing === "new" ? "••••••••••••••••" : t("settings.tuya.secretKeep", "Kosongkan jika tidak diubah")}
                autoComplete="new-password"
              />
            </Field>
            <Field label={t("settings.tuya.projectCode", "Project Code (opsional)")}>
              <input className={inputCls} value={form.projectCode} onChange={(e) => setForm({ ...form, projectCode: e.target.value })} />
            </Field>
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={sedangProses}>
              {sedangProses ? t("settings.tuya.saving", "Menyimpan...") : t("settings.tuya.saveButton", "Simpan Akun")}
            </Button>
            <Button variant="ghost" onClick={() => { setEditing(null); setForm(emptyForm); }} disabled={sedangProses}>
              {t("settings.tuya.cancelButton", "Batal")}
            </Button>
          </div>
        </div>
      )}

      <p className="text-xs text-neutral-500">
        {t(
          "settings.tuya.helpLinkDesc",
          "Belum punya akun Tuya Cloud API? Lihat panduan lengkap (cara bikin akun, cara ambil Access ID/Secret, cara memperpanjang Trial, dan cara mengganti akun/email) di"
        )}{" "}
        <a href="/dashboard/help?category=devices" className="text-amber-400 hover:underline">{t("settings.tuya.helpLinkText", "Pusat Bantuan → Kontrol Perangkat")}</a>.
      </p>
    </Card>
  );
}
