import type { PoolClient } from "pg";
import type { CreateLead, Lead, UpdateLead } from "@selectcars/shared";

/**
 * Lead persistence.
 *
 * Two very different callers use this module:
 *
 * - `create` runs under `withPublic`, driven by an anonymous buyer. It never receives a
 *   tenant from the caller: the dealership is read off the vehicle, so an enquiry cannot be
 *   addressed to a seller who has nothing to do with the car. The insert then has to satisfy
 *   the RLS check, which independently verifies the same thing against a car the public role
 *   can actually see.
 * - everything else runs under `withTenant`, and RLS scopes it to the dealership's own
 *   pipeline.
 */

/**
 * `first_response_at` is what makes response time answerable later. The reading is in hours
 * because that is the unit dealerships are judged in: "we answer within the hour" is a claim
 * a store makes, and "3.4 days" is the answer nobody wants to see.
 */
const LEAD_COLUMNS = `
  l.id,
  l.status,
  l.vehicle_id as "vehicleId",
  case when v.id is null then null
       else concat_ws(' ', v.year::text, v.make, v.model) end as "vehicleLabel",
  v.slug as "vehicleSlug",
  l.buyer_name as "buyerName",
  l.buyer_email as "buyerEmail",
  l.buyer_phone as "buyerPhone",
  l.message,
  l.assigned_to_user_id as "assignedToUserId",
  null::text as "assignedToName",
  case when l.first_response_at is null then null
       else round(extract(epoch from (l.first_response_at - l.created_at)) / 3600.0, 1)::float8
  end as "responseHours",
  l.created_at as "createdAt"
`;

/**
 * Record a buyer's enquiry.
 *
 * Returns nothing on purpose. The buyer gets a confirmation, never the row: the public role
 * has no select policy on this table, and handing the record back would quietly undo that.
 */
export async function createFromPublic(client: PoolClient, input: CreateLead): Promise<boolean> {
  // Read the seller off the car, as the public role: an unlisted or draft vehicle is simply
  // not here, so an enquiry cannot be attached to one.
  const vehicle = await client.query<{ tenant_id: string }>(
    "select tenant_id from public.vehicles where id = $1",
    [input.vehicleId],
  );
  const tenantId = vehicle.rows[0]?.tenant_id;
  if (!tenantId) return false;

  await client.query(
    `insert into public.leads (tenant_id, vehicle_id, buyer_name, buyer_email, buyer_phone, message)
     values ($1, $2, $3, $4, $5, $6)`,
    [
      tenantId,
      input.vehicleId,
      input.buyerName,
      input.buyerEmail,
      input.buyerPhone ?? null,
      input.message ?? null,
    ],
  );
  return true;
}

export async function listForTenant(client: PoolClient, limit = 100): Promise<Lead[]> {
  const result = await client.query<Lead>(
    `select ${LEAD_COLUMNS}
       from public.leads l
       left join public.vehicles v on v.id = l.vehicle_id
      order by
        -- Untouched enquiries first: this list is a queue before it is a record.
        case when l.status = 'new' then 0 else 1 end,
        l.created_at desc
      limit $1`,
    [limit],
  );
  return result.rows;
}

/**
 * Move a lead along, and stamp the first response while doing it.
 *
 * `first_response_at` is set by the same statement that changes the status, and only if it is
 * still null. Doing it here rather than in the caller means the timestamp cannot be forgotten
 * by whichever screen or script moves a lead next.
 */
export async function update(
  client: PoolClient,
  id: string,
  patch: UpdateLead,
): Promise<Lead | undefined> {
  const assignments: string[] = [];
  const values: unknown[] = [];

  if (patch.status !== undefined) {
    values.push(patch.status);
    assignments.push(`status = $${values.length}`);
    assignments.push(
      `first_response_at = case
         when first_response_at is not null then first_response_at
         when $${values.length} = 'new' then null
         else now()
       end`,
    );
  }
  if (patch.assignedToUserId !== undefined) {
    values.push(patch.assignedToUserId);
    assignments.push(`assigned_to_user_id = $${values.length}`);
  }

  if (!assignments.length) return findById(client, id);

  values.push(id);
  await client.query(
    `update public.leads set ${assignments.join(", ")} where id = $${values.length}`,
    values,
  );
  return findById(client, id);
}

export async function findById(client: PoolClient, id: string): Promise<Lead | undefined> {
  const result = await client.query<Lead>(
    `select ${LEAD_COLUMNS}
       from public.leads l
       left join public.vehicles v on v.id = l.vehicle_id
      where l.id = $1`,
    [id],
  );
  return result.rows[0];
}
