/**
 * Label konsol untuk layar TV — mengikuti unit yang BENAR-BENAR ada di outlet (PS2/PS3 masih banyak
 * disewakan), bukan teks contoh. Murni, diuji di console-line.test.ts.
 */
const LABEL: Record<string, string> = {
  ps2: "PS2",
  ps3: "PS3",
  ps4: "PS4",
  ps4_pro: "PS4 Pro",
  ps5: "PS5",
  ps5_slim: "PS5 Slim",
  ps6: "PS6",
  xbox: "Xbox",
  wii: "Wii",
  driving_simulator: "Driving Simulator",
};

/** Keluarga untuk baris ringkas di screensaver (PS4 Pro → PS4, PS5 Slim → PS5). */
const FAMILY: Record<string, string> = { ps4_pro: "ps4", ps5_slim: "ps5" };
const ORDER = ["ps2", "ps3", "ps4", "ps5", "ps6", "xbox", "wii", "driving_simulator"];

export function consoleLabel(type: string | null | undefined): string | null {
  if (!type) return null;
  return LABEL[type] ?? type.replace(/_/g, " ").toUpperCase();
}

/** "PS2 • PS3 • PS4 • PS5 • Driving Simulator" dari daftar tipe konsol unit aktif; null bila kosong. */
export function consoleLine(types: Array<string | null | undefined>): string | null {
  const fams = new Set(types.filter((t): t is string => !!t).map((t) => FAMILY[t] ?? t));
  if (fams.size === 0) return null;
  const sorted = [...fams].sort((a, b) => {
    const ia = ORDER.indexOf(a);
    const ib = ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  return sorted.map((t) => consoleLabel(t)).join(" • ");
}
