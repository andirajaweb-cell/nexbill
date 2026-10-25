import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/*
 * aapt menolak tanda kutip tunggal (') yang tidak di-escape di strings.xml — build APK gagal
 * ("Apostrophe not preceded by \\"). Dijaga di sini karena SDK Android tidak tersedia saat tes lokal.
 */
const RES = join(__dirname, "..", "..", "android-tv", "app", "src", "main", "res");

describe("android-tv strings.xml", () => {
  const dirs = readdirSync(RES).filter((d) => d.startsWith("values"));
  it.each(dirs)("%s: apostrof di-escape & kunci sama dengan values/", (dir) => {
    const xml = readFileSync(join(RES, dir, "strings.xml"), "utf8");
    const values = [...xml.matchAll(/<string name="([^"]+)"[^>]*>([\s\S]*?)<\/string>/g)];
    const bad = values.filter(([, , v]) => /(^|[^\\])'/.test(v)).map(([, k]) => k);
    expect(bad).toEqual([]);
    const base = [...readFileSync(join(RES, "values", "strings.xml"), "utf8").matchAll(/<string name="([^"]+)"(?![^>]*translatable="false")/g)].map((m) => m[1]);
    const keys = new Set(values.map(([, k]) => k));
    expect(base.filter((k) => !keys.has(k))).toEqual([]);
  });
});
