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
      // The request was well formed and allowed, but the resource's current state refuses
      // it: a listing that is `sold` cannot be moved back to `draft`, for example.
      "conflict",
      "bad_request",
      // A dependency this endpoint needs is not configured or not answering (photo storage,
      // for instance). Distinct from `internal`, because nothing is broken: something is
      // switched off, and the message can say which.
      "unavailable",
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

/**
 * The listing lifecycle as a graph: from each status, the statuses a dealer may move to.
 *
 * This is a business rule, not a UI detail, so it lives with the contract. The dashboard
 * reads it to decide which buttons to render, and the API reads the same map to reject a
 * request that skips a step. Neither side can drift, and a hand-crafted `curl` gets the
 * same answer as the button.
 *
 * The shape of the workflow, in words:
 * - `draft` is private work in progress: the only way out is to publish it.
 * - `active` is live on the marketplace: unpublish it, put a deal on it, or sell it.
 * - `pending` is a deal in progress: it closes (`sold`) or it falls through (`active`).
 * - `sold` is terminal for the deal, but a unit can come back (a financing failure, a
 *   returned trade), so relisting is allowed. Going straight back to `draft` is not: a
 *   sold car quietly becoming an unpublished draft would erase it from the sales record.
 */
export const VEHICLE_STATUS_TRANSITIONS: Record<VehicleStatus, readonly VehicleStatus[]> = {
  draft: ["active"],
  active: ["draft", "pending", "sold"],
  pending: ["active", "sold"],
  sold: ["active"],
} as const;

/**
 * Is this status change allowed?
 *
 * Staying put counts as allowed: saving the edit form without touching the status is not a
 * transition, and must not be rejected as one.
 */
export function canTransitionStatus(from: VehicleStatus, to: VehicleStatus): boolean {
  return from === to || VEHICLE_STATUS_TRANSITIONS[from].includes(to);
}

/**
 * The label a dealer sees on the button for a transition. The wording depends on where the
 * car is coming from: moving to `active` is "Publish" for a draft but "Relist" for a car
 * that was sold, and calling both "Activate" would tell the dealer nothing.
 */
export function statusActionLabel(from: VehicleStatus, to: VehicleStatus): string {
  switch (to) {
    case "active":
      if (from === "draft") return "Publish";
      if (from === "sold") return "Relist";
      return "Back to active";
    case "draft":
      return "Unpublish";
    case "pending":
      return "Mark pending";
    case "sold":
      return "Mark sold";
  }
}

/** Body of a status-only change, used by the dashboard's row actions. */
export const changeVehicleStatusSchema = z.object({ status: vehicleStatusSchema });
export type ChangeVehicleStatus = z.infer<typeof changeVehicleStatusSchema>;

/**
 * The seller of a listing, as a buyer sees it.
 *
 * In the US market the seller of record is the **dealership**, not an individual. A
 * salesperson is staff inside a dealership (see `dealershipRoleSchema`): they work leads and
 * deals, they do not own listings. So this is the dealership's public identity, and it is
 * what "Sold by" shows, what the marketplace filters on, and what `/dealers/<slug>` resolves.
 */
export const dealerSummarySchema = z.object({
  slug: z.string(),
  name: z.string(),
  city: z.string().nullable(),
  state: z.string().nullable(),
});
export type DealerSummary = z.infer<typeof dealerSummarySchema>;

/** The full public profile, including what only the dealership's own team edits. */
export const dealerProfileSchema = dealerSummarySchema.extend({
  phone: z.string().nullable(),
  about: z.string().nullable(),
});
export type DealerProfile = z.infer<typeof dealerProfileSchema>;

/**
 * What a dealership may change about its public identity. The slug is absent on purpose:
 * it is the address buyers and search engines already have, so it is not a field to retype.
 */
export const updateDealerProfileSchema = z.object({
  name: z.string().min(2).max(80),
  city: z.string().max(80).nullish(),
  state: z
    .string()
    .regex(/^[A-Z]{2}$/, "Use the two-letter state code, like FL.")
    .nullish(),
  phone: z.string().max(32).nullish(),
  about: z.string().max(600).nullish(),
});
export type UpdateDealerProfile = z.infer<typeof updateDealerProfileSchema>;

/** A seller in the marketplace's seller directory, with how much it has for sale. */
export const dealerListingSchema = dealerSummarySchema.extend({
  listingCount: z.number().int().nonnegative(),
});
export type DealerListing = z.infer<typeof dealerListingSchema>;

export const dealerListSchema = z.object({ items: z.array(dealerListingSchema) });
export type DealerList = z.infer<typeof dealerListSchema>;

/** A gallery photo for a vehicle. Buyers only ever receive photos of `active` listings. */
export const vehiclePhotoSchema = z.object({
  id: z.string().uuid(),
  url: z.string(),
  alt: z.string().nullable(),
  position: z.number().int().nonnegative(),
  isPrimary: z.boolean(),
});
export type VehiclePhoto = z.infer<typeof vehiclePhotoSchema>;

/**
 * Upload limits, shared so the browser, the API, and the storage bucket agree.
 *
 * The browser check exists to give a dealer an instant, readable answer. It is not the
 * defence: the API re-checks, and the bucket itself refuses anything larger or of another
 * type. Three layers, because the first two can be bypassed by anyone willing to craft a
 * request, and the last one cannot.
 */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_PHOTOS_PER_VEHICLE = 12;
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

export const photoContentTypeSchema = z.enum(ALLOWED_PHOTO_TYPES);
export type PhotoContentType = z.infer<typeof photoContentTypeSchema>;

/** What a dealer's browser says it is about to upload, before it is allowed to. */
export const photoUploadRequestSchema = z.object({
  fileName: z.string().min(1).max(180),
  contentType: photoContentTypeSchema,
  sizeBytes: z.number().int().positive().max(MAX_PHOTO_BYTES),
});
export type PhotoUploadRequest = z.infer<typeof photoUploadRequestSchema>;

/**
 * Permission to write exactly one object, for a short time.
 *
 * The dealer's browser sends the bytes straight to storage with this ticket, so a 5 MB photo
 * never travels through our API. What the browser never receives is the storage credential:
 * the ticket is signed server-side and only covers the one key the API chose.
 */
export const photoUploadTicketSchema = z.object({
  uploadUrl: z.string().url(),
  storageKey: z.string(),
  /** Where the object will be readable once the upload finishes. */
  publicUrl: z.string().url(),
});
export type PhotoUploadTicket = z.infer<typeof photoUploadTicketSchema>;

/**
 * Recorded after the bytes are safely in storage. The API re-derives the URL from the key it
 * issued, so a caller cannot attach an arbitrary address to someone's listing.
 */
export const attachPhotoSchema = z.object({
  storageKey: z.string().min(1).max(300),
  alt: z.string().max(180).nullish(),
  isPrimary: z.boolean().default(false),
});
export type AttachPhoto = z.infer<typeof attachPhotoSchema>;

/**
 * A vehicle as the API returns it, with its ordered gallery (primary first). `photos` is
 * always present: an empty array when a listing has none, never missing.
 */
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
  photos: z.array(vehiclePhotoSchema).default([]),
  /**
   * The dealership selling this car. Nullable because it is read with a left join: the
   * database creates a profile for every dealership, but a listing must never vanish from
   * its own dealer's inventory because a profile row is missing.
   */
  dealer: dealerSummarySchema.nullable().default(null),
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

/**
 * A recorded sale.
 *
 * The gross figures are computed by the database (generated columns), never sent by a client:
 * two screens can disagree about a filter, but they cannot disagree about what front-end
 * gross means.
 */
export const dealSchema = z.object({
  id: z.string().uuid(),
  vehicleId: z.string().uuid(),
  /** Denormalised for display, so a deal list does not need a second call. */
  vehicleLabel: z.string(),
  soldAt: z.string(),
  salePriceUsd: z.number(),
  vehicleCostUsd: z.number(),
  reconCostUsd: z.number(),
  backEndGrossUsd: z.number(),
  frontEndGrossUsd: z.number(),
  totalGrossUsd: z.number(),
  buyerName: z.string().nullable(),
  notes: z.string().nullable(),
  /** Days between the car being listed and the sale closing. Null if the listing is gone. */
  daysToSale: z.number().int().nullable(),
});
export type Deal = z.infer<typeof dealSchema>;

/** What a dealer types when a car is sold. Everything else is derived. */
export const createDealSchema = z.object({
  vehicleId: z.string().uuid(),
  soldAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-07-28.")
    .optional(),
  salePriceUsd: z.number().nonnegative().max(100_000_000),
  vehicleCostUsd: z.number().nonnegative().max(100_000_000),
  reconCostUsd: z.number().nonnegative().max(1_000_000).default(0),
  // Can be negative: a finance office does lose money on a deal sometimes.
  backEndGrossUsd: z.number().min(-1_000_000).max(1_000_000).default(0),
  buyerName: z.string().max(120).nullish(),
  notes: z.string().max(1000).nullish(),
});
export type CreateDeal = z.infer<typeof createDealSchema>;

export const dealListSchema = z.object({ items: z.array(dealSchema) });
export type DealList = z.infer<typeof dealListSchema>;

/**
 * The dealership's numbers, as its principal checks them.
 *
 * The set is the standard one used across the trade (Cox Automotive's used-car KPIs, the
 * dashboards in Tekion and DealerSocket): what is on the lot and what it is worth, what sold
 * and what it made, how fast it turned, and what is going stale.
 *
 * Everything is tenant-scoped and computed in the database, so no client can arrive at a
 * different answer by summing differently.
 */
export const dealershipMetricsSchema = z.object({
  inventory: z.object({
    /** Unsold units: draft, active, and pending. */
    unitsInStock: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
    draft: z.number().int().nonnegative(),
    pending: z.number().int().nonnegative(),
    /** Asking price of everything still in stock. */
    valueUsd: z.number().nonnegative(),
    /** Average days on lot across unsold units. */
    averageDaysOnLot: z.number().nonnegative(),
    /** Units that have sat 60 days or more: the money that is going stale. */
    aging60Plus: z.number().int().nonnegative(),
  }),
  sales: z.object({
    /** Sales recorded in the trailing 30 days, and all time. */
    unitsSold30d: z.number().int().nonnegative(),
    unitsSoldTotal: z.number().int().nonnegative(),
    frontEndGrossUsd: z.number(),
    backEndGrossUsd: z.number(),
    totalGrossUsd: z.number(),
    /** Gross per vehicle retailed: total gross divided by units. Zero when nothing sold. */
    grossPerUnitUsd: z.number(),
    /** Average days from listing to sale. Null until something has sold. */
    averageDaysToSale: z.number().nullable(),
  }),
});
export type DealershipMetrics = z.infer<typeof dealershipMetricsSchema>;

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
  /** A dealership's slug: "show me only this seller's cars". */
  dealer: z.string().max(160).optional(),
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
