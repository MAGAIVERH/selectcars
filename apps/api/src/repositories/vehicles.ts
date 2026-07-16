import type { PoolClient } from "pg";
import type {
  CreateVehicle,
  ListVehiclesQuery,
  PublicVehiclesQuery,
  UpdateVehicle,
  Vehicle,
} from "@selectcars/shared";

/**
 * Vehicle persistence.
 *
 * Every function here takes a `PoolClient` that the caller has already scoped, with
 * `withTenant` (dealer) or `withPublic` (buyer). That is deliberate: this module cannot
 * open its own connection, so it cannot accidentally run outside a tenant context. The
 * SQL below never filters by `tenant_id`, because RLS does it.
 */

/**
 * The columns the API exposes, mapped to the camelCase contract in one place.
 *
 * `photos` is aggregated inline as a correlated subquery, so every read (list, detail, and
 * the create/update RETURNING) carries the ordered gallery in one round trip. On the public
 * path the subquery runs as `selectcars_public`, whose RLS policy only reveals photos of
 * `active` vehicles, so a buyer never receives a draft's images.
 */
const VEHICLE_COLUMNS = `
  id, slug, vin, make, model, year, trim, mileage,
  price_usd::float8 as "priceUsd",
  condition, body_style as "bodyStyle", fuel_type as "fuelType",
  transmission, drivetrain,
  exterior_color as "exteriorColor", interior_color as "interiorColor",
  description, status,
  coalesce((
    select json_agg(
      json_build_object(
        'id', p.id, 'url', p.url, 'alt', p.alt,
        'position', p.position, 'isPrimary', p.is_primary
      ) order by p.position
    )
    from public.vehicle_photos p
    where p.vehicle_id = vehicles.id
  ), '[]'::json) as photos,
  created_at as "createdAt", updated_at as "updatedAt"
`;

/** URL-safe, human-readable, and unique per dealership (the DB enforces the uniqueness). */
function buildSlug(input: Pick<CreateVehicle, "year" | "make" | "model" | "trim">): string {
  const parts = [input.year, input.make, input.model, input.trim].filter(Boolean).join(" ");
  const base = parts
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  // Short random suffix: two identical trims in the same dealership must still both save.
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

export async function listForTenant(
  client: PoolClient,
  query: ListVehiclesQuery,
): Promise<{ items: Vehicle[]; total: number }> {
  const filters: string[] = [];
  const values: unknown[] = [];

  if (query.status) {
    values.push(query.status);
    filters.push(`status = $${values.length}`);
  }
  if (query.search) {
    values.push(`%${query.search}%`);
    filters.push(
      `(make ilike $${values.length} or model ilike $${values.length} or vin ilike $${values.length})`,
    );
  }
  const where = filters.length ? `where ${filters.join(" and ")}` : "";

  const totalResult = await client.query<{ count: string }>(
    `select count(*) from public.vehicles ${where}`,
    values,
  );

  values.push(query.limit, query.offset);
  const items = await client.query<Vehicle>(
    `select ${VEHICLE_COLUMNS}
       from public.vehicles
       ${where}
      order by created_at desc
      limit $${values.length - 1} offset $${values.length}`,
    values,
  );

  return { items: items.rows, total: Number(totalResult.rows[0]?.count ?? 0) };
}

export async function findByIdForTenant(
  client: PoolClient,
  id: string,
): Promise<Vehicle | undefined> {
  const result = await client.query<Vehicle>(
    `select ${VEHICLE_COLUMNS} from public.vehicles where id = $1`,
    [id],
  );
  return result.rows[0];
}

export async function create(
  client: PoolClient,
  tenantId: string,
  input: CreateVehicle,
): Promise<Vehicle> {
  const result = await client.query<Vehicle>(
    `insert into public.vehicles (
       tenant_id, slug, vin, make, model, year, trim, mileage, price_usd,
       condition, body_style, fuel_type, transmission, drivetrain,
       exterior_color, interior_color, description, status
     )
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     returning ${VEHICLE_COLUMNS}`,
    [
      tenantId,
      buildSlug(input),
      input.vin ?? null,
      input.make,
      input.model,
      input.year,
      input.trim ?? null,
      input.mileage,
      input.priceUsd ?? null,
      input.condition,
      input.bodyStyle,
      input.fuelType,
      input.transmission ?? null,
      input.drivetrain ?? null,
      input.exteriorColor ?? null,
      input.interiorColor ?? null,
      input.description ?? null,
      input.status,
    ],
  );

  // RLS guarantees the row belongs to this tenant, so a missing row here is impossible.
  const vehicle = result.rows[0];
  if (!vehicle) throw new Error("Insert returned no row.");
  return vehicle;
}

/** Maps contract fields to columns. Anything not listed here simply cannot be updated. */
const UPDATABLE_COLUMNS: Record<keyof UpdateVehicle, string> = {
  vin: "vin",
  make: "make",
  model: "model",
  year: "year",
  trim: "trim",
  mileage: "mileage",
  priceUsd: "price_usd",
  condition: "condition",
  bodyStyle: "body_style",
  fuelType: "fuel_type",
  transmission: "transmission",
  drivetrain: "drivetrain",
  exteriorColor: "exterior_color",
  interiorColor: "interior_color",
  description: "description",
  status: "status",
};

export async function update(
  client: PoolClient,
  id: string,
  patch: UpdateVehicle,
): Promise<Vehicle | undefined> {
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [field, column] of Object.entries(UPDATABLE_COLUMNS)) {
    const value = patch[field as keyof UpdateVehicle];
    if (value === undefined) continue;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  if (!assignments.length) return findByIdForTenant(client, id);

  values.push(id);
  const result = await client.query<Vehicle>(
    `update public.vehicles
        set ${assignments.join(", ")}
      where id = $${values.length}
      returning ${VEHICLE_COLUMNS}`,
    values,
  );
  return result.rows[0];
}

export async function remove(client: PoolClient, id: string): Promise<boolean> {
  const result = await client.query("delete from public.vehicles where id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}

/**
 * The public marketplace listing. There is no `status` filter here on purpose: the RLS
 * policy on the public role already admits only `active` rows, so a buyer cannot ask for
 * drafts even by crafting the query.
 */
export async function listPublic(
  client: PoolClient,
  query: PublicVehiclesQuery,
): Promise<{ items: Vehicle[]; total: number }> {
  const filters: string[] = [];
  const values: unknown[] = [];

  const eq = (column: string, value: unknown) => {
    if (value === undefined) return;
    values.push(value);
    filters.push(`${column} = $${values.length}`);
  };

  eq("make", query.make);
  eq("body_style", query.bodyStyle);
  eq("fuel_type", query.fuelType);
  eq("condition", query.condition);

  if (query.minPriceUsd !== undefined) {
    values.push(query.minPriceUsd);
    filters.push(`price_usd >= $${values.length}`);
  }
  if (query.maxPriceUsd !== undefined) {
    values.push(query.maxPriceUsd);
    filters.push(`price_usd <= $${values.length}`);
  }
  if (query.search) {
    values.push(`%${query.search}%`);
    filters.push(`(make ilike $${values.length} or model ilike $${values.length})`);
  }

  const where = filters.length ? `where ${filters.join(" and ")}` : "";

  const totalResult = await client.query<{ count: string }>(
    `select count(*) from public.vehicles ${where}`,
    values,
  );

  values.push(query.limit, query.offset);
  const items = await client.query<Vehicle>(
    `select ${VEHICLE_COLUMNS}
       from public.vehicles
       ${where}
      order by created_at desc
      limit $${values.length - 1} offset $${values.length}`,
    values,
  );

  return { items: items.rows, total: Number(totalResult.rows[0]?.count ?? 0) };
}

export async function findPublicBySlug(
  client: PoolClient,
  slug: string,
): Promise<Vehicle | undefined> {
  const result = await client.query<Vehicle>(
    `select ${VEHICLE_COLUMNS} from public.vehicles where slug = $1`,
    [slug],
  );
  return result.rows[0];
}
