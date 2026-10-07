import { LANG_OPTIONS, LANG_STORAGE_KEY, translate, type LangCode } from "./registry";

/**
 * Bahasa dashboard yang tersimpan, untuk kode yang berjalan DI LUAR DashboardLangProvider (mis.
 * DialogHost di root layout) atau di modul non-React (printer, pembayaran, unggah foto). Hanya untuk
 * dipanggil di browser; di server (tanpa window) hasilnya Bahasa Indonesia.
 */
export function readStoredLang(): LangCode {
  try {
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (saved && LANG_OPTIONS.some((o) => o.code === saved)) return saved as LangCode;
  } catch {
    // storage diblokir / bukan browser — pakai Bahasa Indonesia
  }
  return "id";
}

/**
 * Teks UI untuk modul non-React: t(key, fallback) dengan bahasa dashboard tersimpan. Modul pemanggil
 * wajib meng-import kamusnya (dict-*.ts) supaya terjemahannya terdaftar.
 */
export function uiText(key: string, fallback: string): string {
  return translate(readStoredLang(), key, fallback);
}
