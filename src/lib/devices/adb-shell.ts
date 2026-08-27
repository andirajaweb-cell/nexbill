/**
 * Low-level "run a command against an Android TV over local ADB" helpers —
 * extracted out of adapters/android-tv.ts so the exact same connect/error
 * handling logic is shared between:
 *  - adapters/android-tv.ts (direct local exec — the Next.js server itself
 *    is on the same LAN as the TV; used for self-hosted deployments)
 *  - scripts/relay-agent.ts (same exec logic, but running on a separate
 *    machine at the outlet, receiving ip/port/action over the relay
 *    WebSocket instead of reading them from a DeviceRecord)
 *
 * Keeping this in one place means a fix to one (e.g. a new ADB error string
 * we learn to recognize) automatically applies to both call sites.
 */
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface AdbTarget {
  ip: string;
  port: number;
  adbPath: string;
  serial: string;
}

export function makeTarget(ip: string, port?: number, adbPath?: string): AdbTarget {
  const p = port || 5555;
  return { ip, port: p, adbPath: adbPath || "adb", serial: `${ip}:${p}` };
}

export async function runAdb(adbPath: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(adbPath, args, { timeout: 10_000, windowsHide: true });
    return { stdout: stdout ?? "", stderr: stderr ?? "" };
  } catch (rawErr: unknown) {
    // execFile's rejection is a NodeJS.ErrnoException with stdout/stderr tacked on — no @types
    // export for that exact shape, so a narrow local cast (not `any`) stands in for it.
    const err = rawErr as { code?: string; stdout?: string; stderr?: string; message?: string };
    if (err?.code === "ENOENT") {
      throw new Error(
        `Perintah "${adbPath}" tidak ditemukan di mesin ini. Install Android Platform Tools (developer.android.com/tools/releases/platform-tools), lalu tambahkan folder-nya ke PATH, atau isi path lengkap adb.exe.`
      );
    }
    const combined = `${err?.stdout ?? ""} ${err?.stderr ?? ""}`.trim();
    throw new Error(combined || err?.message || "Perintah adb gagal dijalankan.");
  }
}

export async function ensureConnected(target: AdbTarget) {
  const { stdout, stderr } = await runAdb(target.adbPath, ["connect", target.serial]);
  const out = `${stdout} ${stderr}`.toLowerCase();
  if (
    out.includes("unable to connect") ||
    out.includes("cannot connect") ||
    out.includes("connection refused") ||
    out.includes("no route to host") ||
    out.includes("timed out")
  ) {
    throw new Error(
      `Tidak bisa terhubung ke TV di ${target.serial}. Pastikan TV menyala, satu jaringan dengan mesin ini, dan "Network debugging" aktif di Developer options TV.`
    );
  }
}

export async function adbShell(target: AdbTarget, command: string): Promise<string> {
  await ensureConnected(target);
  const { stdout, stderr } = await runAdb(target.adbPath, ["-s", target.serial, "shell", command]);
  const combined = `${stdout}\n${stderr}`;
  if (/device unauthorized/i.test(combined)) {
    throw new Error(
      `TV di ${target.serial} belum meng-otorisasi mesin ini. Lihat layar TV — akan muncul popup "Allow debugging?", centang "Always allow from this computer" lalu Izinkan. Setelah itu coba lagi.`
    );
  }
  if (/device offline/i.test(combined)) {
    throw new Error(`TV di ${target.serial} berstatus offline saat handshake. Tunggu beberapa detik lalu coba lagi.`);
  }
  if (/device .* not found|no devices\/emulators found/i.test(combined)) {
    throw new Error(`TV di ${target.serial} tidak terdeteksi. Pastikan alamat IP benar dan TV masih menyala.`);
  }
  return stdout;
}

export async function adbWake(target: AdbTarget) {
  await adbShell(target, "input keyevent 224"); // KEYCODE_WAKEUP
}

export async function adbSleep(target: AdbTarget) {
  await adbShell(target, "input keyevent 223"); // KEYCODE_SLEEP
}

export async function adbGetState(target: AdbTarget): Promise<"on" | "off" | "unknown"> {
  try {
    const out = await adbShell(target, "dumpsys power");
    const wakefulness = out.match(/mWakefulness=(\w+)/i)?.[1]?.toLowerCase();
    if (wakefulness === "awake") return "on";
    if (wakefulness === "asleep" || wakefulness === "dozing") return "off";
    if (/Display Power:\s*state=ON/i.test(out)) return "on";
    if (/Display Power:\s*state=OFF/i.test(out)) return "off";
    return "unknown";
  } catch {
    return "unknown";
  }
}
