"use client";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card } from "@/components/ui/Card";
import { HELP_CATEGORIES, HELP_GROUPS_ORDER, type HelpCategory } from "@/lib/help/content";
import "@/lib/i18n/dict-help";
import "@/lib/i18n/dict-help-content";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";

/** Flattens every searchable string in a category into one lowercase blob, so search matches inside steps/notes/subsections too, not just the label.
 * Deliberately searches the Indonesian source text (content.ts) regardless of active dashboard language — see dict-help-content.ts's header comment for why full-text search across 5 translated languages is out of scope for this pass. */
function searchBlob(c: HelpCategory): string {
  const parts = [c.label, c.summary, c.navHint ?? "", c.roles ?? "", ...(c.steps ?? []), ...(c.notes ?? [])];
  for (const s of c.subsections ?? []) {
    parts.push(s.title, s.navHint ?? "", s.intro ?? "", ...(s.steps ?? []), ...(s.notes ?? []));
  }
  return parts.join(" \n ").toLowerCase();
}

export default function HelpPage() {
  const { t } = useDashboardLang();
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(HELP_CATEGORIES[0].id);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return HELP_CATEGORIES;
    return HELP_CATEGORIES.filter((c) => searchBlob(c).includes(q));
  }, [q]);

  const grouped = useMemo(() => {
    const map = new Map<string, HelpCategory[]>();
    for (const c of filtered) {
      if (!map.has(c.group)) map.set(c.group, []);
      map.get(c.group)!.push(c);
    }
    return HELP_GROUPS_ORDER.map((g) => ({ group: g, items: map.get(g) ?? [] })).filter((g) => g.items.length > 0);
  }, [filtered]);

  const active = HELP_CATEGORIES.find((c) => c.id === activeId) ?? filtered[0] ?? HELP_CATEGORIES[0];

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
                    onClick={() => setActiveId(c.id)}
                    className={`w-full text-left rounded-lg px-2 py-1.5 text-sm transition ${
                      active?.id === c.id ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "text-neutral-400 border border-transparent hover:bg-white/5 hover:text-neutral-200"
                    }`}
                  >
                    {t(`help.content.${c.id}.label`, c.label)}
                  </button>
                ))}
              </div>
            ))}
          </Card>
        </div>

        <div className="min-w-0">{active && <HelpArticle category={active} />}</div>
      </div>
    </div>
  );
}

function HelpArticle({ category: c }: { category: HelpCategory }) {
  const { t } = useDashboardLang();
  // Every string in content.ts is translated via a key generated from the category's stable id
  // + field path (help.content.<id>.<field>[.<index>]) — see dict-help-content.ts. The
  // Indonesian text already written in content.ts is always passed as the fallback, so a
  // key with no translation yet for the active language silently falls back to Indonesian
  // (or to registry.id if that's registered) instead of ever rendering blank.
  const tc = (key: string, fallback: string) => t(`help.content.${key}`, fallback);

  return (
    <Card className="space-y-5">
      <div>
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
