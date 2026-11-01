"use client";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { GraduationCap, Info, Pencil, Plus, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { showConfirm } from "@/lib/ui/dialog";
import { ACADEMIC_STYLE, academicKindLabel, academicLevelLabel, fill, fmtDate, type CalendarAcademic, type TFn } from "./shared";

const LEVELS = ["all", "sd", "smp", "sma", "kuliah"] as const;
const KINDS = ["school_holiday", "midterm", "final_exam", "other"] as const;

export interface AcademicDraft {
  id?: string;
  level: string;
  kind: string;
  title: string;
  startDate: string;
  endDate: string;
  note: string;
}

export function draftFrom(a: CalendarAcademic): AcademicDraft {
  return { id: a.id, level: a.level, kind: a.kind, title: a.title, startDate: a.startDate, endDate: a.endDate, note: a.note ?? "" };
}

export function emptyDraft(date: string): AcademicDraft {
  return { level: "all", kind: "school_holiday", title: "", startDate: date, endDate: date, note: "" };
}

/**
 * Tambah/ubah/hapus satu kegiatan akademik (libur sekolah/kuliah, UTS, UAS) untuk outlet ini.
 * Judul boleh kosong — server memberi judul bawaan (mis. "UTS SMP").
 */
export function AcademicDialog({ draft, t, onClose, onSaved }: { draft: AcademicDraft; t: TFn; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState<AcademicDraft>(draft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<AcademicDraft>) => setD((x) => ({ ...x, ...patch }));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(d.id ? `/api/activity-calendar/academic/${encodeURIComponent(d.id)}` : "/api/activity-calendar/academic", {
        method: d.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: d.level, kind: d.kind, title: d.title, startDate: d.startDate, endDate: d.endDate, note: d.note }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!d.id) return;
    if (!(await showConfirm(t("act.acad.deleteConfirm", "Hapus kegiatan akademik ini?")))) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/activity-calendar/academic/${encodeURIComponent(d.id)}`, { method: "DELETE" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const input = "w-full rounded-lg border border-white/10 bg-neutral-900 px-2.5 py-2 text-sm text-neutral-100";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/10 bg-[#0b1020] p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-100">
            <GraduationCap size={18} className="text-amber-300" />
            {d.id ? t("act.acad.editTitle", "Ubah jadwal akademik") : t("act.acad.addTitle", "Tambah jadwal akademik")}
          </h2>
          <button type="button" onClick={onClose} aria-label={t("act.set.cancel", "Batal")} className="rounded-full p-1 text-neutral-500 hover:bg-white/10 hover:text-neutral-200">
            <X size={18} />
          </button>
        </div>
        {error && <p className="mb-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="space-y-1 text-xs text-neutral-400">
              <span>{t("act.acad.level", "Jenjang")}</span>
              <select value={d.level} onChange={(e) => set({ level: e.target.value })} className={input}>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {academicLevelLabel(l, t)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-neutral-400">
              <span>{t("act.acad.kind", "Jenis")}</span>
              <select value={d.kind} onChange={(e) => set({ kind: e.target.value })} className={input}>
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {academicKindLabel(k, t)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-neutral-400">
              <span>{t("act.acad.start", "Mulai")}</span>
              <input type="date" value={d.startDate} onChange={(e) => set({ startDate: e.target.value, endDate: d.endDate < e.target.value ? e.target.value : d.endDate })} className={input} />
            </label>
            <label className="space-y-1 text-xs text-neutral-400">
              <span>{t("act.acad.end", "Selesai")}</span>
              <input type="date" value={d.endDate} min={d.startDate} onChange={(e) => set({ endDate: e.target.value })} className={input} />
            </label>
          </div>
          <label className="block space-y-1 text-xs text-neutral-400">
            <span>{t("act.acad.titleField", "Nama kegiatan (boleh kosong)")}</span>
            <input value={d.title} maxLength={120} onChange={(e) => set({ title: e.target.value })} placeholder={t("act.acad.titlePh", "mis. PTS Ganjil SMP Negeri se-Kota Bandung")} className={input} />
          </label>
          <label className="block space-y-1 text-xs text-neutral-400">
            <span>{t("act.acad.note", "Catatan (opsional)")}</span>
            <textarea value={d.note} maxLength={300} rows={2} onChange={(e) => set({ note: e.target.value })} placeholder={t("act.acad.notePh", "mis. sumber: kalender pendidikan Disdik provinsi")} className={input} />
          </label>
          <p className="flex items-start gap-1.5 text-[11px] text-neutral-500">
            <Info size={12} className="mt-0.5 shrink-0" />
            {t("act.acad.dialogHint", "Isi sesuai kalender pendidikan provinsi/kota outlet Anda atau kampus terdekat. Satu kegiatan paling panjang 120 hari.")}
          </p>
        </div>
        <div className="mt-5 flex items-center justify-between gap-2 border-t border-white/10 pt-4">
          {d.id ? (
            <Button variant="secondary" onClick={remove} disabled={saving}>
              <Trash2 size={14} className="mr-1.5 inline text-rose-300" />
              {t("act.acad.delete", "Hapus")}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              {t("act.set.cancel", "Batal")}
            </Button>
            <Button onClick={save} disabled={saving || !d.startDate || !d.endDate}>
              {saving ? t("act.acad.saving", "Menyimpan…") : t("act.set.save", "Simpan")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ListResponse {
  ready: boolean;
  province: string | null;
  canEdit: boolean;
  items: CalendarAcademic[];
  error?: string;
}

/**
 * Daftar kalender akademik outlet (60 hari lalu s.d. 1 tahun ke depan) + tombol tambah/ubah. Data kalender
 * pendidikan berbeda per provinsi dan kampus, jadi untuk sementara diisi masing-masing outlet.
 */
export function AcademicSection({ t, locale, reloadKey, onEdit, onAdd }: { t: TFn; locale: string; reloadKey: number; onEdit: (a: CalendarAcademic) => void; onAdd: () => void }) {
  const [data, setData] = useState<ListResponse | null>(null);
  const [showPast, setShowPast] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch("/api/activity-calendar/academic", { cache: "no-store" })
      .then((r) => r.json().catch(() => null))
      .then((d) => {
        if (alive && d) setData(d as ListResponse);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [reloadKey]);
  if (!data || !data.ready) return null;
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = data.items.filter((a) => a.endDate >= today);
  const past = data.items.filter((a) => a.endDate < today);
  const list = showPast ? [...past, ...upcoming] : upcoming;
  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-100">
            <GraduationCap size={16} className="text-amber-300" /> {t("act.acad.title", "Kalender akademik outlet")}
          </h3>
          <p className="mt-0.5 text-[11px] text-neutral-500">
            {data.province
              ? fill(t("act.acad.leadProvince", "Libur sekolah/kuliah, UTS, dan UAS untuk SD, SMP, SMA/SMK, dan kuliah di {province}. Kalender pendidikan berbeda tiap provinsi — untuk sementara diisi oleh outlet."), { province: data.province })
              : t("act.acad.lead", "Libur sekolah/kuliah, UTS, dan UAS untuk SD, SMP, SMA/SMK, dan kuliah. Kalender pendidikan berbeda tiap provinsi — untuk sementara diisi oleh outlet.")}
          </p>
        </div>
        {data.canEdit && (
          <Button onClick={onAdd}>
            <Plus size={14} className="mr-1 inline" />
            {t("act.acad.add", "Tambah jadwal akademik")}
          </Button>
        )}
      </div>
      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-neutral-500">
          {data.canEdit ? t("act.acad.emptyEdit", "Belum ada jadwal. Tambahkan libur semester, UTS, dan UAS sekolah/kampus di sekitar outlet supaya hari ramai & sepi terlihat di kalender.") : t("act.acad.empty", "Belum ada jadwal akademik.")}
        </div>
      ) : (
        <div className="divide-y divide-white/5 rounded-xl border border-white/[0.07]">
          {list.map((a) => (
            <div key={a.id} className={clsx("flex flex-wrap items-center gap-2 px-3 py-2 text-xs", a.endDate < today && "opacity-60")}>
              <span className={clsx("shrink-0 rounded-md border px-1.5 py-px text-[10px]", ACADEMIC_STYLE[a.kind] ?? ACADEMIC_STYLE.other)}>{academicKindLabel(a.kind, t)}</span>
              <span className="shrink-0 rounded-md bg-white/5 px-1.5 py-px text-[10px] text-neutral-300">{academicLevelLabel(a.level, t)}</span>
              <span className="min-w-0 flex-1 truncate text-neutral-100">{a.title}</span>
              <span className="shrink-0 text-neutral-400">
                {fmtDate(a.startDate, locale, { day: "numeric", month: "short" })} – {fmtDate(a.endDate, locale, { day: "numeric", month: "short", year: "numeric" })}
              </span>
              {data.canEdit && (
                <button type="button" onClick={() => onEdit(a)} aria-label={t("act.acad.edit", "Ubah")} className="shrink-0 rounded-md p-1 text-neutral-400 hover:bg-white/10 hover:text-neutral-100">
                  <Pencil size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {past.length > 0 && (
        <button type="button" onClick={() => setShowPast((v) => !v)} className="text-[11px] text-neutral-400 underline underline-offset-2 hover:text-neutral-200">
          {showPast ? t("act.acad.hidePast", "Sembunyikan yang sudah lewat") : fill(t("act.acad.showPast", "Tampilkan yang sudah lewat ({n})"), { n: past.length })}
        </button>
      )}
    </Card>
  );
}
