import type { PoolClient } from "pg";
import type { VehiclePhoto } from "@selectcars/shared";

/**
 * Vehicle photo persistence.
 *
 * Like the other repositories, every function takes a client the caller already scoped with
 * `withTenant`. None of the SQL filters by `tenant_id`: RLS does, on both tables, so a photo
 * can only ever be attached to, or removed from, a vehicle the caller owns.
 */

const PHOTO_COLUMNS = `id, url, alt, position, is_primary as "isPrimary"`;

/** Does this vehicle exist *for this tenant*? Another dealership's id simply is not here. */
export async function vehicleExists(client: PoolClient, vehicleId: string): Promise<boolean> {
  const result = await client.query("select 1 from public.vehicles where id = $1", [vehicleId]);
  return (result.rowCount ?? 0) > 0;
}

export async function countForVehicle(client: PoolClient, vehicleId: string): Promise<number> {
  const result = await client.query<{ count: string }>(
    "select count(*) from public.vehicle_photos where vehicle_id = $1",
    [vehicleId],
  );
  return Number(result.rows[0]?.count ?? 0);
}

/**
 * Record an uploaded photo.
 *
 * Two rules are applied here rather than left to the caller:
 *
 * - The **first** photo of a vehicle is always primary. A listing whose only photo is not the
 *   primary one would render with no image on the card, which is indistinguishable from a bug.
 * - Making a photo primary **clears the previous one first**. The database has a partial
 *   unique index that would otherwise reject the insert, which is exactly the point: the rule
 *   is stated once, in the schema, and this code has to satisfy it.
 */
export async function attach(
  client: PoolClient,
  input: {
    vehicleId: string;
    tenantId: string;
    url: string;
    storageKey: string;
    alt: string | null;
    isPrimary: boolean;
  },
): Promise<VehiclePhoto> {
  const existing = await countForVehicle(client, input.vehicleId);
  const primary = input.isPrimary || existing === 0;

  if (primary) {
    await client.query(
      "update public.vehicle_photos set is_primary = false where vehicle_id = $1 and is_primary",
      [input.vehicleId],
    );
  }

  const result = await client.query<VehiclePhoto>(
    `insert into public.vehicle_photos
       (vehicle_id, tenant_id, url, storage_key, alt, position, is_primary)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning ${PHOTO_COLUMNS}`,
    [
      input.vehicleId,
      input.tenantId,
      input.url,
      input.storageKey,
      input.alt,
      existing, // appended to the end of the gallery
      primary,
    ],
  );

  const photo = result.rows[0];
  if (!photo) throw new Error("Insert returned no row.");
  return photo;
}

export type RemovedPhoto = { storageKey: string | null; wasPrimary: boolean };

/**
 * Delete one photo and report what it was, so the caller can clean up after it: the object in
 * storage, and the gallery's missing primary.
 */
export async function remove(
  client: PoolClient,
  vehicleId: string,
  photoId: string,
): Promise<RemovedPhoto | undefined> {
  const result = await client.query<{ storage_key: string | null; is_primary: boolean }>(
    `delete from public.vehicle_photos
      where id = $1 and vehicle_id = $2
      returning storage_key, is_primary`,
    [photoId, vehicleId],
  );

  const row = result.rows[0];
  if (!row) return undefined;
  return { storageKey: row.storage_key, wasPrimary: row.is_primary };
}

/**
 * After the primary photo is deleted, the oldest remaining one takes over. A gallery with
 * photos but no primary would render an empty card, so the vacancy is never left open.
 */
export async function promoteFirstPhoto(client: PoolClient, vehicleId: string): Promise<void> {
  await client.query(
    `update public.vehicle_photos
        set is_primary = true
      where id = (
        select id from public.vehicle_photos
         where vehicle_id = $1
         order by position, id
         limit 1
      )`,
    [vehicleId],
  );
}

/** Make one photo the primary, clearing the previous one in the same transaction. */
export async function setPrimary(
  client: PoolClient,
  vehicleId: string,
  photoId: string,
): Promise<boolean> {
  await client.query(
    "update public.vehicle_photos set is_primary = false where vehicle_id = $1 and is_primary",
    [vehicleId],
  );

  const result = await client.query(
    "update public.vehicle_photos set is_primary = true where id = $1 and vehicle_id = $2",
    [photoId, vehicleId],
  );
  return (result.rowCount ?? 0) > 0;
}
