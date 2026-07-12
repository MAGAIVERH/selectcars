-- RLS proof-of-concept table (Phase 1, Day 7). Two tenants, isolation enforced
-- at the database, not in application code. Exercised by scripts/verify-rls.ts.

create table if not exists public.test_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.test_items enable row level security;

-- The app role may touch only rows matching the active tenant GUC.
drop policy if exists tenant_isolation on public.test_items;
create policy tenant_isolation on public.test_items
  for all
  to selectcars_app
  using (tenant_id = current_setting('app.current_tenant', true))
  with check (tenant_id = current_setting('app.current_tenant', true));

grant select, insert, update, delete on public.test_items to selectcars_app;
