-- Rekomendasi vendor (mis. Fastpay di halaman PPOB), 2026-10-12. Lihat src/lib/vendor-recommendations.
--  - platform_vendor_recommendations        : isi kartu rekomendasi, diatur di /platform-admin/vendor-recommendations.
--  - platform_vendor_recommendation_events  : indikator performa (dilihat / klik / disembunyikan) per outlet.
-- Tabel baru saja — tidak mengubah tabel lama. Sebelum migrasi dijalankan, kartu tidak tampil dan
-- halaman PPOB tetap normal. AMAN DIJALANKAN ULANG.

BEGIN;

CREATE TABLE IF NOT EXISTS platform_vendor_recommendations (
  id                 text PRIMARY KEY,
  placement          text NOT NULL DEFAULT 'ppob',
  vendor_name        text NOT NULL,
  badge              text,
  headline           text NOT NULL,
  body               text,
  benefits_json      text,
  promo_text         text,
  primary_label      text NOT NULL,
  primary_url        text NOT NULL,
  secondary_label    text,
  secondary_url      text,
  info_label         text,
  info_url           text,
  logo_url           text,
  footnote           text,
  disclosure         text,
  countries          text NOT NULL DEFAULT 'ID',
  is_active          boolean NOT NULL DEFAULT true,
  sort_order         integer NOT NULL DEFAULT 0,
  starts_at          text,
  ends_at            text,
  confirmed_signups  integer NOT NULL DEFAULT 0,
  updated_by         text REFERENCES platform_admins(id),
  created_at         text NOT NULL,
  updated_at         text NOT NULL
);

CREATE TABLE IF NOT EXISTS platform_vendor_recommendation_events (
  id                 text PRIMARY KEY,
  recommendation_id  text NOT NULL REFERENCES platform_vendor_recommendations(id) ON DELETE CASCADE,
  outlet_id          text REFERENCES outlets(id),
  staff_user_id      text,
  event              text NOT NULL,
  target             text,
  created_at         text NOT NULL
);
CREATE INDEX IF NOT EXISTS pvr_events_rec_time_idx ON platform_vendor_recommendation_events (recommendation_id, created_at);
CREATE INDEX IF NOT EXISTS pvr_events_outlet_rec_idx ON platform_vendor_recommendation_events (outlet_id, recommendation_id, event);

-- Tabel internal (diakses server saja): RLS aktif TANPA policy, sama seperti platform_leads.
alter table public.platform_vendor_recommendations enable row level security;
alter table public.platform_vendor_recommendation_events enable row level security;

-- Rekomendasi awal: Fastpay di halaman PPOB (bisa diubah/dinonaktifkan di platform-admin).
INSERT INTO platform_vendor_recommendations (
  id, placement, vendor_name, badge, headline, body, benefits_json, promo_text,
  primary_label, primary_url, secondary_label, secondary_url, info_label, info_url,
  footnote, disclosure, countries, is_active, sort_order, created_at, updated_at
)
SELECT
  'vendor-rec-fastpay-ppob', 'ppob', 'Fastpay', 'Peluang pendapatan tambahan',
  'Tambah pemasukan dari PPOB & layanan keuangan — di meja kasir yang sama',
  'Usaha digital nggak akan habis kemakan tren. Pelanggan yang sedang menunggu atau selesai main bisa sekalian beli pulsa, token listrik, top-up e-wallet, bayar tagihan, transfer, sampai tarik tunai. Dengan aplikasi Fastpay outlet Anda menjadi agen resmi, dan setiap transaksinya tetap bisa dicatat di menu PPOB NEXBILL supaya margin dan saldo deposit masuk laporan.',
  '["Bayar sekali tanpa biaya bulanan — paket mulai Rp97.000*","Pulsa & paket data semua operator, token & tagihan PLN, PDAM, BPJS, top-up GoPay/OVO/DANA/ShopeePay, voucher game","Transfer bank, setor & tarik tunai, tiket pesawat/kereta/PELNI, kirim paket","Margin & saldo deposit tercatat otomatis di menu PPOB NEXBILL"]',
  'Diskon langsung Rp50.000 bila mendaftar lewat tautan resmi di bawah.',
  'Daftar & dapatkan diskon Rp50.000', 'https://www.fastpay.co.id/?FA1013931',
  'Daftar lewat aplikasi (Play Store)', 'https://fastpayindonesia.id/ajakbisnis/Usuh',
  'Pelajari peluang usahanya', 'https://www.fastpay.co.id/peluang-ajak-mitra',
  '*Harga paket menurut aplikasi Fastpay per Oktober 2026 dan dapat berubah sewaktu-waktu. Cek harga terbaru saat mendaftar.',
  'Rekomendasi mitra NEXBILL. NEXBILL dapat menerima komisi referral bila Anda mendaftar lewat tautan ini — harga untuk Anda tidak bertambah.',
  'ID', true, 0, to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
WHERE NOT EXISTS (SELECT 1 FROM platform_vendor_recommendations WHERE id = 'vendor-rec-fastpay-ppob');

COMMIT;
