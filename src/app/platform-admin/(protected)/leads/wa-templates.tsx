"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { LEAD_STATUS_LABEL, type LeadStatus } from "@/lib/leads/constants";
import { BOT_STATE_LABEL, type BotState } from "@/lib/leads/wa-bot-rules";
import {
  DEFAULT_WA_TEMPLATES,
  SAMPLE_LEAD,
  WA_BODY_MAX,
  WA_ELEMENT_INFO,
  WA_PLACEHOLDERS,
  WA_STAGE_LABEL,
  WA_TEMPLATE_ELEMENTS,
  WA_TEMPLATE_STAGES,
  WA_TITLE_MAX,
  missingLeadFields,
  renderWaTemplate,
  templatesForStage,
  unknownPlaceholders,
  waMeLink,
  type WaLeadContext,
  type WaTemplateElement,
  type WaTemplateStage,
} from "@/lib/leads/wa-template";

/*
 * Template WA per tahap pipeline CRM:
 *  - WaTemplatesTab : kelola template (tambah, edit, duplikat, aktif/nonaktif, hapus, pasang bawaan).
 *  - WaComposer     : dipanggil dari detail lead — pilih template sesuai tahap lead, sunting, buka
 *                     WhatsApp, lalu aktivitas "WhatsApp" tercatat otomatis.
 */

export interface WaTemplate {
  id: string;
  stage: WaTemplateStage;
  element: WaTemplateElement;
  title: string;
  body: string;
  sortOrder: number;
  isActive: boolean;
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
}

const inputCls = "w-full rounded-lg bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm";

const ELEMENT_COLOR: Record<WaTemplateElement, string> = {
  pembuka: "text-sky-300 border-sky-400/30 bg-sky-500/10",
  masalah: "text-rose-300 border-rose-400/30 bg-rose-500/10",
  solusi: "text-emerald-300 border-emerald-400/30 bg-emerald-500/10",
  kemudahan: "text-cyan-300 border-cyan-400/30 bg-cyan-500/10",
  kelengkapan: "text-violet-300 border-violet-400/30 bg-violet-500/10",
  bukti: "text-amber-300 border-amber-400/30 bg-amber-500/10",
  penawaran: "text-fuchsia-300 border-fuchsia-400/30 bg-fuchsia-500/10",
  follow_up: "text-orange-300 border-orange-400/30 bg-orange-500/10",
  penutup: "text-neutral-300 border-white/15 bg-white/5",
};

function ElementBadge({ element }: { element: WaTemplateElement }) {
  return (
    <span className={clsx("inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap", ELEMENT_COLOR[element])}>
      {WA_ELEMENT_INFO[element]?.label ?? element}
    </span>
  );
}

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `Gagal (${res.status})`);
  return data;
}

function useWaTemplates() {
  const [templates, setTemplates] = useState<WaTemplate[]>([]);
  const [adminName, setAdminName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const d = await send("/api/platform-admin/wa-templates", "GET");
      setTemplates(d.templates ?? []);
      setAdminName(d.adminName ?? "");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return { templates, adminName, loading, error, reload: load };
}

/** Tampilan teks ala gelembung WhatsApp: *tebal*, _miring_, ~coret~ dirender sederhana. */
function WaBubble({ text }: { text: string }) {
  const parts = useMemo(() => {
    const out: React.ReactNode[] = [];
    const re = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g;
    let last = 0;
    let i = 0;
    for (const m of text.matchAll(re)) {
      const idx = m.index ?? 0;
      if (idx > last) out.push(text.slice(last, idx));
      const tok = m[0];
      const inner = tok.slice(1, -1);
      if (tok.startsWith("*")) out.push(<strong key={i++}>{inner}</strong>);
      else if (tok.startsWith("_")) out.push(<em key={i++}>{inner}</em>);
      else out.push(<s key={i++}>{inner}</s>);
      last = idx + tok.length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  }, [text]);
  return (
    <div className="rounded-xl rounded-tr-sm bg-[#0b3d2e] px-3 py-2 text-[13px] leading-relaxed text-emerald-50 whitespace-pre-wrap [overflow-wrap:anywhere] shadow">
      {parts}
    </div>
  );
}

/* =================================================================== KELOLA TEMPLATE =================================================================== */

type Draft = { id?: string; stage: WaTemplateStage; element: WaTemplateElement; title: string; body: string; sortOrder: string; isActive: boolean };
const emptyDraft = (stage: WaTemplateStage = "baru"): Draft => ({ stage, element: "pembuka", title: "", body: "", sortOrder: "0", isActive: true });

export function WaTemplatesTab() {
  const { templates, adminName, loading, error, reload } = useWaTemplates();
  const [stageFilter, setStageFilter] = useState<WaTemplateStage | "semua">("semua");
  const [elementFilter, setElementFilter] = useState<WaTemplateElement | "">("");
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = templates.filter(
    (t) =>
      (stageFilter === "semua" || t.stage === stageFilter) &&
      (!elementFilter || t.element === elementFilter) &&
      (!q.trim() || `${t.title} ${t.body}`.toLowerCase().includes(q.trim().toLowerCase()))
  );
  const groups = WA_TEMPLATE_STAGES.map((s) => ({ stage: s, items: filtered.filter((t) => t.stage === s) })).filter((g) => g.items.length > 0);
  const countByStage = (s: WaTemplateStage) => templates.filter((t) => t.stage === s).length;

  const seed = async () => {
    setSeeding(true);
    try {
      const r = await send("/api/platform-admin/wa-templates/seed", "POST");
      await reload();
      await showAlert(r.inserted > 0 ? `${r.inserted} template bawaan ditambahkan.` : "Semua template bawaan sudah ada — tidak ada yang ditambahkan.");
    } catch (e) {
      await showAlert(e instanceof Error ? e.message : String(e));
    } finally {
      setSeeding(false);
    }
  };

  const toggleActive = async (t: WaTemplate) => {
    try {
      await send(`/api/platform-admin/wa-templates/${t.id}`, "PATCH", { isActive: !t.isActive });
      await reload();
    } catch (e) {
      await showAlert(e instanceof Error ? e.message : String(e));
    }
  };

  const remove = async (t: WaTemplate) => {
    if (!(await showConfirm(`Hapus template "${t.title}"? Tindakan ini tidak bisa dibatalkan.`, { tone: "danger", confirmLabel: "Hapus" }))) return;
    try {
      await send(`/api/platform-admin/wa-templates/${t.id}`, "DELETE");
      await reload();
    } catch (e) {
      await showAlert(e instanceof Error ? e.message : String(e));
    }
  };

  const edit = (t: WaTemplate) => setDraft({ id: t.id, stage: t.stage, element: t.element, title: t.title, body: t.body, sortOrder: String(t.sortOrder), isActive: t.isActive });
  const duplicate = (t: WaTemplate) =>
    setDraft({ stage: t.stage, element: t.element, title: `${t.title} (salinan)`.slice(0, WA_TITLE_MAX), body: t.body, sortOrder: String(t.sortOrder + 1), isActive: true });

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="gm-heading font-semibold">Template WhatsApp per Tahap</h2>
            <p className="text-xs text-neutral-500 mt-0.5 max-w-2xl">
              Siapkan pesan untuk tiap tahap pipeline dengan unsur berbeda — permasalahan, solusi, kemudahan, kelengkapan, bukti, penawaran, follow up. Saat membuka detail lead, template yang cocok dengan tahapnya muncul otomatis dan terisi data lead.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" className="text-xs" onClick={seed} disabled={seeding}>
              {seeding ? "Memasang..." : "Tambahkan template bawaan"}
            </Button>
            <Button className="text-xs" onClick={() => setDraft(emptyDraft(stageFilter === "semua" ? "baru" : stageFilter))}>
              + Tambah Template
            </Button>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {(["semua", ...WA_TEMPLATE_STAGES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStageFilter(s)}
              className={clsx(
                "shrink-0 rounded-full border px-3 py-1 text-xs transition whitespace-nowrap",
                stageFilter === s ? "border-amber-400/50 bg-amber-500/15 text-amber-200" : "border-white/10 text-neutral-400 hover:text-neutral-200"
              )}
            >
              {s === "semua" ? `Semua (${templates.length})` : `${WA_STAGE_LABEL[s]} (${countByStage(s)})`}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select className={inputCls} value={elementFilter} onChange={(e) => setElementFilter(e.target.value as WaTemplateElement | "")}>
            <option value="">Semua unsur</option>
            {WA_TEMPLATE_ELEMENTS.map((el) => (
              <option key={el} value={el}>{WA_ELEMENT_INFO[el].label}</option>
            ))}
          </select>
          <input className={inputCls} placeholder="Cari judul atau isi pesan..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </Card>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      {loading ? (
        <p className="text-sm text-neutral-500">Memuat template...</p>
      ) : templates.length === 0 ? (
        <Card className="text-center py-10 space-y-3">
          <p className="text-sm text-neutral-400">Belum ada template WA.</p>
          <p className="text-xs text-neutral-500">Mulai dari {DEFAULT_WA_TEMPLATES.length} template bawaan untuk semua tahap (bisa diedit/dihapus), atau buat sendiri.</p>
          <div className="flex justify-center gap-2 flex-wrap">
            <Button onClick={seed} disabled={seeding}>{seeding ? "Memasang..." : "Tambahkan template bawaan"}</Button>
            <Button variant="secondary" onClick={() => setDraft(emptyDraft())}>Buat sendiri</Button>
          </div>
        </Card>
      ) : groups.length === 0 ? (
        <p className="text-sm text-neutral-500">Tidak ada template yang cocok dengan filter.</p>
      ) : (
        groups.map((g) => (
          <section key={g.stage} className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
              {WA_STAGE_LABEL[g.stage]} <span className="text-neutral-600">· {g.items.length}</span>
            </h3>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {g.items.map((t) => {
                const open = expanded.has(t.id);
                return (
                  <Card key={t.id} className={clsx("space-y-2", !t.isActive && "opacity-60")}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <ElementBadge element={t.element} />
                          {!t.isActive && <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-neutral-500">Nonaktif</span>}
                          <span className="text-[10px] text-neutral-600">dipakai {t.usageCount}×</span>
                        </div>
                        <div className="text-sm font-medium text-neutral-100">{t.title}</div>
                      </div>
                      <span className="text-[10px] text-neutral-600 shrink-0">#{t.sortOrder}</span>
                    </div>
                    <div className={clsx(!open && "max-h-40 overflow-hidden [mask-image:linear-gradient(to_bottom,black_70%,transparent)]")}>
                      <WaBubble text={renderWaTemplate(t.body, SAMPLE_LEAD, adminName)} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <button
                        className="text-neutral-500 hover:text-neutral-200"
                        onClick={() =>
                          setExpanded((s) => {
                            const n = new Set(s);
                            if (n.has(t.id)) n.delete(t.id);
                            else n.add(t.id);
                            return n;
                          })
                        }
                      >
                        {open ? "Ringkas" : "Lihat penuh"}
                      </button>
                      <span className="flex-1" />
                      <button className="text-amber-300 hover:underline" onClick={() => edit(t)}>Edit</button>
                      <button className="text-cyan-300 hover:underline" onClick={() => duplicate(t)}>Duplikat</button>
                      <button className="text-neutral-400 hover:underline" onClick={() => toggleActive(t)}>{t.isActive ? "Nonaktifkan" : "Aktifkan"}</button>
                      <button className="text-rose-400 hover:underline" onClick={() => remove(t)}>Hapus</button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        ))
      )}

      {draft && (
        <TemplateEditor
          draft={draft}
          adminName={adminName}
          onClose={() => setDraft(null)}
          onSaved={async () => {
            setDraft(null);
            await reload();
          }}
        />
      )}
    </div>
  );
}

function TemplateEditor({ draft: initial, adminName, onClose, onSaved }: { draft: Draft; adminName: string; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const unknown = unknownPlaceholders(d.body);

  const insert = (token: string) => {
    const el = bodyRef.current;
    const start = el?.selectionStart ?? d.body.length;
    const end = el?.selectionEnd ?? d.body.length;
    const next = d.body.slice(0, start) + token + d.body.slice(end);
    setD({ ...d, body: next });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = { stage: d.stage, element: d.element, title: d.title, body: d.body, sortOrder: Number(d.sortOrder) || 0, isActive: d.isActive };
      if (d.id) await send(`/api/platform-admin/wa-templates/${d.id}`, "PATCH", payload);
      else await send("/api/platform-admin/wa-templates", "POST", payload);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <Card className="p-4 sm:p-5 space-y-4 rounded-b-none sm:rounded-b-2xl">
          <div className="flex items-center justify-between gap-2">
            <h2 className="gm-heading font-semibold">{d.id ? "Edit Template WA" : "Tambah Template WA"}</h2>
            <Button variant="ghost" onClick={onClose}>Tutup</Button>
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-neutral-500">Tahap</label>
                  <select className={inputCls} value={d.stage} onChange={(e) => setD({ ...d, stage: e.target.value as WaTemplateStage })}>
                    {WA_TEMPLATE_STAGES.map((s) => <option key={s} value={s}>{WA_STAGE_LABEL[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-neutral-500">Unsur pesan</label>
                  <select className={inputCls} value={d.element} onChange={(e) => setD({ ...d, element: e.target.value as WaTemplateElement })}>
                    {WA_TEMPLATE_ELEMENTS.map((el) => <option key={el} value={el}>{WA_ELEMENT_INFO[el].label}</option>)}
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-neutral-500 -mt-1">{WA_ELEMENT_INFO[d.element].hint}</p>

              <div className="grid grid-cols-[1fr_5.5rem] gap-2">
                <div>
                  <label className="text-xs text-neutral-500">Judul</label>
                  <input className={inputCls} maxLength={WA_TITLE_MAX} value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="mis. Angkat masalah selisih kas" />
                </div>
                <div>
                  <label className="text-xs text-neutral-500">Urutan</label>
                  <input className={inputCls} type="number" min={0} inputMode="numeric" value={d.sortOrder} onChange={(e) => setD({ ...d, sortOrder: e.target.value })} />
                </div>
              </div>

              <div>
                <div className="flex items-end justify-between gap-2">
                  <label className="text-xs text-neutral-500">Isi pesan</label>
                  <span className={clsx("text-[10px]", d.body.length > WA_BODY_MAX ? "text-rose-400" : "text-neutral-600")}>{d.body.length}/{WA_BODY_MAX}</span>
                </div>
                <textarea
                  ref={bodyRef}
                  className={clsx(inputCls, "font-mono text-[13px] leading-relaxed")}
                  rows={10}
                  value={d.body}
                  onChange={(e) => setD({ ...d, body: e.target.value })}
                  placeholder={"Halo {sapaan}, saya {nama_admin} dari NEXBILL..."}
                />
                <p className="text-[11px] text-neutral-500 mt-1">Format WhatsApp: *tebal*, _miring_, ~coret~. Klik placeholder di bawah untuk menyisipkan di posisi kursor.</p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {WA_PLACEHOLDERS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => insert(`{${p.key}}`)}
                    title={`${p.label} — jika kosong: "${p.fallback}"`}
                    className="rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] text-neutral-300 hover:border-amber-400/40 hover:text-amber-200"
                  >
                    {`{${p.key}}`}
                  </button>
                ))}
              </div>
              {unknown.length > 0 && (
                <p className="text-xs text-rose-400">Placeholder tidak dikenal: {unknown.map((k) => `{${k}}`).join(", ")} — perbaiki sebelum menyimpan.</p>
              )}

              <label className="flex items-center gap-2 text-sm text-neutral-300">
                <input type="checkbox" checked={d.isActive} onChange={(e) => setD({ ...d, isActive: e.target.checked })} />
                Aktif (muncul di pilihan saat mengirim WA)
              </label>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-neutral-500">
                Pratinjau dengan contoh lead <span className="text-neutral-400">&quot;{SAMPLE_LEAD.name}&quot;</span>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#0b141a] p-3 min-h-40">
                {d.body.trim() ? <WaBubble text={renderWaTemplate(d.body, SAMPLE_LEAD, adminName)} /> : <p className="text-xs text-neutral-600">Isi pesan untuk melihat pratinjau.</p>}
              </div>
              <div className="text-[11px] text-neutral-500">
                Jika data lead kosong, placeholder memakai kalimat cadangan — misalnya {"{sapaan}"} menjadi &quot;Kak&quot; dan {"{jumlah_unit}"} menjadi &quot;beberapa unit&quot;.
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-white/10 pt-3">
            <Button variant="secondary" onClick={onClose} disabled={busy}>Batal</Button>
            <Button onClick={save} disabled={busy || !d.title.trim() || !d.body.trim() || unknown.length > 0 || d.body.length > WA_BODY_MAX}>
              {busy ? "Menyimpan..." : "Simpan Template"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* =================================================================== KIRIM WA DARI LEAD =================================================================== */

export function WaComposer({
  leadId,
  lead,
  status,
  waNumber,
  onClose,
  onSent,
}: {
  leadId: string;
  lead: WaLeadContext;
  status: LeadStatus;
  waNumber: string | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const { templates, adminName, loading, error } = useWaTemplates();
  const [botState, setBotState] = useState<BotState | null>(null);
  useEffect(() => {
    fetch("/api/platform-admin/wa-bot", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setBotState(d?.state ?? "belum_pernah"))
      .catch(() => setBotState("belum_pernah"));
  }, []);
  const [semuaTahap, setSemuaTahap] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const cocok = templatesForStage(templates, status);
  const daftar = semuaTahap ? templates.filter((t) => t.isActive) : cocok;
  const selected = templates.find((t) => t.id === selectedId) ?? null;
  const kurang = selected ? missingLeadFields(selected.body, lead, adminName) : [];

  // Pilih otomatis template pertama yang cocok dengan tahap lead.
  useEffect(() => {
    if (loading || selectedId !== null) return; // "" = admin memilih pesan bebas — jangan ditimpa
    const first = templatesForStage(templates, status)[0];
    if (first) {
      setSelectedId(first.id);
      setText(renderWaTemplate(first.body, lead, adminName));
    }
  }, [loading, templates, status, selectedId, lead, adminName]);

  const pilih = (t: WaTemplate | null) => {
    setSelectedId(t?.id ?? "");
    setText(t ? renderWaTemplate(t.body, lead, adminName) : "");
  };

  const kirim = async () => {
    if (!waNumber || !text.trim()) return;
    // Buka WhatsApp lebih dulu (masih di dalam klik) supaya tidak diblokir pemblokir pop-up.
    window.open(waMeLink(waNumber, text), "_blank", "noopener,noreferrer");
    setBusy(true);
    try {
      const ringkas = selected
        ? `Kirim WA — template "${selected.title}" (${WA_STAGE_LABEL[selected.stage]} · ${WA_ELEMENT_INFO[selected.element].label})`
        : "Kirim WA — pesan bebas";
      await send(`/api/platform-admin/leads/${leadId}/activities`, "POST", { type: "whatsapp", content: ringkas });
      if (selected) await send(`/api/platform-admin/wa-templates/${selected.id}/used`, "POST").catch(() => null);
      onSent();
      onClose();
    } catch (e) {
      await showAlert(`WhatsApp sudah dibuka, tapi aktivitas gagal dicatat: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  /** Antrekan ke bot NEXBILL — aktivitas lead dicatat oleh bot saat pesan benar-benar terkirim. */
  const kirimViaBot = async () => {
    if (!waNumber || !text.trim()) return;
    if (botState !== "online") {
      const lanjut = await showConfirm(
        `Bot WhatsApp sedang ${botState ? BOT_STATE_LABEL[botState].toLowerCase() : "tidak diketahui"}. Pesan akan menunggu di antrean dan baru terkirim saat bot aktif. Tetap antrekan?`,
        { confirmLabel: "Antrekan" }
      );
      if (!lanjut) return;
    }
    setBusy(true);
    try {
      await send(`/api/platform-admin/leads/${leadId}/wa-send`, "POST", { body: text, templateId: selected?.id ?? null });
      onSent();
      onClose();
      await showAlert(
        botState === "online"
          ? "Pesan masuk antrean bot dan akan terkirim dalam beberapa detik. Riwayat lead diperbarui setelah terkirim."
          : "Pesan masuk antrean. Terkirim otomatis saat bot aktif — pantau di Platform Admin › WhatsApp Bot."
      );
    } catch (e) {
      await showAlert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const salin = async () => {
    try {
      await navigator.clipboard.writeText(text);
      await showAlert("Teks pesan disalin.");
    } catch {
      await showAlert("Gagal menyalin — pilih teksnya lalu salin manual.");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <Card className="p-4 sm:p-5 space-y-4 rounded-b-none sm:rounded-b-2xl">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="gm-heading font-semibold">Kirim WhatsApp</h2>
              <p className="text-xs text-neutral-500">
                {lead.name} · tahap <span className="text-neutral-300">{LEAD_STATUS_LABEL[status]}</span>
                {waNumber ? ` · +${waNumber}` : ""}
              </p>
            </div>
            <Button variant="ghost" onClick={onClose}>Tutup</Button>
          </div>

          {!waNumber && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              Lead ini belum punya nomor WhatsApp yang valid. Isi nomor telepon (format 08xx/628xx) di detail lead, atau salin teks lalu kirim manual.
            </p>
          )}
          {error && <p className="text-xs text-rose-400">{error}</p>}

          <div className="grid grid-cols-1 lg:grid-cols-[18rem_1fr] gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-neutral-500">{semuaTahap ? "Semua template aktif" : `Cocok untuk tahap ini (${cocok.length})`}</span>
                <button className="text-[11px] text-amber-300 hover:underline" onClick={() => setSemuaTahap((v) => !v)}>
                  {semuaTahap ? "Hanya tahap ini" : "Tampilkan semua"}
                </button>
              </div>
              <div className="space-y-1 max-h-60 lg:max-h-[26rem] overflow-y-auto pr-1">
                {loading ? (
                  <p className="text-xs text-neutral-500">Memuat...</p>
                ) : daftar.length === 0 ? (
                  <p className="text-xs text-neutral-500">
                    Belum ada template untuk tahap ini. Tambahkan di tab <span className="text-neutral-300">Template WA</span>, atau tulis pesan bebas.
                  </p>
                ) : (
                  daftar.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => pilih(t)}
                      className={clsx(
                        "w-full rounded-lg border px-3 py-2 text-left transition",
                        selectedId === t.id ? "border-emerald-400/50 bg-emerald-500/10" : "border-white/10 hover:bg-white/5"
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <ElementBadge element={t.element} />
                        {semuaTahap && <span className="text-[10px] text-neutral-500">{WA_STAGE_LABEL[t.stage]}</span>}
                      </div>
                      <div className="mt-1 text-sm text-neutral-200">{t.title}</div>
                    </button>
                  ))
                )}
                <button
                  onClick={() => pilih(null)}
                  className={clsx(
                    "w-full rounded-lg border border-dashed px-3 py-2 text-left text-sm transition",
                    selectedId === "" ? "border-emerald-400/50 text-emerald-200" : "border-white/10 text-neutral-400 hover:bg-white/5"
                  )}
                >
                  Tulis pesan bebas
                </button>
              </div>
            </div>

            <div className="space-y-2 min-w-0">
              {kurang.length > 0 && (
                <p className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-[11px] text-sky-200">
                  Data lead belum lengkap ({kurang.join(", ")}) — pesan memakai kalimat cadangan. Periksa teks sebelum mengirim, atau lengkapi dulu di detail lead.
                </p>
              )}
              <textarea className={clsx(inputCls, "leading-relaxed")} rows={9} value={text} onChange={(e) => setText(e.target.value)} placeholder="Tulis pesan..." />
              <div className="rounded-xl border border-white/10 bg-[#0b141a] p-3">
                {text.trim() ? <WaBubble text={text} /> : <p className="text-xs text-neutral-600">Pratinjau pesan muncul di sini.</p>}
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" onClick={salin} disabled={!text.trim()}>Salin Teks</Button>
                <Button variant="secondary" onClick={kirim} disabled={busy || !waNumber || !text.trim()} title="Buka WhatsApp di perangkat ini dan kirim sendiri">
                  Buka WhatsApp Manual
                </Button>
                <Button onClick={kirimViaBot} disabled={busy || !waNumber || !text.trim()}>
                  {busy ? "Memproses..." : "Kirim via Bot NEXBILL"}
                </Button>
              </div>
              <p className="text-[11px] text-neutral-500 text-right">
                Bot:{" "}
                <span className={botState === "online" ? "text-emerald-300" : "text-amber-300"}>{botState ? BOT_STATE_LABEL[botState] : "memeriksa..."}</span>
                {" · "}Kedua cara mencatat aktivitas &quot;WhatsApp&quot; di riwayat lead.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
