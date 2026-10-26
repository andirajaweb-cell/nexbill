/**
 * Aturan murni basis pengetahuan bot support (tanpa DB/fs): memecah sumber menjadi potongan dan
 * mencari potongan yang paling cocok dengan pertanyaan merchant. Sengaja sederhana (kecocokan kata,
 * bukan embedding) supaya tanpa biaya dan bisa diuji. Diuji di knowledge-rules.test.ts.
 */

export interface KnowledgeChunk {
  /** Sumber yang disebut bot, mis. "Panduan Perangkat", "Kendala NEXBILL TV (RISIKO.md)", "Jawaban tim". */
  source: string;
  title: string;
  text: string;
}

/** Pecah markdown per judul `##`/`###`; teks sebelum judul pertama ikut sebagai potongan "Ringkasan". */
export function splitMarkdownSections(md: string, source: string): KnowledgeChunk[] {
  const out: KnowledgeChunk[] = [];
  let title = "Ringkasan";
  let buf: string[] = [];
  const flush = () => {
    const text = buf.join("\n").trim();
    if (text) out.push({ source, title, text });
    buf = [];
  };
  for (const line of md.split(/\r?\n/)) {
    const m = /^#{2,3}\s+(.+)$/.exec(line);
    if (m) {
      flush();
      title = m[1].trim();
    } else if (!/^#\s/.test(line)) {
      buf.push(line);
    }
  }
  flush();
  return out;
}

/**
 * Kamus i18n (kunci → teks) dikelompokkan per 3 segmen kunci pertama, mis. semua
 * "devices.guide.hdmi.*" menjadi satu potongan. Urutan baris mengikuti urutan kamus.
 */
export function groupDictEntries(entries: Record<string, string>, prefixes: string[], source: string): KnowledgeChunk[] {
  const groups = new Map<string, string[]>();
  for (const [key, value] of Object.entries(entries)) {
    if (!prefixes.some((p) => key.startsWith(p))) continue;
    const v = value.trim();
    if (!v) continue;
    const g = key.split(".").slice(0, 3).join(".");
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(v);
  }
  return [...groups.entries()].map(([g, lines]) => ({ source, title: g, text: lines.join("\n") }));
}

const STOPWORDS = new Set(
  "yang dan di ke dari untuk dengan ini itu ada tidak bisa saya kami kamu apa bagaimana cara kenapa mengapa atau juga sudah belum akan pada dalam karena jadi kalau jika agar the a an and or of to in is on for how why what my our can not".split(" ")
);

export function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w));
}

/** Skor = jumlah kata kueri yang muncul (judul berbobot 2), dibagi akar panjang potongan supaya potongan raksasa tidak selalu menang. */
export function scoreChunk(queryTokens: string[], chunk: KnowledgeChunk): number {
  if (queryTokens.length === 0) return 0;
  const body = new Set(tokenize(chunk.text));
  const title = new Set(tokenize(chunk.title));
  let hits = 0;
  for (const q of new Set(queryTokens)) {
    if (title.has(q)) hits += 2;
    else if (body.has(q)) hits += 1;
    else if (q.length >= 5 && [...body].some((w) => w.startsWith(q.slice(0, 5)))) hits += 0.5; // bentuk kata lain: "pairing" ~ "pairingnya"
  }
  return hits / Math.sqrt(Math.max(1, body.size / 40));
}

/** Potongan terbaik (skor > 0), dibatasi jumlah & total karakter supaya prompt tetap murah. */
export function searchChunks(query: string, chunks: KnowledgeChunk[], opts: { limit?: number; maxChars?: number } = {}): KnowledgeChunk[] {
  const limit = opts.limit ?? 5;
  const maxChars = opts.maxChars ?? 7000;
  const q = tokenize(query);
  const ranked = chunks
    .map((c) => ({ c, s: scoreChunk(q, c) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit);
  const out: KnowledgeChunk[] = [];
  let used = 0;
  for (const { c } of ranked) {
    const room = maxChars - used;
    if (room < 300) break;
    const text = c.text.length > room ? `${c.text.slice(0, room)}…` : c.text;
    out.push({ ...c, text });
    used += text.length;
  }
  return out;
}

export function formatChunks(chunks: KnowledgeChunk[]): string {
  if (chunks.length === 0) return "Tidak ada yang cocok di basis pengetahuan. Jangan menebak — teruskan ke tim bila panduan juga tidak menjawab.";
  return chunks.map((c) => `[${c.source} › ${c.title}]\n${c.text}`).join("\n\n---\n\n");
}
