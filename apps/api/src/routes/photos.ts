import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  apiErrorSchema,
  attachPhotoSchema,
  photoUploadRequestSchema,
  photoUploadTicketSchema,
  vehiclePhotoSchema,
  MAX_PHOTOS_PER_VEHICLE,
} from "@selectcars/shared";
import { withTenant } from "@selectcars/db";
import { requireTenantContext } from "../lib/request-context";
import {
  buildStorageKey,
  createUploadTicket,
  isStorageConfigured,
  publicUrlFor,
  removeObjects,
} from "../lib/storage";
import * as photos from "../repositories/photos";

const vehicleParamSchema = z.object({ id: z.string().uuid() });
const photoParamSchema = z.object({ id: z.string().uuid(), photoId: z.string().uuid() });

/** Anyone who may edit inventory may photograph it. A `viewer` still cannot. */
const CAN_WRITE = ["owner", "manager", "salesperson"] as const;

/**
 * Vehicle photos.
 *
 * The upload is two calls on purpose, with the bytes going nowhere near this service:
 *
 *   1. POST .../photos/upload-url  ->  the API checks the dealer, the car, and the limits,
 *                                      then signs a ticket for one object key it chose.
 *   2. the browser PUTs the file straight to storage using that ticket.
 *   3. POST .../photos             ->  the API records the row, re-deriving the public URL
 *                                      from the key it issued.
 *
 * Step 3 never trusts a URL from the client. It is handed a storage key, and only the key it
 * signed will resolve to an object, so a caller cannot point someone's listing at an image
 * hosted anywhere else.
 */
export async function photoRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();

  const storageOff = {
    error: {
      code: "unavailable" as const,
      message:
        "Photo storage is not configured on this server. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    },
  };

  r.post(
    "/vehicles/:id/photos/upload-url",
    {
      onRequest: app.requireTenant(CAN_WRITE),
      schema: {
        params: vehicleParamSchema,
        body: photoUploadRequestSchema,
        response: {
          201: photoUploadTicketSchema,
          400: apiErrorSchema,
          401: apiErrorSchema,
          403: apiErrorSchema,
          404: apiErrorSchema,
          409: apiErrorSchema,
          503: apiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      if (!isStorageConfigured()) return reply.code(503).send(storageOff);

      const { tenantId } = requireTenantContext(request);

      // Check the car and the gallery size *before* signing anything. A ticket is permission
      // to write, so it is only ever issued for a listing this dealer owns and that has room.
      const check = await withTenant(tenantId, async (client) => {
        if (!(await photos.vehicleExists(client, request.params.id))) return "not_found" as const;
        const count = await photos.countForVehicle(client, request.params.id);
        return count >= MAX_PHOTOS_PER_VEHICLE ? ("full" as const) : ("ok" as const);
      });

      if (check === "not_found") {
        return reply
          .code(404)
          .send({ error: { code: "not_found", message: "Vehicle not found." } });
      }
      if (check === "full") {
        return reply.code(409).send({
          error: {
            code: "conflict",
            message: `A listing can hold ${MAX_PHOTOS_PER_VEHICLE} photos. Remove one first.`,
          },
        });
      }

      const storageKey = buildStorageKey(tenantId, request.params.id, request.body.contentType);
      const ticket = await createUploadTicket(storageKey);
      reply.code(201);
      return ticket;
    },
  );

  r.post(
    "/vehicles/:id/photos",
    {
      onRequest: app.requireTenant(CAN_WRITE),
      schema: {
        params: vehicleParamSchema,
        body: attachPhotoSchema,
        response: {
          201: vehiclePhotoSchema,
          400: apiErrorSchema,
          401: apiErrorSchema,
          403: apiErrorSchema,
          404: apiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const { tenantId, userId } = requireTenantContext(request);

      // The key must be one we issued for this tenant and this car. Without this check a
      // dealer could attach an object belonging to another dealership by pasting its key.
      const expectedPrefix = `tenant/${tenantId}/vehicle/${request.params.id}/`;
      if (!request.body.storageKey.startsWith(expectedPrefix)) {
        return reply.code(400).send({
          error: { code: "bad_request", message: "That upload does not belong to this vehicle." },
        });
      }

      const photo = await withTenant({ tenantId, actorUserId: userId }, async (client) => {
        if (!(await photos.vehicleExists(client, request.params.id))) return undefined;
        return photos.attach(client, {
          vehicleId: request.params.id,
          tenantId,
          url: publicUrlFor(request.body.storageKey),
          storageKey: request.body.storageKey,
          alt: request.body.alt ?? null,
          isPrimary: request.body.isPrimary,
        });
      });

      if (!photo) {
        return reply
          .code(404)
          .send({ error: { code: "not_found", message: "Vehicle not found." } });
      }
      reply.code(201);
      return photo;
    },
  );

  r.post(
    "/vehicles/:id/photos/:photoId/primary",
    {
      onRequest: app.requireTenant(CAN_WRITE),
      schema: {
        params: photoParamSchema,
        response: {
          204: z.null(),
          401: apiErrorSchema,
          403: apiErrorSchema,
          404: apiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const { tenantId, userId } = requireTenantContext(request);
      const ok = await withTenant({ tenantId, actorUserId: userId }, (client) =>
        photos.setPrimary(client, request.params.id, request.params.photoId),
      );

      if (!ok) {
        return reply.code(404).send({ error: { code: "not_found", message: "Photo not found." } });
      }
      return reply.code(204).send(null);
    },
  );

  r.delete(
    "/vehicles/:id/photos/:photoId",
    {
      onRequest: app.requireTenant(CAN_WRITE),
      schema: {
        params: photoParamSchema,
        response: {
          204: z.null(),
          401: apiErrorSchema,
          403: apiErrorSchema,
          404: apiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const { tenantId, userId } = requireTenantContext(request);

      const removed = await withTenant({ tenantId, actorUserId: userId }, async (client) => {
        const row = await photos.remove(client, request.params.id, request.params.photoId);
        // The gallery must not be left without a primary, so the next photo takes over
        // inside the same transaction that removed the old one.
        if (row?.wasPrimary) await photos.promoteFirstPhoto(client, request.params.id);
        return row;
      });

      if (!removed) {
        return reply.code(404).send({ error: { code: "not_found", message: "Photo not found." } });
      }

      // The row is already gone, so the dealer's delete succeeded. An object we fail to remove
      // is an orphan that costs a little storage and shows to nobody: worth a log, not a 500.
      if (removed.storageKey && isStorageConfigured()) {
        const { error } = await removeObjects([removed.storageKey]);
        if (error) request.log.warn({ err: error, key: removed.storageKey }, "orphaned object");
      }

      return reply.code(204).send(null);
    },
  );
}
