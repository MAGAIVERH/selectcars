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
