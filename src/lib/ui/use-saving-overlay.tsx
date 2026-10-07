"use client";
import { uiText } from "@/lib/i18n/client-text";
import { useState } from "react";
import { ProcessingOverlay } from "@/components/ui/ProcessingOverlay";

/**
 * Pop-up loading untuk aksi yang menyimpan data. Tampil HANYA selama permintaan ke server berjalan —
 * ditutup begitu server menjawab, sebelum pesan sukses/gagal muncul — dan menutupi halaman supaya
 * tidak ada klik lain di tengah proses.
 *
 *   const saving = useSavingOverlay();
 *   const res = await saving.run("Menyimpan expense...", () => fetch(...));
 *   ...
 *   return <>{saving.element}...</>;
 */
export function useSavingOverlay(defaultHint = uiText("shell.saving.hint", "Jangan tutup atau muat ulang halaman ini.")) {
  const [state, setState] = useState<{ message: string; hint: string } | null>(null);

  async function run<T>(message: string, fn: () => Promise<T>, hint = defaultHint): Promise<T> {
    setState({ message, hint });
    try {
      return await fn();
    } finally {
      setState(null);
    }
  }

  return {
    run,
    active: state !== null,
    element: state ? <ProcessingOverlay message={state.message} hint={state.hint} /> : null,
  };
}

/** fetch + parse JSON in one step, so the overlay covers the whole server round trip. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- response shapes vary per endpoint, same as res.json()
export async function fetchJson(input: RequestInfo, init?: RequestInit): Promise<{ res: Response; data: any }> {
  const res = await fetch(input, init);
  const data = await res.json().catch(() => ({ error: uiText("shell.saving.badResponse", "Server tidak merespons dengan benar. Cek daftar sebelum mencoba lagi.") }));
  return { res, data };
}
