-- Foundation for multi-tenant Row-Level Security.
--
-- The connecting role (postgres) has rolbypassrls, so it can never prove tenant
-- isolation on its own. We create a dedicated non-bypass role that the app drops
-- into (SET LOCAL ROLE) for every tenant-scoped query.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'selectcars_app') then
    create role selectcars_app nologin noinherit;
  end if;
end
$$;

-- Allow postgres to assume the app role via SET ROLE (SET privilege is granted by default).
grant selectcars_app to postgres;

-- The app role can use the public schema (object-level grants come per table).
grant usage on schema public to selectcars_app;
