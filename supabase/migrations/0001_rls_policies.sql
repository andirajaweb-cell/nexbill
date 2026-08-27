-- RLS (Row Level Security) policies for multi-tenant isolation.
-- Idempotent: safe to re-run this whole file from scratch any number of times
-- (drops+recreates each policy, enable/force RLS are no-ops if already set).
-- Opsi B: policies are defined and ENABLED now, but the app currently connects
-- using a role that owns the tables (bypasses RLS by default in Postgres). These
-- policies become real enforcement once the app connects via a non-owner, non-
-- superuser, non-BYPASSRLS role AND sets app.outlet_id per request (Opsi A, planned
-- as a follow-up). Until then, treat this file as "armed but not yet live" --
-- app-level outlet_id checks (already hardened across ~200 routes) remain the
-- actual enforcement layer in the meantime.

create or replace function app_current_outlet_id() returns text as $$
  select nullif(current_setting('app.outlet_id', true), '')
$$ language sql stable;

-- ============ outlets (special: scoped by its own id, not outlet_id) ============
alter table public.outlets enable row level security;
alter table public.outlets force row level security;
drop policy if exists tenant_isolation on public.outlets;
create policy tenant_isolation on public.outlets
  using (id = app_current_outlet_id())
  with check (id = app_current_outlet_id());

-- ============ customers (outlet_id is nullable for legacy rows) ============
alter table public.customers enable row level security;
alter table public.customers force row level security;
drop policy if exists tenant_isolation on public.customers;
create policy tenant_isolation on public.customers
  using (outlet_id = app_current_outlet_id() or outlet_id is null)
  with check (outlet_id = app_current_outlet_id());

-- ============ direct outlet_id tables ============
alter table public.staff_users enable row level security;
alter table public.staff_users force row level security;
drop policy if exists tenant_isolation on public.staff_users;
create policy tenant_isolation on public.staff_users
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.devices enable row level security;
alter table public.devices force row level security;
drop policy if exists tenant_isolation on public.devices;
create policy tenant_isolation on public.devices
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.relay_agents enable row level security;
alter table public.relay_agents force row level security;
drop policy if exists tenant_isolation on public.relay_agents;
create policy tenant_isolation on public.relay_agents
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.rental_units enable row level security;
alter table public.rental_units force row level security;
drop policy if exists tenant_isolation on public.rental_units;
create policy tenant_isolation on public.rental_units
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.promos enable row level security;
alter table public.promos force row level security;
drop policy if exists tenant_isolation on public.promos;
create policy tenant_isolation on public.promos
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.banners enable row level security;
alter table public.banners force row level security;
drop policy if exists tenant_isolation on public.banners;
create policy tenant_isolation on public.banners
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.rental_sessions enable row level security;
alter table public.rental_sessions force row level security;
drop policy if exists tenant_isolation on public.rental_sessions;
create policy tenant_isolation on public.rental_sessions
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.products enable row level security;
alter table public.products force row level security;
drop policy if exists tenant_isolation on public.products;
create policy tenant_isolation on public.products
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.orders enable row level security;
alter table public.orders force row level security;
drop policy if exists tenant_isolation on public.orders;
create policy tenant_isolation on public.orders
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.agent_settings enable row level security;
alter table public.agent_settings force row level security;
drop policy if exists tenant_isolation on public.agent_settings;
create policy tenant_isolation on public.agent_settings
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.tuya_settings enable row level security;
alter table public.tuya_settings force row level security;
drop policy if exists tenant_isolation on public.tuya_settings;
create policy tenant_isolation on public.tuya_settings
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.accounts enable row level security;
alter table public.accounts force row level security;
drop policy if exists tenant_isolation on public.accounts;
create policy tenant_isolation on public.accounts
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.account_mappings enable row level security;
alter table public.account_mappings force row level security;
drop policy if exists tenant_isolation on public.account_mappings;
create policy tenant_isolation on public.account_mappings
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.journal_entries enable row level security;
alter table public.journal_entries force row level security;
drop policy if exists tenant_isolation on public.journal_entries;
create policy tenant_isolation on public.journal_entries
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.cash_bank_accounts enable row level security;
alter table public.cash_bank_accounts force row level security;
drop policy if exists tenant_isolation on public.cash_bank_accounts;
create policy tenant_isolation on public.cash_bank_accounts
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.ppob_transactions enable row level security;
alter table public.ppob_transactions force row level security;
drop policy if exists tenant_isolation on public.ppob_transactions;
create policy tenant_isolation on public.ppob_transactions
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.ppob_price_rules enable row level security;
alter table public.ppob_price_rules force row level security;
drop policy if exists tenant_isolation on public.ppob_price_rules;
create policy tenant_isolation on public.ppob_price_rules
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.payment_methods enable row level security;
alter table public.payment_methods force row level security;
drop policy if exists tenant_isolation on public.payment_methods;
create policy tenant_isolation on public.payment_methods
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.cash_movements enable row level security;
alter table public.cash_movements force row level security;
drop policy if exists tenant_isolation on public.cash_movements;
create policy tenant_isolation on public.cash_movements
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.receivables enable row level security;
alter table public.receivables force row level security;
drop policy if exists tenant_isolation on public.receivables;
create policy tenant_isolation on public.receivables
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.cost_centers enable row level security;
alter table public.cost_centers force row level security;
drop policy if exists tenant_isolation on public.cost_centers;
create policy tenant_isolation on public.cost_centers
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.expenses enable row level security;
alter table public.expenses force row level security;
drop policy if exists tenant_isolation on public.expenses;
create policy tenant_isolation on public.expenses
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.other_incomes enable row level security;
alter table public.other_incomes force row level security;
drop policy if exists tenant_isolation on public.other_incomes;
create policy tenant_isolation on public.other_incomes
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.recurring_expense_templates enable row level security;
alter table public.recurring_expense_templates force row level security;
drop policy if exists tenant_isolation on public.recurring_expense_templates;
create policy tenant_isolation on public.recurring_expense_templates
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.fixed_assets enable row level security;
alter table public.fixed_assets force row level security;
drop policy if exists tenant_isolation on public.fixed_assets;
create policy tenant_isolation on public.fixed_assets
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.suppliers enable row level security;
alter table public.suppliers force row level security;
drop policy if exists tenant_isolation on public.suppliers;
create policy tenant_isolation on public.suppliers
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.purchase_orders enable row level security;
alter table public.purchase_orders force row level security;
drop policy if exists tenant_isolation on public.purchase_orders;
create policy tenant_isolation on public.purchase_orders
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.purchase_invoices enable row level security;
alter table public.purchase_invoices force row level security;
drop policy if exists tenant_isolation on public.purchase_invoices;
create policy tenant_isolation on public.purchase_invoices
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.purchase_returns enable row level security;
alter table public.purchase_returns force row level security;
drop policy if exists tenant_isolation on public.purchase_returns;
create policy tenant_isolation on public.purchase_returns
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.warehouses enable row level security;
alter table public.warehouses force row level security;
drop policy if exists tenant_isolation on public.warehouses;
create policy tenant_isolation on public.warehouses
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.stock_opnames enable row level security;
alter table public.stock_opnames force row level security;
drop policy if exists tenant_isolation on public.stock_opnames;
create policy tenant_isolation on public.stock_opnames
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.membership_tiers enable row level security;
alter table public.membership_tiers force row level security;
drop policy if exists tenant_isolation on public.membership_tiers;
create policy tenant_isolation on public.membership_tiers
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.vouchers enable row level security;
alter table public.vouchers force row level security;
drop policy if exists tenant_isolation on public.vouchers;
create policy tenant_isolation on public.vouchers
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.loyalty_rewards enable row level security;
alter table public.loyalty_rewards force row level security;
drop policy if exists tenant_isolation on public.loyalty_rewards;
create policy tenant_isolation on public.loyalty_rewards
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.loyalty_redemptions enable row level security;
alter table public.loyalty_redemptions force row level security;
drop policy if exists tenant_isolation on public.loyalty_redemptions;
create policy tenant_isolation on public.loyalty_redemptions
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.bookings enable row level security;
alter table public.bookings force row level security;
drop policy if exists tenant_isolation on public.bookings;
create policy tenant_isolation on public.bookings
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.booking_notifications enable row level security;
alter table public.booking_notifications force row level security;
drop policy if exists tenant_isolation on public.booking_notifications;
create policy tenant_isolation on public.booking_notifications
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.pricing_rules enable row level security;
alter table public.pricing_rules force row level security;
drop policy if exists tenant_isolation on public.pricing_rules;
create policy tenant_isolation on public.pricing_rules
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.shifts enable row level security;
alter table public.shifts force row level security;
drop policy if exists tenant_isolation on public.shifts;
create policy tenant_isolation on public.shifts
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.approval_requests enable row level security;
alter table public.approval_requests force row level security;
drop policy if exists tenant_isolation on public.approval_requests;
create policy tenant_isolation on public.approval_requests
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.audit_logs enable row level security;
alter table public.audit_logs force row level security;
drop policy if exists tenant_isolation on public.audit_logs;
create policy tenant_isolation on public.audit_logs
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.home_rental_products enable row level security;
alter table public.home_rental_products force row level security;
drop policy if exists tenant_isolation on public.home_rental_products;
create policy tenant_isolation on public.home_rental_products
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.home_rental_packages enable row level security;
alter table public.home_rental_packages force row level security;
drop policy if exists tenant_isolation on public.home_rental_packages;
create policy tenant_isolation on public.home_rental_packages
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.home_rental_rentals enable row level security;
alter table public.home_rental_rentals force row level security;
drop policy if exists tenant_isolation on public.home_rental_rentals;
create policy tenant_isolation on public.home_rental_rentals
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.subscription_invoices enable row level security;
alter table public.subscription_invoices force row level security;
drop policy if exists tenant_isolation on public.subscription_invoices;
create policy tenant_isolation on public.subscription_invoices
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.smart_plug_orders enable row level security;
alter table public.smart_plug_orders force row level security;
drop policy if exists tenant_isolation on public.smart_plug_orders;
create policy tenant_isolation on public.smart_plug_orders
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.subscription_events enable row level security;
alter table public.subscription_events force row level security;
drop policy if exists tenant_isolation on public.subscription_events;
create policy tenant_isolation on public.subscription_events
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.units enable row level security;
alter table public.units force row level security;
drop policy if exists tenant_isolation on public.units;
create policy tenant_isolation on public.units
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.loyalty_play_point_rates enable row level security;
alter table public.loyalty_play_point_rates force row level security;
drop policy if exists tenant_isolation on public.loyalty_play_point_rates;
create policy tenant_isolation on public.loyalty_play_point_rates
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.feature_flags enable row level security;
alter table public.feature_flags force row level security;
drop policy if exists tenant_isolation on public.feature_flags;
create policy tenant_isolation on public.feature_flags
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.home_rental_assets enable row level security;
alter table public.home_rental_assets force row level security;
drop policy if exists tenant_isolation on public.home_rental_assets;
create policy tenant_isolation on public.home_rental_assets
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.home_rental_customer_risk enable row level security;
alter table public.home_rental_customer_risk force row level security;
drop policy if exists tenant_isolation on public.home_rental_customer_risk;
create policy tenant_isolation on public.home_rental_customer_risk
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.subscriptions enable row level security;
alter table public.subscriptions force row level security;
drop policy if exists tenant_isolation on public.subscriptions;
create policy tenant_isolation on public.subscriptions
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

-- ============ indirect (child) tables — scoped via parent's outlet_id ============
alter table public.session_accessories enable row level security;
alter table public.session_accessories force row level security;
drop policy if exists tenant_isolation on public.session_accessories;
create policy tenant_isolation on public.session_accessories
  using (exists (
    select 1 from public.rental_sessions p
    where p.id = session_accessories.rental_session_id and p.outlet_id = app_current_outlet_id()
  ))
  with check (exists (
    select 1 from public.rental_sessions p
    where p.id = session_accessories.rental_session_id and p.outlet_id = app_current_outlet_id()
  ));

alter table public.stock_movements enable row level security;
alter table public.stock_movements force row level security;
drop policy if exists tenant_isolation on public.stock_movements;
create policy tenant_isolation on public.stock_movements
  using (exists (
    select 1 from public.products p
    where p.id = stock_movements.product_id and p.outlet_id = app_current_outlet_id()
  ))
  with check (exists (
    select 1 from public.products p
    where p.id = stock_movements.product_id and p.outlet_id = app_current_outlet_id()
  ));

alter table public.order_items enable row level security;
alter table public.order_items force row level security;
drop policy if exists tenant_isolation on public.order_items;
create policy tenant_isolation on public.order_items
  using (exists (
    select 1 from public.orders p
    where p.id = order_items.order_id and p.outlet_id = app_current_outlet_id()
  ))
  with check (exists (
    select 1 from public.orders p
    where p.id = order_items.order_id and p.outlet_id = app_current_outlet_id()
  ));

alter table public.payments enable row level security;
alter table public.payments force row level security;
drop policy if exists tenant_isolation on public.payments;
create policy tenant_isolation on public.payments
  using (exists (
    select 1 from public.orders p
    where p.id = payments.order_id and p.outlet_id = app_current_outlet_id()
  ))
  with check (exists (
    select 1 from public.orders p
    where p.id = payments.order_id and p.outlet_id = app_current_outlet_id()
  ));

alter table public.journal_lines enable row level security;
alter table public.journal_lines force row level security;
drop policy if exists tenant_isolation on public.journal_lines;
create policy tenant_isolation on public.journal_lines
  using (exists (
    select 1 from public.journal_entries p
    where p.id = journal_lines.journal_entry_id and p.outlet_id = app_current_outlet_id()
  ))
  with check (exists (
    select 1 from public.journal_entries p
    where p.id = journal_lines.journal_entry_id and p.outlet_id = app_current_outlet_id()
  ));

alter table public.asset_depreciation_entries enable row level security;
alter table public.asset_depreciation_entries force row level security;
drop policy if exists tenant_isolation on public.asset_depreciation_entries;
create policy tenant_isolation on public.asset_depreciation_entries
  using (exists (
    select 1 from public.fixed_assets p
    where p.id = asset_depreciation_entries.fixed_asset_id and p.outlet_id = app_current_outlet_id()
  ))
  with check (exists (
    select 1 from public.fixed_assets p
    where p.id = asset_depreciation_entries.fixed_asset_id and p.outlet_id = app_current_outlet_id()
  ));

alter table public.asset_maintenance_logs enable row level security;
alter table public.asset_maintenance_logs force row level security;
drop policy if exists tenant_isolation on public.asset_maintenance_logs;
create policy tenant_isolation on public.asset_maintenance_logs
  using (exists (
    select 1 from public.fixed_assets p
    where p.id = asset_maintenance_logs.fixed_asset_id and p.outlet_id = app_current_outlet_id()
  ))
  with check (exists (
    select 1 from public.fixed_assets p
    where p.id = asset_maintenance_logs.fixed_asset_id and p.outlet_id = app_current_outlet_id()
  ));

alter table public.purchase_order_items enable row level security;
alter table public.purchase_order_items force row level security;
drop policy if exists tenant_isolation on public.purchase_order_items;
create policy tenant_isolation on public.purchase_order_items
  using (exists (
    select 1 from public.purchase_orders p
    where p.id = purchase_order_items.purchase_order_id and p.outlet_id = app_current_outlet_id()
  ))
  with check (exists (
    select 1 from public.purchase_orders p
    where p.id = purchase_order_items.purchase_order_id and p.outlet_id = app_current_outlet_id()
  ));

alter table public.purchase_payments enable row level security;
alter table public.purchase_payments force row level security;
drop policy if exists tenant_isolation on public.purchase_payments;
create policy tenant_isolation on public.purchase_payments
  using (exists (
    select 1 from public.purchase_invoices p
    where p.id = purchase_payments.purchase_invoice_id and p.outlet_id = app_current_outlet_id()
  ))
  with check (exists (
    select 1 from public.purchase_invoices p
    where p.id = purchase_payments.purchase_invoice_id and p.outlet_id = app_current_outlet_id()
  ));

alter table public.stock_opname_items enable row level security;
alter table public.stock_opname_items force row level security;
drop policy if exists tenant_isolation on public.stock_opname_items;
create policy tenant_isolation on public.stock_opname_items
  using (exists (
    select 1 from public.stock_opnames p
    where p.id = stock_opname_items.stock_opname_id and p.outlet_id = app_current_outlet_id()
  ))
  with check (exists (
    select 1 from public.stock_opnames p
    where p.id = stock_opname_items.stock_opname_id and p.outlet_id = app_current_outlet_id()
  ));

alter table public.recipes enable row level security;
alter table public.recipes force row level security;
drop policy if exists tenant_isolation on public.recipes;
create policy tenant_isolation on public.recipes
  using (exists (
    select 1 from public.products p
    where p.id = recipes.product_id and p.outlet_id = app_current_outlet_id()
  ))
  with check (exists (
    select 1 from public.products p
    where p.id = recipes.product_id and p.outlet_id = app_current_outlet_id()
  ));

alter table public.shift_cash_counts enable row level security;
alter table public.shift_cash_counts force row level security;
drop policy if exists tenant_isolation on public.shift_cash_counts;
create policy tenant_isolation on public.shift_cash_counts
  using (exists (
    select 1 from public.shifts p
    where p.id = shift_cash_counts.shift_id and p.outlet_id = app_current_outlet_id()
  ))
  with check (exists (
    select 1 from public.shifts p
    where p.id = shift_cash_counts.shift_id and p.outlet_id = app_current_outlet_id()
  ));

alter table public.shift_balance_checks enable row level security;
alter table public.shift_balance_checks force row level security;
drop policy if exists tenant_isolation on public.shift_balance_checks;
create policy tenant_isolation on public.shift_balance_checks
  using (exists (
    select 1 from public.shifts p
    where p.id = shift_balance_checks.shift_id and p.outlet_id = app_current_outlet_id()
  ))
  with check (exists (
    select 1 from public.shifts p
    where p.id = shift_balance_checks.shift_id and p.outlet_id = app_current_outlet_id()
  ));

alter table public.home_rental_package_items enable row level security;
alter table public.home_rental_package_items force row level security;
drop policy if exists tenant_isolation on public.home_rental_package_items;
create policy tenant_isolation on public.home_rental_package_items
  using (exists (
    select 1 from public.home_rental_packages p
    where p.id = home_rental_package_items.package_id and p.outlet_id = app_current_outlet_id()
  ))
  with check (exists (
    select 1 from public.home_rental_packages p
    where p.id = home_rental_package_items.package_id and p.outlet_id = app_current_outlet_id()
  ));

alter table public.home_rental_rental_items enable row level security;
alter table public.home_rental_rental_items force row level security;
drop policy if exists tenant_isolation on public.home_rental_rental_items;
create policy tenant_isolation on public.home_rental_rental_items
  using (exists (
    select 1 from public.home_rental_rentals p
    where p.id = home_rental_rental_items.rental_id and p.outlet_id = app_current_outlet_id()
  ))
  with check (exists (
    select 1 from public.home_rental_rentals p
    where p.id = home_rental_rental_items.rental_id and p.outlet_id = app_current_outlet_id()
  ));

alter table public.home_rental_rental_assets enable row level security;
alter table public.home_rental_rental_assets force row level security;
drop policy if exists tenant_isolation on public.home_rental_rental_assets;
create policy tenant_isolation on public.home_rental_rental_assets
  using (exists (
    select 1 from public.home_rental_rentals p
    where p.id = home_rental_rental_assets.rental_id and p.outlet_id = app_current_outlet_id()
  ))
  with check (exists (
    select 1 from public.home_rental_rentals p
    where p.id = home_rental_rental_assets.rental_id and p.outlet_id = app_current_outlet_id()
  ));

-- ============ loyalty_transactions (scoped via customer_id -> customers.outlet_id;
--   customers.outlet_id is nullable for legacy rows, mirrored here the same way) ============
alter table public.loyalty_transactions enable row level security;
alter table public.loyalty_transactions force row level security;
drop policy if exists tenant_isolation on public.loyalty_transactions;
create policy tenant_isolation on public.loyalty_transactions
  using (exists (
    select 1 from public.customers c
    where c.id = loyalty_transactions.customer_id
      and (c.outlet_id = app_current_outlet_id() or c.outlet_id is null)
  ))
  with check (exists (
    select 1 from public.customers c
    where c.id = loyalty_transactions.customer_id
      and c.outlet_id = app_current_outlet_id()
  ));

-- ============ recipe_ingredients (2-hop: -> recipes -> products) ============
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_ingredients force row level security;
drop policy if exists tenant_isolation on public.recipe_ingredients;
create policy tenant_isolation on public.recipe_ingredients
  using (exists (
    select 1 from public.recipes r
    join public.products p on p.id = r.product_id
    where r.id = recipe_ingredients.recipe_id and p.outlet_id = app_current_outlet_id()
  ))
  with check (exists (
    select 1 from public.recipes r
    join public.products p on p.id = r.product_id
    where r.id = recipe_ingredients.recipe_id and p.outlet_id = app_current_outlet_id()
  ));

-- ============ subscription_plans (global, platform-managed catalog) ============
alter table public.subscription_plans enable row level security;
drop policy if exists public_read on public.subscription_plans;
create policy public_read on public.subscription_plans for select using (true);

-- ============ platform_admins (platform-only — NOT exposed to any tenant connection) ============
alter table public.platform_admins enable row level security;
alter table public.platform_admins force row level security;

-- ============ KNOWN GAPS — deliberately left WITHOUT outlet RLS in this pass ============
-- role_permissions: currently a single GLOBAL role/permission matrix shared by every
--   outlet. chat_threads / chat_messages: no outlet_id anywhere in the chain today.
--   See earlier migration notes.
