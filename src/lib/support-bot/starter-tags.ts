/** Tag Jawaban Bot bawaan di support_kb_answers: "starter:<key>|<topik>". Murni, dipakai server & halaman admin. */
export function starterTag(key: string, topic: string): string {
  return `starter:${key}|${topic}`;
}

export function starterKeyOf(tags: string | null | undefined): string | null {
  const m = /^starter:([a-z0-9-]+)/.exec(tags ?? "");
  return m ? m[1] : null;
}

/** Topik yang ditampilkan (tag bawaan → topiknya; tag bebas → apa adanya). */
export function topicOfTags(tags: string | null | undefined): string | null {
  if (!tags) return null;
  const k = starterKeyOf(tags);
  if (!k) return tags;
  const i = tags.indexOf("|");
  return i >= 0 ? tags.slice(i + 1) : null;
}
