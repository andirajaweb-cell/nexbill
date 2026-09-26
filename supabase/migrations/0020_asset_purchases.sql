-- Pembelian Aset (menu Aset → tab "Pembelian Aset"), 2026-09-26.
--
-- Satu dokumen pembelian aset tetap: bisa berisi beberapa baris barang (mis. 3 PS5 + 2 TV) plus
-- ongkos kirim/pemasangan yang dikapitalisasi ke harga perolehan (SAK EMKM). Setiap unit menjadi
-- satu baris fixed_assets (fixed_assets.purchase_id menunjuk ke dokumennya) sehingga otomatis
-- tampil di tab Daftar Aset dan ikut dihitung di tab Penyusutan. Jurnalnya satu per pembelian
-- (sumber "asset_purchase") dan satu per pembayaran utang (sumber "asset_purchase_payment").
--
-- JALANKAN SEBELUM deploy ke Vercel — halaman Aset dan tab Utang di Accounting membaca tabel ini.
-- AMAN DIJALANKAN ULANG: IF NOT EXISTS / drop policy if exists. Tidak ada data lama yang diubah.

BEGIN;

CREATE TABLE IF NOT EXISTS asset_purchases (
  id                    text PRIMARY KEY,
  outlet_id             text NOT NULL REFERENCES outlets(id),
  purchase_number       text NOT NULL,
  supplier_id           text REFERENCES suppliers(id),
  invoice_number        text,
  purchase_date         text NOT NULL,
  due_date              text,
  subtotal              double precision NOT NULL DEFAULT 0,
  additional_cost       double precision NOT NULL DEFAULT 0,
  total                 double precision NOT NULL DEFAULT 0,
  paid_amount           double precision NOT NULL DEFAULT 0,
  status                text NOT NULL DEFAULT 'unpaid',   -- unpaid | partial | paid | cancelled
  payment_method        text,
  cash_bank_account_id  text REFERENCES cash_bank_accounts(id),
  journal_entry_id      text,
  shift_id              text,
  notes                 text,
  cancel_reason         text,
  cancelled_at          text,
  staff_user_id         text REFERENCES staff_users(id),
  created_at            text NOT NULL,
  updated_at            text NOT NULL
);
CREATE INDEX IF NOT EXISTS asset_purchases_outlet_status_idx ON asset_purchases (outlet_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS asset_purchases_outlet_number_idx ON asset_purchases (outlet_id, purchase_number);

CREATE TABLE IF NOT EXISTS asset_purchase_items (
  id                  text PRIMARY KEY,
  asset_purchase_id   text NOT NULL REFERENCES asset_purchases(id),
  name                text NOT NULL,
  category            text NOT NULL,
  qty                 integer NOT NULL,
  unit_cost           double precision NOT NULL,
  landed_unit_cost    double precision NOT NULL,
  useful_life_months  integer NOT NULL,
  salvage_value       double precision NOT NULL DEFAULT 0,
  rental_unit_id      text REFERENCES rental_units(id),
  created_at          text NOT NULL,
  updated_at          text NOT NULL
);
CREATE INDEX IF NOT EXISTS asset_purchase_items_purchase_idx ON asset_purchase_items (asset_purchase_id);

CREATE TABLE IF NOT EXISTS asset_purchase_payments (
  id                    text PRIMARY KEY,
  asset_purchase_id     text NOT NULL REFERENCES asset_purchases(id),
  amount                double precision NOT NULL,
  method                text NOT NULL,
  cash_bank_account_id  text NOT NULL REFERENCES cash_bank_accounts(id),
  paid_at               text NOT NULL,
  journal_entry_id      text,
  shift_id              text,
  status                text NOT NULL DEFAULT 'posted',   -- posted | voided
  staff_user_id         text REFERENCES staff_users(id)
);
CREATE INDEX IF NOT EXISTS asset_purchase_payments_purchase_idx ON asset_purchase_payments (asset_purchase_id);
CREATE INDEX IF NOT EXISTS asset_purchase_payments_shift_idx ON asset_purchase_payments (shift_id);

ALTER TABLE fixed_assets ADD COLUMN IF NOT EXISTS purchase_id text REFERENCES asset_purchases(id);
CREATE INDEX IF NOT EXISTS fixed_assets_purchase_idx ON fixed_assets (purchase_id);

-- Isolasi antar-outlet (pola yang sama dengan 0001_rls_policies.sql).
alter table public.asset_purchases enable row level security;
alter table public.asset_purchases force row level security;
drop policy if exists tenant_isolation on public.asset_purchases;
create policy tenant_isolation on public.asset_purchases
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.asset_purchase_items enable row level security;
alter table public.asset_purchase_items force row level security;
drop policy if exists tenant_isolation on public.asset_purchase_items;
create policy tenant_isolation on public.asset_purchase_items
  using (exists (
    select 1 from public.asset_purchases p
    where p.id = asset_purchase_items.asset_purchase_id and p.outlet_id = app_current_outlet_id()
  ))
  with check (exists (
    select 1 from public.asset_purchases p
    where p.id = asset_purchase_items.asset_purchase_id and p.outlet_id = app_current_outlet_id()
  ));

alter table public.asset_purchase_payments enable row level security;
alter table public.asset_purchase_payments force row level security;
drop policy if exists tenant_isolation on public.asset_purchase_payments;
create policy tenant_isolation on public.asset_purchase_payments
  using (exists (
    select 1 from public.asset_purchases p
    where p.id = asset_purchase_payments.asset_purchase_id and p.outlet_id = app_current_outlet_id()
  ))
  with check (exists (
    select 1 from public.asset_purchases p
    where p.id = asset_purchase_payments.asset_purchase_id and p.outlet_id = app_current_outlet_id()
  ));

COMMIT;

-- VERIFIKASI (harus 3 tabel + 1 kolom):
-- SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'asset_purchase%';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'fixed_assets' AND column_name = 'purchase_id';
