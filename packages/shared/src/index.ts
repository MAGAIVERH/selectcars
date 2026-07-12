import { z } from "zod";

/**
 * Shared contracts and constants for SELECTCARS.
 * Imported by both the apps and (later) the API, so there is a single source of truth.
 */

export const SITE = {
  name: "SELECTCARS",
  tagline: "The car you will not find. Until it finds you.",
  location: "Miami · Private appointments",
} as const;

export const bodyStyleSchema = z.enum([
  "Sedan",
  "Coupe",
  "SUV",
  "Truck",
  "Convertible",
  "Hatchback",
]);
export type BodyStyle = z.infer<typeof bodyStyleSchema>;

export const fuelTypeSchema = z.enum(["Gas", "Hybrid", "EV", "Diesel"]);
export type FuelType = z.infer<typeof fuelTypeSchema>;

export const conditionSchema = z.enum(["New", "Used", "Certified"]);
export type Condition = z.infer<typeof conditionSchema>;

/** API health contracts, shared between the Fastify API and its clients. */
export const healthStatusSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
  uptimeSeconds: z.number().nonnegative(),
});
export type HealthStatus = z.infer<typeof healthStatusSchema>;

export const readyStatusSchema = z.object({
  status: z.enum(["ready", "degraded"]),
  checks: z.object({
    database: z.enum(["up", "down"]),
  }),
});
export type ReadyStatus = z.infer<typeof readyStatusSchema>;

/**
 * Dealership roles, ordered from most to least privileged.
 * `buyer` is the marketplace-side role and never belongs to a dealership.
 */
export const dealershipRoleSchema = z.enum(["owner", "manager", "salesperson", "viewer"]);
export type DealershipRole = z.infer<typeof dealershipRoleSchema>;

/**
 * Claims the marketplace (Better Auth, the identity issuer) puts in the access token,
 * and the API verifies via JWKS. This is the contract between the two services: change
 * it here and both sides fail to compile, never at runtime.
 *
 * `activeOrganizationId` is the tenant id that scopes every RLS query.
 */
export const accessTokenClaimsSchema = z.object({
  sub: z.string(),
  email: z.string().email(),
  name: z.string().nullish(),
  activeOrganizationId: z.string().nullable(),
  role: dealershipRoleSchema.nullable(),
});
export type AccessTokenClaims = z.infer<typeof accessTokenClaimsSchema>;

/** Identity resolved from a verified access token, as the API sees it. */
export const authenticatedUserSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  tenantId: z.string().nullable(),
  role: dealershipRoleSchema.nullable(),
});
export type AuthenticatedUser = z.infer<typeof authenticatedUserSchema>;

/** An entry in a dealership's audit trail, written by a database trigger. */
export const auditLogSchema = z.object({
  id: z.string().uuid(),
  actorUserId: z.string().nullable(),
  action: z.enum(["insert", "update", "delete"]),
  tableName: z.string(),
  recordId: z.string().nullable(),
  createdAt: z.coerce.date(),
});
export type AuditLog = z.infer<typeof auditLogSchema>;

/** Shape of every API error response, so clients can handle failures uniformly. */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum([
      "unauthorized",
      "forbidden",
      "no_active_tenant",
      "not_found",
      "bad_request",
      "internal",
    ]),
    message: z.string(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

/** Core vehicle contract (grows as the inventory module is built). */
export const vehicleSchema = z.object({
  id: z.string(),
  make: z.string(),
  model: z.string(),
  year: z.number().int(),
  mileage: z.number().int().nonnegative(),
  priceUsd: z.number().nonnegative().nullable(),
  condition: conditionSchema,
  bodyStyle: bodyStyleSchema,
  fuelType: fuelTypeSchema,
});
export type Vehicle = z.infer<typeof vehicleSchema>;
