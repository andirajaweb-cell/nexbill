/**
 * Aturan murni PIN per staf untuk NEXBILL TV (tanpa DB). Diuji di staff-pin-rules.test.ts.
 */

/** Peran yang boleh punya PIN TV (memulai/mengubah sesi dari TV). */
export const TV_PIN_ROLES = ["owner", "superuser", "manager", "supervisor", "cashier"] as const;

export function canHaveTvPin(role: string): boolean {
  return (TV_PIN_ROLES as readonly string[]).includes(role);
}

/** null = PIN boleh dipakai; string = alasan penolakan (Bahasa Indonesia, untuk dashboard). */
export function validateTvPin(pin: unknown): string | null {
  if (typeof pin !== "string" || !/^\d{4,6}$/.test(pin)) return "PIN harus 4–6 digit angka.";
  if (/^(\d)\1+$/.test(pin)) return "PIN tidak boleh angka yang sama semua (mis. 0000).";
  const digits = pin.split("").map(Number);
  const up = digits.every((d, i) => i === 0 || d === (digits[i - 1] + 1) % 10);
  const down = digits.every((d, i) => i === 0 || d === (digits[i - 1] + 9) % 10);
  if (up || down) return "PIN tidak boleh angka berurutan (mis. 1234).";
  return null;
}

/**
 * Antrean aksi dari TV dipecah menjadi rangkaian BERURUTAN dengan staf yang sama, supaya tiap
 * rangkaian bisa diputar ulang atas nama stafnya tanpa mengubah urutan (mulai sebelum perpanjang).
 */
export function runsByStaff<T>(items: T[], staffOf: (t: T) => string): { staffId: string; items: T[] }[] {
  const runs: { staffId: string; items: T[] }[] = [];
  for (const it of items) {
    const s = staffOf(it);
    const last = runs[runs.length - 1];
    if (last && last.staffId === s) last.items.push(it);
    else runs.push({ staffId: s, items: [it] });
  }
  return runs;
}
