import {
  dealerListSchema,
  dealerProfileSchema,
  vehicleListSchema,
  vehicleSchema,
  type DealerListing,
  type DealerProfile,
  type Vehicle,
} from "@selectcars/shared";

/**
 * Public marketplace read client. No auth and no tenant: these hit the API's public path,
 * which runs as `selectcars_public` and can only ever return `active` listings across every
 * dealership. So whatever any dealer publishes shows up here, and nothing that is not
 * published ever can.
 */

const API_URL = process.env.API_URL ?? "http://127.0.0.1:3333";

/**
 * Every active listing (buyers filter client-side over this set), or one seller's when a
 * `dealer` slug is given. Filtering by seller happens on the API rather than in the browser
 * because a dealership's own page should not ship every other dealership's inventory to
 * render one storefront.
 */
export async function fetchPublicVehicles(options: { dealer?: string } = {}): Promise<Vehicle[]> {
  const params = new URLSearchParams({ limit: "60" });
  if (options.dealer) params.set("dealer", options.dealer);

  const res = await fetch(`${API_URL}/public/vehicles?${params.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) return [];

  const parsed = vehicleListSchema.safeParse(await res.json());
  return parsed.success ? parsed.data.items : [];
}

/** Every dealership with something for sale right now. */
export async function fetchPublicDealers(): Promise<DealerListing[]> {
  const res = await fetch(`${API_URL}/public/dealers`, { cache: "no-store" });
  if (!res.ok) return [];

  const parsed = dealerListSchema.safeParse(await res.json());
  return parsed.success ? parsed.data.items : [];
}

/** One dealership's public profile, or null when it has nothing published (or does not exist). */
export async function fetchPublicDealer(slug: string): Promise<DealerProfile | null> {
  const res = await fetch(`${API_URL}/public/dealers/${encodeURIComponent(slug)}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;

  const parsed = dealerProfileSchema.safeParse(await res.json());
  return parsed.success ? parsed.data : null;
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
