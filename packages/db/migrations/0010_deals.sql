-- Deals: the money side of a sold car.
--
-- Until now a listing could reach `sold`, but nothing recorded what the dealership actually
-- made on it. Every number a dealer principal checks daily (units sold, gross, average gross
-- per unit, days to sale) comes from this table joined back to the vehicle.
--
-- The vocabulary is the trade's, not ours, so the dashboard can be read by someone who has
-- run a store:
--
--   front-end gross  what the car itself made:  sale price - what we paid - reconditioning
--   back-end gross   what the finance office made: financing reserve, warranty, GAP
--   total gross      the two together
--   PVR              total gross per vehicle retailed (an average, computed when reporting)

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public."organization" (id) on delete cascade,

  -- `restrict`, not `cascade`: deleting a listing must not silently erase the sale it made.
  -- A dealer who wants the car gone deletes the deal first, deliberately.
  vehicle_id uuid not null references public.vehicles (id) on delete restrict,

  sold_at date not null default current_date,

  sale_price_usd numeric(12, 2) not null check (sale_price_usd >= 0),
  -- What the dealership paid for the unit (auction, trade-in allowance, wholesale).
  vehicle_cost_usd numeric(12, 2) not null check (vehicle_cost_usd >= 0),
  -- Reconditioning: detailing, tyres, mechanical work done before it hit the lot.
  recon_cost_usd numeric(12, 2) not null default 0 check (recon_cost_usd >= 0),
  -- Finance and insurance products. Can be negative in a bad deal, so it is not constrained.
  back_end_gross_usd numeric(12, 2) not null default 0,

  buyer_name text,
  notes text,

  /**
   * Gross is *derived*, so it is computed by the database rather than by whoever happens to
   * be writing the query. Two reports can disagree about a filter; they cannot disagree about
   * what front-end gross means, because they do not get to define it.
   *
   * Stored generated columns, so they are also indexable and cost nothing to read.
   */
  front_end_gross_usd numeric(12, 2)
    generated always as (sale_price_usd - vehicle_cost_usd - recon_cost_usd) stored,
  -- Postgres will not let one generated column reference another, so the total restates the
  -- arithmetic instead of adding the two. Worth knowing before you try the obvious thing.
  total_gross_usd numeric(12, 2)
    generated always as
      (sale_price_usd - vehicle_cost_usd - recon_cost_usd + back_end_gross_usd) stored,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The dashboard's questions are always "this dealership, this period", in that order.
create index if not exists deals_tenant_sold_at_idx on public.deals (tenant_id, sold_at desc);
create index if not exists deals_vehicle_idx on public.deals (vehicle_id);

alter table public.deals enable row level security;

-- Tenant-scoped, like every other business table. There is deliberately **no** policy for
-- `selectcars_public`: what a dealership paid for a car is the one thing on this platform a
-- buyer must never see, and the safest way to guarantee that is to grant nothing at all.
drop policy if exists deals_tenant_isolation on public.deals;
create policy deals_tenant_isolation on public.deals
  for all
  to selectcars_app
  using (tenant_id = current_setting('app.current_tenant', true))
  with check (tenant_id = current_setting('app.current_tenant', true));

grant select, insert, update, delete on public.deals to selectcars_app;

drop trigger if exists deals_touch_updated_at on public.deals;
create trigger deals_touch_updated_at
  before update on public.deals
  for each row execute function public.touch_updated_at();

drop trigger if exists audit_deals on public.deals;
create trigger audit_deals
  after insert or update or delete on public.deals
  for each row execute function public.audit_trigger();
