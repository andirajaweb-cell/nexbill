/**
 * Basis pengetahuan bot support 24 jam (Customer Service dashboard & Telegram), sesuai tabel
 * "Basis pengetahuan & batas bot" di dokumen kerangka:
 *  1. Panduan Bantuan dashboard (6 bahasa)      → tool buka_panduan (lib/help/content)
 *  2. Panduan NEXBILL TV & Kontrol Perangkat     → teks halaman Kontrol Perangkat (kamus devices.*)
 *  3. android-tv/RISIKO.md & README (catatan rilis) → kendala yang sudah diketahui + solusinya
 *  4. Status akun merchant                      → tool status_akun (support-service)
 *  5. Jawaban tim dari tiket selesai            → tabel support_kb_answers (kurasi mingguan)
 *     + Jawaban Bot bawaan (starter-answers.ts: instalasi, pemakaian, masalah umum)
 * Sumber 2, 3, 5 dicari lewat tool cari_pengetahuan (searchChunks).
 *
 * File .md dibaca dari disk saat runtime; next.config.ts (outputFileTracingIncludes) memastikan
 * file itu ikut ter-deploy ke fungsi Vercel yang memakainya.
 */
import { readFile } from "fs/promises";
import path from "path";
import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { supportKbAnswers } from "@/db/schema";
import { registeredFor, type LangCode } from "@/lib/i18n/registry";
import "@/lib/i18n/dict-devices";
import "@/lib/i18n/dict-devices-guide";
import "@/lib/i18n/dict-devices-guide-detail";
import "@/lib/i18n/dict-devices-guide-levels";
import "@/lib/i18n/dict-devices-methods";
import "@/lib/i18n/dict-devices-tvapp";
import "@/lib/i18n/dict-devices-tvsetup";
import "@/lib/i18n/dict-local-control";
import { starterKeyOf, topicOfTags } from "./starter-tags";
import { STARTER_ANSWERS } from "./starter-answers";
import { tier1Match, type Tier1Match } from "./tiers";
import { formatChunks, groupDictEntries, searchChunks, splitMarkdownSections, type KnowledgeChunk } from "./knowledge-rules";

const LANGS: LangCode[] = ["id", "en", "ms", "th", "fil", "vi"];
const DOCS = [
  { file: "android-tv/RISIKO.md", source: "Kendala NEXBILL TV yang diketahui (RISIKO.md)" },
  { file: "android-tv/README.md", source: "Catatan NEXBILL TV (README)" },
];

let docCache: KnowledgeChunk[] | null = null;

async function docChunks(): Promise<KnowledgeChunk[]> {
  if (docCache) return docCache;
  const out: KnowledgeChunk[] = [];
  for (const d of DOCS) {
    try {
      out.push(...splitMarkdownSections(await readFile(path.join(process.cwd(), d.file), "utf8"), d.source));
    } catch {
      // file tidak ikut ter-deploy — sumber lain tetap dipakai
    }
  }
  try {
    const latest = JSON.parse(await readFile(path.join(process.cwd(), "public/downloads/nexbill-tv/latest.json"), "utf8")) as { versionName?: string; url?: string };
    if (latest.versionName) {
      out.push({ source: "Rilis NEXBILL TV", title: "Versi terbaru", text: `Versi terbaru aplikasi NEXBILL TV: ${latest.versionName}. Unduh: ${latest.url ?? "nexbill.id/downloads/nexbill-tv/nexbill-tv.apk"}. Di TV: menu staf › Cek pembaruan.` });
    }
  } catch {
    // abaikan
  }
  docCache = out;
  return out;
}

function deviceChunks(lang: string): KnowledgeChunk[] {
  const l = (LANGS as string[]).includes(lang) ? (lang as LangCode) : "id";
  const chunks = groupDictEntries({ ...registeredFor("id"), ...registeredFor(l) }, ["devices."], "Panduan NEXBILL TV & Kontrol Perangkat");
  return chunks;
}

let kbCache: { at: number; chunks: KnowledgeChunk[]; menu: MenuItem[] } | null = null;

/** Satu tanya-jawab di menu bantuan (Telegram /menu & Customer Service "Pertanyaan populer"). */
export interface MenuItem {
  key: string;
  topic: string;
  question: string;
  answer: string;
}

/**
 * Jawaban tim (tabel support_kb_answers) + Jawaban Bot bawaan (starter-answers.ts). Jawaban bawaan yang
 * sudah diimpor (tag "starter:<key>") memakai versi database — termasuk bila diubah atau dinonaktifkan.
 */
async function loadSaved(): Promise<{ chunks: KnowledgeChunk[]; menu: MenuItem[] }> {
  if (kbCache && Date.now() - kbCache.at < 5 * 60_000) return kbCache;
  let rows: { question: string; answer: string; tags: string | null; isActive: boolean }[] = [];
  try {
    rows = await db
      .select({ question: supportKbAnswers.question, answer: supportKbAnswers.answer, tags: supportKbAnswers.tags, isActive: supportKbAnswers.isActive })
      .from(supportKbAnswers)
      .orderBy(desc(supportKbAnswers.updatedAt))
      .limit(1000);
  } catch {
    rows = []; // tabel belum ada (migrasi 0037) — jawaban bawaan tetap dipakai
  }
  const byKey = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const k = starterKeyOf(r.tags);
    if (k && !byKey.has(k)) byKey.set(k, r);
  }
  const chunks: KnowledgeChunk[] = [
    ...rows.filter((r) => r.isActive).map((r) => ({ source: "Jawaban tim NEXBILL", title: r.question, text: `${r.answer}${topicOfTags(r.tags) ? `\n(${topicOfTags(r.tags)})` : ""}` })),
    ...STARTER_ANSWERS.filter((a) => !byKey.has(a.key)).map((a) => ({ source: "Jawaban tim NEXBILL", title: a.question, text: `${a.answer}\n(${a.topic})` })),
  ];
  // Menu mengikuti urutan & topik jawaban bawaan; versi database dipakai bila sudah diimpor, dilewati bila dinonaktifkan.
  const menu: MenuItem[] = [];
  for (const a of STARTER_ANSWERS) {
    const r = byKey.get(a.key);
    if (r && !r.isActive) continue;
    menu.push({ key: a.key, topic: a.topic, question: r?.question ?? a.question, answer: r?.answer ?? a.answer });
  }
  kbCache = { at: Date.now(), chunks, menu };
  return kbCache;
}

async function savedAnswerChunks(): Promise<KnowledgeChunk[]> {
  return (await loadSaved()).chunks;
}

/** Daftar menu bantuan (topik → pertanyaan) yang aktif. */
export async function helpMenu(): Promise<MenuItem[]> {
  return (await loadSaved()).menu;
}

export function clearSavedAnswerCache() {
  kbCache = null;
}

/** Cari di panduan perangkat, kendala NEXBILL TV yang diketahui, dan jawaban tim tersimpan. */
export async function searchKnowledge(query: string, lang: string): Promise<string> {
  const saved = await savedAnswerChunks();
  const all = [...saved, ...(await docChunks()), ...deviceChunks(lang)];
  // Jawaban tim diutamakan: dicari terpisah lalu ditaruh di depan.
  const fromSaved = searchChunks(query, saved, { limit: 3, maxChars: 3500 });
  const rest = searchChunks(query, all.filter((c) => !saved.includes(c)), { limit: 4, maxChars: 6000 });
  return formatChunks([...fromSaved, ...rest]);
}

/**
 * Tingkat 1 (tanpa AI): cocokkan pertanyaan dengan Jawaban Bot (jawaban tim + bawaan). Hanya untuk outlet
 * berbahasa Indonesia — jawaban bawaan berbahasa Indonesia; bahasa lain langsung ke tingkat 2.
 */
export async function tier1Answer(query: string, lang: string): Promise<Tier1Match | null> {
  if (lang !== "id") return null;
  const chunks = await savedAnswerChunks();
  // Pertanyaan yang sama persis dengan judul Jawaban Bot (mis. dipilih dari menu) → pasti cocok.
  const norm = (x: string) => x.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const exact = chunks.find((c) => norm(c.title) === norm(query));
  if (exact) return { chunk: exact, score: 99, coverage: 1, confident: true };
  const m = tier1Match(query, chunks);
  return m?.confident ? m : null;
}
