"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, ExternalLink, LocateFixed, MapPin, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useApi } from "@/lib/api/use-api";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { directionsUrl, MAX_PUBLIC_PHOTOS, MAX_WHATSAPP_CONTACTS, parseLatLngFromText } from "@/lib/booking/public-profile-core";
import "@/lib/i18n/dict-booking-blacklist";

/**
 * Profil halaman booking online (/book/[slug]): foto outlet, beberapa admin WhatsApp, dan titik
 * lokasi untuk tombol "Petunjuk arah". Cabang lain milik Owner yang sama tampil otomatis.
 */

interface ProfileData {
  slug: string;
  address: string | null;
  outletPhone: string | null;
  profile: { latitude: number | null; longitude: number | null; mapsUrl: string | null; showBranches: boolean };
  photos: { id: string; url: string; caption: string | null }[];
  contacts: { id: string; label: string; phone: string; isActive: boolean }[];
  branchCount: number;
  canEdit: boolean;
  migrationMissing?: boolean;
}

export function BookingPageProfileCard() {
  const { t } = useDashboardLang();
  const { data, mutate } = useApi<ProfileData>("/api/booking-page-profile");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [showBranches, setShowBranches] = useState(true);
  const [savingLoc, setSavingLoc] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [label, setLabel] = useState("");
  const [phone, setPhone] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!data) return;
    setLat(data.profile.latitude != null ? String(data.profile.latitude) : "");
    setLng(data.profile.longitude != null ? String(data.profile.longitude) : "");
    setMapsUrl(data.profile.mapsUrl ?? "");
    setShowBranches(data.profile.showBranches);
  }, [data]);

  if (!data) return null;
  const edit = data.canEdit && !data.migrationMissing;
  const pageUrl = typeof window !== "undefined" ? `${window.location.origin}/book/${data.slug}` : `/book/${data.slug}`;
  const preview = directionsUrl({ latitude: lat ? Number(lat) : null, longitude: lng ? Number(lng) : null, mapsUrl: mapsUrl || null, address: data.address });

  const fail = async (res: Response) => {
    const body = await res.json().catch(() => ({}));
    await showAlert(body.error ?? t("bookingProfile.saveFailed", "Gagal menyimpan."));
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return showAlert(t("bookingProfile.geoUnsupported", "Browser ini tidak bisa membaca lokasi."));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
      },
      () => showAlert(t("bookingProfile.geoDenied", "Lokasi tidak bisa dibaca. Izinkan akses lokasi, atau tempel link Google Maps.")),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const onMapsUrl = (v: string) => {
    setMapsUrl(v);
    const p = parseLatLngFromText(v);
    if (p) {
      setLat(String(p.lat));
      setLng(String(p.lng));
    }
  };

  const saveLocation = async () => {
    setSavingLoc(true);
    try {
      const res = await fetch("/api/booking-page-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat === "" ? null : Number(lat), longitude: lng === "" ? null : Number(lng), mapsUrl: mapsUrl || null, showBranches }),
      });
      if (!res.ok) return fail(res);
      await mutate();
      await showAlert(t("bookingProfile.saved", "Tersimpan — halaman booking sudah diperbarui."));
    } finally {
      setSavingLoc(false);
    }
  };

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/booking-page-profile/photos", { method: "POST", body: fd });
      if (!res.ok) return fail(res);
      await mutate();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removePhoto = async (id: string) => {
    if (!(await showConfirm(t("bookingProfile.deletePhotoConfirm", "Hapus foto ini dari halaman booking?")))) return;
    const res = await fetch(`/api/booking-page-profile/photos?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) return fail(res);
    await mutate();
  };

  const addContact = async () => {
    const res = await fetch("/api/booking-page-profile/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label, phone }) });
    if (!res.ok) return fail(res);
    setLabel("");
    setPhone("");
    await mutate();
  };

  const patchContact = async (id: string, patch: Record<string, unknown>) => {
    const res = await fetch("/api/booking-page-profile/contacts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...patch }) });
    if (!res.ok) return fail(res);
    await mutate();
  };

  const removeContact = async (id: string) => {
    if (!(await showConfirm(t("bookingProfile.deleteContactConfirm", "Hapus admin WhatsApp ini?")))) return;
    const res = await fetch(`/api/booking-page-profile/contacts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) return fail(res);
    await mutate();
  };

  const inputCls = "rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm";

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-medium">{t("bookingProfile.title", "Tampilan halaman booking online")}</h2>
          <p className="text-xs text-neutral-500">{t("bookingProfile.desc", "Foto outlet, tombol WhatsApp untuk setiap admin, dan titik lokasi untuk petunjuk arah. Cabang lain milik Anda tampil otomatis di bagian bawah halaman.")}</p>
        </div>
        <a href={pageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-neutral-200 hover:bg-white/10">
          <ExternalLink size={14} /> {t("bookingProfile.openPage", "Lihat halaman")}
        </a>
      </div>

      {data.migrationMissing && (
        <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          {t("bookingProfile.migrationMissing", "Belum bisa diatur (pembaruan database belum dijalankan). Halaman booking tetap memakai nomor WhatsApp outlet.")}
        </div>
      )}
      {!data.canEdit && <p className="text-xs text-neutral-500">{t("bookingProfile.readOnly", "Hanya Owner atau staf dengan izin Kelola Pengaturan yang bisa mengubah bagian ini.")}</p>}

      {/* Foto */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs uppercase tracking-wide text-neutral-500">{t("bookingProfile.photosTitle", "Foto outlet ({n}/{max})").replace("{n}", String(data.photos.length)).replace("{max}", String(MAX_PUBLIC_PHOTOS))}</h3>
          {edit && data.photos.length < MAX_PUBLIC_PHOTOS && (
            <>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              <Button variant="secondary" className="text-xs" disabled={uploading} onClick={() => fileRef.current?.click()}>
                <Camera size={13} className="mr-1 inline" /> {uploading ? t("bookingProfile.uploading", "Mengunggah...") : t("bookingProfile.addPhoto", "Tambah foto")}
              </Button>
            </>
          )}
        </div>
        {data.photos.length === 0 ? (
          <p className="text-xs text-neutral-500">{t("bookingProfile.noPhotos", "Belum ada foto. Foto ruangan, unit PS, dan area tunggu membantu pelanggan yakin sebelum booking.")}</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {data.photos.map((p) => (
              <div key={p.id} className="group relative overflow-hidden rounded-lg border border-white/10">
                <img src={p.url} alt={p.caption ?? ""} className="aspect-square w-full object-cover" />
                {edit && (
                  <button type="button" onClick={() => removePhoto(p.id)} className="absolute right-1 top-1 rounded-md bg-black/60 p-1 text-red-300 hover:bg-black/80" aria-label={t("bookingProfile.deletePhoto", "Hapus foto")}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* WhatsApp */}
      <section className="space-y-2">
        <h3 className="text-xs uppercase tracking-wide text-neutral-500">{t("bookingProfile.waTitle", "Admin WhatsApp")}</h3>
        {data.contacts.length === 0 && (
          <p className="text-xs text-neutral-500">
            {data.outletPhone
              ? t("bookingProfile.waFallback", "Belum ada admin — halaman booking memakai nomor outlet {phone}.").replace("{phone}", data.outletPhone)
              : t("bookingProfile.waNone", "Belum ada nomor WhatsApp. Tambahkan minimal satu admin agar pelanggan bisa bertanya.")}
          </p>
        )}
        <div className="divide-y divide-white/5">
          {data.contacts.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5 text-sm">
              <div className={c.isActive ? "" : "opacity-50"}>
                <span className="font-medium">{c.label}</span> <span className="font-mono text-xs text-neutral-400">{c.phone}</span>
              </div>
              {edit && (
                <div className="flex items-center gap-2 text-xs">
                  <label className="flex items-center gap-1">
                    <input type="checkbox" className="accent-emerald-500" checked={c.isActive} onChange={(e) => patchContact(c.id, { isActive: e.target.checked })} />
                    {t("bookingProfile.waShow", "Tampil")}
                  </label>
                  <button type="button" className="text-red-300 hover:text-red-200" onClick={() => removeContact(c.id)} aria-label={t("bookingProfile.deleteContact", "Hapus admin")}>
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        {edit && data.contacts.length < MAX_WHATSAPP_CONTACTS && (
          <div className="flex flex-wrap gap-2">
            <input className={`${inputCls} min-w-[140px] flex-1`} placeholder={t("bookingProfile.waLabelPlaceholder", "Nama/label, mis. Admin Booking")} value={label} maxLength={40} onChange={(e) => setLabel(e.target.value)} />
            <input className={`${inputCls} min-w-[140px] flex-1`} placeholder={t("bookingProfile.waPhonePlaceholder", "No. WhatsApp, mis. 0812xxxx")} value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Button variant="secondary" className="text-xs" disabled={!label.trim() || phone.replace(/[^0-9]/g, "").length < 8} onClick={addContact}>
              {t("bookingProfile.waAdd", "Tambah admin")}
            </Button>
          </div>
        )}
      </section>

      {/* Lokasi */}
      <section className="space-y-2">
        <h3 className="text-xs uppercase tracking-wide text-neutral-500">{t("bookingProfile.locTitle", "Lokasi & petunjuk arah")}</h3>
        <input
          className={`${inputCls} w-full`}
          placeholder={t("bookingProfile.mapsUrlPlaceholder", "Tempel link Google Maps outlet (opsional)")}
          value={mapsUrl}
          disabled={!edit}
          onChange={(e) => onMapsUrl(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <input className={`${inputCls} w-32`} placeholder={t("bookingProfile.lat", "Lintang")} value={lat} disabled={!edit} onChange={(e) => setLat(e.target.value)} inputMode="decimal" />
          <input className={`${inputCls} w-32`} placeholder={t("bookingProfile.lng", "Bujur")} value={lng} disabled={!edit} onChange={(e) => setLng(e.target.value)} inputMode="decimal" />
          {edit && (
            <Button variant="ghost" className="text-xs" onClick={useMyLocation}>
              <LocateFixed size={13} className="mr-1 inline" /> {t("bookingProfile.useMyLocation", "Pakai lokasi saya sekarang")}
            </Button>
          )}
          {preview && (
            <a href={preview} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-cyan-300 underline">
              <MapPin size={13} /> {t("bookingProfile.testDirections", "Coba petunjuk arah")}
            </a>
          )}
        </div>
        <p className="text-[11px] text-neutral-500">{t("bookingProfile.locHelp", "Tekan \"Pakai lokasi saya sekarang\" saat berada di outlet, atau tempel link Google Maps. Tanpa titik lokasi, petunjuk arah memakai alamat outlet.")}</p>
        {data.branchCount > 0 && (
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" className="accent-cyan-500" checked={showBranches} disabled={!edit} onChange={(e) => setShowBranches(e.target.checked)} />
            {t("bookingProfile.showBranches", "Tampilkan {n} cabang lain di halaman booking").replace("{n}", String(data.branchCount))}
          </label>
        )}
        {edit && (
          <Button onClick={saveLocation} disabled={savingLoc}>
            {savingLoc ? t("bookingProfile.saving", "Menyimpan...") : t("bookingProfile.saveLocation", "Simpan lokasi")}
          </Button>
        )}
      </section>
    </Card>
  );
}
