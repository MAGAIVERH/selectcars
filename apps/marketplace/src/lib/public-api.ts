import { vehicleListSchema, vehicleSchema, type Vehicle } from "@selectcars/shared";

/**
 * Public marketplace read client. No auth and no tenant: these hit the API's public path,
 * which runs as `selectcars_public` and can only ever return `active` listings across every
 * dealership. So whatever any dealer publishes shows up here, and nothing that is not
 * published ever can.
 */

const API_URL = process.env.API_URL ?? "http://127.0.0.1:3333";

/** Every active listing (buyers filter client-side over this set). */
export async function fetchPublicVehicles(): Promise<Vehicle[]> {
  const res = await fetch(`${API_URL}/public/vehicles?limit=60`, { cache: "no-store" });
  if (!res.ok) return [];

  const parsed = vehicleListSchema.safeParse(await res.json());
  return parsed.success ? parsed.data.items : [];
}

/** A single active listing by slug, or null when it is not found (or not active). */
export async function fetchPublicVehicleBySlug(slug: string): Promise<Vehicle | null> {
  const res = await fetch(`${API_URL}/public/vehicles/${encodeURIComponent(slug)}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;

  const parsed = vehicleSchema.safeParse(await res.json());
  return parsed.success ? parsed.data : null;
}
