import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/*
 * Windows PowerShell 5.1 membaca file .ps1 tanpa BOM sebagai ANSI, sehingga satu karakter non-ASCII
 * (mis. tanda pisah "—") merusak parsing seluruh skrip ("Unexpected token 'itu'…"). Skrip build yang
 * dijalankan pemilik di Windows wajib ASCII murni (BOM di awal file boleh).
 */
const SCRIPTS = ["android/build.ps1", "android-tv/build.ps1"];

describe("skrip PowerShell ASCII murni", () => {
  it.each(SCRIPTS)("%s tidak memuat karakter non-ASCII", (p) => {
    const text = readFileSync(join(__dirname, "..", "..", p), "utf8").replace(/^﻿/, "");
    const bad = text
      .split("\n")
      .map((l, i) => [i + 1, l] as const)
      .filter(([, l]) => /[^\x00-\x7F]/.test(l));
    expect(bad.map(([n, l]) => `${n}: ${l.slice(0, 80)}`)).toEqual([]);
  });
});
