import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { apiErrorSchema, insightListSchema, insightRunSchema } from "@selectcars/shared";
import { withTenant } from "@selectcars/db";
import { requireTenantContext } from "../lib/request-context";
import { enqueueInsights, isQueueConfigured } from "../lib/queue";
import * as insights from "../repositories/insights";

/**
 * Insights: read what the last run produced, or ask for another run.
 *
 * The shape of these two endpoints is the whole point of the feature. `GET` reads a table.
 * `POST` writes a job id to Redis and answers **202 Accepted**, which is HTTP's way of
 * saying "I have taken this, it is not done yet". Neither one waits on a computation, and
 * in particular neither waits on a language model.
 *
 * Doing it the obvious way instead (compute on GET) would put a multi-second market scan,
 * and possibly a model call, inside a dashboard page load. That is the mistake this design
 * exists to avoid, so the endpoints are shaped to make it impossible rather than discouraged.
 */

/**
 * Same rule as the money endpoints: what the platform thinks of a dealership's pricing is
 * management information. A salesperson sells the car; they do not review the store's
 * pricing strategy.
 */
const CAN_SEE_INSIGHTS = ["owner", "manager"] as const;

export async function insightRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get(
    "/insights",
    {
      onRequest: app.requireTenant(CAN_SEE_INSIGHTS),
      schema: {
        response: { 200: insightListSchema, 401: apiErrorSchema, 403: apiErrorSchema },
      },
    },
    async (request) => {
      const { tenantId } = requireTenantContext(request);
      return withTenant(tenantId, async (client) => ({
        items: await insights.listForTenant(client),
        lastComputedAt: await insights.lastComputedAt(client),
      }));
    },
  );

  r.post(
    "/insights/refresh",
    {
      onRequest: app.requireTenant(CAN_SEE_INSIGHTS),
      schema: {
        response: {
          202: insightRunSchema,
          401: apiErrorSchema,
          403: apiErrorSchema,
          503: apiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const { tenantId } = requireTenantContext(request);

      // Like photo upload without storage: a feature whose infrastructure is absent says so
      // plainly instead of failing somewhere confusing three layers down.
      if (!isQueueConfigured()) {
        return reply.code(503).send({
          error: {
            code: "unavailable",
            message: "Insights are not configured on this server: REDIS_URL is missing.",
          },
        });
      }

      const jobId = await enqueueInsights(tenantId);
      reply.code(202);
      return { queued: true as const, jobId };
    },
  );
}
