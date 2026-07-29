import type { PoolClient } from "pg";
import type { CreateDeal, Deal, DealershipMetrics } from "@selectcars/shared";

/**
 * Deals and the numbers derived from them.
 *
 * Tenant scoping is RLS, as everywhere else, and it matters more here than anywhere: this
 * table holds what a dealership paid for its cars. There is no public role grant at all, so
 * even a careless query cannot expose one store's margins to another, or to a buyer.
 */

/**
 * `sold_at - created_at` is the number the trade calls days to sale, and it is why the deal
 * joins back to its vehicle rather than storing a copy: the listing already knows when it
 * arrived, and two copies of a date eventually disagree.
 */
const DEAL_COLUMNS = `
  d.id,
  d.vehicle_id as "vehicleId",
  concat_ws(' ', v.year::text, v.make, v.model) as "vehicleLabel",
  to_char(d.sold_at, 'YYYY-MM-DD') as "soldAt",
  d.sale_price_usd::float8 as "salePriceUsd",
  d.vehicle_cost_usd::float8 as "vehicleCostUsd",
  d.recon_cost_usd::float8 as "reconCostUsd",
  d.back_end_gross_usd::float8 as "backEndGrossUsd",
  d.front_end_gross_usd::float8 as "frontEndGrossUsd",
  d.total_gross_usd::float8 as "totalGrossUsd",
  d.buyer_name as "buyerName",
  d.notes,
  (d.sold_at - v.created_at::date)::int as "daysToSale"
`;

export async function listForTenant(client: PoolClient, limit = 50): Promise<Deal[]> {
  const result = await client.query<Deal>(
    `select ${DEAL_COLUMNS}
       from public.deals d
       join public.vehicles v on v.id = d.vehicle_id
      order by d.sold_at desc, d.created_at desc
      limit $1`,
    [limit],
  );
  return result.rows;
}

export async function findForVehicle(client: PoolClient, vehicleId: string): Promise<Deal[]> {
  const result = await client.query<Deal>(
    `select ${DEAL_COLUMNS}
       from public.deals d
       join public.vehicles v on v.id = d.vehicle_id
      where d.vehicle_id = $1
      order by d.sold_at desc`,
    [vehicleId],
  );
  return result.rows;
}

export async function create(
  client: PoolClient,
  tenantId: string,
  input: CreateDeal,
): Promise<Deal | undefined> {
  const inserted = await client.query<{ id: string }>(
    `insert into public.deals (
       tenant_id, vehicle_id, sold_at, sale_price_usd, vehicle_cost_usd,
       recon_cost_usd, back_end_gross_usd, buyer_name, notes
     )
     values ($1, $2, coalesce($3::date, current_date), $4, $5, $6, $7, $8, $9)
     returning id`,
    [
      tenantId,
      input.vehicleId,
      input.soldAt ?? null,
      input.salePriceUsd,
      input.vehicleCostUsd,
      input.reconCostUsd,
      input.backEndGrossUsd,
      input.buyerName ?? null,
      input.notes ?? null,
    ],
  );

  const id = inserted.rows[0]?.id;
  if (!id) return undefined;

  // Read it back through the same projection the list uses, so the gross figures a client
  // sees after creating a deal are the database's, not the ones the client sent.
  const result = await client.query<Deal>(
    `select ${DEAL_COLUMNS}
       from public.deals d
       join public.vehicles v on v.id = d.vehicle_id
      where d.id = $1`,
    [id],
  );
  return result.rows[0];
}

export async function remove(client: PoolClient, id: string): Promise<boolean> {
  const result = await client.query("delete from public.deals where id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}

type MetricsRow = {
  unitsInStock: number;
  active: number;
  draft: number;
  pending: number;
  valueUsd: number;
  averageDaysOnLot: number;
  aging60Plus: number;
  unitsSold30d: number;
  unitsSoldTotal: number;
  frontEndGrossUsd: number;
  backEndGrossUsd: number;
  totalGrossUsd: number;
  averageDaysToSale: number | null;
  newLeads: number;
  leadsLast30d: number;
  averageResponseHours: number | null;
};

/** Unsold means it is still costing the dealership money: draft, active, or pending. */
const IN_STOCK = `status in ('draft', 'active', 'pending')`;

/**
 * Every number on the overview, in one round trip.
 *
 * Written as one statement on purpose. Seven separate counts would be seven chances for the
 * screen to show figures from slightly different moments, and a dashboard whose parts
 * disagree is worse than one that loads a beat slower.
 */
export async function metricsForTenant(client: PoolClient): Promise<DealershipMetrics> {
  const result = await client.query<MetricsRow>(`
    with stock as (
      select
        count(*) filter (where ${IN_STOCK})::int as "unitsInStock",
        count(*) filter (where status = 'active')::int as "active",
        count(*) filter (where status = 'draft')::int as "draft",
        count(*) filter (where status = 'pending')::int as "pending",
        coalesce(sum(price_usd) filter (where ${IN_STOCK}), 0)::float8 as "valueUsd",
        coalesce(
          avg(extract(day from now() - created_at)) filter (where ${IN_STOCK}), 0
        )::float8 as "averageDaysOnLot",
        count(*) filter (
          where ${IN_STOCK} and created_at < now() - interval '60 days'
        )::int as "aging60Plus"
      from public.vehicles
    ),
    sold as (
      select
        count(*) filter (where sold_at >= current_date - interval '30 days')::int as "unitsSold30d",
        count(*)::int as "unitsSoldTotal",
        coalesce(sum(front_end_gross_usd), 0)::float8 as "frontEndGrossUsd",
        coalesce(sum(back_end_gross_usd), 0)::float8 as "backEndGrossUsd",
        coalesce(sum(total_gross_usd), 0)::float8 as "totalGrossUsd"
      from public.deals
    ),
    speed as (
      select avg(d.sold_at - v.created_at::date)::float8 as "averageDaysToSale"
      from public.deals d
      join public.vehicles v on v.id = d.vehicle_id
    ),
    inbound as (
      select
        count(*) filter (where status = 'new')::int as "newLeads",
        count(*) filter (where created_at >= now() - interval '30 days')::int as "leadsLast30d",
        avg(
          extract(epoch from (first_response_at - created_at)) / 3600.0
        )::float8 as "averageResponseHours"
      from public.leads
    )
    select * from stock, sold, speed, inbound
  `);

  const row = result.rows[0];
  if (!row) throw new Error("Metrics query returned no row.");

  return {
    inventory: {
      unitsInStock: row.unitsInStock,
      active: row.active,
      draft: row.draft,
      pending: row.pending,
      valueUsd: row.valueUsd,
      averageDaysOnLot: Math.round(row.averageDaysOnLot),
      aging60Plus: row.aging60Plus,
    },
    sales: {
      unitsSold30d: row.unitsSold30d,
      unitsSoldTotal: row.unitsSoldTotal,
      frontEndGrossUsd: row.frontEndGrossUsd,
      backEndGrossUsd: row.backEndGrossUsd,
      totalGrossUsd: row.totalGrossUsd,
      // Averaging in SQL would have meant dividing by zero on a dealership that has not sold
      // anything yet. The guard is clearer here than a `nullif` buried in the query.
      grossPerUnitUsd: row.unitsSoldTotal > 0 ? row.totalGrossUsd / row.unitsSoldTotal : 0,
      averageDaysToSale: row.averageDaysToSale === null ? null : Math.round(row.averageDaysToSale),
    },
    leads: {
      newLeads: row.newLeads,
      last30d: row.leadsLast30d,
      // Rounded to one decimal: "1.4 hours" is a number a dealer can act on, and hiding the
      // fraction would flatter every store that answers in under an hour.
      averageResponseHours:
        row.averageResponseHours === null ? null : Math.round(row.averageResponseHours * 10) / 10,
    },
  };
}
