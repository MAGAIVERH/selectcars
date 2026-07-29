import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  apiErrorSchema,
  createLeadSchema,
  leadListSchema,
  leadSchema,
  updateLeadSchema,
} from "@selectcars/shared";
import { withPublic, withTenant } from "@selectcars/db";
import { requireTenantContext } from "../lib/request-context";
import * as leads from "../repositories/leads";

const idParamSchema = z.object({ id: z.string().uuid() });

/**
 * Leads.
 *
 * The one place in the product where an anonymous visitor writes into a dealership's data,
 * which is why the public route is the narrowest in the API: it takes an enquiry, answers
 * "accepted", and returns nothing. There is no public read of any kind, and the database
 * agrees: `selectcars_public` holds an insert grant on `leads` and no select policy at all.
 *
 * Everyone in the dealership can work the pipeline, including a salesperson. That is the
 * point of the role: they sell, so the conversations are theirs.
 */
const CAN_WORK_LEADS = ["owner", "manager", "salesperson"] as const;

export async function leadRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.post(
    "/public/leads",
    {
      schema: {
        body: createLeadSchema,
        response: {
          202: z.object({ received: z.literal(true) }),
          400: apiErrorSchema,
          404: apiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const accepted = await withPublic((client) => leads.createFromPublic(client, request.body));

      // A car that is not published is not here at all, so an enquiry about one reads as a
      // missing listing rather than as a refusal that would confirm the draft exists.
      if (!accepted) {
        return reply
          .code(404)
          .send({ error: { code: "not_found", message: "That listing is no longer available." } });
      }

      // 202, not 201: the buyer is told it was received, and is deliberately not handed the
      // record. Nothing about the dealership's pipeline crosses back over this boundary.
      reply.code(202);
      return { received: true as const };
    },
  );

  r.get(
    "/leads",
    {
      onRequest: app.requireTenant(CAN_WORK_LEADS),
      schema: { response: { 200: leadListSchema, 401: apiErrorSchema, 403: apiErrorSchema } },
    },
    async (request) => {
      const { tenantId } = requireTenantContext(request);
      const items = await withTenant(tenantId, (client) => leads.listForTenant(client));
      return { items };
    },
  );

  r.patch(
    "/leads/:id",
    {
      onRequest: app.requireTenant(CAN_WORK_LEADS),
      schema: {
        params: idParamSchema,
        body: updateLeadSchema,
        response: {
          200: leadSchema,
          400: apiErrorSchema,
          401: apiErrorSchema,
          403: apiErrorSchema,
          404: apiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const { tenantId, userId } = requireTenantContext(request);
      const lead = await withTenant({ tenantId, actorUserId: userId }, (client) =>
        leads.update(client, request.params.id, request.body),
      );

      if (!lead) {
        return reply.code(404).send({ error: { code: "not_found", message: "Lead not found." } });
      }
      return lead;
    },
  );
}
