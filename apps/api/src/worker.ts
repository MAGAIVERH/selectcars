import { Worker } from "bullmq";
import { withPublic, withTenant } from "@selectcars/db";
import { INSIGHTS_QUEUE, isQueueConfigured, redisConnection, type InsightJob } from "./lib/queue";
import { isNarrativeEnabled, writeNarratives } from "./lib/narrative";
import * as insights from "./repositories/insights";

/**
 * The worker: a second entrypoint into the same codebase.
 *
 * It is the same image and the same source as the API, started with a different command.
 * That is a deliberate trade-off, recorded in docs/adr/004-async-insights.md: a separate
 * `apps/worker` package would duplicate the database layer, the env schema, and the
 * repositories, and the two copies would drift. One process type that cannot serve HTTP and
 * one that cannot consume the queue, built from one tree, is the smaller lie.
 *
 * Nothing here is reachable from the internet. It holds no HTTP port and answers no request:
 * it takes jobs off Redis, does slow work, and writes the result to Postgres.
 */

if (!isQueueConfigured()) {
  console.error("[worker] REDIS_URL is not set: there is no queue to consume. Exiting.");
  process.exit(1);
}

const log = {
  info: (msg: string) => console.log(`[worker] ${msg}`),
  warn: (msg: string) => console.warn(`[worker] ${msg}`),
  error: (msg: string) => console.error(`[worker] ${msg}`),
};

/**
 * Recompute every insight for one dealership.
 *
 * The two Postgres roles do different jobs inside one run, which is the part worth reading
 * twice: the dealership's own stock is read under `withTenant` (RLS scoped to them), and the
 * market it is compared against is read under `withPublic` (active listings, every
 * dealership, no tenant context at all). A dealer therefore learns where their car sits
 * against the whole marketplace without the worker ever holding a role that could read
 * another dealership's private rows.
 */
async function recompute(tenantId: string): Promise<number> {
  const { stock, benchmark } = await withTenant(tenantId, async (client) => ({
    stock: await insights.stockForTenant(client),
    benchmark: await insights.averageDaysToSale(client),
  }));

  if (stock.length === 0) {
    // Still run the write: it clears insights left over from cars that have since sold.
    await withTenant(tenantId, (client) => insights.replaceInsights(client, tenantId, []));
    return 0;
  }

  const computed = await withPublic(async (client) => {
    const rows: insights.ComputedInsight[] = [];
    for (const vehicle of stock) {
      const market = await insights.comparableListings(client, {
        make: vehicle.make,
        bodyStyle: vehicle.bodyStyle,
        year: vehicle.year,
        excludeVehicleId: vehicle.id,
      });

      const pricing = insights.pricingInsight(vehicle, market);
      if (pricing) rows.push(pricing);
      rows.push(insights.agingInsight(vehicle, benchmark));
    }
    return rows;
  });

  const narratives = await writeNarratives(computed, log);
  const withNarrative = computed.map((insight, index) => ({
    ...insight,
    narrative: narratives[index] ?? null,
  }));

  return withTenant(tenantId, (client) =>
    insights.replaceInsights(client, tenantId, withNarrative),
  );
}

const worker = new Worker<InsightJob>(
  INSIGHTS_QUEUE,
  async (job) => {
    const startedAt = Date.now();
    const written = await recompute(job.data.tenantId);
    log.info(
      `job ${job.id}: ${written} insights for tenant ${job.data.tenantId} in ${Date.now() - startedAt}ms`,
    );
    return { written };
  },
  {
    connection: redisConnection(),
    // One dealership at a time. The work is database-bound, and a burst of parallel runs
    // would compete for the same connection pool the API needs to answer requests.
    concurrency: 1,
  },
);

worker.on("failed", (job, error) => {
  log.error(`job ${job?.id ?? "unknown"} failed: ${error.message}`);
});

log.info(
  `listening on "${INSIGHTS_QUEUE}". Narrative writing is ${
    isNarrativeEnabled() ? "on" : "off (insights will be numbers only)"
  }.`,
);

/**
 * Finish the job in hand before dying.
 *
 * `close()` waits for the active job rather than dropping it mid-transaction, so a deploy or
 * a `docker compose down` does not leave a dealership with half its insights replaced.
 */
async function shutdown(signal: string): Promise<void> {
  log.info(`${signal} received, finishing the current job before exit.`);
  await worker.close();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
