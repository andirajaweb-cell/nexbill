-- Extends 0001_rls_policies.sql to cover tables added/discovered after that migration:
-- outlet_memberships, billing_groups (multi-outlet ownership feature), support_threads/
-- support_messages (outlet support chat), notification_reads (notification center),
-- platform_products/platform_costs (NEXBILL's own storefront catalog + internal costs).
--
-- Same status as 0001: policies are defined and ENABLED now, but remain "armed but not
-- live" until the app connects via a non-owner/non-BYPASSRLS role AND sets app.outlet_id
-- per request (see 0001's header comment and src/db/client.ts). Idempotent — safe to
-- re-run.

-- ============ outlet_memberships ============
-- CAVEAT, read before wiring real enforcement: this table's actual access pattern is
-- "which outlets can staff account X switch into" (see lib/outlets/membership.ts,
-- getAccessibleOutlets) — queried BY staff_user_id, deliberately returning outlets OTHER
-- than the one currently active. A plain outlet_id = app_current_outlet_id() policy (used
-- here for consistency with every other table, and because no app.staff_user_id session
-- variable exists yet) would make the multi-outlet switcher itself impossible to query
-- once this policy is actually enforced — it would only ever see the single already-active
-- outlet's own membership row, defeating the feature's entire purpose. Before flipping the
-- app to a non-owner role, either (a) add a second session variable (app.staff_user_id) and
-- rewrite this policy to key off that instead, or (b) have getAccessibleOutlets() use a
-- dedicated elevated connection that bypasses this particular policy. Do not enforce this
-- table as-is without addressing one of those.
alter table public.outlet_memberships enable row level security;
alter table public.outlet_memberships force row level security;
drop policy if exists tenant_isolation on public.outlet_memberships;
create policy tenant_isolation on public.outlet_memberships
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

-- ============ billing_groups (no outlet_id of its own — scoped via subscriptions.billing_group_id) ============
alter table public.billing_groups enable row level security;
alter table public.billing_groups force row level security;
drop policy if exists tenant_isolation on public.billing_groups;
create policy tenant_isolation on public.billing_groups
  using (exists (
    select 1 from public.subscriptions s
    where s.billing_group_id = billing_groups.id and s.outlet_id = app_current_outlet_id()
  ))
  with check (exists (
    select 1 from public.subscriptions s
    where s.billing_group_id = billing_groups.id and s.outlet_id = app_current_outlet_id()
  ));

-- ============ support_threads (direct outlet_id) ============
alter table public.support_threads enable row level security;
alter table public.support_threads force row level security;
drop policy if exists tenant_isolation on public.support_threads;
create policy tenant_isolation on public.support_threads
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

-- ============ support_messages (indirect via support_threads.thread_id) ============
alter table public.support_messages enable row level security;
alter table public.support_messages force row level security;
drop policy if exists tenant_isolation on public.support_messages;
create policy tenant_isolation on public.support_messages
  using (exists (
    select 1 from public.support_threads t
    where t.id = support_messages.thread_id and t.outlet_id = app_current_outlet_id()
  ))
  with check (exists (
    select 1 from public.support_threads t
    where t.id = support_messages.thread_id and t.outlet_id = app_current_outlet_id()
  ));

-- ============ notification_reads (direct outlet_id) ============
alter table public.notification_reads enable row level security;
alter table public.notification_reads force row level security;
drop policy if exists tenant_isolation on public.notification_reads;
create policy tenant_isolation on public.notification_reads
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

-- ============ platform_products (global storefront catalog, same pattern as subscription_plans) ============
alter table public.platform_products enable row level security;
drop policy if exists public_read on public.platform_products;
create policy public_read on public.platform_products for select using (true);

-- ============ platform_costs (platform-internal financials — NOT exposed to any tenant connection) ============
alter table public.platform_costs enable row level security;
alter table public.platform_costs force row level security;
-- No policy created deliberately, same as platform_admins in 0001 — locked to nobody
-- under the tenant-scoped role. Platform-admin routes (src/app/api/platform-admin/**) must
-- use their own separate, elevated connection once real enforcement is wired; they must
-- NOT go through whatever role ends up used for outlet-scoped app traffic.

-- ============ STILL-KNOWN GAPS — deliberately left without outlet RLS in this pass ============
-- role_permissions: single GLOBAL role/permission matrix shared by every outlet (unchanged
--   from 0001). chat_threads / chat_messages: no outlet_id anywhere in the chain (unchanged
--   from 0001). subscription_plans / platform_admins: see 0001, unchanged.
