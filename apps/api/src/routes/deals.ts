import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  apiErrorSchema,
  createDealSchema,
  dealListSchema,
  dealSchema,
  dealershipMetricsSchema,
} from "@selectcars/shared";
import { withTenant } from "@selectcars/db";
import { requireTenantContext } from "../lib/request-context";
import * as deals from "../repositories/deals";
import * as vehicles from "../repositories/vehicles";

const idParamSchema = z.object({ id: z.string().uuid() });

/**
 * Money is an owner and manager concern.
 *
 * A salesperson may list, price, and sell a car, but what the dealership paid for it and what
 * it made is not theirs to read or write. This is the first place in the product where the
 * role split does real work rather than describing an intention.
 */
const CAN_SEE_MONEY = ["owner", "manager"] as const;

export async function dealRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get(
    "/metrics",
    {
      onRequest: app.requireTenant(CAN_SEE_MONEY),
      schema: {
        response: { 200: dealershipMetricsSchema, 401: apiErrorSchema, 403: apiErrorSchema },
      },
    },
    async (request) => {
      const { tenantId } = requireTenantContext(request);
      return withTenant(tenantId, (client) => deals.metricsForTenant(client));
    },
  );

  r.get(
    "/deals",
    {
      onRequest: app.requireTenant(CAN_SEE_MONEY),
      schema: {
        // Optional, so one endpoint serves both the overview's list and a single car's
        // history without a second route that would drift from this one.
        querystring: z.object({ vehicleId: z.string().uuid().optional() }),
        response: { 200: dealListSchema, 401: apiErrorSchema, 403: apiErrorSchema },
      },
    },
    async (request) => {
      const { tenantId } = requireTenantContext(request);
      const items = await withTenant(tenantId, (client) =>
        request.query.vehicleId
          ? deals.findForVehicle(client, request.query.vehicleId)
          : deals.listForTenant(client),
      );
      return { items };
    },
  );

  r.post(
    "/deals",
    {
      onRequest: app.requireTenant(CAN_SEE_MONEY),
      schema: {
        body: createDealSchema,
        response: {
          201: dealSchema,
          400: apiErrorSchema,
          401: apiErrorSchema,
          403: apiErrorSchema,
          404: apiErrorSchema,
          409: apiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const { tenantId, userId } = requireTenantContext(request);

      const outcome = await withTenant({ tenantId, actorUserId: userId }, async (client) => {
        // The vehicle is resolved under RLS, so recording a sale against another
        // dealership's car reads as "no such car" rather than as a permission error.
        const vehicle = await vehicles.findByIdForTenant(client, request.body.vehicleId);
        if (!vehicle) return { kind: "not_found" } as const;

        // A deal on a car that is still listed would make the dashboard contradict itself:
        // the metrics would count it as sold while buyers can still see it for sale. Mark it
        // sold first, which is the order the dealership works in anyway.
        if (vehicle.status !== "sold") {
          return { kind: "not_sold", status: vehicle.status } as const;
        }

        const deal = await deals.create(client, tenantId, request.body);
        return deal ? ({ kind: "ok", deal } as const) : ({ kind: "not_found" } as const);
      });

      if (outcome.kind === "not_found") {
        return reply
          .code(404)
          .send({ error: { code: "not_found", message: "Vehicle not found." } });
      }
      if (outcome.kind === "not_sold") {
        return reply.code(409).send({
          error: {
            code: "conflict",
            message: `This listing is ${outcome.status}. Mark it sold before recording the sale.`,
          },
        });
      }
      reply.code(201);
      return outcome.deal;
    },
  );

  r.delete(
    "/deals/:id",
    {
      onRequest: app.requireTenant(CAN_SEE_MONEY),
      schema: {
        params: idParamSchema,
        response: { 204: z.null(), 401: apiErrorSchema, 403: apiErrorSchema, 404: apiErrorSchema },
      },
    },
    async (request, reply) => {
      const { tenantId, userId } = requireTenantContext(request);
      const removed = await withTenant({ tenantId, actorUserId: userId }, (client) =>
        deals.remove(client, request.params.id),
      );

      if (!removed) {
        return reply.code(404).send({ error: { code: "not_found", message: "Deal not found." } });
      }
      return reply.code(204).send(null);
    },
  );
}
