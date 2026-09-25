-- Tautan jurnal pembalik → jurnal asli, 2026-09-25.
--
-- Membatalkan transaksi tidak menghapus jurnalnya: jurnal asli ditandai "void" dan sebuah jurnal
-- pembalik diposting. Neraca Saldo dulu menjumlahkan KEDUANYA, sehingga saldo akhirnya benar tapi
-- kolom Debit/Kredit dan rincian akun penuh transaksi yang sebenarnya dibatalkan. Kolom ini
-- menautkan pembalik ke aslinya, supaya pasangan yang saling meniadakan dalam periode yang sama
-- bisa dikeluarkan dari laporan.
--
-- JALANKAN SEBELUM deploy ke Vercel (kode baru membaca kolom ini di Neraca Saldo & Laba Rugi).
-- Jurnal lama ditautkan terpisah oleh: npx tsx scripts/audit-duplicate-journals.ts --apply
-- (bagian D). Sebelum ditautkan, jurnal lama tetap dihitung seperti sekarang — tidak ada angka
-- yang berubah hanya karena migrasi ini.
--
-- AMAN DIJALANKAN ULANG.

ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS reversal_of_entry_id text;
CREATE INDEX IF NOT EXISTS journal_entries_reversal_of_idx ON journal_entries (reversal_of_entry_id);
