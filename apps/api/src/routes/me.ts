import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { authenticatedUserSchema, apiErrorSchema, auditLogSchema } from "@selectcars/shared";
import { withTenant } from "@selectcars/db";
import { requireAuth, requireTenantContext } from "../lib/request-context";

const tenantItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

/**
 * Authenticated routes. They exist to prove, end to end, that a request carries a tenant
 * and that the database refuses to serve anything outside it.
 */
export async function meRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();

  /** Who the verified access token says you are. */
  r.get(
    "/me",
    {
      onRequest: app.authenticate,
      schema: { response: { 200: authenticatedUserSchema, 401: apiErrorSchema } },
    },
    async (request) => requireAuth(request),
  );

  /**
   * Tenant-scoped read. Every row returned is filtered by Postgres RLS, not by a
   * `where tenant_id = ...` that we could forget to write.
   */
  r.get(
    "/tenant/items",
    {
      onRequest: app.requireTenant(),
      schema: {
        response: { 200: z.array(tenantItemSchema), 401: apiErrorSchema, 403: apiErrorSchema },
      },
    },
    async (request) => {
      const { tenantId } = requireTenantContext(request);
      return withTenant(tenantId, async (client) => {
        const result = await client.query<{ id: string; name: string }>(
          "select id, name from public.test_items order by created_at desc limit 50",
        );
        return result.rows;
      });
    },
  );

  /**
   * Tenant-scoped write, restricted by role. The tenant id comes from the verified token,
   * never from the request body: a caller cannot write into someone else's dealership.
   */
  r.post(
    "/tenant/items",
    {
      onRequest: app.requireTenant(["owner", "manager"]),
      schema: {
        body: z.object({ name: z.string().min(1).max(120) }),
        response: { 201: tenantItemSchema, 401: apiErrorSchema, 403: apiErrorSchema },
      },
    },
    async (request, reply) => {
      const { tenantId, userId } = requireTenantContext(request);
      const item = await withTenant({ tenantId, actorUserId: userId }, async (client) => {
        const result = await client.query<{ id: string; name: string }>(
          "insert into public.test_items (tenant_id, name) values ($1, $2) returning id, name",
          [tenantId, request.body.name],
        );
        return result.rows[0];
      });

      reply.code(201);
      return item;
    },
  );

  /**
   * The tenant's audit trail. Written by a database trigger, so it records what actually
   * happened, not what the application remembered to log. Owners and managers only.
   */
  r.get(
    "/tenant/audit-logs",
    {
      onRequest: app.requireTenant(["owner", "manager"]),
      schema: {
        response: { 200: z.array(auditLogSchema), 401: apiErrorSchema, 403: apiErrorSchema },
      },
    },
    async (request) => {
      const { tenantId } = requireTenantContext(request);
      return withTenant(tenantId, async (client) => {
        const result = await client.query(
          `select id, actor_user_id as "actorUserId", action, table_name as "tableName",
                  record_id as "recordId", created_at as "createdAt"
             from public.audit_logs
            order by created_at desc
            limit 50`,
        );
        return result.rows;
      });
    },
  );
}
