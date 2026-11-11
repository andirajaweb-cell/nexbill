"use client";
import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ExternalLink, ImagePlus, Megaphone, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fetchJsonArray } from "@/lib/api/fetch-json";
import { useApi } from "@/lib/api/use-api";
import { useAuth } from "@/lib/auth/client";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { bannerFileProblem, BANNER_TITLE_MAX } from "@/lib/booking/banner-rules";
import "@/lib/i18n/dict-booking-banner";

interface BannerRow {
  id: string;
  imageUrl: string;
  linkUrl: string | null;
  title: string | null;
  sortOrder: number;
  isActive: boolean;
}

const inputCls = "w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm";

/**
 * Banner Iklan halaman booking publik — dipindah dari Pengaturan ke halaman Booking (2026-11-11)
 * supaya semua yang tampil di /book/[slug] (link, profil, banner) diatur di satu tempat.
 * Perbaikan: upload khusus banner (bukan endpoint logo), link divalidasi http(s), urutan disimpan
 * utuh lewat /api/banners/order, judul & link bisa diubah, gambar terhapus dari storage saat banner
 * dihapus, staf tanpa izin melihat daftar tanpa tombol ubah.
 */
export function BookingBannersCard() {
  const { t } = useDashboardLang();
  const { user } = useAuth();
  const canManage = hasPermission((user?.role ?? "cashier") as StaffRole, "manage_settings");
  const { data: link } = useApi<{ slug: string }>("/api/outlets/booking-link");
  const [rows, setRows] = useState<BannerRow[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ imageUrl: string; title: string; linkUrl: string } | null>(null);
  const [editing, setEditing] = useState<{ id: string; title: string; linkUrl: string } | null>(null);

  const load = useCallback(() => {
    fetchJsonArray<BannerRow>("/api/banners").then((r) => setRows([...r].sort((a, b) => a.sortOrder - b.sortOrder)));
  }, []);
  useEffect(() => {
    let alive = true;
    fetchJsonArray<BannerRow>("/api/banners").then((r) => {
      if (alive) setRows([...r].sort((a, b) => a.sortOrder - b.sortOrder));
    });
    return () => {
      alive = false;
    };
  }, []);

  const failed = async (res: Response) => {
    const body = await res.json().catch(() => ({}));
    await showAlert(body.error ?? t("bookingBanner.failed", "Gagal menyimpan banner."));
  };

  const uploadImage = async (file: File) => {
    const problem = bannerFileProblem(file.name, file.size);
    if (problem) return showAlert(problem.includes("3MB") ? t("bookingBanner.tooBig", "Ukuran gambar banner maksimal 3MB.") : t("bookingBanner.badFormat", "Format banner harus PNG, JPG, atau WEBP."));
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/banners/upload", { method: "POST", body: fd });
      if (!res.ok) return failed(res);
      const data = await res.json();
      setPending({ imageUrl: data.url, title: "", linkUrl: "" });
    } finally {
      setUploading(false);
    }
  };

  const addBanner = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      const res = await fetch("/api/banners", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pending) });
      if (!res.ok) return failed(res);
      setPending(null);
      load();
    } finally {
      setBusy(false);
    }
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/banners/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) {
        await failed(res);
        return false;
      }
      load();
      return true;
    } finally {
      setBusy(false);
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    if (!rows) return;
    const next = [...rows];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setRows(next.map((r, i) => ({ ...r, sortOrder: i })));
    const res = await fetch("/api/banners/order", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: next.map((r) => r.id) }) });
    if (!res.ok) await failed(res);
    load();
  };

  const remove = async (row: BannerRow) => {
    const msg = row.title
      ? t("bookingBanner.deleteConfirmTitle", 'Hapus banner "{title}"? Gambarnya ikut dihapus.').replace("{title}", row.title)
      : t("bookingBanner.deleteConfirm", "Hapus banner ini? Gambarnya ikut dihapus.");
    if (!(await showConfirm(msg, { tone: "danger", confirmLabel: t("bookingBanner.delete", "Hapus") }))) return;
    const res = await fetch(`/api/banners/${row.id}`, { method: "DELETE" });
    if (!res.ok) return failed(res);
    load();
  };

  if (rows === null) return null;
  if (!canManage && rows.length === 0) return null;
  const activeCount = rows.filter((r) => r.isActive).length;
  const publicUrl = link?.slug ? `/book/${link.slug}` : null;

  return (
    <Card className="space-y-4" id="banner-iklan">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <h2 className="font-medium flex items-center gap-2">
            <Megaphone size={16} className="text-cyan-300" />
            {t("bookingBanner.heading", "Banner Iklan — Halaman Booking Publik")}
          </h2>
          <p className="text-xs text-neutral-500">
            {t("bookingBanner.desc", "Slideshow berputar otomatis tiap 5 detik di halaman booking online, tepat di bawah form booking. Cocok untuk promo F&B, paket main, event turnamen, atau iklan sponsor. Banner yang diklik membuka link tujuan di tab baru.")}
          </p>
          <p className="text-xs text-neutral-400">
            {activeCount > 0
              ? t("bookingBanner.activeCount", "{n} banner aktif tampil di halaman booking.").replace("{n}", String(activeCount))
              : t("bookingBanner.noneActive", "Belum ada banner aktif — halaman booking tampil tanpa slideshow.")}
          </p>
        </div>
        {publicUrl && (
          <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
            <Button variant="secondary" className="text-xs flex items-center gap-1">
              <ExternalLink size={14} /> {t("bookingBanner.preview", "Lihat di halaman booking")}
            </Button>
          </a>
        )}
      </div>

      {canManage && (
        <div className="rounded-lg border border-neutral-800 p-3 space-y-2">
          {!pending ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="text-xs shrink-0">
                <span className="inline-flex items-center gap-2 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 cursor-pointer hover:bg-neutral-700">
                  <ImagePlus size={14} />
                  {uploading ? t("bookingBanner.uploading", "Mengunggah...") : t("bookingBanner.upload", "Upload Gambar Banner")}
                </span>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) void uploadImage(f);
                  }}
                />
              </label>
              <p className="text-[11px] text-neutral-500">
                {t("bookingBanner.sizeHint", "Disarankan 2400×750 px (minimal 1600×500), PNG/JPG/WEBP maks. 3MB. Gambar dipotong 16:5 di HP dan 21:6 di layar lebar — taruh teks & logo di tengah.")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <img src={pending.imageUrl} alt="" className="w-full aspect-[16/5] sm:aspect-[21/6] object-cover rounded-lg border border-neutral-700" />
              <div className="grid sm:grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-xs text-neutral-500">{t("bookingBanner.titleLabel", "Judul (opsional, dibaca pembaca layar)")}</span>
                  <input className={inputCls} maxLength={BANNER_TITLE_MAX} value={pending.title} onChange={(e) => setPending({ ...pending, title: e.target.value })} />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-neutral-500">{t("bookingBanner.linkLabel", "Link tujuan saat diklik (opsional)")}</span>
                  <input className={inputCls} placeholder="https://instagram.com/outletkamu" value={pending.linkUrl} onChange={(e) => setPending({ ...pending, linkUrl: e.target.value })} />
                </label>
              </div>
              <div className="flex gap-2">
                <Button onClick={addBanner} disabled={busy}>{busy ? t("bookingBanner.saving", "Menyimpan...") : t("bookingBanner.add", "Tambah ke Slideshow")}</Button>
                <Button variant="secondary" onClick={() => setPending(null)} disabled={busy}>{t("bookingBanner.cancel", "Batal")}</Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {rows.map((b, i) => (
          <div key={b.id} className={`rounded-lg border border-neutral-800 p-2 ${b.isActive ? "" : "opacity-60"}`}>
            <div className="flex items-center gap-3">
              <img src={b.imageUrl} alt={b.title ?? ""} className="w-28 aspect-[16/5] object-cover rounded-md border border-neutral-800 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{b.title || t("bookingBanner.noTitle", "(tanpa judul)")}</div>
                {b.linkUrl ? (
                  <a href={b.linkUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-300 truncate block hover:underline">{b.linkUrl}</a>
                ) : (
                  <div className="text-xs text-neutral-600">{t("bookingBanner.noLink", "Tanpa link")}</div>
                )}
                <div className="text-[11px] text-neutral-600">
                  {t("bookingBanner.order", "Urutan #{n}").replace("{n}", String(i + 1))} · {b.isActive ? t("bookingBanner.active", "Aktif") : t("bookingBanner.inactive", "Nonaktif")}
                </div>
              </div>
              {canManage && (
                <div className="flex flex-wrap items-center justify-end gap-1 shrink-0">
                  <Button variant="ghost" className="text-xs px-2" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t("bookingBanner.up", "Naikkan")}>
                    <ArrowUp size={14} />
                  </Button>
                  <Button variant="ghost" className="text-xs px-2" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label={t("bookingBanner.down", "Turunkan")}>
                    <ArrowDown size={14} />
                  </Button>
                  <Button variant="ghost" className="text-xs px-2" onClick={() => setEditing({ id: b.id, title: b.title ?? "", linkUrl: b.linkUrl ?? "" })} aria-label={t("bookingBanner.edit", "Ubah")}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant={b.isActive ? "secondary" : "primary"} className="text-xs" disabled={busy} onClick={() => patch(b.id, { isActive: !b.isActive })}>
                    {b.isActive ? t("bookingBanner.deactivate", "Nonaktifkan") : t("bookingBanner.activate", "Aktifkan")}
                  </Button>
                  <Button variant="danger" className="text-xs px-2" onClick={() => remove(b)} aria-label={t("bookingBanner.delete", "Hapus")}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              )}
            </div>
            {editing?.id === b.id && (
              <div className="mt-2 grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                <label className="block space-y-1">
                  <span className="text-xs text-neutral-500">{t("bookingBanner.titleLabel", "Judul (opsional, dibaca pembaca layar)")}</span>
                  <input className={inputCls} maxLength={BANNER_TITLE_MAX} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-neutral-500">{t("bookingBanner.linkLabel", "Link tujuan saat diklik (opsional)")}</span>
                  <input className={inputCls} placeholder="https://instagram.com/outletkamu" value={editing.linkUrl} onChange={(e) => setEditing({ ...editing, linkUrl: e.target.value })} />
                </label>
                <div className="flex gap-2">
                  <Button
                    disabled={busy}
                    onClick={async () => {
                      if (await patch(b.id, { title: editing.title, linkUrl: editing.linkUrl })) setEditing(null);
                    }}
                  >
                    {t("bookingBanner.save", "Simpan")}
                  </Button>
                  <Button variant="secondary" onClick={() => setEditing(null)}>{t("bookingBanner.cancel", "Batal")}</Button>
                </div>
              </div>
            )}
          </div>
        ))}
        {rows.length === 0 && <div className="text-sm text-neutral-500 text-center py-4">{t("bookingBanner.empty", "Belum ada banner. Upload gambar di atas untuk mulai.")}</div>}
      </div>
    </Card>
  );
}
