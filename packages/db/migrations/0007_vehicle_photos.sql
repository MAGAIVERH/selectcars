-- Vehicle photos: the gallery images for a listing.
--
-- Same two-audience model as `vehicles` (see 0006):
--
--   Dealers -> role `selectcars_app`, scoped to their tenant, full CRUD on their photos.
--   Buyers  -> role `selectcars_public`, may read a photo ONLY when its vehicle is `active`.
--
-- The public policy leans on the vehicles policy: the `exists` subquery runs as the same
-- non-bypass role, so it can only ever see `active` vehicles anyway. A photo of a draft or
-- a sold car is therefore unreachable to a buyer, enforced by the database, not a filter.

create table if not exists public.vehicle_photos (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  -- Denormalized tenant so the dealer RLS policy is a plain equality, matching `vehicles`.
  tenant_id text not null references public."organization" (id) on delete cascade,

  url text not null,
  alt text,
  -- Gallery order; the primary is what the card and hero use.
  position integer not null default 0,
  is_primary boolean not null default false,

  created_at timestamptz not null default now()
);

-- Gallery lookup: a vehicle's photos in display order.
create index if not exists vehicle_photos_vehicle_position_idx
  on public.vehicle_photos (vehicle_id, position);

-- At most one primary photo per vehicle.
create unique index if not exists vehicle_photos_one_primary_idx
  on public.vehicle_photos (vehicle_id)
  where is_primary;

alter table public.vehicle_photos enable row level security;

-- --- Dealer access: tenant-scoped, full CRUD -------------------------------------------
drop policy if exists vehicle_photos_tenant_isolation on public.vehicle_photos;
create policy vehicle_photos_tenant_isolation on public.vehicle_photos
  for all
  to selectcars_app
  using (tenant_id = current_setting('app.current_tenant', true))
  with check (tenant_id = current_setting('app.current_tenant', true));

grant select, insert, update, delete on public.vehicle_photos to selectcars_app;

-- --- Buyer access: read a photo only if its vehicle is active, read only ----------------
drop policy if exists vehicle_photos_public_read on public.vehicle_photos;
create policy vehicle_photos_public_read on public.vehicle_photos
  for select
  to selectcars_public
  using (
    exists (
      select 1
      from public.vehicles v
      where v.id = vehicle_photos.vehicle_id
        and v.status = 'active'
    )
  );

grant select on public.vehicle_photos to selectcars_public;

-- --- Audit -----------------------------------------------------------------------------
drop trigger if exists audit_vehicle_photos on public.vehicle_photos;
create trigger audit_vehicle_photos
  after insert or update or delete on public.vehicle_photos
  for each row execute function public.audit_trigger();
