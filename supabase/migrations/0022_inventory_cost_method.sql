-- Metode penilaian persediaan per outlet (Inventory → Belanja Supplier), 2026-09-26.
--
-- Pilihan: 'average' (rata-rata tertimbang — perilaku yang selama ini dipakai, tetap default) atau
-- 'fifo' (masuk pertama keluar pertama). LIFO sengaja tidak disediakan: tidak diperbolehkan oleh
-- SAK EMKM/PSAK 14 dan UU PPh Pasal 10 ayat (6).
--
-- inventory_cost_layers = lapisan harga FIFO: setiap penerimaan barang menjadi satu lapisan
-- (qty + harga modal per unit); penjualan/pengurangan stok menghabiskan lapisan tertua lebih dulu.
-- Hanya dipakai saat metode outlet = 'fifo'.
--
-- JALANKAN SEBELUM deploy ke Vercel — penjualan, belanja, dan penyesuaian stok membaca kolom ini.
-- AMAN DIJALANKAN ULANG. Semua outlet tetap 'average' sampai pemiliknya memilih FIFO.

BEGIN;

ALTER TABLE outlets ADD COLUMN IF NOT EXISTS inventory_cost_method text NOT NULL DEFAULT 'average';
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS inventory_cost_method_since text;

CREATE TABLE IF NOT EXISTS inventory_cost_layers (
  id             text PRIMARY KEY,
  outlet_id      text NOT NULL REFERENCES outlets(id),
  product_id     text NOT NULL REFERENCES products(id),
  received_at    text NOT NULL,
  qty_initial    double precision NOT NULL,
  qty_remaining  double precision NOT NULL,
  unit_cost      double precision NOT NULL,
  source         text NOT NULL,      -- purchase | opening | adjustment | restock | switch
  ref_id         text,
  created_at     text NOT NULL,
  updated_at     text NOT NULL
);
CREATE INDEX IF NOT EXISTS inventory_cost_layers_product_idx ON inventory_cost_layers (product_id, received_at);
CREATE INDEX IF NOT EXISTS inventory_cost_layers_ref_idx ON inventory_cost_layers (ref_id);

alter table public.inventory_cost_layers enable row level security;
alter table public.inventory_cost_layers force row level security;
drop policy if exists tenant_isolation on public.inventory_cost_layers;
create policy tenant_isolation on public.inventory_cost_layers
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

COMMIT;

-- VERIFIKASI (harus 2 kolom + 1 tabel):
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'outlets' AND column_name LIKE 'inventory_cost_method%';
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'inventory_cost_layers';
