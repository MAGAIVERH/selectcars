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

export const transmissionSchema = z.enum(["Automatic", "Manual"]);
export type Transmission = z.infer<typeof transmissionSchema>;

export const drivetrainSchema = z.enum(["FWD", "RWD", "AWD", "4WD"]);
export type Drivetrain = z.infer<typeof drivetrainSchema>;

/**
 * Listing lifecycle. Only `active` is visible to buyers, and that rule is enforced by an
 * RLS policy, not by a filter someone has to remember to write.
 */
export const vehicleStatusSchema = z.enum(["draft", "active", "pending", "sold"]);
export type VehicleStatus = z.infer<typeof vehicleStatusSchema>;

/** A vehicle as the API returns it. */
export const vehicleSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  vin: z.string().nullable(),
  make: z.string(),
  model: z.string(),
  year: z.number().int(),
  trim: z.string().nullable(),
  mileage: z.number().int().nonnegative(),
  priceUsd: z.number().nonnegative().nullable(),
  condition: conditionSchema,
  bodyStyle: bodyStyleSchema,
  fuelType: fuelTypeSchema,
  transmission: transmissionSchema.nullable(),
  drivetrain: drivetrainSchema.nullable(),
  exteriorColor: z.string().nullable(),
  interiorColor: z.string().nullable(),
  description: z.string().nullable(),
  status: vehicleStatusSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Vehicle = z.infer<typeof vehicleSchema>;

/**
 * What a dealer may send when creating a vehicle.
 *
 * Note what is absent: `tenant_id`, `id`, `slug`, and the timestamps. The tenant comes from
 * the verified access token, never from the body, so a caller cannot write into another
 * dealership by lying in JSON. The slug is derived server-side.
 */
export const createVehicleSchema = z.object({
  // A US VIN is 17 characters and never uses I, O, or Q.
  vin: z
    .string()
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/i, "A VIN is 17 characters and cannot contain I, O, or Q.")
    .nullish(),
  make: z.string().min(1).max(60),
  model: z.string().min(1).max(60),
  year: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 2),
  trim: z.string().max(60).nullish(),
  mileage: z.number().int().nonnegative().default(0),
  priceUsd: z.number().nonnegative().max(100_000_000).nullish(),
  condition: conditionSchema,
  bodyStyle: bodyStyleSchema,
  fuelType: fuelTypeSchema,
  transmission: transmissionSchema.nullish(),
  drivetrain: drivetrainSchema.nullish(),
  exteriorColor: z.string().max(40).nullish(),
  interiorColor: z.string().max(40).nullish(),
  description: z.string().max(5000).nullish(),
  status: vehicleStatusSchema.default("draft"),
});
export type CreateVehicle = z.infer<typeof createVehicleSchema>;

/** Every field optional: a partial update. */
export const updateVehicleSchema = createVehicleSchema.partial();
export type UpdateVehicle = z.infer<typeof updateVehicleSchema>;

/** Filters a dealer can apply to their own inventory. */
export const listVehiclesQuerySchema = z.object({
  status: vehicleStatusSchema.optional(),
  search: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  offset: z.coerce.number().int().nonnegative().default(0),
});
export type ListVehiclesQuery = z.infer<typeof listVehiclesQuerySchema>;

/** Filters a buyer can apply to the public marketplace. `status` is not one of them. */
export const publicVehiclesQuerySchema = z.object({
  make: z.string().max(60).optional(),
  bodyStyle: bodyStyleSchema.optional(),
  fuelType: fuelTypeSchema.optional(),
  condition: conditionSchema.optional(),
  minPriceUsd: z.coerce.number().nonnegative().optional(),
  maxPriceUsd: z.coerce.number().nonnegative().optional(),
  search: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(60).default(24),
  offset: z.coerce.number().int().nonnegative().default(0),
});
export type PublicVehiclesQuery = z.infer<typeof publicVehiclesQuerySchema>;

/** A paginated result, so clients can render "showing 24 of 137" without a second call. */
export const vehicleListSchema = z.object({
  items: z.array(vehicleSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int(),
  offset: z.number().int(),
});
export type VehicleList = z.infer<typeof vehicleListSchema>;
