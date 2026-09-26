-- Isolasi pembukuan antar-outlet di level database, 2026-09-26.
--
-- Aplikasi sudah menolak jurnal yang memakai akun outlet lain (assertPostableAccountIds di
-- src/lib/accounting/coa.ts). Trigger di bawah ini adalah lapisan kedua: apa pun jalur penulisnya
-- (kode baru yang lupa mengecek, script, SQL manual), database menolak:
--   1. baris jurnal yang akunnya bukan milik outlet jurnalnya,
--   2. akun kas/bank yang ditautkan ke akun COA outlet lain,
--   3. Account Mapping yang menunjuk ke akun COA outlet lain.
-- Hanya berlaku untuk penulisan BARU; data lama diperiksa lewat query VERIFIKASI di bawah dan tab
-- Accounting → Audit ("Isolasi antar-outlet").
--
-- Boleh dijalankan sebelum atau sesudah deploy. AMAN DIJALANKAN ULANG.

CREATE OR REPLACE FUNCTION nexbill_assert_journal_line_outlet() RETURNS trigger AS $$
DECLARE
  account_outlet text;
  entry_outlet text;
BEGIN
  SELECT outlet_id INTO account_outlet FROM accounts WHERE id = NEW.account_id;
  SELECT outlet_id INTO entry_outlet FROM journal_entries WHERE id = NEW.journal_entry_id;
  IF account_outlet IS DISTINCT FROM entry_outlet THEN
    RAISE EXCEPTION 'Isolasi outlet: akun % bukan milik outlet jurnal %', NEW.account_id, NEW.journal_entry_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS journal_lines_outlet_isolation ON journal_lines;
CREATE TRIGGER journal_lines_outlet_isolation
  BEFORE INSERT OR UPDATE OF account_id, journal_entry_id ON journal_lines
  FOR EACH ROW EXECUTE FUNCTION nexbill_assert_journal_line_outlet();

CREATE OR REPLACE FUNCTION nexbill_assert_row_account_outlet() RETURNS trigger AS $$
DECLARE
  account_outlet text;
BEGIN
  SELECT outlet_id INTO account_outlet FROM accounts WHERE id = NEW.account_id;
  IF account_outlet IS DISTINCT FROM NEW.outlet_id THEN
    RAISE EXCEPTION 'Isolasi outlet: akun % bukan milik outlet %', NEW.account_id, NEW.outlet_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cash_bank_accounts_outlet_isolation ON cash_bank_accounts;
CREATE TRIGGER cash_bank_accounts_outlet_isolation
  BEFORE INSERT OR UPDATE OF account_id, outlet_id ON cash_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION nexbill_assert_row_account_outlet();

DROP TRIGGER IF EXISTS account_mappings_outlet_isolation ON account_mappings;
CREATE TRIGGER account_mappings_outlet_isolation
  BEFORE INSERT OR UPDATE OF account_id, outlet_id ON account_mappings
  FOR EACH ROW EXECUTE FUNCTION nexbill_assert_row_account_outlet();

-- VERIFIKASI data lama (harus 0 semua):
-- SELECT
--   (SELECT count(*) FROM journal_lines jl JOIN journal_entries je ON je.id = jl.journal_entry_id JOIN accounts a ON a.id = jl.account_id WHERE a.outlet_id <> je.outlet_id) AS baris_jurnal_lintas_outlet,
--   (SELECT count(*) FROM cash_bank_accounts c JOIN accounts a ON a.id = c.account_id WHERE a.outlet_id <> c.outlet_id) AS kas_bank_lintas_outlet,
--   (SELECT count(*) FROM account_mappings m JOIN accounts a ON a.id = m.account_id WHERE a.outlet_id <> m.outlet_id) AS mapping_lintas_outlet;
