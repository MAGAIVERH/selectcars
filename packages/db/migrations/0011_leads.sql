-- Leads: buyer interest, routed to the dealership that owns the car.
--
-- This is the first table an **anonymous** visitor writes to, which makes it the most
-- interesting policy in the project so far. Everything else the public role touches is
-- read-only; here a stranger on the internet gets to create a row inside a tenant's data.
--
-- The rule that makes that safe is written once, in the database:
--
--   a buyer may INSERT a lead, only against a vehicle they can actually see,
--   and may never SELECT one back.
--
-- Both halves matter. Without the first, someone could post leads into a dealership's
-- pipeline for cars that are drafts, or for another dealership entirely. Without the second,
-- the enquiry form would double as a way to read every buyer's name, email, and phone number.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public."organization" (id) on delete cascade,

  -- `set null`, not cascade: a dealership that deletes a listing keeps the people who asked
  -- about it. The lead is about a human, and the car is context.
  vehicle_id uuid references public.vehicles (id) on delete set null,

  -- The pipeline a salesperson works. Deliberately short: a stage nobody updates is a stage
  -- that lies.
  status text not null default 'new'
    check (status in ('new', 'contacted', 'appointment', 'won', 'lost')),

  buyer_name text not null check (length(trim(buyer_name)) > 0),
  buyer_email text not null check (position('@' in buyer_email) > 1),
  buyer_phone text,
  message text,

  -- Who in the dealership owns this conversation. No FK to the auth tables on purpose: the
  -- app role has no grant there, and a lead outliving a departed salesperson is correct.
  assigned_to_user_id text,

  /**
   * Set the first time the lead leaves `new`. Response time is the number dealerships are
   * judged on: most buyers contact several sellers and buy from whoever answers first.
   * Stored rather than derived, because "when did we first reply" cannot be recovered from
   * the current status later.
   */
  first_response_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The dashboard asks "this dealership's pipeline, newest first", always.
create index if not exists leads_tenant_created_idx on public.leads (tenant_id, created_at desc);
create index if not exists leads_tenant_status_idx on public.leads (tenant_id, status);
create index if not exists leads_vehicle_idx on public.leads (vehicle_id);

alter table public.leads enable row level security;

-- --- The dealership: full access to its own pipeline ------------------------------------
drop policy if exists leads_tenant_isolation on public.leads;
create policy leads_tenant_isolation on public.leads
  for all
  to selectcars_app
  using (tenant_id = current_setting('app.current_tenant', true))
  with check (tenant_id = current_setting('app.current_tenant', true));

grant select, insert, update, delete on public.leads to selectcars_app;

-- --- The buyer: may write one, may never read one ----------------------------------------
--
-- Note what the check does NOT say: it never mentions `status = 'active'`. It does not have
-- to. The subquery runs as `selectcars_public`, so the policy on `vehicles` already applies
-- inside it and only active listings exist from here. The sentence the database ends up
-- enforcing is "you may only enquire about a car you can see", written without restating
-- what "can see" means.
--
-- The `tenant_id` on the row is checked against the vehicle's, so a crafted request cannot
-- drop a lead into a dealership that has nothing to do with the car.
drop policy if exists leads_public_insert on public.leads;
create policy leads_public_insert on public.leads
  for insert
  to selectcars_public
  with check (
    exists (
      select 1
        from public.vehicles v
       where v.id = leads.vehicle_id
         and v.tenant_id = leads.tenant_id
    )
  );

-- Insert only. There is deliberately no select policy and no select grant: a buyer cannot
-- read a lead back, not even the one they just created.
grant insert on public.leads to selectcars_public;

drop trigger if exists leads_touch_updated_at on public.leads;
create trigger leads_touch_updated_at
  before update on public.leads
  for each row execute function public.touch_updated_at();

drop trigger if exists audit_leads on public.leads;
create trigger audit_leads
  after insert or update or delete on public.leads
  for each row execute function public.audit_trigger();
