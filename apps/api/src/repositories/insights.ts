import type { PoolClient } from "pg";
import type { InsightSeverity, VehicleInsight } from "@selectcars/shared";

/**
 * Insights: what the platform noticed about a dealership's cars.
 *
 * Both kinds are **arithmetic**, and that is the design. A model may later write a sentence
 * over the numbers, but the numbers are computed here, from data, and they are what the
 * dashboard shows when no model is configured. Nothing in this file needs an API key.
 *
 * The two Postgres roles do different jobs in the same run, which is the neat part:
 *
 *   `withPublic`  reads the **market**: every active listing, across every dealership.
 *   `withTenant`  reads and writes **this dealership's** cars and insights.
 *
 * A dealer therefore learns where their car sits against the whole marketplace without ever
 * being able to read another dealership's row, because the comparison happens under the role
 * that can only see what a buyer sees.
 */

export type StockVehicle = {
  id: string;
  make: string;
  model: string;
  year: number;
  bodyStyle: string;
  priceUsd: number | null;
  status: string;
  daysOnLot: number;
};

/** The dealership's unsold cars, with how long each has been sitting. */
export async function stockForTenant(client: PoolClient): Promise<StockVehicle[]> {
  const result = await client.query<StockVehicle>(
    `select id, make, model, year,
            body_style as "bodyStyle",
            price_usd::float8 as "priceUsd",
            status,
            extract(day from now() - created_at)::int as "daysOnLot"
       from public.vehicles
      where status in ('draft', 'active', 'pending')`,
  );
  return result.rows;
}

/** How fast this dealership actually sells, used as the aging benchmark. */
export async function averageDaysToSale(client: PoolClient): Promise<number | null> {
  const result = await client.query<{ days: number | null }>(
    `select avg(d.sold_at - v.created_at::date)::float8 as days
       from public.deals d
       join public.vehicles v on v.id = d.vehicle_id`,
  );
  const days = result.rows[0]?.days;
  return days === null || days === undefined ? null : Math.round(days);
}

export type MarketComparison = { sample: number; medianUsd: number | null };

/**
 * Where comparable cars are priced, across the whole marketplace.
 *
 * Run under `withPublic`, so "comparable" means "listings a buyer can actually see": active
 * cars from every dealership, this one included. A year band of ±2 keeps a 2019 and a 2021 of
 * the same model in the same conversation without pretending a 2015 belongs there.
 */
export async function comparableListings(
  client: PoolClient,
  input: { make: string; bodyStyle: string; year: number; excludeVehicleId: string },
): Promise<MarketComparison> {
  const result = await client.query<{ sample: number; median: number | null }>(
    `select count(*)::int as sample,
            percentile_cont(0.5) within group (order by price_usd)::float8 as median
       from public.vehicles
      where price_usd is not null
        and make = $1
        and body_style = $2
        and year between $3 - 2 and $3 + 2
        and id <> $4`,
    [input.make, input.bodyStyle, input.year, input.excludeVehicleId],
  );

  const row = result.rows[0];
  return { sample: row?.sample ?? 0, medianUsd: row?.median ?? null };
}

export type ComputedInsight = {
  vehicleId: string;
  kind: "pricing" | "aging";
  severity: InsightSeverity;
  headline: string;
  facts: Record<string, string | number>;
};

/** Below this, "the market" is one or two cars and the median means nothing. */
const MIN_COMPARABLE_SAMPLE = 3;
/** How far off the median before it is worth a dealer's attention. */
const PRICE_TOLERANCE = 0.12;
/** Used when a dealership has sold nothing yet and has no pace of its own. */
const DEFAULT_DAYS_BENCHMARK = 45;

/**
 * Where this car sits against the market.
 *
 * Deliberately silent when the comparison set is too small: "priced 40% above market" drawn
 * from one other listing is worse than saying nothing, because a dealer might act on it.
 */
export function pricingInsight(
  vehicle: StockVehicle,
  market: MarketComparison,
): ComputedInsight | null {
  if (vehicle.priceUsd === null || market.medianUsd === null) return null;
  if (market.sample < MIN_COMPARABLE_SAMPLE) return null;

  const delta = (vehicle.priceUsd - market.medianUsd) / market.medianUsd;
  const percent = Math.round(Math.abs(delta) * 100);

  const facts = {
    priceUsd: vehicle.priceUsd,
    marketMedianUsd: Math.round(market.medianUsd),
    comparableListings: market.sample,
    percentFromMedian: Math.round(delta * 100),
  };

  if (delta > PRICE_TOLERANCE) {
    return {
      vehicleId: vehicle.id,
      kind: "pricing",
      severity: "warning",
      headline: `Priced ${percent}% above comparable listings`,
      facts,
    };
  }
  if (delta < -PRICE_TOLERANCE) {
    return {
      vehicleId: vehicle.id,
      kind: "pricing",
      severity: "info",
      headline: `Priced ${percent}% below comparable listings`,
      facts,
    };
  }
  return {
    vehicleId: vehicle.id,
    kind: "pricing",
    severity: "info",
    headline: "Priced in line with the market",
    facts,
  };
}

/**
 * How long it has been sitting, against how fast this dealership usually sells.
 *
 * The benchmark is the store's own pace rather than a fixed 60 days, because 60 days is
 * ordinary for a Bentley and alarming for a Corolla. A dealership with no sales history gets
 * a neutral default rather than a lecture.
 */
export function agingInsight(vehicle: StockVehicle, benchmark: number | null): ComputedInsight {
  const target = benchmark ?? DEFAULT_DAYS_BENCHMARK;
  const facts = {
    daysOnLot: vehicle.daysOnLot,
    dealershipAverageDaysToSale: target,
    benchmarkSource: benchmark === null ? "platform default" : "this dealership",
  };

  if (vehicle.daysOnLot >= target * 2) {
    return {
      vehicleId: vehicle.id,
      kind: "aging",
      severity: "critical",
      headline: `${vehicle.daysOnLot} days on the lot, more than twice your usual ${target}`,
      facts,
    };
  }
  if (vehicle.daysOnLot > target) {
    return {
      vehicleId: vehicle.id,
      kind: "aging",
      severity: "warning",
      headline: `${vehicle.daysOnLot} days on the lot, past your usual ${target}`,
      facts,
    };
  }
  return {
    vehicleId: vehicle.id,
    kind: "aging",
    severity: "info",
    headline: `${vehicle.daysOnLot} days on the lot`,
    facts,
  };
}

/**
 * Replace this dealership's insights with the run's results.
 *
 * Upsert on (vehicle, kind): a run replaces the previous reading rather than appending, so
 * the dashboard never has to work out which of five rows is current. The narrative is only
 * overwritten when the new run produced one, so a run with the model switched off does not
 * wipe a sentence an earlier run wrote.
 */
export async function replaceInsights(
  client: PoolClient,
  tenantId: string,
  insights: (ComputedInsight & { narrative?: string | null })[],
): Promise<number> {
  const keptVehicleIds = insights.map((i) => i.vehicleId);

  // Anything for a car that is no longer in stock (sold, deleted) goes: an insight about a
  // car the dealer cannot act on is noise.
  await client.query(
    keptVehicleIds.length
      ? `delete from public.vehicle_insights where not (vehicle_id = any($1::uuid[]))`
      : `delete from public.vehicle_insights`,
    keptVehicleIds.length ? [keptVehicleIds] : [],
  );

  for (const insight of insights) {
    await client.query(
      `insert into public.vehicle_insights
         (tenant_id, vehicle_id, kind, severity, headline, facts, narrative, computed_at)
       values ($1, $2, $3, $4, $5, $6::jsonb, $7, now())
       on conflict (vehicle_id, kind) do update
         set severity = excluded.severity,
             headline = excluded.headline,
             facts = excluded.facts,
             narrative = coalesce(excluded.narrative, public.vehicle_insights.narrative),
             computed_at = now()`,
      [
        tenantId,
        insight.vehicleId,
        insight.kind,
        insight.severity,
        insight.headline,
        JSON.stringify(insight.facts),
        insight.narrative ?? null,
      ],
    );
  }

  return insights.length;
}

const INSIGHT_COLUMNS = `
  i.id,
  i.vehicle_id as "vehicleId",
  concat_ws(' ', v.year::text, v.make, v.model) as "vehicleLabel",
  v.slug as "vehicleSlug",
  i.kind,
  i.severity,
  i.headline,
  i.facts,
  i.narrative,
  i.computed_at as "computedAt"
`;

/** This dealership's current insights, loudest first. */
export async function listForTenant(client: PoolClient): Promise<VehicleInsight[]> {
  const result = await client.query<VehicleInsight>(
    `select ${INSIGHT_COLUMNS}
       from public.vehicle_insights i
       join public.vehicles v on v.id = i.vehicle_id
      order by case i.severity when 'critical' then 0 when 'warning' then 1 else 2 end,
               i.computed_at desc`,
  );
  return result.rows;
}

export async function lastComputedAt(client: PoolClient): Promise<Date | null> {
  const result = await client.query<{ at: Date | null }>(
    "select max(computed_at) as at from public.vehicle_insights",
  );
  return result.rows[0]?.at ?? null;
}
