# NEXBILL — catatan kerja untuk Claude

## Setiap kali ada fitur baru atau fitur pindah paket

1. **Aturan paket** — fitur yang dikunci per paket: tambah/ubah `PlanFeature` dan `STARTER_FEATURES` di `src/lib/subscription/pricing.ts` (+ `featureForApiRequest` / `featureForDashboardPath`).
2. **Tabel "Bandingkan paket" di nexbill.id (#harga)** — tambah barisnya di `src/lib/subscription/plan-matrix.ts` (6 bahasa: id, en, ms, th, vi, fil). Fitur di semua paket → `all: true`; fitur berpaket → `feature`. `plan-matrix.test.ts` gagal kalau ada `PlanFeature` tanpa baris. Hanya fitur yang benar-benar sudah ada.
3. **Katalog fitur** — `public/downloads/katalog-fitur-nexbill.html` bila fiturnya layak dipasarkan.
4. **Dokumen "Analisa SWOT & Strategi Kompetitif NEXBILL"** (Claude Docs, https://claude.ai/artifact/7DL96WK85QSFZG4JFtgZsX) — perbarui baris NEXBILL di Matriks fitur, perbandingan KULA POS, dan SWOT bila fitur itu mengubah posisi terhadap pesaing.

## Aturan tetap

- Pemilik repo yang `git push`; commit tanpa file yang hanya berubah CRLF: `scripts/audit-duplicate-journals.ts`, `src/lib/accounting/{coa-data,coa,expense,journal}.ts`, `src/lib/ppob/engine.ts`.
- Migrasi SQL di `supabase/migrations/` dijalankan manual di Supabase — hindari migrasi baru bila bisa.
- Materi publik tidak menyerang/menyebut pesaing; klaim harus bisa dibuktikan.
- UI dashboard: semua teks lewat `t()` + kamus 6 bahasa (`src/lib/i18n/dict-*.ts`); dicek `hardcoded-text.test.ts`.
