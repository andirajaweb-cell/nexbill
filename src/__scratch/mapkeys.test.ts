import { it } from "vitest";
import fs from "fs";
import path from "path";
import { hasTranslation } from "@/lib/i18n/registry";
const SRC = path.resolve(__dirname, "..");
const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
it("map keys", async () => {
  for (const f of fs.readdirSync(path.join(SRC, "lib/i18n")).filter((n) => /^dict-.*\.ts$/.test(n))) await import(`@/lib/i18n/${f}`);
  const missing = new Map<string, string>();
  for (const f of walk(SRC)) {
    if (!/\.(tsx?)$/.test(f) || f.includes("/i18n/") || f.includes("__scratch")) continue;
    const s = fs.readFileSync(f, "utf8");
    for (const m of s.matchAll(/\b[a-zA-Z]*[kK]ey\s*:\s*["'`]([a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9_\-]+)+)["'`]/g)) {
      if (!hasTranslation("en", m[1])) missing.set(m[1], path.relative(SRC, f));
    }
  }
  const by: Record<string, number> = {};
  for (const f of missing.values()) by[f] = (by[f] ?? 0) + 1;
  console.log("missing:", missing.size, by);
  fs.writeFileSync("/tmp/claude-0/-home-user-nexbill/b4c84bd8-dff9-590c-9079-577e5aa6b12b/scratchpad/mapkeys.json", JSON.stringify([...missing], null, 1));
});
