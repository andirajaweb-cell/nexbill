-- Prep work for REAL RLS enforcement (Opsi A, referenced throughout 0001/0002 and in
-- src/db/client.ts). Creates a Postgres role that does NOT own the tables and does NOT
-- have BYPASSRLS — the two things that currently make every RLS policy in this project a
-- no-op, since the app's live DATABASE_URL connects as the table-owning role.
--
-- IMPORTANT — running this file changes NOTHING about live app behavior by itself. It
-- only creates the role and grants it privileges; DATABASE_URL still points at the
-- owning role until you deliberately swap it. Do not swap DATABASE_URL to this role
-- until src/db/client.ts also sets app.outlet_id per request/transaction — swapping
-- early with nothing setting that session variable means app_current_outlet_id() reads
-- NULL for every query, and every tenant_isolation policy here compares outlet_id to
-- NULL, which is never true in SQL — every outlet-scoped query would return zero rows
-- app-wide. That wiring is a separate, larger piece of work, deliberately not done in
-- this pass (see the chat discussion — scoped to "close the policy gaps" only).
--
-- Idempotent: safe to re-run.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'nexbill_app_tenant') then
    create role nexbill_app_tenant login password 'CHANGE_ME_BEFORE_USE' nosuperuser nocreatedb nocreaterole nobypassrls;
  end if;
end
$$;

-- Replace the placeholder above with a real generated secret before this role is ever
-- used in a connection string:
--   alter role nexbill_app_tenant with password 'a-real-generated-secret';

grant usage on schema public to nexbill_app_tenant;

-- Table privileges for everything that currently exists...
grant select, insert, update, delete on all tables in schema public to nexbill_app_tenant;
grant usage, select on all sequences in schema public to nexbill_app_tenant;
grant execute on all functions in schema public to nexbill_app_tenant;

-- ...and for every table/sequence/function created AFTER this point by `db:push` (run as
-- the owning role), so future schema changes don't silently lock this role out.
alter default privileges in schema public
  grant select, insert, update, delete on tables to nexbill_app_tenant;
alter default privileges in schema public
  grant usage, select on sequences to nexbill_app_tenant;
alter default privileges in schema public
  grant execute on functions to nexbill_app_tenant;

-- Remaining manual steps (NOT done by this file, and not done by this pass of work):
--   1. Set a real password: alter role nexbill_app_tenant with password '...';
--   2. Build a second connection string using this role, e.g. as DATABASE_URL_TENANT in
--      .env, alongside the existing owner-role DATABASE_URL (platform-admin routes must
--      keep using the owner role — see 0002's note on platform_costs).
--   3. Wire src/db/client.ts (or a new tenant-scoped client) to run every outlet-facing
--      request inside a transaction that starts with
--      `select set_config('app.outlet_id', $1, true)` before any other query, using the
--      current session's outletId. This touches every route that currently calls the
--      global `db` object directly — a deliberately separate, larger piece of work.
--   4. Resolve the outlet_memberships policy caveat noted in 0002 before switching that
--      table's access over, or the multi-outlet switcher will break.
--   5. Only once 1-4 are done and tested against a staging database, cut DATABASE_URL
--      over to nexbill_app_tenant for outlet-facing traffic.
