-- Struktur harga baru NEXBILL, 2026-10-03 (lihat src/lib/subscription/pricing.ts).
--
--   Starter : Rp6.000 / unit PS / bulan, minimal 5 unit — fitur operasional (billing, kasir,
--             booking, kontrol TV, QR pelanggan). Akuntansi, aset, PPOB, anti-fraud, multi-cabang,
--             rental ke rumah TERKUNCI; AI lewat AI Add-on.
--   Pro     : Rp199.000 / outlet / bulan flat — unit tak terbatas + semua fitur + AI.
--   Multi-cabang : outlet Pro ke-2 dst dalam satu grup penagihan diskon 20%.
--   Tahunan : bayar 10 bulan, aktif 12 bulan.
--   Trial 30 hari tetap (akses penuh). Status free_forever TIDAK disentuh.
--
-- Data lama: paket "standard" (Rp249.000) DIUBAH menjadi paket "pro" (Rp199.000) — id-nya sama,
-- jadi semua langganan aktif otomatis pindah ke Pro dengan harga lebih murah. Tagihan langganan
-- yang BELUM dibayar dengan harga lama dikedaluwarsakan supaya dibuat ulang dengan harga baru.
--
-- JALANKAN SEBELUM deploy. subscription_plans, subscriptions, dan subscription_invoices dibaca
-- dengan select() semua kolom — tanpa migrasi ini halaman Langganan & dashboard gagal.
-- AMAN DIJALANKAN ULANG.

BEGIN;

ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'pro';
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS pricing_model text NOT NULL DEFAULT 'flat';
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS min_units integer NOT NULL DEFAULT 1;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS annual_months_charged integer NOT NULL DEFAULT 10;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS multi_outlet_discount_pct integer NOT NULL DEFAULT 20;

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_units integer NOT NULL DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS next_plan_id text REFERENCES subscription_plans(id);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS next_billing_cycle text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS next_plan_units integer;

ALTER TABLE subscription_invoices ADD COLUMN IF NOT EXISTS period_months integer;
ALTER TABLE subscription_invoices ADD COLUMN IF NOT EXISTS target_plan_id text REFERENCES subscription_plans(id);
ALTER TABLE subscription_invoices ADD COLUMN IF NOT EXISTS target_billing_cycle text;
ALTER TABLE subscription_invoices ADD COLUMN IF NOT EXISTS target_plan_units integer;

-- Paket lama "standard" → "pro" (hanya kalau "pro" belum ada).
UPDATE subscription_plans
   SET code = 'pro', name = 'NEXBILL Pro', tier = 'pro', pricing_model = 'flat',
       price_original = 199000, price_current = 199000, min_units = 1,
       annual_months_charged = 10, multi_outlet_discount_pct = 20,
       unlimited_entitlement = true, included_consoles = 0, extra_console_price = 0,
       is_active = true, sort_order = 2, updated_at = to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
 WHERE code = 'standard'
   AND NOT EXISTS (SELECT 1 FROM subscription_plans WHERE code = 'pro');

INSERT INTO subscription_plans (id, code, name, price_original, price_current, included_consoles, extra_console_price,
                                unlimited_entitlement, tier, pricing_model, min_units, annual_months_charged,
                                multi_outlet_discount_pct, is_active, sort_order, created_at, updated_at)
SELECT gen_random_uuid()::text, 'pro', 'NEXBILL Pro', 199000, 199000, 0, 0, true, 'pro', 'flat', 1, 10, 20, true, 2,
       to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE code = 'pro');

INSERT INTO subscription_plans (id, code, name, price_original, price_current, included_consoles, extra_console_price,
                                unlimited_entitlement, tier, pricing_model, min_units, annual_months_charged,
                                multi_outlet_discount_pct, is_active, sort_order, created_at, updated_at)
SELECT gen_random_uuid()::text, 'starter', 'NEXBILL Starter', 6000, 6000, 0, 0, false, 'starter', 'per_unit', 5, 10, 0, true, 1,
       to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE code = 'starter');

-- Paket lain selain starter/pro (kalau pernah dibuat manual) dinonaktifkan dari katalog; langganan
-- yang masih memakainya tetap jalan dan diperlakukan sebagai Pro.
UPDATE subscription_plans SET is_active = false WHERE code NOT IN ('starter', 'pro');

-- Produk "Slot Konsol Tambahan" (model harga lama) tidak dipakai lagi.
UPDATE platform_products SET is_active = false WHERE category = 'extra_console';

-- Tagihan langganan belum dibayar dengan harga lama → kedaluwarsa, dibuat ulang otomatis.
UPDATE subscription_invoices
   SET status = 'expired', cancel_reason = 'repriced_2026_10', method = NULL, provider_ref = NULL,
       qr_string = NULL, qr_image_url = NULL, va_number = NULL, va_bank_code = NULL
 WHERE status = 'unpaid' AND type IN ('subscription_fee', 'group_renewal', 'cart_order', 'extra_console');

-- Outlet yang sedang di tengah checkout pertama (pending_payment) dikembalikan ke status sebelum
-- checkout supaya bisa memilih paket Starter/Pro baru.
UPDATE subscriptions
   SET status = CASE WHEN trial_ends_at > to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') THEN 'trial' ELSE 'trial_expired' END
 WHERE status = 'pending_payment';

COMMIT;

-- VERIFIKASI:
-- SELECT code, name, tier, pricing_model, price_current, min_units, is_active FROM subscription_plans ORDER BY sort_order;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name IN ('billing_cycle','plan_units');
