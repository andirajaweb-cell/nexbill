"use client";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { HELP_CATEGORIES, HELP_GROUPS_ORDER, type HelpCategory, type HelpSubsection } from "@/lib/help/content";
import "@/lib/i18n/dict-help";
import "@/lib/i18n/dict-help-content";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { useAuth } from "@/lib/auth/client";
import { fetchJsonObject } from "@/lib/api/fetch-json";
import { showAlert, showConfirm } from "@/lib/ui/dialog";

/** Same editable-fields shape as src/lib/help/overrides.ts (kept in sync manually — this is a
 * thin client type, not imported from the server module to avoid pulling `@/db/client` into the
 * client bundle). */
type EditableHelpFields = Partial<Pick<HelpCategory, "label" | "navHint" | "summary" | "roles" | "steps" | "notes" | "subsections">>;

/** Flattens every searchable string in a category into one lowercase blob, so search matches inside steps/notes/subsections too, not just the label.
 * Deliberately searches the Indonesian source text (content.ts, or a Superuser's edited replacement of it) regardless of active dashboard language — see dict-help-content.ts's header comment for why full-text search across 5 translated languages is out of scope for this pass. */
function searchBlob(c: HelpCategory): string {
  const parts = [c.label, c.summary, c.navHint ?? "", c.roles ?? "", ...(c.steps ?? []), ...(c.notes ?? [])];
  for (const s of c.subsections ?? []) {
    parts.push(s.title, s.navHint ?? "", s.intro ?? "", ...(s.steps ?? []), ...(s.notes ?? []));
  }
  return parts.join(" \n ").toLowerCase();
}

export default function HelpPage() {
  const { t } = useDashboardLang();
  const { user } = useAuth();
  const canEdit = user?.role === "superuser";

  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(HELP_CATEGORIES[0].id);
  const [overrides, setOverrides] = useState<Record<string, EditableHelpFields>>({});
  const [loadingOverrides, setLoadingOverrides] = useState(true);
  const [editing, setEditing] = useState(false);

  const loadOverrides = async () => {
    setLoadingOverrides(true);
    const data = await fetchJsonObject<Record<string, EditableHelpFields>>("/api/help-content");
    setOverrides(data ?? {});
    setLoadingOverrides(false);
  };

  useEffect(() => {
    loadOverrides();
  }, []);

  // Merge each outlet's saved edits on top of the shipped defaults — a category with no override
  // row just renders content.ts as-is. Same merge shape as src/lib/help/overrides.ts's
  // mergeHelpCategories() (kept duplicated client-side since that module also imports the DB
  // client, which must never end up in a browser bundle).
  const categories = useMemo<HelpCategory[]>(
    () => HELP_CATEGORIES.map((c) => (overrides[c.id] ? { ...c, ...overrides[c.id] } : c)),
    [overrides]
  );

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return categories;
    return categories.filter((c) => searchBlob(c).includes(q));
  }, [q, categories]);

  const grouped = useMemo(() => {
    const map = new Map<string, HelpCategory[]>();
    for (const c of filtered) {
      if (!map.has(c.group)) map.set(c.group, []);
      map.get(c.group)!.push(c);
    }
    return HELP_GROUPS_ORDER.map((g) => ({ group: g, items: map.get(g) ?? [] })).filter((g) => g.items.length > 0);
  }, [filtered]);

  const active = categories.find((c) => c.id === activeId) ?? filtered[0] ?? categories[0];
  const hasOverride = !!overrides[active?.id];

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("help.pageTitle", "Bantuan & Panduan")}
        subtitle={t(
          "help.pageSubtitle",
          "Petunjuk penggunaan lengkap untuk setiap fitur NEXBILL — cara pakai langkah demi langkah, hal-hal penting yang perlu diperhatikan, dan siapa yang bisa mengakses apa."
        )}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
        <div className="space-y-3 lg:sticky lg:top-4">
          <input
            className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm"
            placeholder={t("help.searchPlaceholder", 'Cari fitur atau kata kunci... (mis. "deposit", "void", "printer")')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Card className="p-2 max-h-[70vh] overflow-y-auto">
            {grouped.length === 0 && <p className="text-xs text-neutral-500 p-2">{t("help.noResults", "Tidak ada topik yang cocok dengan pencarianmu.")}</p>}
            {grouped.map(({ group, items }) => (
              <div key={group} className="mb-2 last:mb-0">
                <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-neutral-600 font-semibold">
                  {t(`help.content.group.${group}`, group)}
                </div>
                {items.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setActiveId(c.id); setEditing(false); }}
                    className={`w-full text-left rounded-lg px-2 py-1.5 text-sm transition flex items-center justify-between gap-2 ${
                      active?.id === c.id ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "text-neutral-400 border border-transparent hover:bg-white/5 hover:text-neutral-200"
                    }`}
                  >
                    <span>{t(`help.content.${c.id}.label`, c.label)}</span>
                    {overrides[c.id] && <span className="text-[9px] uppercase tracking-wider text-amber-400/80 flex-shrink-0">diedit</span>}
                  </button>
                ))}
              </div>
            ))}
          </Card>
        </div>

        <div className="min-w-0">
          {active && !editing && (
            <HelpArticle
              category={active}
              canEdit={canEdit}
              hasOverride={hasOverride}
              onEdit={() => setEditing(true)}
              onReset={async () => {
                if (!(await showConfirm("Kembalikan topik ini ke versi default (menghapus semua editan)?"))) return;
                const res = await fetch(`/api/help-content/${active.id}`, { method: "DELETE" });
                if (!res.ok) { const d = await res.json(); return showAlert(d.error); }
                await loadOverrides();
              }}
            />
          )}
          {active && editing && (
            <HelpEditor
              category={active}
              onCancel={() => setEditing(false)}
              onSaved={async () => {
                setEditing(false);
                await loadOverrides();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function HelpArticle({
  category: c,
  canEdit,
  hasOverride,
  onEdit,
  onReset,
}: {
  category: HelpCategory;
  canEdit: boolean;
  hasOverride: boolean;
  onEdit: () => void;
  onReset: () => void;
}) {
  const { t } = useDashboardLang();
  // Every string in content.ts is translated via a key generated from the category's stable id
  // + field path (help.content.<id>.<field>[.<index>]) — see dict-help-content.ts. The
  // Indonesian text already written in content.ts (or a Superuser's edited replacement) is
  // always passed as the fallback, so a key with no translation yet for the active language
  // silently falls back to Indonesian instead of ever rendering blank.
  const tc = (key: string, fallback: string) => t(`help.content.${key}`, fallback);

  return (
    <Card className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-neutral-100">{tc(`${c.id}.label`, c.label)}</h2>
          {c.navHint && <p className="text-xs text-amber-400/90 mt-1">{tc(`${c.id}.navHint`, c.navHint)}</p>}
          <p className="text-sm text-neutral-400 mt-2 leading-relaxed">{tc(`${c.id}.summary`, c.summary)}</p>
          {c.roles && (
            <p className="text-xs text-cyan-400/90 mt-2 rounded-lg bg-cyan-500/5 border border-cyan-500/20 px-3 py-2">
              <span className="font-semibold">{t("help.rolesLabel", "Siapa yang bisa akses: ")}</span>
              {tc(`${c.id}.roles`, c.roles)}
            </p>
          )}
        </div>
        {canEdit && (
          <div className="flex-shrink-0 flex flex-col gap-1.5 items-end">
            <Button variant="secondary" className="text-xs px-2.5 py-1.5" onClick={onEdit}>
              Edit Konten
            </Button>
            {hasOverride && (
              <button onClick={onReset} className="text-[11px] text-neutral-500 hover:text-rose-400 hover:underline">
                Kembalikan ke default
              </button>
            )}
          </div>
        )}
      </div>

      {c.steps && c.steps.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-neutral-200 mb-2">{t("help.howToUse", "Cara Pakai")}</h3>
          <ol className="list-decimal list-inside space-y-1.5 text-sm text-neutral-300">
            {c.steps.map((s, i) => (
              <li key={i} className="leading-relaxed">{tc(`${c.id}.step${i}`, s)}</li>
            ))}
          </ol>
        </div>
      )}

      {c.subsections && c.subsections.length > 0 && (
        <div className="space-y-5">
          {c.subsections.map((sub, si) => (
            <div key={si} className="rounded-lg border border-neutral-800 p-3.5">
              <h3 className="text-sm font-medium text-neutral-200 mb-1.5">{tc(`${c.id}.sub${si}.title`, sub.title)}</h3>
              {sub.navHint && <p className="text-xs text-amber-400/90 mb-1.5">{tc(`${c.id}.sub${si}.navHint`, sub.navHint)}</p>}
              {sub.intro && <p className="text-xs text-neutral-500 mb-2">{tc(`${c.id}.sub${si}.intro`, sub.intro)}</p>}
              {sub.steps && sub.steps.length > 0 && (
                <ol className="list-decimal list-inside space-y-1.5 text-sm text-neutral-300">
                  {sub.steps.map((s, j) => (
                    <li key={j} className="leading-relaxed">{tc(`${c.id}.sub${si}.step${j}`, s)}</li>
                  ))}
                </ol>
              )}
              {sub.notes && sub.notes.length > 0 && (
                <ul className="list-disc list-inside space-y-1 text-xs text-amber-300/80 mt-2">
                  {sub.notes.map((n, j) => (
                    <li key={j} className="leading-relaxed">{tc(`${c.id}.sub${si}.note${j}`, n)}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {c.notes && c.notes.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-neutral-200 mb-2">{t("help.notesHeading", "Hal Penting & Catatan")}</h3>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-amber-300/80">
            {c.notes.map((n, i) => (
              <li key={i} className="leading-relaxed">{tc(`${c.id}.note${i}`, n)}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

const editInputCls = "w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm";
const editLabelCls = "text-xs font-medium text-neutral-400 mb-1 block";

/** Multi-line steps/notes are edited as one item per line in a plain textarea — much faster to
 * type/paste for a Superuser than N separate single-line inputs with add/remove buttons, and
 * matches how the content already reads in content.ts (one string per bullet/step). Blank lines
 * are dropped on save. */
function linesToArray(text: string): string[] {
  return text.split("\n").map((s) => s.trim()).filter(Boolean);
}

/** Editable draft of a subsection — mirrors HelpSubsection but keeps steps/notes as raw textarea
 * text while the form is open, converted back to string[] only on save. */
interface SubsectionDraft {
  title: string;
  navHint: string;
  intro: string;
  stepsText: string;
  notesText: string;
}

function subsectionToDraft(s: HelpSubsection): SubsectionDraft {
  return {
    title: s.title,
    navHint: s.navHint ?? "",
    intro: s.intro ?? "",
    stepsText: (s.steps ?? []).join("\n"),
    notesText: (s.notes ?? []).join("\n"),
  };
}

function draftToSubsection(d: SubsectionDraft): HelpSubsection {
  const out: HelpSubsection = { title: d.title.trim() || "(Tanpa judul)" };
  if (d.navHint.trim()) out.navHint = d.navHint.trim();
  if (d.intro.trim()) out.intro = d.intro.trim();
  const steps = linesToArray(d.stepsText);
  const notes = linesToArray(d.notesText);
  if (steps.length) out.steps = steps;
  if (notes.length) out.notes = notes;
  return out;
}

function HelpEditor({ category: c, onCancel, onSaved }: { category: HelpCategory; onCancel: () => void; onSaved: () => void }) {
  const [label, setLabel] = useState(c.label);
  const [navHint, setNavHint] = useState(c.navHint ?? "");
  const [summary, setSummary] = useState(c.summary);
  const [roles, setRoles] = useState(c.roles ?? "");
  const [stepsText, setStepsText] = useState((c.steps ?? []).join("\n"));
  const [notesText, setNotesText] = useState((c.notes ?? []).join("\n"));
  const [subsections, setSubsections] = useState<SubsectionDraft[]>((c.subsections ?? []).map(subsectionToDraft));
  const [saving, setSaving] = useState(false);

  const addSubsection = () => setSubsections((prev) => [...prev, { title: "", navHint: "", intro: "", stepsText: "", notesText: "" }]);
  const removeSubsection = (i: number) => setSubsections((prev) => prev.filter((_, idx) => idx !== i));
  const updateSubsection = (i: number, patch: Partial<SubsectionDraft>) =>
    setSubsections((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const save = async () => {
    setSaving(true);
    const body: Record<string, unknown> = {
      label: label.trim() || c.label,
      summary: summary.trim() || c.summary,
    };
    body.navHint = navHint.trim() || undefined;
    body.roles = roles.trim() || undefined;
    const steps = linesToArray(stepsText);
    const notes = linesToArray(notesText);
    body.steps = steps.length ? steps : undefined;
    body.notes = notes.length ? notes : undefined;
    body.subsections = subsections.length ? subsections.map(draftToSubsection) : undefined;

    const res = await fetch(`/api/help-content/${c.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    onSaved();
  };

  return (
    <Card className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-100">Edit Topik: {c.label}</h2>
        <div className="flex gap-2">
          <Button variant="ghost" className="text-xs px-2.5 py-1.5" onClick={onCancel} disabled={saving}>Batal</Button>
          <Button className="text-xs px-2.5 py-1.5" onClick={save} disabled={saving}>{saving ? "Menyimpan..." : "Simpan Perubahan"}</Button>
        </div>
      </div>

      <div>
        <label className={editLabelCls}>Judul Topik</label>
        <input className={editInputCls} value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>
      <div>
        <label className={editLabelCls}>Petunjuk lokasi menu (opsional, tampil sebagai catatan kuning di atas ringkasan)</label>
        <input className={editInputCls} value={navHint} onChange={(e) => setNavHint(e.target.value)} />
      </div>
      <div>
        <label className={editLabelCls}>Ringkasan</label>
        <textarea className={editInputCls} rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
      </div>
      <div>
        <label className={editLabelCls}>Siapa yang bisa akses (opsional)</label>
        <input className={editInputCls} value={roles} onChange={(e) => setRoles(e.target.value)} />
      </div>
      <div>
        <label className={editLabelCls}>Cara Pakai — satu langkah per baris</label>
        <textarea className={editInputCls} rows={6} value={stepsText} onChange={(e) => setStepsText(e.target.value)} placeholder={"Langkah 1...\nLangkah 2...\nLangkah 3..."} />
      </div>
      <div>
        <label className={editLabelCls}>Hal Penting & Catatan — satu catatan per baris</label>
        <textarea className={editInputCls} rows={5} value={notesText} onChange={(e) => setNotesText(e.target.value)} placeholder={"Catatan 1...\nCatatan 2..."} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-neutral-200">Sub-bagian</label>
          <Button variant="secondary" className="text-xs px-2.5 py-1.5" onClick={addSubsection}>+ Tambah Sub-bagian</Button>
        </div>
        {subsections.length === 0 && <p className="text-xs text-neutral-500">Belum ada sub-bagian.</p>}
        {subsections.map((s, i) => (
          <div key={i} className="rounded-lg border border-neutral-800 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <input
                className={`${editInputCls} font-medium`}
                placeholder="Judul sub-bagian"
                value={s.title}
                onChange={(e) => updateSubsection(i, { title: e.target.value })}
              />
              <button onClick={() => removeSubsection(i)} className="text-xs text-rose-400 hover:underline flex-shrink-0 px-1">Hapus</button>
            </div>
            <input
              className={editInputCls}
              placeholder="Petunjuk lokasi menu (opsional)"
              value={s.navHint}
              onChange={(e) => updateSubsection(i, { navHint: e.target.value })}
            />
            <textarea
              className={editInputCls}
              rows={2}
              placeholder="Kalimat pembuka sub-bagian (opsional)"
              value={s.intro}
              onChange={(e) => updateSubsection(i, { intro: e.target.value })}
            />
            <textarea
              className={editInputCls}
              rows={4}
              placeholder={"Langkah — satu per baris"}
              value={s.stepsText}
              onChange={(e) => updateSubsection(i, { stepsText: e.target.value })}
            />
            <textarea
              className={editInputCls}
              rows={3}
              placeholder={"Catatan — satu per baris"}
              value={s.notesText}
              onChange={(e) => updateSubsection(i, { notesText: e.target.value })}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
        <Button variant="ghost" className="text-xs px-2.5 py-1.5" onClick={onCancel} disabled={saving}>Batal</Button>
        <Button className="text-xs px-2.5 py-1.5" onClick={save} disabled={saving}>{saving ? "Menyimpan..." : "Simpan Perubahan"}</Button>
      </div>
    </Card>
  );
}
