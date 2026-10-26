import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { registeredFor } from "@/lib/i18n/registry";
import "@/lib/i18n/dict-devices";
import "@/lib/i18n/dict-devices-guide";
import "@/lib/i18n/dict-devices-guide-detail";
import "@/lib/i18n/dict-devices-guide-levels";
import "@/lib/i18n/dict-devices-methods";
import "@/lib/i18n/dict-devices-tvapp";
import "@/lib/i18n/dict-devices-tvsetup";
import "@/lib/i18n/dict-local-control";
import { formatChunks, groupDictEntries, scoreChunk, searchChunks, splitMarkdownSections, tokenize } from "./knowledge-rules";

describe("memecah sumber", () => {
  it("markdown per judul ## / ###, judul # diabaikan", () => {
    const chunks = splitMarkdownSections("# Judul\nintro\n## Satu\nisi satu\n### Dua\nisi dua\n", "Doc");
    expect(chunks).toEqual([
      { source: "Doc", title: "Ringkasan", text: "intro" },
      { source: "Doc", title: "Satu", text: "isi satu" },
      { source: "Doc", title: "Dua", text: "isi dua" },
    ]);
  });
  it("kamus dikelompokkan per 3 segmen kunci, hanya prefiks yang diminta", () => {
    const chunks = groupDictEntries({ "devices.guide.hdmi.a": "Satu", "devices.guide.hdmi.b": "Dua", "devices.risk.x": "Tiga", "pos.x": "Abaikan" }, ["devices."], "Perangkat");
    expect(chunks).toEqual([
      { source: "Perangkat", title: "devices.guide.hdmi", text: "Satu\nDua" },
      { source: "Perangkat", title: "devices.risk.x", text: "Tiga" },
    ]);
  });
});

describe("pencarian", () => {
  it("tokenize membuang tanda baca & kata umum", () => {
    expect(tokenize("Bagaimana cara pairing TV, kode 6-digit?")).toEqual(["pairing", "tv", "kode", "digit"]);
  });
  it("judul lebih berbobot; tanpa kecocokan → kosong", () => {
    const a = { source: "s", title: "Smart plug offline", text: "Cek WiFi colokan." };
    const b = { source: "s", title: "Lain", text: "smart plug disebut sekali di sini bersama banyak kata lain" };
    expect(scoreChunk(tokenize("smart plug offline"), a)).toBeGreaterThan(scoreChunk(tokenize("smart plug offline"), b));
    expect(searchChunks("zzz qqq", [a, b])).toEqual([]);
    expect(formatChunks([])).toMatch(/Jangan menebak/);
  });
  it("batas karakter dipatuhi", () => {
    const big = { source: "s", title: "hdmi", text: "hdmi ".repeat(5000) };
    const out = searchChunks("hdmi", [big, { ...big, title: "hdmi 2" }], { maxChars: 1000 });
    expect(out.reduce((n, c) => n + c.text.length, 0)).toBeLessThanOrEqual(1001);
  });
});

describe("sumber nyata ikut terbaca", () => {
  it("panduan perangkat (kamus devices.*) bisa dicari: HDMI, smart plug, pairing", () => {
    const chunks = groupDictEntries({ ...registeredFor("id") }, ["devices."], "Panduan NEXBILL TV & Kontrol Perangkat");
    expect(chunks.length).toBeGreaterThan(20);
    for (const q of ["HDMI", "smart plug", "pairing kode TV"]) expect(searchChunks(q, chunks).length, q).toBeGreaterThan(0);
  });
  it("RISIKO.md NEXBILL TV terpecah per bagian dan bisa dicari", () => {
    const md = readFileSync(path.join(process.cwd(), "android-tv/RISIKO.md"), "utf8");
    const chunks = splitMarkdownSections(md, "RISIKO.md");
    expect(chunks.length).toBeGreaterThanOrEqual(4);
    expect(searchChunks("jam TV mundur listrik padam", chunks)[0]?.title).toBe("Jam & waktu");
  });
});
