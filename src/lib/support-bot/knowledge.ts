/**
 * Basis pengetahuan bot support 24 jam (Customer Service dashboard & Telegram), sesuai tabel
 * "Basis pengetahuan & batas bot" di dokumen kerangka:
 *  1. Panduan Bantuan dashboard (6 bahasa)      → tool buka_panduan (lib/help/content)
 *  2. Panduan NEXBILL TV & Kontrol Perangkat     → teks halaman Kontrol Perangkat (kamus devices.*)
 *  3. android-tv/RISIKO.md & README (catatan rilis) → kendala yang sudah diketahui + solusinya
 *  4. Status akun merchant                      → tool status_akun (support-service)
 *  5. Jawaban tim dari tiket selesai            → tabel support_kb_answers (kurasi mingguan)
 * Sumber 2, 3, 5 dicari lewat tool cari_pengetahuan (searchChunks).
 *
 * File .md dibaca dari disk saat runtime; next.config.ts (outputFileTracingIncludes) memastikan
 * file itu ikut ter-deploy ke fungsi Vercel yang memakainya.
 */
import { readFile } from "fs/promises";
import path from "path";
import { desc, eq } from "drizzle-orm";
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

let kbCache: { at: number; chunks: KnowledgeChunk[] } | null = null;

async function savedAnswerChunks(): Promise<KnowledgeChunk[]> {
  if (kbCache && Date.now() - kbCache.at < 5 * 60_000) return kbCache.chunks;
  try {
    const rows = await db
      .select({ question: supportKbAnswers.question, answer: supportKbAnswers.answer, tags: supportKbAnswers.tags })
      .from(supportKbAnswers)
      .where(eq(supportKbAnswers.isActive, true))
      .orderBy(desc(supportKbAnswers.updatedAt))
      .limit(500);
    const chunks = rows.map((r) => ({ source: "Jawaban tim NEXBILL", title: r.question, text: `${r.answer}${r.tags ? `\n(${r.tags})` : ""}` }));
    kbCache = { at: Date.now(), chunks };
    return chunks;
  } catch {
    return []; // tabel belum ada (migrasi 0037) — bot tetap jalan dengan sumber lain
  }
}

export function clearSavedAnswerCache() {
  kbCache = null;
}

/** Cari di panduan perangkat, kendala NEXBILL TV yang diketahui, dan jawaban tim tersimpan. */
export async function searchKnowledge(query: string, lang: string): Promise<string> {
  const saved = await savedAnswerChunks();
  const all = [...saved, ...(await docChunks()), ...deviceChunks(lang)];
  // Jawaban tim diutamakan: dicari terpisah lalu ditaruh di depan.
  const fromSaved = searchChunks(query, saved, { limit: 2, maxChars: 2500 });
  const rest = searchChunks(query, all.filter((c) => !saved.includes(c)), { limit: 4, maxChars: 6000 });
  return formatChunks([...fromSaved, ...rest]);
}
