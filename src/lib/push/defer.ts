import { after } from "next/server";

/**
 * Jalankan pekerjaan (mis. kirim notifikasi push) SETELAH respons dikirim bila sedang dalam
 * request Next.js (Vercel menunggu sampai selesai), atau langsung di latar belakang bila dipanggil
 * dari skrip/scheduler. Tidak pernah melempar.
 */
export function runAfterResponse(fn: () => Promise<unknown>): void {
  const run = () => fn().catch((err) => console.error("[runAfterResponse]", err));
  try {
    after(run);
  } catch {
    void run();
  }
}
