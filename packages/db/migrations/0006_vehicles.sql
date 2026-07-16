-- Vehicles: the inventory each dealership owns, and the listings buyers browse.
--
-- Two audiences, two access paths:
--
--   Dealers  -> role `selectcars_app`, scoped to their tenant, full CRUD.
--   Buyers   -> role `selectcars_public`, no tenant context, and may read ONLY vehicles
--               that are `active`. It cannot see drafts, sold cars, or any other column
--               it has not been granted.
--
-- The public path is a separate non-bypass role rather than "just query as postgres",
-- because the marketplace is the one surface an attacker reaches without credentials.
-- If a public query is ever written carelessly, the database still refuses to leak a
-- draft listing.

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public."organization" (id) on delete cascade,

  -- Identity
  vin text,
  slug text not null,

  -- US market fields
  make text not null,
  model text not null,
  year integer not null check (year between 1900 and 2100),
  trim text,
  mileage integer not null default 0 check (mileage >= 0),
  price_usd numeric(10, 2) check (price_usd >= 0),

  condition text not null check (condition in ('New', 'Used', 'Certified')),
  body_style text not null check (body_style in ('Sedan', 'Coupe', 'SUV', 'Truck', 'Convertible', 'Hatchback')),
  fuel_type text not null check (fuel_type in ('Gas', 'Hybrid', 'EV', 'Diesel')),
  transmission text check (transmission in ('Automatic', 'Manual')),
  drivetrain text check (drivetrain in ('FWD', 'RWD', 'AWD', '4WD')),

  exterior_color text,
  interior_color text,
  description text,

  -- draft -> active -> pending -> sold. Only `active` is visible to buyers.
  status text not null default 'draft' check (status in ('draft', 'active', 'pending', 'sold')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- A VIN is unique per dealership, not globally: two dealers can legitimately list the
  -- same car over its lifetime. Partial, so many vehicles may have no VIN yet.
  constraint vehicles_tenant_vin_key unique (tenant_id, vin),
  -- Slugs must be unique per dealership so a listing URL is stable.
  constraint vehicles_tenant_slug_key unique (tenant_id, slug)
);

-- Dealer inventory list: "my vehicles, newest first", optionally filtered by status.
create index if not exists vehicles_tenant_status_created_idx
  on public.vehicles (tenant_id, status, created_at desc);

-- Buyer search: only active listings, filtered by the facets the marketplace exposes.
create index if not exists vehicles_public_browse_idx
  on public.vehicles (status, make, model, year)
  where status = 'active';

create index if not exists vehicles_price_idx on public.vehicles (price_usd) where status = 'active';

alter table public.vehicles enable row level security;

-- --- Dealer access: tenant-scoped, full CRUD -------------------------------------------
drop policy if exists vehicles_tenant_isolation on public.vehicles;
create policy vehicles_tenant_isolation on public.vehicles
  for all
  to selectcars_app
  using (tenant_id = current_setting('app.current_tenant', true))
  with check (tenant_id = current_setting('app.current_tenant', true));

grant select, insert, update, delete on public.vehicles to selectcars_app;

-- --- Buyer access: active listings only, read only --------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'selectcars_public') then
    create role selectcars_public nologin noinherit;
  end if;
end
$$;

grant selectcars_public to postgres;
grant usage on schema public to selectcars_public;

drop policy if exists vehicles_public_read on public.vehicles;
create policy vehicles_public_read on public.vehicles
  for select
  to selectcars_public
  using (status = 'active');

grant select on public.vehicles to selectcars_public;

-- --- Audit + updated_at -----------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists vehicles_touch_updated_at on public.vehicles;
create trigger vehicles_touch_updated_at
  before update on public.vehicles
  for each row execute function public.touch_updated_at();

drop trigger if exists audit_vehicles on public.vehicles;
create trigger audit_vehicles
  after insert or update or delete on public.vehicles
  for each row execute function public.audit_trigger();
