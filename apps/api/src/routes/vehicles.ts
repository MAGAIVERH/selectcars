import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  apiErrorSchema,
  createVehicleSchema,
  listVehiclesQuerySchema,
  publicVehiclesQuerySchema,
  updateVehicleSchema,
  vehicleListSchema,
  vehicleSchema,
} from "@selectcars/shared";
import { withPublic, withTenant } from "@selectcars/db";
import { requireTenantContext } from "../lib/request-context";
import * as vehicles from "../repositories/vehicles";

const idParamSchema = z.object({ id: z.string().uuid() });

/** Roles allowed to change inventory. A `viewer` can look, but not touch. */
const CAN_WRITE = ["owner", "manager", "salesperson"] as const;

export async function vehicleRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();

  // --- Dealer inventory (tenant-scoped) --------------------------------------------------

  r.get(
    "/vehicles",
    {
      onRequest: app.requireTenant(),
      schema: {
        querystring: listVehiclesQuerySchema,
        response: { 200: vehicleListSchema, 401: apiErrorSchema, 403: apiErrorSchema },
      },
    },
    async (request) => {
      const { tenantId } = requireTenantContext(request);
      const { items, total } = await withTenant(tenantId, (client) =>
        vehicles.listForTenant(client, request.query),
      );
      return { items, total, limit: request.query.limit, offset: request.query.offset };
    },
  );

  r.get(
    "/vehicles/:id",
    {
      onRequest: app.requireTenant(),
      schema: {
        params: idParamSchema,
        response: {
          200: vehicleSchema,
          401: apiErrorSchema,
          403: apiErrorSchema,
          404: apiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const { tenantId } = requireTenantContext(request);
      const vehicle = await withTenant(tenantId, (client) =>
        vehicles.findByIdForTenant(client, request.params.id),
      );

      // A vehicle in another dealership is invisible to RLS, so it reads as "not found"
      // rather than "forbidden": we do not confirm that someone else's id exists.
      if (!vehicle) {
        return reply
          .code(404)
          .send({ error: { code: "not_found", message: "Vehicle not found." } });
      }
      return vehicle;
    },
  );

  r.post(
    "/vehicles",
    {
      onRequest: app.requireTenant(CAN_WRITE),
      schema: {
        body: createVehicleSchema,
        response: {
          201: vehicleSchema,
          400: apiErrorSchema,
          401: apiErrorSchema,
          403: apiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const { tenantId, userId } = requireTenantContext(request);
      const vehicle = await withTenant({ tenantId, actorUserId: userId }, (client) =>
        vehicles.create(client, tenantId, request.body),
      );
      reply.code(201);
      return vehicle;
    },
  );

  r.patch(
    "/vehicles/:id",
    {
      onRequest: app.requireTenant(CAN_WRITE),
      schema: {
        params: idParamSchema,
        body: updateVehicleSchema,
        response: {
          200: vehicleSchema,
          400: apiErrorSchema,
          401: apiErrorSchema,
          403: apiErrorSchema,
          404: apiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const { tenantId, userId } = requireTenantContext(request);
      const vehicle = await withTenant({ tenantId, actorUserId: userId }, (client) =>
        vehicles.update(client, request.params.id, request.body),
      );

      if (!vehicle) {
        return reply
          .code(404)
          .send({ error: { code: "not_found", message: "Vehicle not found." } });
      }
      return vehicle;
    },
  );

  r.delete(
    "/vehicles/:id",
    {
      // Deleting inventory is an owner/manager decision, not a salesperson's.
      onRequest: app.requireTenant(["owner", "manager"]),
      schema: {
        params: idParamSchema,
        response: { 204: z.null(), 401: apiErrorSchema, 403: apiErrorSchema, 404: apiErrorSchema },
      },
    },
    async (request, reply) => {
      const { tenantId, userId } = requireTenantContext(request);
      const deleted = await withTenant({ tenantId, actorUserId: userId }, (client) =>
        vehicles.remove(client, request.params.id),
      );

      if (!deleted) {
        return reply
          .code(404)
          .send({ error: { code: "not_found", message: "Vehicle not found." } });
      }
      return reply.code(204).send(null);
    },
  );

  // --- Public marketplace (no auth, no tenant) -------------------------------------------
  //
  // These run as the narrow `selectcars_public` role, whose RLS policy admits only `active`
  // listings. No token, no tenant, and no way to ask for a draft.

  r.get(
    "/public/vehicles",
    {
      schema: {
        querystring: publicVehiclesQuerySchema,
        response: { 200: vehicleListSchema },
      },
    },
    async (request) => {
      const { items, total } = await withPublic((client) =>
        vehicles.listPublic(client, request.query),
      );
      return { items, total, limit: request.query.limit, offset: request.query.offset };
    },
  );

  r.get(
    "/public/vehicles/:slug",
    {
      schema: {
        params: z.object({ slug: z.string().min(1).max(160) }),
        response: { 200: vehicleSchema, 404: apiErrorSchema },
      },
    },
    async (request, reply) => {
      const vehicle = await withPublic((client) =>
        vehicles.findPublicBySlug(client, request.params.slug),
      );

      if (!vehicle) {
        return reply
          .code(404)
          .send({ error: { code: "not_found", message: "Vehicle not found." } });
      }
      return vehicle;
    },
  );
}
