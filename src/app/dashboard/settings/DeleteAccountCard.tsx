"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fetchJsonObject } from "@/lib/api/fetch-json";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-account-deletion";

interface DeletionStatus {
  canRequest: boolean;
  outlets: { id: string; name: string }[];
  request: { id: string; status: string; codeExpiresAt: string | null; scheduledPurgeAt: string | null; email: string } | null;
}

const inputCls = "w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm";

/**
 * Hapus Akun & Data (Kebijakan Privasi bagian 9, syarat Google Play): Owner minta kode ke email
 * terdaftar → masukkan kode + ketik HAPUS → akun, staf, dan outlet langsung nonaktif; data pribadi
 * dihapus/dianonimkan paling lambat 30 hari. Staf non-Owner hanya melihat petunjuk.
 */
export function DeleteAccountCard() {
  const { t } = useDashboardLang();
  const [status, setStatus] = useState<DeletionStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [code, setCode] = useState("");
  const [phrase, setPhrase] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => fetchJsonObject<DeletionStatus>("/api/account/deletion").then((d) => d && setStatus(d));
  useEffect(() => {
    load();
  }, []);

  if (!status) return null;
  const outletNames = status.outlets.map((o) => o.name).join(", ") || "-";
  const pending = status.request?.status === "pending_verification";

  const requestCode = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/account/deletion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
      const out = await res.json();
      if (!res.ok) return showAlert(out.error ?? "Gagal.");
      setSentTo(out.email);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!(await showConfirm(t("delAcc.confirmDialog", "Yakin? Akun dan semua outlet di atas langsung dinonaktifkan dan Anda akan keluar dari NEXBILL.")))) return;
    setBusy(true);
    try {
      const res = await fetch("/api/account/deletion/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: code.trim(), phrase }) });
      const out = await res.json();
      if (!res.ok) return showAlert(out.error ?? "Gagal.");
      const date = new Date(out.scheduledPurgeAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
      await showAlert(t("delAcc.done", "Akun dinonaktifkan. Data dihapus paling lambat {date}.").replace("{date}", date));
      window.location.href = "/login";
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      await fetch("/api/account/deletion", { method: "DELETE" });
      setOpen(false);
      setSentTo(null);
      setCode("");
      setPhrase("");
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-3 border-rose-500/30">
      <h2 className="font-medium text-rose-300">{t("delAcc.heading", "Hapus Akun & Data")}</h2>
      {!status.canRequest ? (
        <p className="text-xs text-neutral-500">{t("delAcc.notOwner", "Hanya Owner yang bisa menghapus akun & data outlet.")}</p>
      ) : (
        <>
          <p className="text-xs text-neutral-500">{t("delAcc.desc", "Menghapus akun Owner ini beserta data outlet: {outlets}.").replace("{outlets}", outletNames)}</p>
          <p className="text-xs text-neutral-500">
            {t("delAcc.exportHint", "Sebelum menghapus, unduh laporan yang Anda perlukan dari menu Laporan dan Akuntansi.")}{" "}
            <a href="/kebijakan-privasi#hapus-akun" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
              {t("delAcc.privacyLink", "Kebijakan Privasi")}
            </a>
          </p>

          {!open && !pending && (
            <Button variant="secondary" className="text-xs text-rose-300" onClick={() => setOpen(true)}>
              {t("delAcc.heading", "Hapus Akun & Data")}
            </Button>
          )}

          {(open || pending) && (
            <div className="space-y-3 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
              {!pending && (
                <>
                  <label className="block text-xs text-neutral-400">
                    {t("delAcc.reasonLabel", "Alasan (opsional)")}
                    <textarea className={`${inputCls} mt-1`} rows={2} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
                  </label>
                  <div className="flex gap-2">
                    <Button className="text-xs" onClick={requestCode} disabled={busy}>{t("delAcc.requestButton", "Kirim Kode Konfirmasi")}</Button>
                    <Button variant="ghost" className="text-xs" onClick={() => setOpen(false)} disabled={busy}>{t("delAcc.cancelButton", "Batalkan")}</Button>
                  </div>
                </>
              )}
              {pending && (
                <>
                  <p className="text-xs text-emerald-300">
                    {t("delAcc.codeSent", "Kode 6 digit dikirim ke {email}. Berlaku 15 menit.").replace("{email}", sentTo ?? status.request?.email ?? "")}
                  </p>
                  <label className="block text-xs text-neutral-400">
                    {t("delAcc.codeLabel", "Kode dari email")}
                    <input className={`${inputCls} mt-1 tracking-[0.4em]`} inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
                  </label>
                  <label className="block text-xs text-neutral-400">
                    {t("delAcc.phraseLabel", "Ketik HAPUS untuk mengonfirmasi")}
                    <input className={`${inputCls} mt-1`} value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder="HAPUS" />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button className="text-xs bg-rose-600 hover:bg-rose-500" onClick={confirm} disabled={busy || code.length !== 6 || phrase.trim().toUpperCase() !== "HAPUS"}>
                      {t("delAcc.confirmButton", "Hapus Akun Permanen")}
                    </Button>
                    <Button variant="secondary" className="text-xs" onClick={requestCode} disabled={busy}>{t("delAcc.resend", "Kirim ulang kode")}</Button>
                    <Button variant="ghost" className="text-xs" onClick={cancel} disabled={busy}>{t("delAcc.cancelButton", "Batalkan")}</Button>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
