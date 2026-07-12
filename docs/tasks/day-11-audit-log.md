# Day 11 — Audit log

- **Date:** 2026-07-12
- **Phase:** 1 (Multi-tenancy + Auth)
- **Status:** Done

## Goal

Record who changed what, in which dealership, so a mutation can always be traced.

## Design decision

The audit trail is written by a **database trigger**, not by application code.

Application-level logging (`audit.log()` after each mutation) records what a developer
_remembered_ to log. A trigger records what actually happened: a mutation cannot escape it
by taking a code path someone forgot to instrument.

The trigger reads the same GUCs that RLS reads (`app.current_tenant`, plus
`app.current_actor` for attribution), so an audit row can never claim a tenant the writer
was not scoped to.

## Tasks done

- [x] `audit_logs` table: tenant, actor, action, table, record id, `old_data`/`new_data`
      (jsonb), timestamp. Indexed by `(tenant_id, created_at desc)` and `(table_name, record_id)`.
- [x] `audit_trigger()` (`security definer`) handling insert / update / delete.
- [x] **RLS on the trail itself:** the app role can `select` only its own tenant's entries,
      and has no insert/update/delete grant. The trail is append-only from the app's side:
      only the trigger writes it.
- [x] `withTenant()` extended to carry an actor (`app.current_actor`), so mutations are
      attributed to the user who made them.
- [x] Attached to `test_items`; business tables opt in the same way.
- [x] `GET /tenant/audit-logs` (owner/manager only), contract in `packages/shared`.

## Artifacts

- `packages/db/migrations/0005_audit_log.sql`
- `packages/db/src/tenant.ts` (actor GUC)
- `apps/api/src/routes/me.ts` (audit endpoint)

## Verification

Covered by `verify:api` (see [Day 8](day-08-tenant-context.md)):

- creating an item through the API produces an `insert` audit row for `test_items`,
  **attributed to the acting user**;
- the trail is readable by an owner (200) and scoped to that tenant only.

## Still open

- Retention/archival policy for the trail (it grows without bound).
- Expose the trail in the dashboard UI (Phase 4+).
