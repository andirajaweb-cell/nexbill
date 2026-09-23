-- Marketplace Antar-Outlet (2026-09-23)
--
-- Outlet yang punya stok berlebih (stik, konsol bekas, kabel, TV) menjualnya ke outlet lain di
-- jaringan NEXBILL.
--
-- AKAD DAN ALUR UANG — ditetapkan pemilik, dan tercermin langsung di bentuk tabel ini:
--
--   * NEXBILL TIDAK MEMEGANG UANG SIAPA PUN. Pembeli membayar langsung ke penjual. Karena itu
--     TIDAK ADA kolom saldo tertahan/escrow di sini, dan kolom semacam itu tidak boleh ditambahkan
--     tanpa lisensi penyelenggara jasa pembayaran lebih dulu.
--
--   * Upah NEXBILL adalah UJRAH bernominal TETAP per transaksi sukses (akad ijarah/ju'alah),
--     bukan persentase dari nilai barang. Nominalnya DISALIN ke kolom platform_fee_amount saat
--     kesepakatan dibuat, supaya perubahan tarif belakangan tidak mengubah biaya kesepakatan yang
--     sudah disetujui.
--
--   * Ujrah ditagih ke PENJUAL lewat faktur bertipe "marketplace_fee" yang menumpuk sampai
--     dibayar. Tipe itu TIDAK perlu perubahan skema: kolom subscription_invoices.type adalah text
--     biasa (enum-nya hanya berlaku di sisi TypeScript), jadi nilai baru langsung bisa dipakai.
--
-- AMAN DIJALANKAN ULANG: seluruhnya CREATE TABLE/INDEX IF NOT EXISTS.
--
-- Catatan: id dan created_at/updated_at selalu diisi aplikasi (crypto.randomUUID dan
-- toISOString lewat $defaultFn di Drizzle), jadi default di bawah hanya jaring pengaman untuk
-- insert manual lewat SQL — formatnya sengaja dibuat persis sama dengan ISO milik JavaScript
-- supaya perbandingan tanggal berbasis string di kode tidak melenceng untuk baris semacam itu.

BEGIN;

CREATE TABLE IF NOT EXISTS marketplace_listings (
  id           text PRIMARY KEY,
  outlet_id    text NOT NULL REFERENCES outlets(id),
  title        text NOT NULL,
  description  text,
  category     text NOT NULL DEFAULT 'other',
  condition    text NOT NULL DEFAULT 'used',
  qty          integer NOT NULL DEFAULT 1,
  price        double precision NOT NULL,
  negotiable   boolean NOT NULL DEFAULT true,
  city         text,
  contact_phone text,
  image_url    text,
  status       text NOT NULL DEFAULT 'active',
  created_at   text NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  updated_at   text NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);

CREATE INDEX IF NOT EXISTS marketplace_listings_status_idx ON marketplace_listings(status);
CREATE INDEX IF NOT EXISTS marketplace_listings_outlet_idx ON marketplace_listings(outlet_id);

CREATE TABLE IF NOT EXISTS marketplace_deals (
  id                      text PRIMARY KEY,
  deal_number             text NOT NULL UNIQUE,
  listing_id              text NOT NULL REFERENCES marketplace_listings(id),
  seller_outlet_id        text NOT NULL REFERENCES outlets(id),
  buyer_outlet_id         text NOT NULL REFERENCES outlets(id),
  qty                     integer NOT NULL DEFAULT 1,
  agreed_price            double precision NOT NULL,
  platform_fee_amount     double precision NOT NULL DEFAULT 0,
  platform_fee_status     text NOT NULL DEFAULT 'pending',
  platform_fee_invoice_id text,
  status                  text NOT NULL DEFAULT 'requested',
  buyer_note              text,
  seller_note             text,
  settlement_method       text,
  seller_other_income_id  text,
  completed_at            text,
  closed_reason           text,
  created_at              text NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  updated_at              text NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);

CREATE INDEX IF NOT EXISTS marketplace_deals_seller_idx ON marketplace_deals(seller_outlet_id);
CREATE INDEX IF NOT EXISTS marketplace_deals_buyer_idx  ON marketplace_deals(buyer_outlet_id);

COMMIT;

-- CATATAN RLS. Kedua tabel ini SENGAJA lintas-outlet — itu memang gunanya: outlet A harus bisa
-- melihat barang outlet B. Jadi kebijakan RLS per-outlet seperti di 0001/0002 TIDAK diterapkan apa
-- adanya di sini. Penyaringan dilakukan di lapisan aplikasi (lib/marketplace/service.ts):
-- listPublicListings hanya mengembalikan listing berstatus 'active' milik outlet LAIN, dan
-- listDeals hanya mengembalikan kesepakatan yang outlet peminta menjadi salah satu pihaknya.
--
-- VERIFIKASI (jalankan terpisah; seharusnya menampilkan dua baris):
--
--   SELECT table_name FROM information_schema.tables
--   WHERE table_name IN ('marketplace_listings','marketplace_deals');
