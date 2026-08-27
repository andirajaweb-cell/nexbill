-- Extends 0001_rls_policies.sql / 0002_rls_gap_tables.sql to cover tables added AFTER those
-- passes, in the referral program, membership fee, deposit channel, Home Rental policy engine,
-- market-risk cross-border pricing, and platform storefront/COGS/announcements work:
--   membership_payments, deposit_balance_channels, home_rental_policy_rules,
--   referral_partners, referral_conversions, referral_commissions, referral_payouts,
--   affiliate_products, market_risk_currencies, platform_announcements, platform_purchases,
--   platform_tuya_account.
--
-- Same status as 0001/0002: policies are defined and ENABLED now, but remain "armed but not
-- live" until the app connects via a non-owner/non-BYPASSRLS role AND sets app.outlet_id per
-- request (see 0001's header + 0003_tenant_role.sql). The actual enforcement layer today is
-- still the app-level outlet_id checks in every route. Idempotent — safe to re-run.
--
-- Also note: 0001's policy on `tuya_settings` is now orphaned — that table was dropped and
-- replaced by `platform_tuya_account` (single shared Tuya Cloud API account, see schema.ts)
-- during the Tuya single-account migration. Harmless (a policy on a dropped table is simply
-- gone with it), but this file is what actually protects its successor table.

-- ============ membership_payments (direct outlet_id — real money: membership fee sales ledger) ============
alter table public.membership_payments enable row level security;
alter table public.membership_payments force row level security;
drop policy if exists tenant_isolation on public.membership_payments;
create policy tenant_isolation on public.membership_payments
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

-- ============ deposit_balance_channels (direct outlet_id) ============
alter table public.deposit_balance_channels enable row level security;
alter table public.deposit_balance_channels force row level security;
drop policy if exists tenant_isolation on public.deposit_balance_channels;
create policy tenant_isolation on public.deposit_balance_channels
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

-- ============ home_rental_policy_rules (direct outlet_id) ============
alter table public.home_rental_policy_rules enable row level security;
alter table public.home_rental_policy_rules force row level security;
drop policy if exists tenant_isolation on public.home_rental_policy_rules;
create policy tenant_isolation on public.home_rental_policy_rules
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

-- ============ referral_partners (direct outlet_id, unique per outlet — commission balances) ============
alter table public.referral_partners enable row level security;
alter table public.referral_partners force row level security;
drop policy if exists tenant_isolation on public.referral_partners;
create policy tenant_isolation on public.referral_partners
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

-- ============ referral_conversions (indirect via referral_partner_id -> referral_partners.outlet_id) ============
-- Scoped to the REFERRING outlet's own visibility (getReferralDashboard reads by
-- referralPartnerId) — matches the actual query pattern today. referee_outlet_id (the outlet
-- that WAS referred) exists on this row too but is not read through directly anywhere in the
-- app yet; if a "who referred me" view is ever built, add an `or referee_outlet_id =
-- app_current_outlet_id()` branch then, same caveat style as outlet_memberships in 0002.
alter table public.referral_conversions enable row level security;
alter table public.referral_conversions force row level security;
drop policy if exists tenant_isolation on public.referral_conversions;
create policy tenant_isolation on public.referral_conversions
  using (exists (
    select 1 from public.referral_partners p
    where p.id = referral_conversions.referral_partner_id and p.outlet_id = app_current_outlet_id()
  ))
  with check (exists (
    select 1 from public.referral_partners p
    where p.id = referral_conversions.referral_partner_id and p.outlet_id = app_current_outlet_id()
  ));

-- ============ referral_commissions (indirect via referral_partner_id — append-only commission ledger) ============
alter table public.referral_commissions enable row level security;
alter table public.referral_commissions force row level security;
drop policy if exists tenant_isolation on public.referral_commissions;
create policy tenant_isolation on public.referral_commissions
  using (exists (
    select 1 from public.referral_partners p
    where p.id = referral_commissions.referral_partner_id and p.outlet_id = app_current_outlet_id()
  ))
  with check (exists (
    select 1 from public.referral_partners p
    where p.id = referral_commissions.referral_partner_id and p.outlet_id = app_current_outlet_id()
  ));

-- ============ referral_payouts (indirect via referral_partner_id — outlet reads its own payout history; NEXBILL ops record these from platform-admin's own separate connection, not this tenant role) ============
alter table public.referral_payouts enable row level security;
alter table public.referral_payouts force row level security;
drop policy if exists tenant_isolation on public.referral_payouts;
create policy tenant_isolation on public.referral_payouts
  using (exists (
    select 1 from public.referral_partners p
    where p.id = referral_payouts.referral_partner_id and p.outlet_id = app_current_outlet_id()
  ))
  with check (exists (
    select 1 from public.referral_partners p
    where p.id = referral_payouts.referral_partner_id and p.outlet_id = app_current_outlet_id()
  ));

-- ============ affiliate_products (global "Rekomendasi Produk" catalog, same pattern as platform_products) ============
alter table public.affiliate_products enable row level security;
drop policy if exists public_read on public.affiliate_products;
create policy public_read on public.affiliate_products for select using (true);

-- ============ market_risk_currencies (global FX rate book — every outlet's Billing page reads its resolved currency's rate; only platform-admin writes) ============
alter table public.market_risk_currencies enable row level security;
drop policy if exists public_read on public.market_risk_currencies;
create policy public_read on public.market_risk_currencies for select using (true);

-- ============ platform_announcements (broadcast when outlet_id is null, targeted when set — same "mine or null" pattern as customers in 0001) ============
alter table public.platform_announcements enable row level security;
drop policy if exists public_read on public.platform_announcements;
create policy public_read on public.platform_announcements for select
  using (outlet_id = app_current_outlet_id() or outlet_id is null);

-- ============ platform_purchases (NEXBILL's own internal COGS/procurement records — NOT exposed to any tenant connection, same treatment as platform_costs in 0002) ============
alter table public.platform_purchases enable row level security;
alter table public.platform_purchases force row level security;
-- No policy created deliberately — locked to nobody under the tenant-scoped role.
-- Platform-admin routes must use their own separate, elevated connection once real
-- enforcement is wired; they must NOT go through whatever role ends up used for
-- outlet-scoped app traffic.

-- ============ platform_tuya_account (single shared Tuya Cloud API credentials row — access secret lives here, MUST NOT be tenant-readable) ============
alter table public.platform_tuya_account enable row level security;
alter table public.platform_tuya_account force row level security;
-- No policy created deliberately, same reasoning as platform_purchases/platform_costs above —
-- this one is extra-sensitive (it holds the live Tuya Access ID/Secret used to control smart
-- plug hardware for every outlet), so it's even more important this stays locked to nobody
-- under the tenant-scoped role. Only /platform-admin/tuya (a separate, elevated connection)
-- may ever read or write this row.

-- ============ STILL-KNOWN GAPS — deliberately left without outlet RLS in this pass ============
-- role_permissions: single GLOBAL role/permission matrix shared by every outlet (unchanged from
--   0001/0002). chat_threads / chat_messages: no outlet_id anywhere in the chain (unchanged from
--   0001/0002 — see the design note on chatThreads in schema.ts). subscription_plans /
--   platform_admins / platform_costs: see 0001/0002, unchanged.
