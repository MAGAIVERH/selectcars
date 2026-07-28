-- Dealer profiles: who is selling, as a buyer sees it.
--
-- Until now a listing had no visible owner. The marketplace is a multi-seller platform:
-- several dealerships publish into the same collection, and a buyer must be able to see
-- who is behind a car and to browse one seller's inventory. That is also how the US market
-- works: on Cars.com and Autotrader the seller of record is the DEALERSHIP (franchised or
-- independent), never one of its salespeople. Salespeople exist inside the dealership as
-- roles (owner, manager, salesperson, viewer) and own leads and deals, not listings.
--
-- Why a table of ours instead of reading `organization` (the Better Auth table):
--
--   1. `organization` is the identity provider's data. Business attributes a buyer sees
--      (city, phone, the pitch) are ours, and they belong in a table under our own RLS.
--   2. It keeps the public role away from the auth schema entirely. `selectcars_public` is
--      the role an anonymous visitor drives; it should never hold a grant on a table that
--      also holds members and invitations.
--
-- Every dealership gets a profile the moment it is created (trigger below), so a listing
-- always has a seller: there is no "unknown dealer" state to handle in the UI.

create table if not exists public.dealer_profiles (
  -- One profile per dealership, so the tenant id IS the key.
  tenant_id text primary key references public."organization" (id) on delete cascade,

  display_name text not null,
  -- Mirrors the organization slug, which Better Auth already keeps unique. Stored here so
  -- the public path can resolve /dealers/<slug> without touching the auth tables.
  slug text not null unique,

  city text,
  -- US two-letter state code, checked so a stray "California" cannot land here.
  state text check (state ~ '^[A-Z]{2}$'),
  phone text,
  about text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dealer_profiles enable row level security;

-- --- Dealer access: their own profile, tenant-scoped -------------------------------------
drop policy if exists dealer_profiles_tenant_isolation on public.dealer_profiles;
create policy dealer_profiles_tenant_isolation on public.dealer_profiles
  for all
  to selectcars_app
  using (tenant_id = current_setting('app.current_tenant', true))
  with check (tenant_id = current_setting('app.current_tenant', true));

-- No delete grant: a profile disappears when the dealership does (the FK cascade), never
-- on its own, because a listing would then point at a seller that does not exist.
grant select, insert, update on public.dealer_profiles to selectcars_app;

-- --- Buyer access: only sellers who actually have something for sale ---------------------
--
-- Note how this policy composes with the one on `vehicles`. The subquery runs as the same
-- role, so it can only see `active` rows; a dealership whose inventory is all drafts is
-- invisible to a buyer without this policy having to mention `status` at all.
drop policy if exists dealer_profiles_public_read on public.dealer_profiles;
create policy dealer_profiles_public_read on public.dealer_profiles
  for select
  to selectcars_public
  using (
    exists (
      select 1 from public.vehicles v where v.tenant_id = dealer_profiles.tenant_id
    )
  );

grant select on public.dealer_profiles to selectcars_public;

-- --- Every dealership gets a profile, without the app having to remember ------------------
--
-- `security definer` because the insert happens in whatever context created the
-- organization (a sign-up running as the connecting role), and the function must be able
-- to write regardless. The search_path is pinned: a `security definer` function that
-- resolves names through the caller's search_path is a privilege escalation waiting to
-- happen.
create or replace function public.create_dealer_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.dealer_profiles (tenant_id, display_name, slug)
  values (new.id, new.name, new.slug)
  on conflict (tenant_id) do nothing;
  return new;
end;
$$;

drop trigger if exists organization_create_dealer_profile on public."organization";
create trigger organization_create_dealer_profile
  after insert on public."organization"
  for each row execute function public.create_dealer_profile();

-- Backfill the dealerships that existed before this migration.
insert into public.dealer_profiles (tenant_id, display_name, slug)
select o.id, o.name, o.slug
  from public."organization" o
 where not exists (select 1 from public.dealer_profiles d where d.tenant_id = o.id);

-- --- Housekeeping -------------------------------------------------------------------------
drop trigger if exists dealer_profiles_touch_updated_at on public.dealer_profiles;
create trigger dealer_profiles_touch_updated_at
  before update on public.dealer_profiles
  for each row execute function public.touch_updated_at();

-- The audit trigger records `record_id` from a column named `id`, which this table does not
-- have. That is fine and not worth a special case: there is exactly one profile per tenant,
-- so `tenant_id` on the audit row already identifies the record uniquely.
drop trigger if exists audit_dealer_profiles on public.dealer_profiles;
create trigger audit_dealer_profiles
  after insert or update or delete on public.dealer_profiles
  for each row execute function public.audit_trigger();
