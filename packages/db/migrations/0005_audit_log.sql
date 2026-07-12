-- Audit log: who changed what, in which tenant.
--
-- Written by a trigger rather than by application code, so a mutation cannot be audited
-- "by accident of remembering". The actor and tenant come from the same GUCs that RLS
-- reads, so an audited row can never claim a tenant the writer was not scoped to.

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  actor_user_id text,
  action text not null check (action in ('insert', 'update', 'delete')),
  table_name text not null,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_tenant_created_idx
  on public.audit_logs (tenant_id, created_at desc);
create index if not exists audit_logs_table_record_idx
  on public.audit_logs (table_name, record_id);

alter table public.audit_logs enable row level security;

-- The app role reads only its own tenant's trail, and can never write or rewrite it:
-- audit rows are inserted by the trigger, which runs as the table owner (security definer).
drop policy if exists audit_logs_tenant_read on public.audit_logs;
create policy audit_logs_tenant_read on public.audit_logs
  for select
  to selectcars_app
  using (tenant_id = current_setting('app.current_tenant', true));

grant select on public.audit_logs to selectcars_app;

-- Actor id, set per transaction alongside app.current_tenant.
create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant text := current_setting('app.current_tenant', true);
  v_actor  text := nullif(current_setting('app.current_actor', true), '');
  v_record text;
begin
  if tg_op = 'DELETE' then
    v_record := (to_jsonb(old) ->> 'id');
    insert into public.audit_logs (tenant_id, actor_user_id, action, table_name, record_id, old_data)
    values (coalesce(v_tenant, old.tenant_id), v_actor, 'delete', tg_table_name, v_record, to_jsonb(old));
    return old;
  end if;

  v_record := (to_jsonb(new) ->> 'id');

  if tg_op = 'INSERT' then
    insert into public.audit_logs (tenant_id, actor_user_id, action, table_name, record_id, new_data)
    values (coalesce(v_tenant, new.tenant_id), v_actor, 'insert', tg_table_name, v_record, to_jsonb(new));
    return new;
  end if;

  insert into public.audit_logs (tenant_id, actor_user_id, action, table_name, record_id, old_data, new_data)
  values (coalesce(v_tenant, new.tenant_id), v_actor, 'update', tg_table_name, v_record, to_jsonb(old), to_jsonb(new));
  return new;
end;
$$;

-- Attach to the RLS proof-of-concept table. Business tables opt in the same way.
drop trigger if exists audit_test_items on public.test_items;
create trigger audit_test_items
  after insert or update or delete on public.test_items
  for each row execute function public.audit_trigger();
