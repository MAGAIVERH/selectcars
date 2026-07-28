import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  apiErrorSchema,
  dealerListSchema,
  dealerProfileSchema,
  updateDealerProfileSchema,
} from "@selectcars/shared";
import { withPublic, withTenant } from "@selectcars/db";
import { requireTenantContext } from "../lib/request-context";
import * as dealers from "../repositories/dealers";

/**
 * Sellers.
 *
 * A dealership is the seller of record on this platform, so it has a public face (the two
 * routes under `/public`) and a private one (the two a signed-in team edits). The split
 * mirrors the vehicles module: anonymous reads run as `selectcars_public`, everything else
 * runs tenant-scoped.
 */
export async function dealerRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();

  // --- The seller directory (no auth, no tenant) -----------------------------------------

  r.get("/public/dealers", { schema: { response: { 200: dealerListSchema } } }, async () => {
    const items = await withPublic((client) => dealers.listPublicDealers(client));
    return { items };
  });

  r.get(
    "/public/dealers/:slug",
    {
      schema: {
        params: z.object({ slug: z.string().min(1).max(160) }),
        response: { 200: dealerProfileSchema, 404: apiErrorSchema },
      },
    },
    async (request, reply) => {
      const dealer = await withPublic((client) =>
        dealers.findPublicDealerBySlug(client, request.params.slug),
      );

      // A dealership with nothing published is invisible to this role, so it reads as "not
      // found" rather than "empty": buyers get no way to enumerate who has signed up.
      if (!dealer) {
        return reply
          .code(404)
          .send({ error: { code: "not_found", message: "Dealership not found." } });
      }
      return dealer;
    },
  );

  // --- The dealership's own profile -------------------------------------------------------

  r.get(
    "/dealership",
    {
      onRequest: app.requireTenant(),
      schema: {
        response: {
          200: dealerProfileSchema,
          401: apiErrorSchema,
          403: apiErrorSchema,
          404: apiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const { tenantId } = requireTenantContext(request);
      const profile = await withTenant(tenantId, (client) => dealers.findProfileForTenant(client));

      if (!profile) {
        return reply
          .code(404)
          .send({ error: { code: "not_found", message: "This dealership has no profile." } });
      }
      return profile;
    },
  );

  r.patch(
    "/dealership",
    {
      // How the dealership presents itself to buyers is an owner or manager decision, the
      // same bar as deleting inventory. A salesperson lists cars; they do not rename the store.
      onRequest: app.requireTenant(["owner", "manager"]),
      schema: {
        body: updateDealerProfileSchema,
        response: {
          200: dealerProfileSchema,
          400: apiErrorSchema,
          401: apiErrorSchema,
          403: apiErrorSchema,
          404: apiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const { tenantId, userId } = requireTenantContext(request);
      const profile = await withTenant({ tenantId, actorUserId: userId }, (client) =>
        dealers.updateProfileForTenant(client, request.body),
      );

      if (!profile) {
        return reply
          .code(404)
          .send({ error: { code: "not_found", message: "This dealership has no profile." } });
      }
      return profile;
    },
  );
}
