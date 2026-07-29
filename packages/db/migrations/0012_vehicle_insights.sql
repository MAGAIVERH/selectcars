-- Insights: what the platform noticed about a listing.
--
-- Two kinds to start, and both are **arithmetic**, not opinion:
--
--   pricing  where this car sits against comparable listings across the marketplace
--   aging    how long it has been on the lot against how fast this dealership usually sells
--
-- The row holds the computed facts. A `narrative` sentence may be written over them later by
-- a language model, and is deliberately nullable: the numbers stand on their own, and the
-- product works with the model switched off. See docs/adr/004-async-insights.md.
--
-- Nothing here is computed during a request. A worker fills this table off the queue, and the
-- dashboard reads whatever the last run produced, which is the whole point: a model call can
-- take seconds, and no buyer or dealer should ever wait behind one.

create table if not exists public.vehicle_insights (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public."organization" (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,

  kind text not null check (kind in ('pricing', 'aging')),
  -- What the dealer should feel about it, in the same vocabulary the status colours use.
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),

  headline text not null,
  /**
   * The numbers behind the headline, as JSON: the comparison set size, the median, the
   * percentage, the day counts. Stored so the dashboard can show the evidence and so a
   * later model call has something factual to write from instead of guessing.
   */
  facts jsonb not null default '{}'::jsonb,

  /** Written by a language model when one is configured. Null is a normal, working state. */
  narrative text,

  computed_at timestamptz not null default now(),

  -- One insight of each kind per car: a new run replaces the old reading rather than piling
  -- up a history nobody asked for.
  constraint vehicle_insights_vehicle_kind_key unique (vehicle_id, kind)
);

create index if not exists vehicle_insights_tenant_idx
  on public.vehicle_insights (tenant_id, severity, computed_at desc);

alter table public.vehicle_insights enable row level security;

-- Tenant-scoped, and private: what the platform thinks of a dealership's pricing is for that
-- dealership. There is no public policy, so a buyer can never read "this car is 18% over
-- market" off the listing they are looking at.
drop policy if exists vehicle_insights_tenant_isolation on public.vehicle_insights;
create policy vehicle_insights_tenant_isolation on public.vehicle_insights
  for all
  to selectcars_app
  using (tenant_id = current_setting('app.current_tenant', true))
  with check (tenant_id = current_setting('app.current_tenant', true));

grant select, insert, update, delete on public.vehicle_insights to selectcars_app;

drop trigger if exists audit_vehicle_insights on public.vehicle_insights;
create trigger audit_vehicle_insights
  after insert or update or delete on public.vehicle_insights
  for each row execute function public.audit_trigger();
